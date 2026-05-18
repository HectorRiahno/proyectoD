-- =====================================================================
-- POLÍTICAS RLS PARA MÉDICO
--
-- Ejecutar DESPUÉS de rls-admin.sql
-- El médico solo puede escribir sobre sus propios registros.
-- Se usa mi_id_medico() de views.sql (auth.uid → usuario → medico)
-- =====================================================================

-- ─── cita ────────────────────────────────────────────────────────────
-- El médico puede actualizar (cambiar estado) sus propias citas, lo que
-- permite marcarlas como 'en_curso' al iniciar la consulta y 'completada'
-- al guardarla. Admin/asistente conservan su propio policy (rls-admin.sql).
DROP POLICY IF EXISTS "medico_update_cita" ON cita;

CREATE POLICY "medico_update_cita"
    ON cita FOR UPDATE TO authenticated
    USING    (id_medico = mi_id_medico())
    WITH CHECK (id_medico = mi_id_medico());

-- ─── consulta_medica ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "medico_read_consulta"   ON consulta_medica;
DROP POLICY IF EXISTS "medico_insert_consulta" ON consulta_medica;
DROP POLICY IF EXISTS "medico_update_consulta" ON consulta_medica;
DROP POLICY IF EXISTS "medico_delete_consulta" ON consulta_medica;

-- Admin ya tiene política para todo; el médico solo ve/edita las suyas
CREATE POLICY "medico_read_consulta"
    ON consulta_medica FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "medico_insert_consulta"
    ON consulta_medica FOR INSERT TO authenticated
    WITH CHECK (id_medico = mi_id_medico());

CREATE POLICY "medico_update_consulta"
    ON consulta_medica FOR UPDATE TO authenticated
    USING    (id_medico = mi_id_medico() OR es_admin())
    WITH CHECK (id_medico = mi_id_medico() OR es_admin());

CREATE POLICY "medico_delete_consulta"
    ON consulta_medica FOR DELETE TO authenticated
    USING (id_medico = mi_id_medico() OR es_admin());

-- ─── diagnostico ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_diagnostico"   ON diagnostico;
DROP POLICY IF EXISTS "medico_write_diagnostico" ON diagnostico;

CREATE POLICY "auth_read_diagnostico"
    ON diagnostico FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "medico_write_diagnostico"
    ON diagnostico FOR ALL TO authenticated
    USING (
        id_consulta IN (
            SELECT id_consulta FROM consulta_medica
            WHERE id_medico = mi_id_medico()
        ) OR es_admin()
    )
    WITH CHECK (
        id_consulta IN (
            SELECT id_consulta FROM consulta_medica
            WHERE id_medico = mi_id_medico()
        ) OR es_admin()
    );

-- ─── sintoma ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_sintoma"   ON sintoma;
DROP POLICY IF EXISTS "medico_write_sintoma" ON sintoma;

CREATE POLICY "auth_read_sintoma"
    ON sintoma FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "medico_write_sintoma"
    ON sintoma FOR ALL TO authenticated
    USING (
        id_consulta IN (
            SELECT id_consulta FROM consulta_medica
            WHERE id_medico = mi_id_medico()
        ) OR es_admin()
    )
    WITH CHECK (
        id_consulta IN (
            SELECT id_consulta FROM consulta_medica
            WHERE id_medico = mi_id_medico()
        ) OR es_admin()
    );

-- ─── signos_vitales ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_signos"     ON signos_vitales;
DROP POLICY IF EXISTS "medico_write_signos"  ON signos_vitales;

CREATE POLICY "auth_read_signos"
    ON signos_vitales FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "medico_write_signos"
    ON signos_vitales FOR ALL TO authenticated
    USING    (TRUE)
    WITH CHECK (TRUE);

-- ─── orden_medica ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_orden"     ON orden_medica;
DROP POLICY IF EXISTS "medico_write_orden"  ON orden_medica;

CREATE POLICY "auth_read_orden"
    ON orden_medica FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "medico_write_orden"
    ON orden_medica FOR ALL TO authenticated
    USING (
        id_consulta IN (
            SELECT id_consulta FROM consulta_medica
            WHERE id_medico = mi_id_medico()
        ) OR es_admin()
    )
    WITH CHECK (
        id_consulta IN (
            SELECT id_consulta FROM consulta_medica
            WHERE id_medico = mi_id_medico()
        ) OR es_admin()
    );

-- ─── tipo_diagnostico (catálogo, solo lectura) ────────────────────────
DROP POLICY IF EXISTS "auth_read_tipo_diag" ON tipo_diagnostico;

CREATE POLICY "auth_read_tipo_diag"
    ON tipo_diagnostico FOR SELECT TO authenticated USING (TRUE);

-- ─── tipo_consulta (catálogo, solo lectura) ───────────────────────────
DROP POLICY IF EXISTS "auth_read_tipo_consulta_medico" ON tipo_consulta;

CREATE POLICY "auth_read_tipo_consulta_medico"
    ON tipo_consulta FOR SELECT TO authenticated USING (TRUE);

-- Grants
GRANT EXECUTE ON FUNCTION mi_id_medico() TO authenticated;
GRANT EXECUTE ON FUNCTION mi_id_paciente() TO authenticated;
