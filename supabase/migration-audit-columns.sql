-- =====================================================================
-- MIGRACIÓN: Columnas de auditoría (created_by / updated_by / *_at)
--
-- Añade trazabilidad a las tablas clínicas y a asignacion_rol. Un trigger
-- genérico se encarga de llenar las columnas automáticamente al INSERT/UPDATE
-- usando auth.uid(), protegiendo contra escritura manual por parte del cliente.
--
-- ON DELETE SET NULL en las FKs hacia auth.users: si una cuenta se elimina,
-- los registros históricos permanecen pero el created_by/updated_by queda
-- NULL en vez de romper la FK.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.
-- =====================================================================


-- ─── Función genérica del trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
BEGIN
    -- auth.uid() puede ser NULL si la operación viene del service_role
    -- (Edge Function, scripts admin, etc). En ese caso no forzamos el campo.
    v_uid := auth.uid();

    IF TG_OP = 'INSERT' THEN
        IF NEW.created_at IS NULL THEN NEW.created_at := NOW(); END IF;
        IF NEW.created_by IS NULL THEN NEW.created_by := v_uid; END IF;
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


-- ─── Helper: aplicar columnas + trigger a una tabla ────────────────────
-- (Postgres no tiene macros: se repite el bloque por tabla, pero los
-- IF NOT EXISTS lo hacen idempotente).
DO $$ BEGIN

    -- consulta_medica
    ALTER TABLE public.consulta_medica
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- diagnostico
    ALTER TABLE public.diagnostico
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- sintoma
    ALTER TABLE public.sintoma
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- signos_vitales
    ALTER TABLE public.signos_vitales
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- orden_medica
    ALTER TABLE public.orden_medica
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- cita (ya tiene created_at, lo demás se añade)
    ALTER TABLE public.cita
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- asignacion_rol — clave para auditoría: quién cambió el rol y cuándo.
    ALTER TABLE public.asignacion_rol
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

END $$;


-- ─── Triggers (uno por tabla) ──────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_consulta_medica ON consulta_medica;
CREATE TRIGGER trg_audit_consulta_medica
    BEFORE INSERT OR UPDATE ON consulta_medica
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS trg_audit_diagnostico ON diagnostico;
CREATE TRIGGER trg_audit_diagnostico
    BEFORE INSERT OR UPDATE ON diagnostico
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS trg_audit_sintoma ON sintoma;
CREATE TRIGGER trg_audit_sintoma
    BEFORE INSERT OR UPDATE ON sintoma
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS trg_audit_signos_vitales ON signos_vitales;
CREATE TRIGGER trg_audit_signos_vitales
    BEFORE INSERT OR UPDATE ON signos_vitales
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS trg_audit_orden_medica ON orden_medica;
CREATE TRIGGER trg_audit_orden_medica
    BEFORE INSERT OR UPDATE ON orden_medica
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS trg_audit_cita ON cita;
CREATE TRIGGER trg_audit_cita
    BEFORE INSERT OR UPDATE ON cita
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS trg_audit_asignacion_rol ON asignacion_rol;
CREATE TRIGGER trg_audit_asignacion_rol
    BEFORE INSERT OR UPDATE ON asignacion_rol
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();


-- ─── Backfill mínimo: dejar created_at coherente con datos previos ─────
-- Para las tablas con timestamps de dominio (fecha_consulta, fecha,
-- fecha_emision, etc.), usamos ese valor como aproximación al created_at
-- en filas históricas que quedaron NULL.
UPDATE consulta_medica
SET    created_at = COALESCE(created_at, fecha_consulta, NOW()),
       updated_at = COALESCE(updated_at, fecha_consulta, NOW())
WHERE  created_at IS NULL;

UPDATE diagnostico
SET    created_at = COALESCE(created_at, fecha, NOW()),
       updated_at = COALESCE(updated_at, fecha, NOW())
WHERE  created_at IS NULL;

UPDATE signos_vitales
SET    created_at = COALESCE(created_at, fecha_registro, NOW()),
       updated_at = COALESCE(updated_at, fecha_registro, NOW())
WHERE  created_at IS NULL;

UPDATE orden_medica
SET    created_at = COALESCE(created_at, fecha_emision, NOW()),
       updated_at = COALESCE(updated_at, fecha_emision, NOW())
WHERE  created_at IS NULL;

UPDATE asignacion_rol
SET    created_at = COALESCE(created_at, fecha_asignacion, NOW()),
       updated_at = COALESCE(updated_at, fecha_asignacion, NOW())
WHERE  created_at IS NULL;

UPDATE cita
SET    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE  updated_at IS NULL;


-- ─── Vista auxiliar: resolver UUID a nombre legible ───────────────────
-- Útil para mostrar "Editado por: Dr. María Gómez" en la UI sin tener
-- que hacer un JOIN manual cada vez.
DROP VIEW IF EXISTS vw_audit_usuarios CASCADE;
CREATE VIEW vw_audit_usuarios AS
SELECT
    u.auth_user_id                                    AS uuid,
    u.username,
    p.nombres,
    p.apellidos,
    (p.nombres || ' ' || p.apellidos)                 AS nombre_completo,
    r.nombre                                          AS rol_nombre
FROM usuario u
JOIN persona p ON p.id_persona = u.id_persona
LEFT JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
LEFT JOIN rol r ON r.id_rol = ar.id_rol;

GRANT SELECT ON vw_audit_usuarios TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. ¿Las columnas existen?
-- SELECT table_name, column_name
-- FROM information_schema.columns
-- WHERE column_name IN ('created_by','created_at','updated_by','updated_at')
--   AND table_schema = 'public'
-- ORDER BY table_name, column_name;
--
-- 2. ¿Los triggers están activos?
-- SELECT event_object_table, trigger_name
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE 'trg_audit_%'
-- ORDER BY event_object_table;
--
-- 3. Probar manualmente:
-- INSERT INTO cita (...) VALUES (...);
-- SELECT id_cita, created_by, created_at, updated_by, updated_at FROM cita ORDER BY id_cita DESC LIMIT 1;
