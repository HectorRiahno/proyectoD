-- =====================================================================
-- MIGRACIÓN: Soft-delete fase 2 — cerrar la cadena
--
-- Asegura que un registro soft-deleted NO aparezca en ningún listado,
-- dropdown ni vista funcional. Solo queda accesible desde la Papelera
-- para restaurar, y como referencia histórica (FK en citas/consultas
-- que ya existían).
--
-- Cambios:
--   1. mi_id_paciente / mi_id_medico filtran deleted_at IS NULL
--      → un médico soft-deleted pierde sus privilegios al instante.
--   2. vw_admin_pacientes / vw_admin_medicos excluyen deleted
--      → dropdowns para crear citas no muestran borrados.
--   3. vw_admin_citas mantiene citas (incluso de pacientes borrados,
--      para no perder historial) pero añade flags paciente_eliminado /
--      medico_eliminado para que la UI los marque visualmente.
--   4. vw_medico_* y vw_asistente_* excluyen deleted_at.
--   5. vw_admin_papelera trae nombre, documento, especialidad, etc.
--      en el resumen — para mostrar info útil al admin antes de restaurar.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.
-- =====================================================================


-- =====================================================================
-- 1. HELPERS — filtrar deleted_at IS NULL
-- =====================================================================
CREATE OR REPLACE FUNCTION mi_id_paciente()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT id_paciente
    FROM paciente
    WHERE id_persona = mi_id_persona()
      AND deleted_at IS NULL
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION mi_id_medico()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT id_medico
    FROM medico
    WHERE id_persona = mi_id_persona()
      AND deleted_at IS NULL
    LIMIT 1;
$$;


-- =====================================================================
-- 2. ADMIN: pacientes y médicos listados solo activos
-- =====================================================================
DROP VIEW IF EXISTS vw_admin_pacientes CASCADE;
CREATE VIEW vw_admin_pacientes AS
SELECT
    pa.id_paciente,
    pa.numero_historia,
    pa.tipo_sangre,
    pa.alergias,
    pa.contacto_emergencia,
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
LEFT JOIN cita c ON c.id_paciente = pa.id_paciente AND c.deleted_at IS NULL
WHERE pa.deleted_at IS NULL                            -- 🆕 oculta soft-deleted
GROUP BY pa.id_paciente, pe.id_persona;


DROP VIEW IF EXISTS vw_admin_medicos CASCADE;
CREATE VIEW vw_admin_medicos AS
SELECT
    m.id_medico,
    m.numero_licencia,
    m.especialidad,
    m.consultorio,
    m.anios_experiencia,
    m.activo,
    p.id_persona,
    p.documento,
    p.nombres,
    p.apellidos,
    (p.nombres || ' ' || p.apellidos)                                  AS nombre_completo,
    p.email,
    p.telefono,
    COUNT(c.id_cita)                                                   AS total_citas,
    COUNT(c.id_cita) FILTER (WHERE c.fecha_cita::date >= CURRENT_DATE) AS citas_proximas,
    COUNT(c.id_cita) FILTER (WHERE c.fecha_cita::date = CURRENT_DATE)  AS citas_hoy
FROM medico m
JOIN persona p ON p.id_persona = m.id_persona
LEFT JOIN cita c ON c.id_medico = m.id_medico AND c.deleted_at IS NULL
WHERE m.deleted_at IS NULL                            -- 🆕
GROUP BY m.id_medico, p.id_persona;


-- =====================================================================
-- 3. ADMIN CITAS: oculta citas borradas, MARCA con flags los pacientes/medicos borrados
--    (no filtra por paciente/medico borrado — conserva el histórico)
-- =====================================================================
DROP VIEW IF EXISTS vw_admin_citas CASCADE;
CREATE VIEW vw_admin_citas AS
SELECT
    c.id_cita,
    c.fecha_cita,
    c.fecha_cita::date                            AS fecha,
    c.fecha_cita::time                            AS hora,
    c.estado,
    c.motivo,
    c.observaciones,
    c.created_at,
    -- Paciente
    c.id_paciente,
    pa.numero_historia,
    (pp.nombres || ' ' || pp.apellidos)           AS paciente_nombre,
    pp.documento                                  AS paciente_documento,
    pp.telefono                                   AS paciente_telefono,
    pp.email                                      AS paciente_email,
    (pa.deleted_at IS NOT NULL)                   AS paciente_eliminado,  -- 🆕
    -- Médico
    c.id_medico,
    (mp.nombres || ' ' || mp.apellidos)           AS medico_nombre,
    m.especialidad                                AS medico_especialidad,
    m.consultorio                                 AS medico_consultorio,
    (m.deleted_at IS NOT NULL)                    AS medico_eliminado,    -- 🆕
    -- Tipo consulta
    c.id_tipo_consulta,
    tc.nombre                                     AS tipo_consulta_nombre
