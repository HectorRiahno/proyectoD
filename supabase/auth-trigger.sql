-- =====================================================================
-- AUTO-SYNC entre auth.users y public.usuario / public.persona
--
-- ⚠️  EJECUTAR ESTE ARCHIVO PRIMERO, ANTES QUE views.sql
--    (views.sql depende de la columna auth_user_id que se agrega aquí)
--
-- Flujo:
--   1. Admin crea cuenta vía Supabase Auth (Dashboard o admin API):
--         email + password → auth.users (UUID generado por Supabase)
--   2. Este trigger se dispara INSERT ON auth.users y crea:
--         - persona     (con el email)
--         - usuario     (con auth_user_id = mismo UUID de auth.users)
--         - asignacion_rol (rol "cliente" por defecto)
--   3. La contraseña queda gestionada por Supabase Auth (bcrypt).
--      En public.usuario.password_hash NO se almacena nada sensible.
-- =====================================================================


-- =====================================================================
-- PASO 1. Agregar columna auth_user_id en usuario
-- =====================================================================
ALTER TABLE public.usuario
    ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE
    REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_usuario_auth_user_id
    ON public.usuario(auth_user_id);


-- =====================================================================
-- PASO 2. Función auxiliar reutilizable (definir ANTES del trigger
--         y del backfill que la usan)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.provision_user_from_auth(
    p_id    UUID,
    p_email TEXT,
    p_meta  JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_persona  BIGINT;
    v_id_usuario  BIGINT;
    v_id_rol      BIGINT;
    v_full_name   TEXT;
    v_nombres     TEXT;
    v_apellidos   TEXT;
    v_rol_nombre  TEXT;
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

    -- Crear o reutilizar persona (por email)
    SELECT id_persona INTO v_id_persona
    FROM public.persona
    WHERE LOWER(email) = LOWER(p_email)
    LIMIT 1;

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

    -- 🔒 SEGURIDAD: el trigger SIEMPRE asigna 'cliente'. No confiamos en
    --    metadata.rol porque supabase.auth.signUp permite que cualquier
    --    cliente envíe { rol: 'admin' } y se autopromueva.
    --    Si la invitación viene de la Edge Function con un rol elevado
    --    (medico/admin/asistente), esa función — usando service_role —
    --    actualiza asignacion_rol después de que este trigger termine.
    SELECT id_rol INTO v_id_rol FROM public.rol WHERE nombre = 'cliente' LIMIT 1;

    IF v_id_rol IS NOT NULL AND v_id_usuario IS NOT NULL THEN
        INSERT INTO public.asignacion_rol (id_usuario, id_rol)
        VALUES (v_id_usuario, v_id_rol)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


-- =====================================================================
-- PASO 3. Trigger sobre auth.users (INSERT) → llama a la función auxiliar
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.provision_user_from_auth(NEW.id, NEW.email, NEW.raw_user_meta_data);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();


-- =====================================================================
-- PASO 4. Sincronizar email si cambia en auth.users
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_auth_email_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        UPDATE public.usuario
        SET username = LOWER(NEW.email)
        WHERE auth_user_id = NEW.id;

        UPDATE public.persona
        SET email = LOWER(NEW.email)
        WHERE id_persona = (
            SELECT id_persona FROM public.usuario WHERE auth_user_id = NEW.id LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_email_change();


-- =====================================================================
-- PASO 5. Backfill: para usuarios YA existentes en auth.users
--          (vincula su UUID con public.usuario por email, o crea fila)
-- =====================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        -- 1. Si ya existe persona+usuario con ese email, vincular el UUID
        UPDATE public.usuario u
        SET auth_user_id = r.id
        FROM public.persona p
        WHERE p.id_persona = u.id_persona
          AND LOWER(p.email) = LOWER(r.email)
          AND u.auth_user_id IS NULL;

        -- 2. Si no quedó vinculado, provisionar (crear persona+usuario+rol)
        IF NOT EXISTS (SELECT 1 FROM public.usuario WHERE auth_user_id = r.id) THEN
            PERFORM public.provision_user_from_auth(r.id, r.email, r.raw_user_meta_data);
        END IF;
    END LOOP;
END $$;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT au.id AS auth_uid, au.email,
--        p.id_persona, p.nombres, p.apellidos,
--        u.id_usuario, u.auth_user_id,
--        r.nombre AS rol
-- FROM auth.users au
-- LEFT JOIN public.usuario u    ON u.auth_user_id = au.id
-- LEFT JOIN public.persona p    ON p.id_persona   = u.id_persona
-- LEFT JOIN public.asignacion_rol ar ON ar.id_usuario = u.id_usuario
-- LEFT JOIN public.rol r        ON r.id_rol = ar.id_rol;
