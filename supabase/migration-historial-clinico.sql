-- =====================================================================
-- MIGRACIÓN: Mover tipo_sangre / alergias / enfermedades_cronicas
-- de la tabla `paciente` a una nueva tabla `historial_clinico`.
--
-- Razón: estos datos son información clínica que evoluciona con el tiempo
-- y debe pertenecer al historial del paciente, no a su registro
-- administrativo. La tabla `paciente` queda solo con datos de identidad
-- y emergencia.
--
-- Cambios:
--   1. Crear tabla historial_clinico (1:1 con paciente).
--   2. Backfill desde paciente.
--   3. Audit columns + triggers + RLS.
--   4. RPC upsert_historial_clinico para edición desde el frontend.
--   5. Actualizar vistas para que sigan exponiendo los campos vía JOIN
--      (transparente para el código que solo lee).
--   6. Drop columnas de paciente.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.
-- Pre-requisitos: migration-audit-columns.sql, migration-audit-log.sql.
-- =====================================================================


-- =====================================================================
-- 1. Tabla historial_clinico
-- =====================================================================
CREATE TABLE IF NOT EXISTS historial_clinico (
    id_historial              BIGSERIAL PRIMARY KEY,
    id_paciente               BIGINT UNIQUE NOT NULL REFERENCES paciente(id_paciente) ON DELETE CASCADE,
    -- Datos básicos
    tipo_sangre               VARCHAR(5),
    alergias                  TEXT,
    enfermedades_cronicas     TEXT,
    -- Antecedentes ampliados (campos extra que estaban "implícitos" en las consultas)
    antecedentes_familiares   TEXT,
    antecedentes_quirurgicos  TEXT,
    medicamentos_permanentes  TEXT,
    habitos                   TEXT,        -- tabaquismo, alcohol, ejercicio
    notas_generales           TEXT,
    -- Audit (los rellena set_audit_fields)
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    created_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_by                UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_historial_paciente ON historial_clinico(id_paciente);


-- =====================================================================
-- 2. BACKFILL desde paciente (solo si las columnas aún existen)
-- =====================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'paciente'
          AND column_name = 'tipo_sangre'
    ) THEN
        EXECUTE $sql$
            INSERT INTO historial_clinico (id_paciente, tipo_sangre, alergias, enfermedades_cronicas)
            SELECT id_paciente, tipo_sangre, alergias, enfermedades_cronicas
            FROM paciente
            WHERE tipo_sangre IS NOT NULL
               OR alergias IS NOT NULL
               OR enfermedades_cronicas IS NOT NULL
            ON CONFLICT (id_paciente) DO UPDATE
                SET tipo_sangre           = COALESCE(historial_clinico.tipo_sangre, EXCLUDED.tipo_sangre),
                    alergias              = COALESCE(historial_clinico.alergias, EXCLUDED.alergias),
                    enfermedades_cronicas = COALESCE(historial_clinico.enfermedades_cronicas, EXCLUDED.enfermedades_cronicas);
        $sql$;
    END IF;
END $$;


-- =====================================================================
-- 3. Audit triggers
-- =====================================================================
DROP TRIGGER IF EXISTS trg_audit_historial_clinico ON historial_clinico;
CREATE TRIGGER trg_audit_historial_clinico
    BEFORE INSERT OR UPDATE ON historial_clinico
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS trg_audit_log_historial_clinico ON historial_clinico;
CREATE TRIGGER trg_audit_log_historial_clinico
    AFTER INSERT OR UPDATE OR DELETE ON historial_clinico
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_historial');


-- =====================================================================
-- 4. RLS
-- =====================================================================
ALTER TABLE historial_clinico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historial_select" ON historial_clinico;
CREATE POLICY "historial_select" ON historial_clinico FOR SELECT TO authenticated
    USING (
        id_paciente = mi_id_paciente()       -- el paciente ve el suyo
        OR mi_id_medico() IS NOT NULL         -- cualquier médico
        OR es_admin_o_asistente()             -- staff
    );