FROM cita c
LEFT JOIN paciente      pa ON pa.id_paciente     = c.id_paciente
LEFT JOIN persona       pp ON pp.id_persona      = pa.id_persona
LEFT JOIN medico        m  ON m.id_medico        = c.id_medico
LEFT JOIN persona       mp ON mp.id_persona      = m.id_persona
LEFT JOIN tipo_consulta tc ON tc.id_tipo_consulta = c.id_tipo_consulta
WHERE c.deleted_at IS NULL;                       -- 🆕 ocultar citas soft-deleted


-- =====================================================================
-- 4. MÉDICO — vistas filtran deleted_at
-- =====================================================================
DROP VIEW IF EXISTS vw_medico_mis_citas CASCADE;
CREATE VIEW vw_medico_mis_citas AS
SELECT
    c.id_cita,
    c.fecha_cita,
    c.fecha_cita::date                          AS fecha,
    c.fecha_cita::time                          AS hora,
    c.estado,
    c.motivo,
    c.observaciones,
    c.id_paciente,
    pa.numero_historia,
    (pp.nombres || ' ' || pp.apellidos)         AS paciente_nombre,
    pp.documento                                AS paciente_documento,
    pp.telefono                                 AS paciente_telefono,
    pp.email                                    AS paciente_email,
    EXTRACT(YEAR FROM AGE(pp.fecha_nacimiento))::INT AS paciente_edad,
    tc.nombre                                   AS tipo_consulta
FROM cita c
LEFT JOIN paciente      pa ON pa.id_paciente     = c.id_paciente
LEFT JOIN persona       pp ON pp.id_persona      = pa.id_persona
LEFT JOIN tipo_consulta tc ON tc.id_tipo_consulta = c.id_tipo_consulta
WHERE c.id_medico = mi_id_medico()
  AND c.deleted_at IS NULL                        -- 🆕
  AND (pa.deleted_at IS NULL OR pa.id_paciente IS NULL);   -- 🆕

DROP VIEW IF EXISTS vw_medico_agenda_hoy CASCADE;
CREATE VIEW vw_medico_agenda_hoy AS
SELECT * FROM vw_medico_mis_citas
WHERE fecha = CURRENT_DATE
ORDER BY hora ASC;

DROP VIEW IF EXISTS vw_medico_mis_pacientes CASCADE;
CREATE VIEW vw_medico_mis_pacientes AS
SELECT DISTINCT
    pa.id_paciente, pa.numero_historia, pa.tipo_sangre, pa.alergias,
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
JOIN cita    c  ON c.id_paciente = pa.id_paciente AND c.deleted_at IS NULL
WHERE c.id_medico = mi_id_medico()
  AND pa.deleted_at IS NULL;                        -- 🆕

DROP VIEW IF EXISTS vw_medico_consultas CASCADE;
CREATE VIEW vw_medico_consultas AS
SELECT
    cm.id_consulta, cm.id_cita, cm.fecha_consulta,
    cm.motivo_consulta, cm.enfermedad_actual, cm.revision_sistemas,
    cm.examen_fisico, cm.examenes_complementarios, cm.analisis_clinico,
    cm.impresion_diagnostica, cm.plan_tratamiento, cm.observaciones,
    cm.id_paciente,
    (pp.nombres || ' ' || pp.apellidos) AS paciente_nombre,
    pp.documento                        AS paciente_documento,
    pa.numero_historia
FROM consulta_medica cm
LEFT JOIN paciente pa ON pa.id_paciente = cm.id_paciente
LEFT JOIN persona  pp ON pp.id_persona  = pa.id_persona
WHERE cm.id_medico = mi_id_medico()
  AND cm.deleted_at IS NULL;                        -- 🆕


-- =====================================================================
-- 5. ASISTENTE — vistas filtran deleted_at
-- =====================================================================
DROP VIEW IF EXISTS vw_asistente_calendario CASCADE;
CREATE VIEW vw_asistente_calendario AS
SELECT
    c.id_cita, c.fecha_cita,
    c.fecha_cita::date                      AS fecha,
    c.fecha_cita::time                      AS hora,
    c.estado, c.motivo, c.id_paciente,
    (pp.nombres || ' ' || pp.apellidos)     AS paciente_nombre,
    pp.documento                            AS paciente_documento,
    pp.telefono                             AS paciente_telefono,
    c.id_medico,
    (mp.nombres || ' ' || mp.apellidos)     AS medico_nombre,
    m.especialidad                          AS medico_especialidad,
    m.consultorio                           AS medico_consultorio,
    tc.nombre                               AS tipo_consulta
