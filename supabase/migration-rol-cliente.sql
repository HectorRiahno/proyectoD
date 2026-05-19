-- =====================================================================
-- MIGRACIÓN: Normalizar el rol 'paciente' → 'cliente'
--
-- El seed original en schema.sql insertó:
--    INSERT INTO rol (nombre, ...) VALUES ('paciente', ...);
-- pero el código JS usa 'cliente' en todas partes (config/roles.js,
-- AuthContext, auth-trigger, etc.). Eso causa errores al guardar:
--    "Rol 'cliente' no encontrado en la BD."
--
-- Esta migración deja la BD consistente con el código:
--   1. Asegura que exista el rol 'cliente'.
--   2. Reasigna las asignacion_rol que apuntaban a 'paciente' → 'cliente'.
--   3. Elimina el rol 'paciente' si quedó huérfano.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.
-- =====================================================================

-- 1. Asegurar que 'cliente' exista
INSERT INTO rol (nombre, descripcion)
VALUES ('cliente', 'Paciente / cliente del centro')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Mover asignaciones de 'paciente' → 'cliente' (sin duplicar)
DO $$
DECLARE
    v_id_paciente BIGINT;
    v_id_cliente  BIGINT;
BEGIN
    SELECT id_rol INTO v_id_paciente FROM rol WHERE nombre = 'paciente' LIMIT 1;
    SELECT id_rol INTO v_id_cliente  FROM rol WHERE nombre = 'cliente'  LIMIT 1;

    IF v_id_paciente IS NOT NULL AND v_id_cliente IS NOT NULL THEN
        -- Actualiza solo las filas que no chocarían con un UNIQUE
        UPDATE asignacion_rol
        SET id_rol = v_id_cliente
        WHERE id_rol = v_id_paciente
          AND NOT EXISTS (
            SELECT 1 FROM asignacion_rol ar2
            WHERE ar2.id_usuario = asignacion_rol.id_usuario
              AND ar2.id_rol = v_id_cliente
          );

        -- Borra duplicados restantes (usuario que tenía AMBOS)
        DELETE FROM asignacion_rol WHERE id_rol = v_id_paciente;

        -- Elimina el rol 'paciente' si ya no tiene asignaciones
        DELETE FROM rol WHERE id_rol = v_id_paciente;
    END IF;
END $$;

-- Verificación:
-- SELECT * FROM rol ORDER BY id_rol;
