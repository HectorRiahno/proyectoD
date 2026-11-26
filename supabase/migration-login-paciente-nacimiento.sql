-- =====================================================================
-- MIGRACIÓN: Ingreso del paciente con documento + fecha de nacimiento
--
-- Para pacientes que no manejan correo (adultos mayores, etc.). El admin
-- los registra en Pacientes con nombre, documento y fecha de nacimiento;
-- el paciente entra desde la pestaña "Soy paciente" del login con esos
-- dos datos. No necesita correo, invitación ni contraseña.
--
-- Piezas:
--   1. fn_login_fallo(): contador de intentos fallidos reutilizable
--      (tabla login_intento, la misma del login con documento + clave).
--   2. fn_verificar_acceso_paciente(): valida documento + fecha. Sólo la
--      llama la Edge Function `login-paciente` (service_role).
--        · Sólo pacientes activos (ficha en `paciente`, no borrada).
--        · Nunca personal: si la persona tiene cualquier rol distinto de
--          'cliente' (admin, médico, asistente) se rechaza; ellos entran
--          con su contraseña.
--        · 5 fallos sobre un documento → bloqueo 15 min.
--          20 fallos desde una IP     → bloqueo 30 min.
--        · Nunca distingue "no existe" de "fecha incorrecta".
--   3. provision_user_from_auth: si la cuenta la crea el servidor con
--      app_metadata.id_persona (sólo service_role puede poner
--      app_metadata; un signUp público no), se liga a ESA persona en vez
--      de crear una nueva. Así la cuenta sin correo del paciente queda
--      ligada a su ficha y su historia clínica.
--
-- No depende de otras migraciones: crea lo que necesite si falta
-- (tabla login_intento, fn_documento_norm, paciente.deleted_at) sin
-- tocarlo si ya existe. Transaccional e idempotente.
-- =====================================================================

BEGIN;

