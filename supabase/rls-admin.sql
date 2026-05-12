-- =====================================================================
-- POLÍTICAS RLS PARA ADMINISTRADOR
--
-- Ejecutar en Supabase SQL Editor DESPUÉS de auth-trigger.sql y views.sql
--
-- Lógica: un usuario es admin si en la tabla asignacion_rol tiene
-- asignado el rol 'admin'. Se comprueba via auth.uid() → usuario.auth_user_id
-- =====================================================================

-- Función helper reutilizable en todas las políticas
CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM usuario u
        JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
        JOIN rol r             ON r.id_rol      = ar.id_rol
        WHERE u.auth_user_id = auth.uid()
          AND r.nombre = 'admin'
    );
$$;

-- Función helper para asistente o admin
CREATE OR REPLACE FUNCTION es_admin_o_asistente()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM usuario u
        JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
        JOIN rol r             ON r.id_rol      = ar.id_rol
        WHERE u.auth_user_id = auth.uid()
          AND r.nombre IN ('admin', 'asistente')
    );
$$;

-- =====================================================================
-- persona
-- =====================================================================
DROP POLICY IF EXISTS "admin_insert_persona"  ON persona;
DROP POLICY IF EXISTS "admin_update_persona"  ON persona;
DROP POLICY IF EXISTS "admin_delete_persona"  ON persona;

CREATE POLICY "admin_insert_persona"
    ON persona FOR INSERT TO authenticated
    WITH CHECK (es_admin());

CREATE POLICY "admin_update_persona"
    ON persona FOR UPDATE TO authenticated
    USING    (es_admin())
    WITH CHECK (es_admin());

CREATE POLICY "admin_delete_persona"
    ON persona FOR DELETE TO authenticated
    USING (es_admin());

-- =====================================================================
-- medico
-- =====================================================================
DROP POLICY IF EXISTS "admin_insert_medico"  ON medico;
DROP POLICY IF EXISTS "admin_update_medico"  ON medico;
DROP POLICY IF EXISTS "admin_delete_medico"  ON medico;

CREATE POLICY "admin_insert_medico"
    ON medico FOR INSERT TO authenticated
    WITH CHECK (es_admin());

CREATE POLICY "admin_update_medico"
    ON medico FOR UPDATE TO authenticated
    USING    (es_admin())
    WITH CHECK (es_admin());

CREATE POLICY "admin_delete_medico"
    ON medico FOR DELETE TO authenticated
    USING (es_admin());

-- =====================================================================
-- medicamento  (catálogo → admin puede hacer CRUD)
-- =====================================================================
DROP POLICY IF EXISTS "auth_read_medicamento"    ON medicamento;
DROP POLICY IF EXISTS "admin_insert_medicamento" ON medicamento;
DROP POLICY IF EXISTS "admin_update_medicamento" ON medicamento;
DROP POLICY IF EXISTS "admin_delete_medicamento" ON medicamento;

CREATE POLICY "auth_read_medicamento"
    ON medicamento FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "admin_insert_medicamento"
    ON medicamento FOR INSERT TO authenticated
    WITH CHECK (es_admin());

CREATE POLICY "admin_update_medicamento"
    ON medicamento FOR UPDATE TO authenticated
    USING    (es_admin())
    WITH CHECK (es_admin());

CREATE POLICY "admin_delete_medicamento"
    ON medicamento FOR DELETE TO authenticated
    USING (es_admin());

-- =====================================================================
-- categoria_medicamento
-- =====================================================================
DROP POLICY IF EXISTS "auth_read_cat_med"    ON categoria_medicamento;
DROP POLICY IF EXISTS "admin_write_cat_med"  ON categoria_medicamento;

CREATE POLICY "auth_read_cat_med"
    ON categoria_medicamento FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "admin_write_cat_med"
    ON categoria_medicamento FOR ALL TO authenticated
    USING    (es_admin())
    WITH CHECK (es_admin());

-- =====================================================================
-- asistente, horario_medico
-- =====================================================================
DROP POLICY IF EXISTS "auth_read_asistente"  ON asistente;
DROP POLICY IF EXISTS "admin_write_asistente" ON asistente;

CREATE POLICY "auth_read_asistente"
    ON asistente FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "admin_write_asistente"
    ON asistente FOR ALL TO authenticated
    USING    (es_admin())
    WITH CHECK (es_admin());

DROP POLICY IF EXISTS "auth_read_horario"  ON horario_medico;
DROP POLICY IF EXISTS "admin_write_horario" ON horario_medico;

CREATE POLICY "auth_read_horario"
    ON horario_medico FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "admin_write_horario"
    ON horario_medico FOR ALL TO authenticated
    USING    (es_admin())
    WITH CHECK (es_admin());

-- =====================================================================
-- cita  (admin y asistente pueden crear/editar citas)
-- =====================================================================
DROP POLICY IF EXISTS "admin_write_cita" ON cita;

CREATE POLICY "admin_write_cita"
    ON cita FOR ALL TO authenticated
    USING    (es_admin_o_asistente())
    WITH CHECK (es_admin_o_asistente());

-- =====================================================================
-- paciente  (admin puede hacer CRUD)
-- =====================================================================
DROP POLICY IF EXISTS "admin_write_paciente" ON paciente;

CREATE POLICY "admin_write_paciente"
    ON paciente FOR ALL TO authenticated
    USING    (es_admin())
    WITH CHECK (es_admin());

-- =====================================================================
-- Tablas catálogo de sólo lectura para autenticados
-- (tipo_consulta, tipo_diagnostico, tipo_procedimiento, etc.)
-- =====================================================================
CREATE POLICY "auth_read_tipo_consulta"    ON tipo_consulta
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "auth_read_tipo_diagnostico" ON tipo_diagnostico
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "auth_read_tipo_procedimiento" ON tipo_procedimiento
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "auth_read_rol" ON rol
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "auth_read_asignacion_rol" ON asignacion_rol
    FOR SELECT TO authenticated USING (TRUE);

-- =====================================================================
-- usuario — admin puede actualizar y eliminar (el INSERT lo hace el trigger)
-- =====================================================================
DROP POLICY IF EXISTS "admin_update_usuario" ON usuario;
DROP POLICY IF EXISTS "admin_delete_usuario" ON usuario;

CREATE POLICY "admin_update_usuario"
    ON usuario FOR UPDATE TO authenticated
    USING    (es_admin())
    WITH CHECK (es_admin());

CREATE POLICY "admin_delete_usuario"
    ON usuario FOR DELETE TO authenticated
    USING (es_admin());

-- =====================================================================
-- asignacion_rol — admin puede gestionar roles de cualquier usuario
-- =====================================================================
DROP POLICY IF EXISTS "admin_write_asignacion_rol" ON asignacion_rol;

CREATE POLICY "admin_write_asignacion_rol"
    ON asignacion_rol FOR ALL TO authenticated
    USING    (es_admin())
    WITH CHECK (es_admin());

-- =====================================================================
-- Grants para que las funciones helper sean visibles
-- =====================================================================
GRANT EXECUTE ON FUNCTION es_admin()             TO authenticated;
GRANT EXECUTE ON FUNCTION es_admin_o_asistente() TO authenticated;
