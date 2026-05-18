-- =====================================================================
-- MIGRACIÓN: Persistencia COMPLETA del modal de consulta médica
--
-- Ejecutar en Supabase SQL Editor.
-- Es idempotente: se puede correr varias veces sin romper nada.
--
-- Cubre todo lo que envía src/features/medico/pages/Consultas.jsx
-- (ModalCrear → tablas consulta_medica, diagnostico, signos_vitales)
-- y reconstruye las vistas para que el médico/paciente puedan leer
-- los campos al volver a abrir la consulta.
-- =====================================================================

-- ─── 1. Columnas adicionales en consulta_medica ──────────────────────
ALTER TABLE consulta_medica
    ADD COLUMN IF NOT EXISTS enfermedad_actual        TEXT,
    ADD COLUMN IF NOT EXISTS revision_sistemas        TEXT,
    ADD COLUMN IF NOT EXISTS examenes_complementarios TEXT,
    ADD COLUMN IF NOT EXISTS analisis_clinico         TEXT;

-- ─── 2. Columnas adicionales en diagnostico ──────────────────────────
ALTER TABLE diagnostico
    ADD COLUMN IF NOT EXISTS tipo_dx   VARCHAR(30) DEFAULT 'impresion'
        CHECK (tipo_dx IN ('impresion','confirmado_nuevo','confirmado_repetido')),
    ADD COLUMN IF NOT EXISTS prioridad SMALLINT DEFAULT 1
        CHECK (prioridad BETWEEN 1 AND 5);

-- ─── 3. Enlazar signos_vitales con la consulta y el médico ───────────
-- Permite recuperar los signos registrados desde el modal de consulta.
ALTER TABLE signos_vitales
    ADD COLUMN IF NOT EXISTS id_consulta BIGINT
        REFERENCES consulta_medica(id_consulta) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS id_medico   BIGINT
        REFERENCES medico(id_medico);

CREATE INDEX IF NOT EXISTS idx_signos_consulta ON signos_vitales(id_consulta);
CREATE INDEX IF NOT EXISTS idx_signos_medico   ON signos_vitales(id_medico);

-- ─── 4. Semilla: tipos de diagnóstico ────────────────────────────────
INSERT INTO tipo_diagnostico (nombre, descripcion) VALUES
    ('Presuntivo',           'Basado en síntomas, pendiente de confirmación'),
    ('Confirmado nuevo',     'Diagnóstico confirmado por primera vez'),
    ('Confirmado repetido',  'Diagnóstico ya conocido del paciente'),
    ('Diferencial',          'Diagnóstico que se debe descartar'),
    ('Comorbilidad',         'Condición coexistente no relacionada')
ON CONFLICT (nombre) DO NOTHING;

-- ─── 5. Vista del médico: incluir TODOS los campos del modal ─────────
DROP VIEW IF EXISTS vw_medico_consultas CASCADE;
CREATE VIEW vw_medico_consultas AS
SELECT
    cm.id_consulta,
    cm.id_cita,
    cm.fecha_consulta,
    cm.motivo_consulta,
    cm.enfermedad_actual,
    cm.revision_sistemas,
    cm.examen_fisico,
    cm.examenes_complementarios,
    cm.analisis_clinico,
    cm.impresion_diagnostica,
    cm.plan_tratamiento,
    cm.observaciones,
    cm.id_paciente,
    (pp.nombres || ' ' || pp.apellidos) AS paciente_nombre,
    pp.documento                        AS paciente_documento,
    pa.numero_historia
FROM consulta_medica cm
LEFT JOIN paciente pa ON pa.id_paciente = cm.id_paciente
LEFT JOIN persona  pp ON pp.id_persona  = pa.id_persona
WHERE cm.id_medico = mi_id_medico();

GRANT SELECT ON vw_medico_consultas TO authenticated;

-- ─── 6. Vista del paciente: historial con todos los campos ───────────
DROP VIEW IF EXISTS vw_paciente_mi_historial CASCADE;
CREATE VIEW vw_paciente_mi_historial AS
SELECT
    cm.id_consulta,
    cm.fecha_consulta,
    cm.motivo_consulta,
    cm.enfermedad_actual,
    cm.revision_sistemas,
    cm.examen_fisico,
    cm.examenes_complementarios,
    cm.analisis_clinico,
    cm.impresion_diagnostica,
    cm.plan_tratamiento,
    cm.observaciones,
    cm.id_medico,
    (mp.nombres || ' ' || mp.apellidos) AS medico_nombre,
    me.especialidad                     AS medico_especialidad
FROM consulta_medica cm
LEFT JOIN medico  me ON me.id_medico  = cm.id_medico
LEFT JOIN persona mp ON mp.id_persona = me.id_persona
WHERE cm.id_paciente = mi_id_paciente()
ORDER BY cm.fecha_consulta DESC;

GRANT SELECT ON vw_paciente_mi_historial TO authenticated;

-- ─── 7. Verificación rápida ──────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'consulta_medica' ORDER BY ordinal_position;
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'diagnostico' ORDER BY ordinal_position;
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'signos_vitales' ORDER BY ordinal_position;