-- Escritura: paciente NO puede editar su historial (solo lo lee).
-- Solo médico/admin/asistente pueden modificar.
DROP POLICY IF EXISTS "historial_write" ON historial_clinico;
CREATE POLICY "historial_write" ON historial_clinico FOR ALL TO authenticated
    USING (
        mi_id_medico() IS NOT NULL OR es_admin_o_asistente()
    )
    WITH CHECK (
        mi_id_medico() IS NOT NULL OR es_admin_o_asistente()
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON historial_clinico TO authenticated;


-- =====================================================================
-- 5. RPC upsert_historial_clinico
-- =====================================================================
CREATE OR REPLACE FUNCTION public.upsert_historial_clinico(
    p_id_paciente              BIGINT,
    p_tipo_sangre              VARCHAR DEFAULT NULL,
    p_alergias                 TEXT    DEFAULT NULL,
    p_enfermedades_cronicas    TEXT    DEFAULT NULL,
    p_antecedentes_familiares  TEXT    DEFAULT NULL,
    p_antecedentes_quirurgicos TEXT    DEFAULT NULL,
    p_medicamentos_permanentes TEXT    DEFAULT NULL,
    p_habitos                  TEXT    DEFAULT NULL,
    p_notas_generales          TEXT    DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_id BIGINT;
BEGIN
    INSERT INTO historial_clinico (
        id_paciente, tipo_sangre, alergias, enfermedades_cronicas,
        antecedentes_familiares, antecedentes_quirurgicos,
        medicamentos_permanentes, habitos, notas_generales
    ) VALUES (
        p_id_paciente, p_tipo_sangre, p_alergias, p_enfermedades_cronicas,
        p_antecedentes_familiares, p_antecedentes_quirurgicos,
        p_medicamentos_permanentes, p_habitos, p_notas_generales
    )
    ON CONFLICT (id_paciente) DO UPDATE
        SET tipo_sangre              = EXCLUDED.tipo_sangre,
            alergias                 = EXCLUDED.alergias,
            enfermedades_cronicas    = EXCLUDED.enfermedades_cronicas,
            antecedentes_familiares  = EXCLUDED.antecedentes_familiares,
            antecedentes_quirurgicos = EXCLUDED.antecedentes_quirurgicos,
            medicamentos_permanentes = EXCLUDED.medicamentos_permanentes,
            habitos                  = EXCLUDED.habitos,
            notas_generales          = EXCLUDED.notas_generales
    RETURNING id_historial INTO v_id;

    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_historial_clinico TO authenticated;


-- =====================================================================
-- 6. Actualizar vistas (mantienen los nombres tipo_sangre/alergias/etc.
--    para no romper el frontend de lectura)
-- =====================================================================

-- ─── vw_admin_pacientes ──────────────────────────────────────────────
DROP VIEW IF EXISTS vw_admin_pacientes CASCADE;
CREATE VIEW vw_admin_pacientes AS
SELECT
    pa.id_paciente,
    pa.numero_historia,
    h.tipo_sangre,
    h.alergias,
    h.enfermedades_cronicas,
    pa.contacto_emergencia,
    pa.telefono_emergencia,
    pa.ocupacion,
    pa.estado_civil,
    pe.id_persona,
    pe.documento,
    pe.tipo_documento,
    pe.nombres,
    pe.apellidos,
    (pe.nombres || ' ' || pe.apellidos)                              AS nombre_completo,
    pe.fecha_nacimiento,
    EXTRACT(YEAR FROM AGE(pe.fecha_nacimiento))::INT                 AS edad,
    pe.genero,
    pe.email,
    pe.telefono,
    pe.direccion,
    COUNT(c.id_cita)                                                 AS total_citas,
    MAX(c.fecha_cita) FILTER (WHERE c.estado = 'completada')         AS ultima_visita
FROM paciente pa
JOIN persona pe ON pe.id_persona = pa.id_persona
LEFT JOIN historial_clinico h ON h.id_paciente = pa.id_paciente
LEFT JOIN cita c ON c.id_paciente = pa.id_paciente AND c.deleted_at IS NULL
WHERE pa.deleted_at IS NULL
GROUP BY pa.id_paciente, pe.id_persona, h.tipo_sangre, h.alergias, h.enfermedades_cronicas;


-- ─── vw_medico_mis_pacientes ─────────────────────────────────────────
DROP VIEW IF EXISTS vw_medico_mis_pacientes CASCADE;
CREATE VIEW vw_medico_mis_pacientes AS
SELECT DISTINCT
    pa.id_paciente, pa.numero_historia,
    h.tipo_sangre, h.alergias,
    pa.contacto_emergencia, pa.ocupacion, pa.estado_civil,
    pp.documento, pp.nombres, pp.apellidos,
    (pp.nombres || ' ' || pp.apellidos)              AS nombre_completo,
    pp.email, pp.telefono, pp.fecha_nacimiento,
    EXTRACT(YEAR FROM AGE(pp.fecha_nacimiento))::INT AS edad,
    (SELECT MAX(c2.fecha_cita) FROM cita c2
       WHERE c2.id_paciente = pa.id_paciente
         AND c2.id_medico   = mi_id_medico()
         AND c2.deleted_at IS NULL
    ) AS ultima_cita_conmigo
FROM paciente pa
JOIN persona pp ON pp.id_persona = pa.id_persona
LEFT JOIN historial_clinico h ON h.id_paciente = pa.id_paciente
JOIN cita c ON c.id_paciente = pa.id_paciente AND c.deleted_at IS NULL
WHERE c.id_medico = mi_id_medico()
  AND pa.deleted_at IS NULL;


-- ─── vw_paciente_mi_perfil ───────────────────────────────────────────
DROP VIEW IF EXISTS vw_paciente_mi_perfil CASCADE;
CREATE VIEW vw_paciente_mi_perfil AS
SELECT
    pa.id_paciente,
    pa.numero_historia,
    h.tipo_sangre,
    h.alergias,
    h.enfermedades_cronicas,
    pa.contacto_emergencia,
    pa.ocupacion,
    pa.estado_civil,
    pp.documento, pp.tipo_documento, pp.nombres, pp.apellidos,
    (pp.nombres || ' ' || pp.apellidos)              AS nombre_completo,
    pp.fecha_nacimiento,
    EXTRACT(YEAR FROM AGE(pp.fecha_nacimiento))::INT AS edad,
    pp.genero, pp.email, pp.telefono, pp.direccion
FROM paciente pa
JOIN persona pp ON pp.id_persona = pa.id_persona
LEFT JOIN historial_clinico h ON h.id_paciente = pa.id_paciente
WHERE pa.id_paciente = mi_id_paciente();


-- ─── vw_admin_papelera (resumen del paciente) ─────────────────────────
DROP VIEW IF EXISTS vw_admin_papelera CASCADE;
CREATE VIEW vw_admin_papelera AS
SELECT
    'consulta_medica' AS tabla,
    cm.id_consulta::TEXT AS id_registro,
    cm.deleted_at, cm.deleted_by,
    jsonb_build_object(
        'paciente',  COALESCE(pe.nombres || ' ' || pe.apellidos, '—'),
        'documento', pe.documento,
        'motivo',    cm.motivo_consulta,
        'fecha',     cm.fecha_consulta,
        'dx',        cm.impresion_diagnostica
    ) AS resumen
FROM consulta_medica cm
LEFT JOIN paciente pa ON pa.id_paciente = cm.id_paciente
LEFT JOIN persona  pe ON pe.id_persona  = pa.id_persona
WHERE cm.deleted_at IS NOT NULL

UNION ALL

SELECT
    'cita', c.id_cita::TEXT, c.deleted_at, c.deleted_by,
    jsonb_build_object(
        'paciente',  COALESCE(pe.nombres || ' ' || pe.apellidos, '—'),
        'documento', pe.documento,
        'medico',    COALESCE(mp.nombres || ' ' || mp.apellidos, '—'),
        'fecha',     c.fecha_cita,
        'estado',    c.estado,
        'motivo',    c.motivo
    )
FROM cita c
LEFT JOIN paciente pa ON pa.id_paciente = c.id_paciente
LEFT JOIN persona  pe ON pe.id_persona  = pa.id_persona
LEFT JOIN medico   m  ON m.id_medico    = c.id_medico
LEFT JOIN persona  mp ON mp.id_persona  = m.id_persona
WHERE c.deleted_at IS NOT NULL

UNION ALL

SELECT
    'paciente', pa.id_paciente::TEXT, pa.deleted_at, pa.deleted_by,
    jsonb_build_object(
        'nombre',          pe.nombres || ' ' || pe.apellidos,
        'documento',       pe.documento,
        'tipo_documento',  pe.tipo_documento,
        'numero_historia', pa.numero_historia,
        'email',           pe.email,
        'telefono',        pe.telefono,
        'tipo_sangre',     h.tipo_sangre
    )
FROM paciente pa
JOIN persona pe ON pe.id_persona = pa.id_persona
LEFT JOIN historial_clinico h ON h.id_paciente = pa.id_paciente
WHERE pa.deleted_at IS NOT NULL

UNION ALL

SELECT
    'medico', m.id_medico::TEXT, m.deleted_at, m.deleted_by,
    jsonb_build_object(
        'nombre',          pe.nombres || ' ' || pe.apellidos,
        'documento',       pe.documento,
        'numero_licencia', m.numero_licencia,
        'especialidad',    m.especialidad,
        'consultorio',     m.consultorio,
        'email',           pe.email
    )
FROM medico m
JOIN persona pe ON pe.id_persona = m.id_persona
WHERE m.deleted_at IS NOT NULL

ORDER BY 3 DESC;


-- ─── Grants para todas las vistas re-creadas ─────────────────────────
GRANT SELECT ON vw_admin_pacientes, vw_medico_mis_pacientes,
                vw_paciente_mi_perfil, vw_admin_papelera
TO authenticated;


-- =====================================================================
-- 7. Drop columnas de paciente (ahora viven en historial_clinico)
-- =====================================================================
ALTER TABLE paciente
    DROP COLUMN IF EXISTS tipo_sangre,
    DROP COLUMN IF EXISTS alergias,
    DROP COLUMN IF EXISTS enfermedades_cronicas;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. La tabla paciente ya no tiene esas columnas:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'paciente' ORDER BY ordinal_position;
--
-- 2. Los datos están en historial_clinico:
--    SELECT id_paciente, tipo_sangre, alergias, enfermedades_cronicas
--    FROM historial_clinico ORDER BY id_paciente;
--
-- 3. Las vistas siguen exponiendo los campos via JOIN:
--    SELECT id_paciente, nombre_completo, tipo_sangre, alergias
--    FROM vw_admin_pacientes LIMIT 5;
