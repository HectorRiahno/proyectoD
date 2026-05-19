-- =====================================================================
-- BACKFILL: crear filas en `paciente` para usuarios con rol 'cliente'
-- que no las tienen.
--
-- Idempotente. Ejecutar en Supabase SQL Editor después de
-- migration-rol-cliente.sql.
-- =====================================================================

INSERT INTO paciente (id_persona, numero_historia)
SELECT
    u.id_persona,
    'HC-' || u.id_persona || '-' || EXTRACT(EPOCH FROM NOW())::bigint
FROM usuario u
JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
JOIN rol r ON r.id_rol = ar.id_rol
LEFT JOIN paciente p ON p.id_persona = u.id_persona
WHERE r.nombre IN ('cliente', 'paciente')
  AND p.id_paciente IS NULL
  AND u.id_persona IS NOT NULL;

-- Verificación:
-- SELECT u.id_usuario, u.username, r.nombre AS rol,
--        CASE WHEN p.id_paciente IS NULL THEN 'FALTA' ELSE 'ok' END AS paciente
-- FROM usuario u
-- JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
-- JOIN rol r ON r.id_rol = ar.id_rol
-- LEFT JOIN paciente p ON p.id_persona = u.id_persona
-- WHERE r.nombre IN ('cliente', 'paciente')
-- ORDER BY u.id_usuario;