FROM cita c
LEFT JOIN paciente pa  ON pa.id_paciente     = c.id_paciente
LEFT JOIN persona  pp  ON pp.id_persona      = pa.id_persona
LEFT JOIN medico   m   ON m.id_medico        = c.id_medico
LEFT JOIN persona  mp  ON mp.id_persona      = m.id_persona
LEFT JOIN tipo_consulta tc ON tc.id_tipo_consulta = c.id_tipo_consulta
WHERE c.fecha_cita >= CURRENT_DATE - INTERVAL '1 day'
  AND c.deleted_at IS NULL                          -- 🆕
ORDER BY c.fecha_cita ASC;

DROP VIEW IF EXISTS vw_asistente_citas_pendientes CASCADE;
CREATE VIEW vw_asistente_citas_pendientes AS
SELECT * FROM vw_asistente_calendario
WHERE estado IN ('programada','confirmada');

DROP VIEW IF EXISTS vw_asistente_pacientes CASCADE;
CREATE VIEW vw_asistente_pacientes AS
SELECT
    pa.id_paciente, pa.numero_historia,
    pp.documento,
    (pp.nombres || ' ' || pp.apellidos)              AS nombre_completo,
    pp.email, pp.telefono,
    EXTRACT(YEAR FROM AGE(pp.fecha_nacimiento))::INT AS edad,
    pa.contacto_emergencia
FROM paciente pa
JOIN persona pp ON pp.id_persona = pa.id_persona
WHERE pa.deleted_at IS NULL                          -- 🆕
ORDER BY pp.nombres ASC, pp.apellidos ASC;

DROP VIEW IF EXISTS vw_asistente_medicos_disponibles CASCADE;
CREATE VIEW vw_asistente_medicos_disponibles AS
SELECT
    m.id_medico, m.numero_licencia, m.especialidad, m.consultorio,
    (pp.nombres || ' ' || pp.apellidos)                         AS nombre_completo,
    pp.email, pp.telefono,
    COUNT(c.id_cita) FILTER (WHERE c.fecha_cita::date = CURRENT_DATE) AS citas_hoy
FROM medico m
JOIN persona pp ON pp.id_persona = m.id_persona
LEFT JOIN cita c ON c.id_medico = m.id_medico AND c.deleted_at IS NULL
WHERE m.activo = TRUE
  AND m.deleted_at IS NULL                           -- 🆕
GROUP BY m.id_medico, pp.id_persona
ORDER BY pp.nombres ASC;


-- =====================================================================
-- 6. PAPELERA — resumen enriquecido con nombres / documentos
-- =====================================================================
DROP VIEW IF EXISTS vw_admin_papelera CASCADE;
CREATE VIEW vw_admin_papelera AS
-- consulta_medica
SELECT
    'consulta_medica' AS tabla,
    cm.id_consulta::TEXT AS id_registro,
    cm.deleted_at,
    cm.deleted_by,
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

-- cita
SELECT
    'cita',
    c.id_cita::TEXT,
    c.deleted_at,
    c.deleted_by,
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

-- paciente
SELECT
    'paciente',
    pa.id_paciente::TEXT,
    pa.deleted_at,
    pa.deleted_by,
    jsonb_build_object(
        'nombre',          pe.nombres || ' ' || pe.apellidos,
        'documento',       pe.documento,
        'tipo_documento',  pe.tipo_documento,
        'numero_historia', pa.numero_historia,
        'email',           pe.email,
        'telefono',        pe.telefono,
        'tipo_sangre',     pa.tipo_sangre
    )
FROM paciente pa
JOIN persona pe ON pe.id_persona = pa.id_persona
WHERE pa.deleted_at IS NOT NULL

UNION ALL

-- medico
SELECT
    'medico',
    m.id_medico::TEXT,
    m.deleted_at,
    m.deleted_by,
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

ORDER BY 3 DESC;  -- deleted_at desc

GRANT SELECT ON vw_admin_papelera TO authenticated;


-- =====================================================================
-- GRANTS para todas las vistas re-creadas
-- =====================================================================
GRANT SELECT ON
    vw_admin_pacientes, vw_admin_medicos, vw_admin_citas,
    vw_medico_mis_citas, vw_medico_agenda_hoy, vw_medico_mis_pacientes, vw_medico_consultas,
    vw_asistente_calendario, vw_asistente_citas_pendientes,
    vw_asistente_pacientes, vw_asistente_medicos_disponibles
TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Borra un paciente con soft_delete y prueba que NO aparece en
--    vw_admin_pacientes:
--      SELECT public.soft_delete_paciente(42);
--      SELECT id_paciente, nombre_completo FROM vw_admin_pacientes WHERE id_paciente = 42;  -- 0 filas
--
-- 2. Confirma que la cita histórica del paciente borrado sigue presente
--    pero marcada como eliminado:
--      SELECT id_cita, paciente_nombre, paciente_eliminado FROM vw_admin_citas WHERE id_paciente = 42;
--
-- 3. Confirma que la papelera trae info útil:
--      SELECT * FROM vw_admin_papelera WHERE tabla = 'paciente' LIMIT 5;
