-- =====================================================================
-- MIGRACIÓN: Registro público sin secuestro de identidad
--
-- PROBLEMA
--   provision_user_from_auth reutilizaba cualquier `persona` cuyo email
--   coincidiera con el de la cuenta nueva. Un paciente creado por el
--   admin (con email pero sin cuenta) podía ser "reclamado" por quien se
--   registrara en /register con ese correo: su usuario quedaba ligado a
--   esa persona → mi_id_paciente() devolvía el paciente de la víctima y
--   veía toda su historia clínica. Con "Confirm email" desactivado en
--   Supabase Auth bastaba con registrarse; con él activado, la fila
--   quedaba ligada igual y esperando a que alguien confirmara.
--
-- QUÉ HACE
--   Sólo se reutiliza una persona existente cuando la cuenta la creó el
--   admin (invitación / admin API: auth.users sin contraseña al crearse)
--   y esa persona todavía no tiene otro usuario. Un signUp público
--   siempre trae contraseña → siempre recibe una persona nueva.
--
-- Reemplaza la versión de migration-rls-security.sql (que a su vez
-- reemplazó la de auth-trigger.sql). Idempotente.
-- =====================================================================

BEGIN;

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
BEGIN
    -- Si ya existe usuario con este UUID, no hacer nada
    IF EXISTS (SELECT 1 FROM public.usuario WHERE auth_user_id = p_id) THEN
        RETURN;
    END IF;

    -- Extraer nombre desde metadata
    v_full_name := COALESCE(
        p_meta ->> 'nombre',
        p_meta ->> 'full_name',
        p_meta ->> 'name',
        split_part(p_email, '@', 1)
    );
    v_nombres   := split_part(v_full_name, ' ', 1);
    v_apellidos := NULLIF(TRIM(SUBSTRING(v_full_name FROM LENGTH(v_nombres) + 1)), '');

    -- inviteUserByEmail / admin.createUser sin clave crean la fila sin
    -- contraseña; supabase.auth.signUp (registro público) siempre la trae.
    -- En el AFTER INSERT la fila ya es visible.
    SELECT coalesce(au.encrypted_password, '') = ''
      INTO v_creada_por_admin
      FROM auth.users au
     WHERE au.id = p_id;

    -- 🔒 Reutilizar persona (por email) SÓLO en cuentas creadas por el
    --    admin, y sólo si nadie más está ligado ya a esa persona.
    IF v_creada_por_admin THEN
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

    -- Crear usuario vinculado al UUID de auth.users
    INSERT INTO public.usuario (auth_user_id, username, id_persona, password_hash, activo)
    VALUES (
        p_id,
        LOWER(p_email),
        v_id_persona,
        'AUTH_MANAGED',
        TRUE
    )
    ON CONFLICT (auth_user_id) DO NOTHING
    RETURNING id_usuario INTO v_id_usuario;

    IF v_id_usuario IS NULL THEN
        SELECT id_usuario INTO v_id_usuario
        FROM public.usuario WHERE auth_user_id = p_id;
    END IF;

    -- 🔒 SEGURIDAD: el trigger SIEMPRE asigna 'cliente'. Ignora metadata.rol
    --    para evitar escalación de privilegios desde supabase.auth.signUp.
    --    La Edge Function create-user cambia el rol después, como el admin.
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
-- VERIFICACIÓN
-- =====================================================================
-- 1. Cuentas ligadas a una persona que comparte email con otra cuenta o
--    que fueron auto-registradas sobre un paciente preexistente
--    (revisar a mano si aparece alguna):
-- SELECT u.id_usuario, u.username, au.created_at, au.invited_at,
--        pa.id_paciente, pa.numero_historia
-- FROM usuario u
-- JOIN auth.users au ON au.id = u.auth_user_id
-- JOIN paciente  pa  ON pa.id_persona = u.id_persona
-- WHERE au.invited_at IS NULL
--   AND pa.created_at < au.created_at;
--
-- 2. En el Dashboard: Authentication → Sign In / Providers → Email →
--    "Confirm email" debe estar ACTIVADO.
-- =====================================================================
