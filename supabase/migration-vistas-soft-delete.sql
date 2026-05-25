-- =====================================================================
-- MIGRACIÓN: Vistas admin filtran soft-deleted
--
-- Problema: cuando un usuario cambiaba de rol (ej: cliente → médico),
-- la fila vieja de paciente/medico se marcaba con deleted_at, pero las
-- vistas vw_admin_pacientes / vw_admin_medicos no filtraban deleted_at,
-- así que el usuario seguía apareciendo en ambos listados.
--
-- Esta migración recrea ambas vistas con WHERE ... deleted_at IS NULL.
--
-- IMPORTANTE — coherencia con otras migraciones:
--   • Reemplaza la definición de vw_admin_pacientes / vw_admin_medicos
--     que existía en views.sql Y en migration-soft-delete-v2.sql.
--   • migration-soft-delete-v2.sql es INCOMPATIBLE con
--     migration-historial-clinico.sql (referencia pa.tipo_sangre /
--     pa.alergias que ya no existen). Por eso aquí usamos
--     LEFT JOIN historial_clinico, igual que migration-historial-clinico.sql.
--   • Solo toca estas dos vistas — el resto de soft-delete-v2 (RLS,
--     vw_admin_citas con flags, helpers mi_id_*) sigue siendo válido si
--     ya lo ejecutaste sin la sección de pacientes.
--
-- Idempotente. Ejecutar DESPUÉS de migration-soft-delete.sql y de
-- migration-historial-clinico.sql.
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


-- ─── vw_admin_medicos ────────────────────────────────────────────────
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
WHERE m.deleted_at IS NULL
GROUP BY m.id_medico, p.id_persona;


-- ─── Permisos (DROP VIEW los pierde) ─────────────────────────────────
GRANT SELECT ON vw_admin_medicos   TO authenticated;
GRANT SELECT ON vw_admin_pacientes TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Verificar que filtran:
--    SELECT id_medico FROM vw_admin_medicos
--    WHERE id_medico IN (SELECT id_medico FROM medico WHERE deleted_at IS NOT NULL);
--    -- debe devolver 0 filas.
--
-- 2. Limpieza de duplicados ya existentes (usuarios que quedaron en
--    ambas tablas por el bug viejo). Inspeccionar primero:
--    SELECT p.id_persona, p.documento, p.nombres, p.apellidos,
--           r.nombre AS rol_actual,
--           CASE WHEN m.id_medico IS NOT NULL THEN 'sí' ELSE 'no' END AS tiene_medico,
--           CASE WHEN pa.id_paciente IS NOT NULL THEN 'sí' ELSE 'no' END AS tiene_paciente
--      FROM persona p
--      JOIN usuario u ON u.id_persona = p.id_persona
--      LEFT JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
--      LEFT JOIN rol r ON r.id_rol = ar.id_rol
--      LEFT JOIN medico m ON m.id_persona = p.id_persona AND m.deleted_at IS NULL
--      LEFT JOIN paciente pa ON pa.id_persona = p.id_persona AND pa.deleted_at IS NULL
--     WHERE (m.id_medico IS NOT NULL AND pa.id_paciente IS NOT NULL)
--        OR (r.nombre = 'medico'  AND pa.id_paciente IS NOT NULL)
--        OR (r.nombre IN ('cliente','paciente') AND m.id_medico IS NOT NULL);
--
--    Luego, manualmente:
--      UPDATE paciente SET deleted_at = NOW() WHERE id_persona = <X>;
--      UPDATE medico   SET deleted_at = NOW(), activo = FALSE WHERE id_persona = <X>;
