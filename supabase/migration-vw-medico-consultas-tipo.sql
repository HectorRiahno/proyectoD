-- =====================================================================
-- MIGRACIÓN: vw_medico_consultas expone tipo_consulta
--
-- Contexto: la página /medico/consultas necesita saber el tipo de cada
-- consulta para mostrar el botón "Adjuntar radiografías / PDF" solo
-- cuando la consulta es de tipo "examen" (Toma de exámenes, Revisión de
-- exámenes, etc.).
--
-- consulta_medica NO tiene id_tipo_consulta directamente — vive en cita.
-- Esta migración JOINEA cita + tipo_consulta para exponer el nombre.
-- Si la consulta no tiene cita vinculada, tipo_consulta_nombre = NULL
-- (el botón Adjuntar no aparece, el médico igual puede usar Editar).
--
-- Idempotente. Compatible con migration-rls-security.sql (helper
-- mi_id_medico ya existente).
-- =====================================================================

DROP VIEW IF EXISTS vw_medico_consultas CASCADE;
CREATE VIEW vw_medico_consultas AS
SELECT
    cm.id_consulta,
    cm.id_cita,
    cm.fecha_consulta,
    cm.motivo_consulta,
    cm.examen_fisico,
    cm.impresion_diagnostica,
    cm.plan_tratamiento,
    cm.observaciones,
    cm.id_paciente,
    (pp.nombres || ' ' || pp.apellidos)   AS paciente_nombre,
    pp.documento                          AS paciente_documento,
    pa.numero_historia,
    -- Nuevos: tipo de consulta a través de la cita vinculada
    c.id_tipo_consulta,
    tc.nombre                             AS tipo_consulta_nombre
FROM consulta_medica cm
LEFT JOIN paciente       pa ON pa.id_paciente       = cm.id_paciente
LEFT JOIN persona        pp ON pp.id_persona        = pa.id_persona
LEFT JOIN cita           c  ON c.id_cita            = cm.id_cita
LEFT JOIN tipo_consulta  tc ON tc.id_tipo_consulta  = c.id_tipo_consulta
WHERE cm.id_medico = mi_id_medico();

GRANT SELECT ON vw_medico_consultas TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- Como médico:
--   SELECT id_consulta, paciente_nombre, tipo_consulta_nombre
--     FROM vw_medico_consultas LIMIT 10;
-- Las consultas vinculadas a citas con tipo="Toma de exámenes" o
-- "Revisión de exámenes" deben mostrar ese nombre. Las consultas
-- huérfanas (sin cita) muestran NULL.
