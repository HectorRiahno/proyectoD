-- =====================================================================
-- MIGRACIÓN: Tipos de cita agendables — sólo "Consulta general" y "Control"
--
-- `tipo_consulta` tiene más filas ('General', 'Urgencia', 'Especialista',
-- 'Revisión de exámenes', 'Toma de exámenes'...) que NO se pueden borrar:
-- hay citas antiguas que las referencian y Facturación usa el mismo
-- catálogo para armar líneas de factura. Por eso, en vez de borrar, se
-- marca cuáles se pueden usar al AGENDAR:
--
--   1. Columna tipo_consulta.agendable (por defecto false).
--   2. Sólo 'Consulta general' y 'Control' quedan agendables (se crean si
--      no existen).
--   3. Trigger en `cita`: al crear una cita, o al cambiarle el tipo, el
--      tipo es obligatorio y debe ser agendable. Aplica a las RPCs
--      (fn_agendar_cita, fn_agendar_mi_cita, fn_editar_cita) y a cualquier
--      escritura directa. Las citas antiguas no se tocan: editarlas sin
--      cambiarles el tipo sigue funcionando.
--
-- Las operaciones sin usuario final (service_role, SQL editor) no se
-- validan, para no romper importaciones ni el seed.
--
-- Transaccional e idempotente.
-- =====================================================================

BEGIN;

-- ─── 1. Columna ───────────────────────────────────────────────────────
ALTER TABLE tipo_consulta
    ADD COLUMN IF NOT EXISTS agendable BOOLEAN NOT NULL DEFAULT FALSE;


-- ─── 2. Los dos tipos agendables ─────────────────────────────────────
INSERT INTO tipo_consulta (nombre, descripcion, duracion_min, costo) VALUES
    ('Consulta general', 'Atención médica general',              30, 60000),
    ('Control',          'Consulta de seguimiento o control',    20, 35000)
ON CONFLICT (nombre) DO NOTHING;     -- si ya existen se respetan duración y costo

UPDATE tipo_consulta
   SET agendable = (nombre IN ('Consulta general', 'Control'));


-- ─── 3. Regla en `cita` ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_cita_tipo_agendable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NEW;                       -- service_role / SQL editor / seed
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.id_tipo_consulta IS NOT DISTINCT FROM OLD.id_tipo_consulta THEN
        RETURN NEW;                       -- no cambió el tipo (citas antiguas)
    END IF;

    IF NEW.id_tipo_consulta IS NULL THEN
        RAISE EXCEPTION 'Elige el tipo de cita: Consulta general o Control.' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM tipo_consulta
                    WHERE id_tipo_consulta = NEW.id_tipo_consulta AND agendable) THEN
        RAISE EXCEPTION 'Ese tipo de cita no se puede agendar. Elige Consulta general o Control.'
            USING ERRCODE = '22023';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_cita_tipo_agendable() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cita_tipo_agendable ON cita;
CREATE TRIGGER trg_cita_tipo_agendable
    BEFORE INSERT OR UPDATE OF id_tipo_consulta ON cita
    FOR EACH ROW EXECUTE FUNCTION fn_cita_tipo_agendable();

COMMIT;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT nombre, duracion_min, costo, agendable FROM tipo_consulta ORDER BY agendable DESC, nombre;
--   → sólo 'Consulta general' y 'Control' con agendable = true
--
-- Para cambiar duración o costo de un tipo:
-- UPDATE tipo_consulta SET duracion_min = 30, costo = 40000 WHERE nombre = 'Control';
-- =====================================================================