-- ─── 0. Base (por si no se ejecutó migration-login-documento.sql) ────
CREATE TABLE IF NOT EXISTS public.login_intento (
    documento        TEXT PRIMARY KEY,         -- documento o 'ip:<dirección>'
    fallos           INTEGER     NOT NULL DEFAULT 0,
    bloqueado_hasta  TIMESTAMPTZ,
    actualizado      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.login_intento ENABLE ROW LEVEL SECURITY;   -- sin políticas: nadie la lee por la API
REVOKE ALL ON public.login_intento FROM anon, authenticated;

-- '1.090.123-456 ' → '1090123456'
CREATE OR REPLACE FUNCTION public.fn_documento_norm(p_documento TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE
AS $$ SELECT upper(regexp_replace(coalesce(p_documento, ''), '[\s.\-]', '', 'g')) $$;

-- Soft-delete de pacientes (migration-soft-delete.sql); vacío = activo.
ALTER TABLE public.paciente ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ─── 1. Contador de fallos ────────────────────────────────────────────
-- Devuelve la hora hasta la que queda bloqueada la clave, o NULL.
CREATE OR REPLACE FUNCTION public.fn_login_fallo(p_clave TEXT, p_max INT, p_bloqueo INTERVAL)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_int login_intento%ROWTYPE;
BEGIN
    INSERT INTO login_intento AS li (documento, fallos, actualizado)
    VALUES (p_clave, 1, now())
    ON CONFLICT (documento) DO UPDATE SET
        fallos      = CASE WHEN li.actualizado < now() - p_bloqueo THEN 1 ELSE li.fallos + 1 END,
        actualizado = now()
    RETURNING * INTO v_int;

    IF v_int.fallos >= p_max THEN
        UPDATE login_intento
           SET bloqueado_hasta = now() + p_bloqueo, fallos = 0
         WHERE documento = p_clave
        RETURNING * INTO v_int;
        RETURN v_int.bloqueado_hasta;
    END IF;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_login_fallo(TEXT, INT, INTERVAL) FROM PUBLIC, anon, authenticated;


-- ─── 2. Verificación documento + fecha de nacimiento ─────────────────
-- Devuelve JSONB:
--   { ok: true, id_persona, auth_user_id, email, nombre }
--   { ok: false }                    datos incorrectos
--   { ok: false, bloqueado_hasta }   demasiados intentos
CREATE OR REPLACE FUNCTION public.fn_verificar_acceso_paciente(
    p_documento TEXT,
    p_fecha     DATE,
    p_ip        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_doc      TEXT := fn_documento_norm(p_documento);
    v_clave_ip TEXT := CASE WHEN coalesce(p_ip, '') <> '' THEN 'ip:' || p_ip END;
    v_bloq     TIMESTAMPTZ;
    r          RECORD;
BEGIN
    IF v_doc = '' OR p_fecha IS NULL THEN
        RETURN jsonb_build_object('ok', false);
    END IF;

    -- ¿Bloqueado por documento o por IP?
    SELECT max(bloqueado_hasta) INTO v_bloq
      FROM login_intento
     WHERE documento IN (v_doc, v_clave_ip) AND bloqueado_hasta > now();
    IF v_bloq IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'bloqueado_hasta', v_bloq);
    END IF;

    SELECT p.id_persona, p.email, p.nombres, p.apellidos,
           u.id_usuario, u.activo, u.auth_user_id
      INTO r
      FROM persona p
      JOIN paciente pa  ON pa.id_persona = p.id_persona AND pa.deleted_at IS NULL
      LEFT JOIN usuario u ON u.id_persona = p.id_persona
     WHERE fn_documento_norm(p.documento) = v_doc
       AND p.fecha_nacimiento = p_fecha
     LIMIT 1;

    IF r.id_persona IS NOT NULL
       AND r.activo IS NOT FALSE
       AND NOT EXISTS (                         -- nunca personal del centro
           SELECT 1 FROM asignacion_rol ar
             JOIN rol ro ON ro.id_rol = ar.id_rol
            WHERE ar.id_usuario = r.id_usuario AND ro.nombre <> 'cliente')
    THEN
        DELETE FROM login_intento WHERE documento = v_doc;
        RETURN jsonb_build_object(
            'ok',           true,
            'id_persona',   r.id_persona,
            'auth_user_id', r.auth_user_id,
            'email',        r.email,
            'nombre',       trim(r.nombres || ' ' || coalesce(r.apellidos, ''))
        );
    END IF;

    -- Fallo: cuenta por documento y por IP.
    v_bloq := fn_login_fallo(v_doc, 5, INTERVAL '15 minutes');
    IF v_clave_ip IS NOT NULL THEN
        v_bloq := coalesce(v_bloq, fn_login_fallo(v_clave_ip, 20, INTERVAL '30 minutes'));
    END IF;

    IF v_bloq IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'bloqueado_hasta', v_bloq);
    END IF;
    RETURN jsonb_build_object('ok', false);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_verificar_acceso_paciente(TEXT, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_verificar_acceso_paciente(TEXT, DATE, TEXT) TO service_role;


-- ─── 3. provision_user_from_auth: ligar por app_metadata.id_persona ──
-- Igual a la versión de migration-seguridad-registro.sql, más el paso
-- "persona indicada por el servidor".
CREATE OR REPLACE FUNCTION public.provision_user_from_auth(
    p_id    UUID,
    p_email TEXT,
    p_meta  JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id_persona  BIGINT;
    v_id_usuario  BIGINT;
    v_id_rol      BIGINT;
    v_full_name   TEXT;
    v_nombres     TEXT;
    v_apellidos   TEXT;
    v_creada_por_admin BOOLEAN;
    v_persona_app BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM public.usuario WHERE auth_user_id = p_id) THEN
        RETURN;
    END IF;

    v_full_name := COALESCE(
        p_meta ->> 'nombre',
        p_meta ->> 'full_name',
        p_meta ->> 'name',
        split_part(p_email, '@', 1)
    );
    v_nombres   := split_part(v_full_name, ' ', 1);
    v_apellidos := NULLIF(TRIM(SUBSTRING(v_full_name FROM LENGTH(v_nombres) + 1)), '');

    -- Cuenta creada por el servidor (sin contraseña) y, opcionalmente, la
    -- persona exacta a la que pertenece (app_metadata: sólo service_role).
    SELECT coalesce(au.encrypted_password, '') = '',
           CASE WHEN au.raw_app_meta_data ->> 'id_persona' ~ '^[0-9]+$'
                THEN (au.raw_app_meta_data ->> 'id_persona')::BIGINT END
      INTO v_creada_por_admin, v_persona_app
      FROM auth.users au
     WHERE au.id = p_id;

    IF v_creada_por_admin AND v_persona_app IS NOT NULL THEN
        SELECT pe.id_persona INTO v_id_persona
          FROM public.persona pe
         WHERE pe.id_persona = v_persona_app
           AND NOT EXISTS (SELECT 1 FROM public.usuario u WHERE u.id_persona = pe.id_persona);
    END IF;

    IF v_id_persona IS NULL AND v_creada_por_admin THEN
        SELECT pe.id_persona INTO v_id_persona
        FROM public.persona pe
        WHERE LOWER(pe.email) = LOWER(p_email)
          AND NOT EXISTS (SELECT 1 FROM public.usuario u WHERE u.id_persona = pe.id_persona)
        ORDER BY pe.id_persona
        LIMIT 1;
    END IF;

    IF v_id_persona IS NULL THEN
        INSERT INTO public.persona (documento, tipo_documento, nombres, apellidos, email)
        VALUES (
            'AUTH-' || SUBSTRING(p_id::text, 1, 12),
            'CC',
            v_nombres,
            COALESCE(v_apellidos, ''),
            LOWER(p_email)
        )
        RETURNING id_persona INTO v_id_persona;
    END IF;

    INSERT INTO public.usuario (auth_user_id, username, id_persona, password_hash, activo)
    VALUES (p_id, LOWER(p_email), v_id_persona, 'AUTH_MANAGED', TRUE)
    ON CONFLICT (auth_user_id) DO NOTHING
    RETURNING id_usuario INTO v_id_usuario;

    IF v_id_usuario IS NULL THEN
        SELECT id_usuario INTO v_id_usuario
        FROM public.usuario WHERE auth_user_id = p_id;
    END IF;

    -- 🔒 Siempre 'cliente'; la Edge Function create-user cambia el rol después.
    SELECT id_rol INTO v_id_rol FROM public.rol WHERE nombre = 'cliente' LIMIT 1;

    IF v_id_rol IS NOT NULL AND v_id_usuario IS NOT NULL THEN
        INSERT INTO public.asignacion_rol (id_usuario, id_rol)
        VALUES (v_id_usuario, v_id_rol)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.provision_user_from_auth(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

COMMIT;


-- =====================================================================
-- VERIFICACIÓN (como postgres en el SQL Editor)
-- =====================================================================
-- SELECT fn_verificar_acceso_paciente('9100000001', DATE '1992-04-18');  -- cliente1 de prueba → ok: true
-- SELECT fn_verificar_acceso_paciente('9100000001', DATE '1992-04-19');  -- → ok: false
-- SELECT * FROM login_intento;                                          -- contador de fallos
-- DELETE FROM login_intento WHERE documento = '9100000001';             -- desbloquear a mano
-- =====================================================================
