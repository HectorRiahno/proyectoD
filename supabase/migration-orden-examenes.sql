-- =====================================================================
-- MIGRACIÓN: Órdenes de exámenes paramédicos
--
-- Persiste las órdenes de exámenes que el médico solicita durante una
-- consulta. Cada orden:
--   • Está vinculada a una consulta_medica (1:N — una consulta puede
--     generar varias órdenes pero el modelo natural es 1:1 por consulta).
--   • Contiene un encabezado (indicaciones generales, fecha emisión,
--     número de orden, médico solicitante).
--   • Contiene N items (cada examen pedido: nombre + observaciones).
--
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- =====================================================================

-- ─── 1. Tabla orden_examen (cabecera) ────────────────────────────────
CREATE TABLE IF NOT EXISTS orden_examen (
    id_orden_examen   BIGSERIAL PRIMARY KEY,
    id_consulta       BIGINT NOT NULL
                        REFERENCES consulta_medica(id_consulta) ON DELETE CASCADE,
    id_paciente       BIGINT NOT NULL
                        REFERENCES paciente(id_paciente),
    id_medico         BIGINT NOT NULL
                        REFERENCES medico(id_medico),
    numero_orden      VARCHAR(40) UNIQUE,            -- ORD-XXXXXXXX (autogenerado)
    fecha_emision     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    indicaciones      TEXT,                          -- preparación general / urgencia
    -- Auditoría + soft delete (mismo patrón que el resto)
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by        UUID,
    updated_by        UUID,
    deleted_at        TIMESTAMPTZ,
    deleted_by        UUID
);

CREATE INDEX IF NOT EXISTS idx_orden_examen_consulta ON orden_examen(id_consulta);
CREATE INDEX IF NOT EXISTS idx_orden_examen_paciente ON orden_examen(id_paciente);
CREATE INDEX IF NOT EXISTS idx_orden_examen_medico   ON orden_examen(id_medico);
CREATE INDEX IF NOT EXISTS idx_orden_examen_active   ON orden_examen(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE orden_examen IS
    'Cabecera de una orden de exámenes paramédicos solicitada en una consulta.';

-- ─── 2. Tabla orden_examen_item (líneas) ──────────────────────────────
CREATE TABLE IF NOT EXISTS orden_examen_item (
    id_item           BIGSERIAL PRIMARY KEY,
    id_orden_examen   BIGINT NOT NULL
                        REFERENCES orden_examen(id_orden_examen) ON DELETE CASCADE,
    orden             SMALLINT NOT NULL DEFAULT 1,    -- posición en la orden (1, 2, 3...)
    nombre            VARCHAR(240) NOT NULL,           -- "Hemograma completo", "Glicemia"...
    observaciones     TEXT,                            -- preparación específica del item
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orden_examen_item_orden ON orden_examen_item(id_orden_examen);

COMMENT ON TABLE orden_examen_item IS
    'Cada examen individual solicitado dentro de una orden.';

-- ─── 3. Trigger: autogenerar numero_orden ─────────────────────────────
CREATE OR REPLACE FUNCTION generar_numero_orden_examen()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_orden IS NULL OR NEW.numero_orden = '' THEN
        NEW.numero_orden := 'ORD-' || LPAD(NEW.id_orden_examen::text, 8, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orden_examen_numero ON orden_examen;
CREATE TRIGGER trg_orden_examen_numero
    BEFORE INSERT ON orden_examen
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_orden_examen();

-- ─── 4. Trigger: updated_at automático ────────────────────────────────
CREATE OR REPLACE FUNCTION tocar_updated_at_orden_examen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    NEW.updated_by := auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orden_examen_updated ON orden_examen;
CREATE TRIGGER trg_orden_examen_updated
    BEFORE UPDATE ON orden_examen
    FOR EACH ROW
    EXECUTE FUNCTION tocar_updated_at_orden_examen();

-- ─── 5. RLS: orden_examen ─────────────────────────────────────────────
ALTER TABLE orden_examen ENABLE ROW LEVEL SECURITY;

-- Admin ve y modifica todo
DROP POLICY IF EXISTS p_orden_examen_admin_all ON orden_examen;
CREATE POLICY p_orden_examen_admin_all ON orden_examen
    FOR ALL TO authenticated
    USING (es_admin())
    WITH CHECK (es_admin());

-- Médico ve órdenes de SUS consultas o de pacientes que ha atendido
DROP POLICY IF EXISTS p_orden_examen_medico_select ON orden_examen;
CREATE POLICY p_orden_examen_medico_select ON orden_examen
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            id_medico = mi_id_medico()
            OR EXISTS (
                SELECT 1 FROM consulta_medica c
                WHERE c.id_paciente = orden_examen.id_paciente
                  AND c.id_medico   = mi_id_medico()
                  AND c.deleted_at IS NULL
            )
        )
    );

-- Médico puede crear órdenes en sus propias consultas
DROP POLICY IF EXISTS p_orden_examen_medico_insert ON orden_examen;
CREATE POLICY p_orden_examen_medico_insert ON orden_examen
    FOR INSERT TO authenticated
    WITH CHECK (
        id_medico = mi_id_medico()
        AND EXISTS (
            SELECT 1 FROM consulta_medica c
            WHERE c.id_consulta = orden_examen.id_consulta
              AND c.id_medico   = mi_id_medico()
              AND c.deleted_at IS NULL
        )
    );

-- Médico puede actualizar/borrar las órdenes que él creó
DROP POLICY IF EXISTS p_orden_examen_medico_update ON orden_examen;
CREATE POLICY p_orden_examen_medico_update ON orden_examen
    FOR UPDATE TO authenticated
    USING (id_medico = mi_id_medico())
    WITH CHECK (id_medico = mi_id_medico());

DROP POLICY IF EXISTS p_orden_examen_medico_delete ON orden_examen;
CREATE POLICY p_orden_examen_medico_delete ON orden_examen
    FOR DELETE TO authenticated
    USING (id_medico = mi_id_medico());

-- Paciente ve SUS órdenes (no las puede modificar)
DROP POLICY IF EXISTS p_orden_examen_paciente_select ON orden_examen;
CREATE POLICY p_orden_examen_paciente_select ON orden_examen
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND id_paciente = mi_id_paciente()
    );

