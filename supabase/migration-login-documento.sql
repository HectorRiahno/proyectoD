-- =====================================================================
-- LOGIN CON DOCUMENTO + ESTADO DEL PORTAL DEL PACIENTE
--
-- Ejecutar en Supabase SQL Editor (requiere auth-trigger.sql y rls-admin.sql).
--
-- Supabase Auth sólo inicia sesión con correo. Para entrar con el número
-- de documento, el frontend llama a fn_login_documento(documento, clave):
--   • Verifica la contraseña contra auth.users (bcrypt, pgcrypto).
--   • SÓLO si es correcta devuelve el correo de la cuenta; luego el
--     navegador hace signInWithPassword(correo, clave) normalmente.
--   Así nadie puede averiguar el correo de otra persona con su cédula.
--   • Tras 5 intentos fallidos sobre un documento lo bloquea 15 minutos
--     (las RPC no tienen el rate-limit de Supabase Auth).
--
-- fn_estado_portal_pacientes(): para admin/asistente, indica por paciente
-- si tiene cuenta, si la invitación está pendiente y su último ingreso.
--
-- Es idempotente: se puede re-ejecutar.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ─── 1. Intentos fallidos (sin acceso directo desde la API) ──────────
CREATE TABLE IF NOT EXISTS login_intento (
    documento        TEXT PRIMARY KEY,
    fallos           INTEGER     NOT NULL DEFAULT 0,
    bloqueado_hasta  TIMESTAMPTZ,
    actualizado      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE login_intento ENABLE ROW LEVEL SECURITY;   -- sin políticas: nadie la lee por la API
REVOKE ALL ON login_intento FROM anon, authenticated;


-- ─── 2. Normalización del documento ('1.090.123-456 ' → '1090123456') ─
CREATE OR REPLACE FUNCTION fn_documento_norm(p_documento TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE
AS $$ SELECT upper(regexp_replace(coalesce(p_documento, ''), '[\s.\-]', '', 'g')) $$;


-- ─── 3. fn_login_documento ───────────────────────────────────────────
-- Devuelve JSON:
--   { ok: true,  email }                 credenciales correctas
--   { ok: false }                        documento o clave incorrectos
--   { ok: false, bloqueado_hasta }       demasiados intentos
-- Nunca distingue "documento inexistente" de "clave incorrecta".
CREATE OR REPLACE FUNCTION fn_login_documento(p_documento TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_doc   TEXT := fn_documento_norm(p_documento);
    v_hash  TEXT;
    v_email TEXT;
    v_int   login_intento%ROWTYPE;
BEGIN
    IF v_doc = '' OR coalesce(p_password, '') = '' THEN
        RETURN jsonb_build_object('ok', false);
    END IF;

    SELECT * INTO v_int FROM login_intento WHERE documento = v_doc;
    IF v_int.bloqueado_hasta > now() THEN
        RETURN jsonb_build_object('ok', false, 'bloqueado_hasta', v_int.bloqueado_hasta);
    END IF;

    SELECT au.encrypted_password, au.email
      INTO v_hash, v_email
      FROM persona p
      JOIN usuario u     ON u.id_persona = p.id_persona AND u.activo IS NOT FALSE
      JOIN auth.users au ON au.id = u.auth_user_id
     WHERE fn_documento_norm(p.documento) = v_doc
     LIMIT 1;

    IF coalesce(v_hash, '') <> '' AND crypt(p_password, v_hash) = v_hash THEN
        DELETE FROM login_intento WHERE documento = v_doc;
        RETURN jsonb_build_object('ok', true, 'email', v_email);
    END IF;

    -- Mismo costo de bcrypt aunque el documento no exista (evita
    -- distinguir por tiempo de respuesta).
    IF coalesce(v_hash, '') = '' THEN
        PERFORM crypt(p_password, gen_salt('bf', 10));
    END IF;

    INSERT INTO login_intento AS li (documento, fallos, actualizado)
    VALUES (v_doc, 1, now())
    ON CONFLICT (documento) DO UPDATE SET
        fallos      = CASE WHEN li.actualizado < now() - INTERVAL '15 minutes' THEN 1 ELSE li.fallos + 1 END,
        actualizado = now()
    RETURNING * INTO v_int;

    IF v_int.fallos >= 5 THEN
        UPDATE login_intento
           SET bloqueado_hasta = now() + INTERVAL '15 minutes', fallos = 0
         WHERE documento = v_doc
        RETURNING * INTO v_int;
        RETURN jsonb_build_object('ok', false, 'bloqueado_hasta', v_int.bloqueado_hasta);
    END IF;

    RETURN jsonb_build_object('ok', false);
END;
$$;

REVOKE ALL ON FUNCTION fn_login_documento(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_login_documento(TEXT, TEXT) TO anon, authenticated;


-- ─── 4. fn_estado_portal_pacientes ───────────────────────────────────
--   estado: 'sin_cuenta' | 'pendiente' (invitado, aún sin contraseña) | 'activa'
CREATE OR REPLACE FUNCTION fn_estado_portal_pacientes()
RETURNS TABLE (
    id_paciente     BIGINT,
    estado          TEXT,
    invitado_at     TIMESTAMPTZ,
    ultimo_ingreso  TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT es_admin_o_asistente() THEN
        RAISE EXCEPTION 'No tienes permiso para ver el estado del portal.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT pa.id_paciente,
           CASE
               WHEN au.id IS NULL                        THEN 'sin_cuenta'
               WHEN coalesce(au.encrypted_password, '') = '' THEN 'pendiente'
               ELSE 'activa'
           END,
           au.invited_at,
           au.last_sign_in_at
      FROM paciente pa
      LEFT JOIN usuario u     ON u.id_persona = pa.id_persona
      LEFT JOIN auth.users au ON au.id = u.auth_user_id
     WHERE pa.deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION fn_estado_portal_pacientes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_estado_portal_pacientes() TO authenticated;

COMMIT;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT fn_login_documento('1091655499', 'clave-incorrecta');   -- {"ok": false}
-- SELECT * FROM fn_estado_portal_pacientes();                     -- como admin
