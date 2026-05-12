-- =====================================================================
-- MIGRACIÓN: Campos adicionales para consulta médica completa
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- ─── 1. Nuevos campos en consulta_medica ─────────────────────────────
ALTER TABLE consulta_medica
    ADD COLUMN IF NOT EXISTS enfermedad_actual          TEXT,
    ADD COLUMN IF NOT EXISTS revision_sistemas          TEXT,
    ADD COLUMN IF NOT EXISTS examenes_complementarios   TEXT,
    ADD COLUMN IF NOT EXISTS analisis_clinico           TEXT;

-- ─── 2. Campos de tipo y prioridad en diagnostico ────────────────────
ALTER TABLE diagnostico
    ADD COLUMN IF NOT EXISTS tipo_dx   VARCHAR(30) DEFAULT 'impresion'
        CHECK (tipo_dx IN ('impresion','confirmado_nuevo','confirmado_repetido')),
    ADD COLUMN IF NOT EXISTS prioridad SMALLINT DEFAULT 1
        CHECK (prioridad BETWEEN 1 AND 5);

-- ─── 3. Semilla: tipos de diagnóstico ────────────────────────────────
INSERT INTO tipo_diagnostico (nombre, descripcion) VALUES
    ('Presuntivo',           'Basado en síntomas, pendiente de confirmación'),
    ('Confirmado nuevo',     'Diagnóstico confirmado por primera vez'),
    ('Confirmado repetido',  'Diagnóstico ya conocido del paciente'),
    ('Diferencial',          'Diagnóstico que se debe descartar'),
    ('Comorbilidad',         'Condición coexistente no relacionada')
ON CONFLICT (nombre) DO NOTHING;

-- ─── 4. Actualizar vw_admin_estadisticas para incluir nuevos conteos ─
-- (opcional, ya contaba consulta_medica)

-- ─── Verificación ─────────────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'consulta_medica' ORDER BY ordinal_position;
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'diagnostico' ORDER BY ordinal_position;
