-- =====================================================================
-- MIGRACIÓN: Reglas clínicas — el médico trabaja sólo con SUS pacientes
--            y nadie borra físicamente la historia clínica
--
-- DECISIONES (definidas con la clínica)
--   • El médico sólo puede REGISTRAR consultas de pacientes que el
--     admin/asistente le asignó con una cita (no cancelada, no borrada).
--     Si la consulta se vincula a una cita, esa cita debe ser suya y del
--     mismo paciente.
--   • El médico puede LEER la historia clínica completa (también lo que
--     registraron otros médicos) sólo de:
--       - pacientes con una cita activa con él (programada / confirmada /
--         en curso) → la ve mientras lo atiende, y
--       - pacientes que ya atendió (tiene al menos una consulta con él).
--     De ningún otro paciente. Antes cualquier médico leía persona,
--     paciente e historial_clinico (alergias, tipo de sangre...) de todos.
--   • El asistente es personal asistencial: conserva la lectura clínica.
--   • Nadie borra físicamente registros clínicos. Se usa soft-delete
--     (soft_delete_* / Papelera) y todo queda en audit_log.
--       - Excepción: diagnostico. Editar una consulta reemplaza sus
--         diagnósticos (DELETE + INSERT); queda permitido sólo al médico
--         autor (política existente) y cada borrado queda en audit_log.
--       - persona: el admin sólo puede borrar personas sin paciente,
--         médico ni usuario (rollback al crear paciente/médico). Antes,
--         borrar una persona arrastraba en cascada al paciente.
--   • Una consulta no puede cambiar de paciente ni de médico (salvo
--     admin) — antes un UPDATE podía "mover" una consulta a otro
--     paciente.
--
-- Las reglas de escritura usan políticas RESTRICTIVE: se combinan con
-- AND con las existentes, así que valen aunque haya políticas permisivas
-- antiguas en la base que no estén en el repo.
--
-- Requiere migration-seguridad-vistas-paciente.sql (medico_atendio_paciente).
-- Transaccional e idempotente.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. HELPERS (SECURITY DEFINER: se evalúan dentro de políticas sin
--    recursión de RLS)
-- =====================================================================

-- ¿El paciente tiene una cita (no cancelada) con el médico autenticado?
-- Regla para REGISTRAR consultas.
CREATE OR REPLACE FUNCTION public.medico_tiene_cita_con(p_id_paciente BIGINT, p_id_cita BIGINT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT mi_id_medico() IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM cita c
            WHERE c.id_paciente = p_id_paciente
              AND c.id_medico   = mi_id_medico()
              AND c.deleted_at IS NULL
              AND c.estado <> 'cancelada'
              AND (p_id_cita IS NULL OR c.id_cita = p_id_cita)
       );
$$;

