-- =====================================================================
-- MIGRACIÓN: Trazabilidad — actor fiable y cobertura completa del log
--
-- QUÉ CORRIGE
--   1. set_audit_fields respetaba el created_by que mandara el cliente
--      en un INSERT → cualquiera podía atribuir un registro a otro
--      usuario. Ahora, con sesión, created_by/created_at los fija el
--      servidor siempre.
--   2. audit_log_trigger:
--      • Sin auth.uid() (service_role, triggers de Auth, SQL editor) el
--        actor quedaba vacío. Ahora actor_rol indica el origen
--        ('service_role', 'supabase_auth_admin', 'sistema'...).
--      • actor_rol salía de un LIMIT 1 sin orden → no determinista.
--      • Acepta columnas a ignorar (2º argumento) y no registra UPDATEs
--        que no cambian nada.
--   3. Tablas que no dejaban rastro: consulta_adjunto, orden_examen,
--      orden_examen_item, usuario (activar/desactivar cuentas),
--      medicamento, categoria_medicamento (inventario) y horario_medico.
--   4. Inicios de sesión: cada login queda en audit_log como
--      operacion = 'LOGIN' (tabla 'sesion').
--
-- La Edge Function create-user ahora escribe con el JWT del admin que
-- invita, así que el cambio de rol queda atribuido a ese admin
-- (redeploy: npx supabase functions deploy create-user --no-verify-jwt).
--
-- Requiere migration-audit-log.sql, migration-audit-columns.sql y
-- migration-seguridad-hardening.sql. Transaccional e idempotente.
-- =====================================================================

BEGIN;

-- ─── 1. audit_log admite LOGIN ────────────────────────────────────────
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_operacion_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_operacion_check
    CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN'));


-- ─── 2. set_audit_fields: el servidor fija el autor ──────────────────
CREATE OR REPLACE FUNCTION public.set_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
BEGIN
    -- auth.uid() es NULL para service_role / scripts admin: sólo en ese
    -- caso se acepta lo que traiga la fila (backfills, importaciones).
    v_uid := auth.uid();

    IF TG_OP = 'INSERT' THEN
        IF v_uid IS NOT NULL THEN
            NEW.created_by := v_uid;
            NEW.created_at := NOW();
        ELSE
            IF NEW.created_at IS NULL THEN NEW.created_at := NOW(); END IF;
        END IF;
        NEW.updated_at := NEW.created_at;
        NEW.updated_by := NEW.created_by;
    ELSIF TG_OP = 'UPDATE' THEN
        -- No permitir que el cliente sobrescriba created_*: siempre conservar
        NEW.created_at := OLD.created_at;
        NEW.created_by := OLD.created_by;
        NEW.updated_at := NOW();
        NEW.updated_by := v_uid;
    END IF;
    RETURN NEW;
END;
$$;


-- ─── 3. audit_log_trigger ─────────────────────────────────────────────
-- TG_ARGV[0]: nombre de la PK.
-- TG_ARGV[1]: (opcional) columnas separadas por coma que, si son lo
--             único que cambió, no generan registro (ej. 'ultimo_acceso').
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_uuid   UUID;
    v_actor_nombre TEXT;
    v_actor_rol    TEXT;
    v_id_registro  TEXT;
    v_pk_column    TEXT;
    v_ignorar      TEXT[];
