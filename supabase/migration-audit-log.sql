-- =====================================================================
-- MIGRACIÓN: Audit log completo
--
-- Tabla `audit_log` append-only que registra cada INSERT/UPDATE/DELETE
-- en las tablas clínicas con:
--   • UUID + nombre del actor (denormalizado por si la cuenta se borra)
--   • Snapshot completo before/after en JSONB
--   • Timestamp inmutable
--
-- El trigger es AFTER INSERT/UPDATE/DELETE → no interfiere con el
-- BEFORE de set_audit_fields (migration-audit-columns.sql).
--
-- Solo admin puede leer (puede contener datos médicos). Nadie puede
-- INSERT/UPDATE/DELETE directo — solo el trigger (SECURITY DEFINER)
-- o service_role.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.
-- =====================================================================


-- ─── Tabla audit_log ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id_audit      BIGSERIAL PRIMARY KEY,
    tabla         VARCHAR(64) NOT NULL,
    operacion     VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
    id_registro   TEXT,                    -- PK del registro afectado (como texto)
    actor_uuid    UUID,                    -- auth.uid() al momento del cambio
    actor_nombre  TEXT,                    -- denormalizado
    actor_rol     TEXT,                    -- denormalizado
    ocurrio_en    TIMESTAMPTZ DEFAULT NOW(),
    before_data   JSONB,                   -- estado antes (NULL en INSERT)
    after_data    JSONB                    -- estado después (NULL en DELETE)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tabla_fecha ON audit_log(tabla, ocurrio_en DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor       ON audit_log(actor_uuid, ocurrio_en DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro    ON audit_log(tabla, id_registro);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_admin_read" ON audit_log;
CREATE POLICY "audit_log_admin_read"
    ON audit_log FOR SELECT TO authenticated
    USING (es_admin());

-- Sin políticas INSERT/UPDATE/DELETE → bloqueadas para todos.
-- Solo escriben: el trigger (SECURITY DEFINER) y service_role.

GRANT SELECT ON audit_log TO authenticated;


-- ─── Función trigger genérica ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_uuid   UUID;
    v_actor_nombre TEXT;
    v_actor_rol    TEXT;
    v_id_registro  TEXT;
    v_pk_column    TEXT;
BEGIN
    v_actor_uuid := auth.uid();
    v_pk_column  := TG_ARGV[0];   -- nombre de la PK, ej. 'id_consulta'

    IF v_actor_uuid IS NOT NULL THEN
        SELECT (p.nombres || ' ' || p.apellidos), r.nombre
        INTO v_actor_nombre, v_actor_rol
        FROM usuario u
        JOIN persona p ON p.id_persona = u.id_persona
        LEFT JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
        LEFT JOIN rol r ON r.id_rol = ar.id_rol
        WHERE u.auth_user_id = v_actor_uuid
        LIMIT 1;
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


-- ─── Adjuntar trigger a cada tabla auditada ──────────────────────────
DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_audit_log_consulta_medica ON consulta_medica;
    DROP TRIGGER IF EXISTS trg_audit_log_diagnostico    ON diagnostico;
    DROP TRIGGER IF EXISTS trg_audit_log_sintoma        ON sintoma;
    DROP TRIGGER IF EXISTS trg_audit_log_signos_vitales ON signos_vitales;
    DROP TRIGGER IF EXISTS trg_audit_log_orden_medica   ON orden_medica;
    DROP TRIGGER IF EXISTS trg_audit_log_cita           ON cita;
    DROP TRIGGER IF EXISTS trg_audit_log_asignacion_rol ON asignacion_rol;
    DROP TRIGGER IF EXISTS trg_audit_log_paciente       ON paciente;
    DROP TRIGGER IF EXISTS trg_audit_log_medico         ON medico;
    DROP TRIGGER IF EXISTS trg_audit_log_persona        ON persona;
END $$;

CREATE TRIGGER trg_audit_log_consulta_medica AFTER INSERT OR UPDATE OR DELETE ON consulta_medica
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_consulta');

CREATE TRIGGER trg_audit_log_diagnostico    AFTER INSERT OR UPDATE OR DELETE ON diagnostico
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_diagnostico');

CREATE TRIGGER trg_audit_log_sintoma        AFTER INSERT OR UPDATE OR DELETE ON sintoma
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_sintoma');

CREATE TRIGGER trg_audit_log_signos_vitales AFTER INSERT OR UPDATE OR DELETE ON signos_vitales
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_signos');

CREATE TRIGGER trg_audit_log_orden_medica   AFTER INSERT OR UPDATE OR DELETE ON orden_medica
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_orden');

CREATE TRIGGER trg_audit_log_cita           AFTER INSERT OR UPDATE OR DELETE ON cita
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_cita');

CREATE TRIGGER trg_audit_log_asignacion_rol AFTER INSERT OR UPDATE OR DELETE ON asignacion_rol
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_asignacion');

CREATE TRIGGER trg_audit_log_paciente       AFTER INSERT OR UPDATE OR DELETE ON paciente
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_paciente');

CREATE TRIGGER trg_audit_log_medico         AFTER INSERT OR UPDATE OR DELETE ON medico
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_medico');

CREATE TRIGGER trg_audit_log_persona        AFTER INSERT OR UPDATE OR DELETE ON persona
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_persona');


-- ─── Vista legible para la UI ─────────────────────────────────────────
DROP VIEW IF EXISTS vw_audit_log CASCADE;
CREATE VIEW vw_audit_log AS
SELECT
    id_audit,
    tabla,
    operacion,
    id_registro,
    actor_uuid,
    COALESCE(actor_nombre, '(sistema / service_role)') AS actor_nombre,
    actor_rol,
    ocurrio_en,
    before_data,
    after_data
FROM audit_log
ORDER BY ocurrio_en DESC;

GRANT SELECT ON vw_audit_log TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Hacer un cambio cualquiera y revisar el log:
-- UPDATE cita SET motivo = 'test audit' WHERE id_cita = (SELECT MIN(id_cita) FROM cita);
-- SELECT * FROM vw_audit_log WHERE tabla = 'cita' LIMIT 5;
--
-- 2. Ver todos los cambios de un registro específico:
-- SELECT * FROM vw_audit_log WHERE tabla = 'consulta_medica' AND id_registro = '42';
--
-- 3. Ver todas las acciones de un usuario:
-- SELECT * FROM vw_audit_log WHERE actor_uuid = 'XXX' ORDER BY ocurrio_en DESC;