-- ─── 6. RLS: orden_examen_item (hereda por id_orden_examen) ───────────
ALTER TABLE orden_examen_item ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_orden_item_admin_all ON orden_examen_item;
CREATE POLICY p_orden_item_admin_all ON orden_examen_item
    FOR ALL TO authenticated
    USING (es_admin())
    WITH CHECK (es_admin());

-- SELECT: si puede ver la orden padre, puede ver el item
DROP POLICY IF EXISTS p_orden_item_select ON orden_examen_item;
CREATE POLICY p_orden_item_select ON orden_examen_item
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orden_examen o
            WHERE o.id_orden_examen = orden_examen_item.id_orden_examen
              AND o.deleted_at IS NULL
              AND (
                  o.id_medico = mi_id_medico()
                  OR o.id_paciente = mi_id_paciente()
                  OR EXISTS (
                      SELECT 1 FROM consulta_medica c
                      WHERE c.id_paciente = o.id_paciente
                        AND c.id_medico   = mi_id_medico()
                        AND c.deleted_at IS NULL
                  )
              )
        )
    );

-- INSERT/UPDATE/DELETE: si el médico es dueño de la orden padre
DROP POLICY IF EXISTS p_orden_item_medico_write ON orden_examen_item;
CREATE POLICY p_orden_item_medico_write ON orden_examen_item
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orden_examen o
            WHERE o.id_orden_examen = orden_examen_item.id_orden_examen
              AND o.id_medico = mi_id_medico()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orden_examen o
            WHERE o.id_orden_examen = orden_examen_item.id_orden_examen
              AND o.id_medico = mi_id_medico()
        )
    );

-- ─── 7. Vista del médico: órdenes con items ──────────────────────────
DROP VIEW IF EXISTS vw_medico_ordenes_examen CASCADE;
CREATE VIEW vw_medico_ordenes_examen AS
SELECT
    o.id_orden_examen,
    o.id_consulta,
    o.id_paciente,
    o.id_medico,
    o.numero_orden,
    o.fecha_emision,
    o.indicaciones,
    o.created_at,
    o.updated_at,
    -- Pre-agregado JSON de los items para evitar N+1 desde el frontend
    (
        SELECT COALESCE(json_agg(json_build_object(
            'id_item',       it.id_item,
            'orden',         it.orden,
            'nombre',        it.nombre,
            'observaciones', it.observaciones
        ) ORDER BY it.orden, it.id_item), '[]'::json)
        FROM orden_examen_item it
        WHERE it.id_orden_examen = o.id_orden_examen
    ) AS items,
    -- Conteo rápido para badges
    (
        SELECT COUNT(*)::int
        FROM orden_examen_item it
        WHERE it.id_orden_examen = o.id_orden_examen
    ) AS n_items
FROM orden_examen o
WHERE o.deleted_at IS NULL;

-- ─── 8. Vista del paciente: sus propias órdenes ──────────────────────
DROP VIEW IF EXISTS vw_paciente_mis_ordenes_examen CASCADE;
CREATE VIEW vw_paciente_mis_ordenes_examen AS
SELECT
    o.id_orden_examen,
    o.id_consulta,
    o.numero_orden,
    o.fecha_emision,
    o.indicaciones,
    (mp.nombres || ' ' || mp.apellidos)  AS medico_nombre,
    m.especialidad                       AS medico_especialidad,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'id_item',       it.id_item,
            'orden',         it.orden,
            'nombre',        it.nombre,
            'observaciones', it.observaciones
        ) ORDER BY it.orden, it.id_item), '[]'::json)
        FROM orden_examen_item it
        WHERE it.id_orden_examen = o.id_orden_examen
    ) AS items
FROM orden_examen o
LEFT JOIN medico  m   ON m.id_medico    = o.id_medico
LEFT JOIN persona mp  ON mp.id_persona  = m.id_persona
WHERE o.deleted_at IS NULL
  AND o.id_paciente = mi_id_paciente()
ORDER BY o.fecha_emision DESC;

-- ─── 9. Permisos a las vistas ────────────────────────────────────────
GRANT SELECT ON vw_medico_ordenes_examen      TO authenticated;
GRANT SELECT ON vw_paciente_mis_ordenes_examen TO authenticated;