BEGIN
    v_actor_uuid := auth.uid();
    v_pk_column  := TG_ARGV[0];

    IF TG_OP = 'UPDATE' THEN
        v_ignorar := CASE WHEN TG_NARGS > 1
                          THEN string_to_array(replace(TG_ARGV[1], ' ', ''), ',')
                          ELSE ARRAY[]::TEXT[] END;
        IF (to_jsonb(NEW) - v_ignorar) = (to_jsonb(OLD) - v_ignorar) THEN
            RETURN NEW;
        END IF;
    END IF;

    IF v_actor_uuid IS NOT NULL THEN
        SELECT (p.nombres || ' ' || p.apellidos), r.nombre
        INTO v_actor_nombre, v_actor_rol
        FROM usuario u
        JOIN persona p ON p.id_persona = u.id_persona
        LEFT JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
        LEFT JOIN rol r ON r.id_rol = ar.id_rol
        WHERE u.auth_user_id = v_actor_uuid
        ORDER BY ar.id_asignacion DESC NULLS LAST
        LIMIT 1;
    ELSE
        -- Sin usuario final: dejar constancia de QUIÉN escribió
        -- (service_role desde Edge Functions, supabase_auth_admin desde
        -- los triggers de Auth, postgres desde el SQL editor...).
        v_actor_rol := COALESCE(
            NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
            session_user::TEXT,
            'sistema'
        );
    END IF;

    IF TG_OP = 'DELETE' THEN
        v_id_registro := (to_jsonb(OLD) ->> v_pk_column);
        INSERT INTO audit_log (tabla, operacion, id_registro, actor_uuid, actor_nombre, actor_rol, before_data)
        VALUES (TG_TABLE_NAME, 'DELETE', v_id_registro, v_actor_uuid, v_actor_nombre, v_actor_rol, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        v_id_registro := (to_jsonb(NEW) ->> v_pk_column);
        INSERT INTO audit_log (tabla, operacion, id_registro, actor_uuid, actor_nombre, actor_rol, after_data)
        VALUES (TG_TABLE_NAME, 'INSERT', v_id_registro, v_actor_uuid, v_actor_nombre, v_actor_rol, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        v_id_registro := (to_jsonb(NEW) ->> v_pk_column);
        INSERT INTO audit_log (tabla, operacion, id_registro, actor_uuid, actor_nombre, actor_rol, before_data, after_data)
        VALUES (TG_TABLE_NAME, 'UPDATE', v_id_registro, v_actor_uuid, v_actor_nombre, v_actor_rol, to_jsonb(OLD), to_jsonb(NEW));
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_log_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_audit_fields()  FROM PUBLIC, anon, authenticated;


-- ─── 4. Tablas que faltaban en el log ─────────────────────────────────
-- (tabla, PK, columnas a ignorar). Se saltan las que no existan.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('consulta_adjunto',      'id_adjunto',      NULL),
            ('orden_examen',          'id_orden_examen', NULL),
            ('orden_examen_item',     'id_item',         NULL),
            ('usuario',               'id_usuario',      'ultimo_acceso'),
            ('medicamento',           'id_medicamento',  NULL),
            ('categoria_medicamento', 'id_categoria',    NULL),
            ('horario_medico',        'id_horario',      NULL)
        ) AS t(tabla, pk, ignorar)
    LOOP
        IF to_regclass('public.' || r.tabla) IS NULL THEN
            RAISE NOTICE 'Tabla % no existe; se omite', r.tabla;
            CONTINUE;
        END IF;

        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I',
                       'trg_audit_log_' || r.tabla, r.tabla);

        IF r.ignorar IS NULL THEN
            EXECUTE format(
                'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I
                 FOR EACH ROW EXECUTE FUNCTION audit_log_trigger(%L)',
                'trg_audit_log_' || r.tabla, r.tabla, r.pk);
        ELSE
            EXECUTE format(
                'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I
                 FOR EACH ROW EXECUTE FUNCTION audit_log_trigger(%L, %L)',
                'trg_audit_log_' || r.tabla, r.tabla, r.pk, r.ignorar);
        END IF;
    END LOOP;
END $$;


-- ─── 5. Inicios de sesión ─────────────────────────────────────────────
-- Extiende el trigger de migration-seguridad-hardening.sql: además de
-- sincronizar usuario.ultimo_acceso, deja un registro LOGIN.
CREATE OR REPLACE FUNCTION public.handle_auth_last_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id_usuario BIGINT;
    v_nombre     TEXT;
    v_rol        TEXT;
BEGIN
    IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
        UPDATE public.usuario
        SET ultimo_acceso = NEW.last_sign_in_at
        WHERE auth_user_id = NEW.id
        RETURNING id_usuario INTO v_id_usuario;

        SELECT (p.nombres || ' ' || p.apellidos), r.nombre
        INTO v_nombre, v_rol
        FROM usuario u
        JOIN persona p ON p.id_persona = u.id_persona
        LEFT JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
        LEFT JOIN rol r ON r.id_rol = ar.id_rol
        WHERE u.id_usuario = v_id_usuario
        ORDER BY ar.id_asignacion DESC NULLS LAST
        LIMIT 1;

        INSERT INTO audit_log (tabla, operacion, id_registro, actor_uuid, actor_nombre, actor_rol,
                               ocurrio_en, after_data)
        VALUES ('sesion', 'LOGIN', v_id_usuario::TEXT, NEW.id, v_nombre, v_rol,
                NEW.last_sign_in_at,
                jsonb_build_object('email', NEW.email, 'last_sign_in_at', NEW.last_sign_in_at));
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Nunca bloquear un login por un fallo de sincronización
    RAISE WARNING 'handle_auth_last_sign_in: %', SQLERRM;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_auth_last_sign_in() FROM PUBLIC, anon, authenticated;

COMMIT;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Triggers de auditoría activos:
-- SELECT event_object_table, trigger_name
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE 'trg_audit_log_%'
-- ORDER BY 1;
--
-- 2. Iniciar sesión en la app y revisar:
-- SELECT * FROM vw_audit_log WHERE operacion = 'LOGIN' LIMIT 5;
--
-- 3. Invitar un médico desde el panel y revisar que el cambio de rol
--    tenga como actor al admin (no '(sistema / service_role)'):
-- SELECT * FROM vw_audit_log WHERE tabla = 'asignacion_rol' LIMIT 5;
-- =====================================================================