-- ¿Puede el médico autenticado LEER la historia de este paciente?
-- Sí, si lo tiene asignado con una cita activa o si ya lo atendió.
CREATE OR REPLACE FUNCTION public.medico_puede_ver_paciente(p_id_paciente BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT mi_id_medico() IS NOT NULL
       AND (
            medico_atendio_paciente(p_id_paciente)
            OR EXISTS (
                SELECT 1 FROM cita c
                WHERE c.id_paciente = p_id_paciente
                  AND c.id_medico   = mi_id_medico()
                  AND c.deleted_at IS NULL
                  AND c.estado IN ('programada', 'confirmada', 'en_curso')
            )
       );
$$;

CREATE OR REPLACE FUNCTION public.medico_puede_ver_consulta(p_id_consulta BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE((
        SELECT medico_puede_ver_paciente(cm.id_paciente)
        FROM consulta_medica cm
        WHERE cm.id_consulta = p_id_consulta
          AND cm.deleted_at IS NULL
    ), FALSE);
$$;

-- persona: la de otros médicos (nombre en la historia) o la de sus pacientes
CREATE OR REPLACE FUNCTION public.medico_puede_ver_persona(p_id_persona BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT mi_id_medico() IS NOT NULL
       AND (
            EXISTS (SELECT 1 FROM medico m WHERE m.id_persona = p_id_persona)
            OR EXISTS (
                SELECT 1 FROM paciente pa
                WHERE pa.id_persona = p_id_persona
                  AND medico_puede_ver_paciente(pa.id_paciente)
            )
       );
$$;

REVOKE EXECUTE ON FUNCTION public.medico_tiene_cita_con(BIGINT, BIGINT)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.medico_puede_ver_paciente(BIGINT)      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.medico_puede_ver_consulta(BIGINT)      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.medico_puede_ver_persona(BIGINT)       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.medico_tiene_cita_con(BIGINT, BIGINT)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.medico_puede_ver_paciente(BIGINT)      TO authenticated;
GRANT  EXECUTE ON FUNCTION public.medico_puede_ver_consulta(BIGINT)      TO authenticated;
GRANT  EXECUTE ON FUNCTION public.medico_puede_ver_persona(BIGINT)       TO authenticated;


-- =====================================================================
-- 2. LECTURA: el médico sólo ve a sus pacientes
-- =====================================================================

-- ─── 2.a Datos del paciente: antes "cualquier médico" ────────────────
DROP POLICY IF EXISTS "persona_select" ON persona;
CREATE POLICY "persona_select" ON persona FOR SELECT TO authenticated
  USING (
    id_persona = mi_id_persona()
    OR es_admin_o_asistente()
    OR medico_puede_ver_persona(id_persona)
  );

DROP POLICY IF EXISTS "paciente_select" ON paciente;
CREATE POLICY "paciente_select" ON paciente FOR SELECT TO authenticated
  USING (
    (id_paciente = mi_id_paciente()
     OR es_admin_o_asistente()
     OR medico_puede_ver_paciente(id_paciente))
    AND (deleted_at IS NULL OR es_admin())
  );

DROP POLICY IF EXISTS "historial_select" ON historial_clinico;
CREATE POLICY "historial_select" ON historial_clinico FOR SELECT TO authenticated
  USING (
    id_paciente = mi_id_paciente()
    OR es_admin_o_asistente()
    OR medico_puede_ver_paciente(id_paciente)
  );

-- Escribir antecedentes: el médico sólo los de sus pacientes
DROP POLICY IF EXISTS "historial_write" ON historial_clinico;
CREATE POLICY "historial_write" ON historial_clinico FOR ALL TO authenticated
  USING      (es_admin_o_asistente() OR medico_puede_ver_paciente(id_paciente))
  WITH CHECK (es_admin_o_asistente() OR medico_puede_ver_paciente(id_paciente));

-- ─── 2.b Historia completa (también lo de otros médicos) ─────────────
-- Políticas permisivas ADICIONALES: se suman con OR a las existentes,
-- que ya dejan ver al médico sus propias consultas.
DROP POLICY IF EXISTS "medico_hc_select" ON consulta_medica;
CREATE POLICY "medico_hc_select" ON consulta_medica FOR SELECT TO authenticated
    USING (deleted_at IS NULL AND medico_puede_ver_paciente(id_paciente));

DROP POLICY IF EXISTS "medico_hc_select" ON diagnostico;
CREATE POLICY "medico_hc_select" ON diagnostico FOR SELECT TO authenticated
    USING (medico_puede_ver_consulta(id_consulta));

DROP POLICY IF EXISTS "medico_hc_select" ON sintoma;
CREATE POLICY "medico_hc_select" ON sintoma FOR SELECT TO authenticated
    USING (medico_puede_ver_consulta(id_consulta));

DROP POLICY IF EXISTS "medico_hc_select" ON orden_medica;
CREATE POLICY "medico_hc_select" ON orden_medica FOR SELECT TO authenticated
    USING (medico_puede_ver_consulta(id_consulta));

DROP POLICY IF EXISTS "medico_hc_select" ON signos_vitales;
CREATE POLICY "medico_hc_select" ON signos_vitales FOR SELECT TO authenticated
    USING (medico_puede_ver_paciente(id_paciente));

DO $$
BEGIN
    IF to_regclass('public.orden_examen') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "medico_hc_select" ON orden_examen';
        EXECUTE 'CREATE POLICY "medico_hc_select" ON orden_examen FOR SELECT TO authenticated
                 USING (deleted_at IS NULL AND medico_puede_ver_paciente(id_paciente))';
    END IF;

    IF to_regclass('public.orden_examen_item') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "medico_hc_select" ON orden_examen_item';
        EXECUTE 'CREATE POLICY "medico_hc_select" ON orden_examen_item FOR SELECT TO authenticated
                 USING (EXISTS (
                     SELECT 1 FROM orden_examen o
                     WHERE o.id_orden_examen = orden_examen_item.id_orden_examen
                       AND o.deleted_at IS NULL
                       AND medico_puede_ver_paciente(o.id_paciente)))';
    END IF;

    IF to_regclass('public.consulta_adjunto') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "medico_hc_select" ON consulta_adjunto';
        EXECUTE 'CREATE POLICY "medico_hc_select" ON consulta_adjunto FOR SELECT TO authenticated
                 USING (deleted_at IS NULL AND medico_puede_ver_consulta(id_consulta))';
    END IF;
END $$;


-- =====================================================================
-- 3. ESCRITURA: consultas sólo con pacientes asignados
-- =====================================================================
DROP POLICY IF EXISTS "consulta_insert_asignada" ON consulta_medica;
CREATE POLICY "consulta_insert_asignada" ON consulta_medica
    AS RESTRICTIVE FOR INSERT TO authenticated
    WITH CHECK (
        es_admin()
        OR (id_medico = mi_id_medico() AND medico_tiene_cita_con(id_paciente, id_cita))
    );

-- Paciente y médico de una consulta son inmutables (salvo admin)
CREATE OR REPLACE FUNCTION public.fn_consulta_inmutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (NEW.id_paciente IS DISTINCT FROM OLD.id_paciente
        OR NEW.id_medico IS DISTINCT FROM OLD.id_medico)
       AND auth.uid() IS NOT NULL
       AND NOT es_admin() THEN
        RAISE EXCEPTION 'No se puede cambiar el paciente ni el médico de una consulta.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_consulta_inmutable() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_consulta_inmutable ON consulta_medica;
CREATE TRIGGER trg_consulta_inmutable
    BEFORE UPDATE ON consulta_medica
    FOR EACH ROW EXECUTE FUNCTION fn_consulta_inmutable();


-- =====================================================================
-- 4. SIN BORRADO FÍSICO DE DATOS CLÍNICOS
--    (las RPC soft_delete_* hacen UPDATE, no se ven afectadas)
-- =====================================================================
DROP POLICY IF EXISTS "medico_delete_consulta" ON consulta_medica;

REVOKE DELETE ON consulta_medica   FROM anon, authenticated;
REVOKE DELETE ON cita              FROM anon, authenticated;
REVOKE DELETE ON paciente          FROM anon, authenticated;
REVOKE DELETE ON historial_clinico FROM anon, authenticated;
REVOKE DELETE ON signos_vitales    FROM anon, authenticated;
REVOKE DELETE ON sintoma           FROM anon, authenticated;
REVOKE DELETE ON orden_medica      FROM anon, authenticated;

DO $$
BEGIN
    IF to_regclass('public.orden_examen') IS NOT NULL THEN
        EXECUTE 'REVOKE DELETE ON public.orden_examen FROM anon, authenticated';
    END IF;
END $$;

-- persona: sólo si no está ligada a nada (rollback de altas fallidas)
DROP POLICY IF EXISTS "persona_delete_sin_vinculos" ON persona;
CREATE POLICY "persona_delete_sin_vinculos" ON persona
    AS RESTRICTIVE FOR DELETE TO authenticated
    USING (
        es_admin()
        AND NOT EXISTS (SELECT 1 FROM paciente pa WHERE pa.id_persona = persona.id_persona)
        AND NOT EXISTS (SELECT 1 FROM medico   m  WHERE m.id_persona  = persona.id_persona)
        AND NOT EXISTS (SELECT 1 FROM usuario  u  WHERE u.id_persona  = persona.id_persona)
    );

COMMIT;


-- =====================================================================
-- VERIFICACIÓN (iniciar sesión como un médico en la app)
-- =====================================================================
-- 1. "Nueva consulta" sólo lista pacientes con cita suya. Forzar un
--    INSERT con otro paciente debe fallar con 42501.
-- 2. "Mis pacientes" → Historial de un paciente asignado muestra también
--    las consultas de otros médicos.
-- 3. Un paciente sin cita activa ni consulta con ese médico no aparece
--    en ninguna pantalla del médico (ni en vw_admin_pacientes).
-- 4. Ningún rol tiene DELETE sobre las tablas clínicas:
-- SELECT table_name, grantee FROM information_schema.role_table_grants
-- WHERE privilege_type = 'DELETE' AND grantee IN ('anon', 'authenticated')
--   AND table_name IN ('consulta_medica','cita','paciente','historial_clinico',
--                      'signos_vitales','sintoma','orden_medica','orden_examen');
--   → vacío
-- =====================================================================
