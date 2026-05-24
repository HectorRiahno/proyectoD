-- =====================================================================
-- MIGRACIÓN DE SEGURIDAD
--
-- 1. Endurece el trigger provision_user_from_auth: ignora `metadata.rol`
--    cuando pide un rol elevado (admin/medico/asistente). Siempre crea
--    al usuario como 'cliente'. La Edge Function `create-user` hace el
--    override usando service_role.
--
-- 2. Reescribe las políticas RLS de las tablas con datos médicos/PII:
--    persona, paciente, cita, consulta_medica, diagnostico, sintoma,
--    signos_vitales, orden_medica.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.
--
-- ⚠️  Después de correr esta migración necesitas redeployar la Edge
--    Function actualizada:  npx supabase functions deploy create-user --no-verify-jwt
-- =====================================================================


-- =====================================================================
-- PARTE 1: Trigger seguro
-- =====================================================================

CREATE OR REPLACE FUNCTION public.provision_user_from_auth(
    p_id    UUID,
    p_email TEXT,
    p_meta  JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_persona  BIGINT;
    v_id_usuario  BIGINT;
    v_id_rol      BIGINT;
    v_full_name   TEXT;
    v_nombres     TEXT;
    v_apellidos   TEXT;
BEGIN
    -- Si ya existe usuario con este UUID, no hacer nada
    IF EXISTS (SELECT 1 FROM public.usuario WHERE auth_user_id = p_id) THEN
        RETURN;
    END IF;

    -- Extraer nombre desde metadata
    v_full_name := COALESCE(
        p_meta ->> 'nombre',
        p_meta ->> 'full_name',
        p_meta ->> 'name',
        split_part(p_email, '@', 1)
    );
    v_nombres   := split_part(v_full_name, ' ', 1);
    v_apellidos := NULLIF(TRIM(SUBSTRING(v_full_name FROM LENGTH(v_nombres) + 1)), '');

    -- Crear o reutilizar persona (por email)
    SELECT id_persona INTO v_id_persona
    FROM public.persona
    WHERE LOWER(email) = LOWER(p_email)
    LIMIT 1;

    IF v_id_persona IS NULL THEN
        INSERT INTO public.persona (documento, tipo_documento, nombres, apellidos, email)
        VALUES (
            'AUTH-' || SUBSTRING(p_id::text, 1, 12),
            'CC',
            v_nombres,
            COALESCE(v_apellidos, ''),
            LOWER(p_email)
        )
        RETURNING id_persona INTO v_id_persona;
    END IF;

    -- Crear usuario vinculado al UUID de auth.users
    INSERT INTO public.usuario (auth_user_id, username, id_persona, password_hash, activo)
    VALUES (
        p_id,
        LOWER(p_email),
        v_id_persona,
        'AUTH_MANAGED',
        TRUE
    )
    ON CONFLICT (auth_user_id) DO NOTHING
    RETURNING id_usuario INTO v_id_usuario;

    IF v_id_usuario IS NULL THEN
        SELECT id_usuario INTO v_id_usuario
        FROM public.usuario WHERE auth_user_id = p_id;
    END IF;

    -- 🔒 SEGURIDAD: el trigger SIEMPRE asigna 'cliente'. Ignora metadata.rol
    --    para evitar escalación de privilegios desde supabase.auth.signUp.
    --    Si la invitación viene de la Edge Function (service_role) con rol
    --    elevado (medico/admin/asistente), esa función hace UPDATE de
    --    asignacion_rol DESPUÉS de que este trigger termine.
    SELECT id_rol INTO v_id_rol FROM public.rol WHERE nombre = 'cliente' LIMIT 1;

    IF v_id_rol IS NOT NULL AND v_id_usuario IS NOT NULL THEN
        INSERT INTO public.asignacion_rol (id_usuario, id_rol)
        VALUES (v_id_usuario, v_id_rol)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


-- =====================================================================
-- PARTE 2: RLS endurecido
--
-- Patrón: cada tabla tiene políticas separadas por operación. Las
-- políticas USING controlan SELECT/UPDATE/DELETE; WITH CHECK controla
-- INSERT/UPDATE.
--
-- Reglas:
--   - Paciente:  solo sus propios datos.
--   - Médico:    sus pacientes (vía cita o consulta) + lectura general
--                para datos no-clínicos (lista de pacientes).
--   - Asistente: lectura/escritura administrativa (citas, etc).
--   - Admin:     todo.
-- =====================================================================


-- ─── persona ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_persona" ON persona;
DROP POLICY IF EXISTS "persona_select"     ON persona;

CREATE POLICY "persona_select" ON persona FOR SELECT TO authenticated
  USING (
    -- Yo mismo
    id_persona = mi_id_persona()
    -- Cualquier miembro del staff médico/administrativo
    OR mi_id_medico() IS NOT NULL
    OR es_admin_o_asistente()
  );


-- ─── paciente ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_paciente" ON paciente;
DROP POLICY IF EXISTS "paciente_select"    ON paciente;

CREATE POLICY "paciente_select" ON paciente FOR SELECT TO authenticated
  USING (
    id_paciente = mi_id_paciente()
    OR mi_id_medico() IS NOT NULL
    OR es_admin_o_asistente()
  );


-- ─── cita ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_cita" ON cita;
DROP POLICY IF EXISTS "cita_select"    ON cita;

CREATE POLICY "cita_select" ON cita FOR SELECT TO authenticated
  USING (
    id_paciente = mi_id_paciente()         -- el paciente ve sus citas
    OR id_medico = mi_id_medico()           -- el médico ve sus citas
    OR es_admin_o_asistente()               -- staff ve todas
  );


-- ─── consulta_medica ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_consulta"   ON consulta_medica;
DROP POLICY IF EXISTS "medico_read_consulta" ON consulta_medica;
DROP POLICY IF EXISTS "consulta_select"      ON consulta_medica;

CREATE POLICY "consulta_select" ON consulta_medica FOR SELECT TO authenticated
  USING (
    id_paciente = mi_id_paciente()         -- el paciente ve sus consultas
    OR id_medico = mi_id_medico()           -- el médico ve las que él hizo
    OR es_admin_o_asistente()
  );

-- Las políticas INSERT/UPDATE/DELETE ya existen en rls-medico.sql
-- (medico_insert_consulta, medico_update_consulta, medico_delete_consulta).
-- Las dejamos como están: id_medico = mi_id_medico() OR es_admin().


-- ─── diagnostico ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_diagnostico" ON diagnostico;
DROP POLICY IF EXISTS "diagnostico_select"    ON diagnostico;

CREATE POLICY "diagnostico_select" ON diagnostico FOR SELECT TO authenticated
  USING (
    id_consulta IN (
      SELECT id_consulta FROM consulta_medica
      WHERE id_paciente = mi_id_paciente() OR id_medico = mi_id_medico()
    )
    OR es_admin_o_asistente()
  );

-- WRITE: ya hay medico_write_diagnostico en rls-medico.sql con FOR ALL.
-- Lo dejamos como está (chequea id_consulta IN consultas del médico).


-- ─── sintoma ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_sintoma" ON sintoma;
DROP POLICY IF EXISTS "sintoma_select"    ON sintoma;

CREATE POLICY "sintoma_select" ON sintoma FOR SELECT TO authenticated
  USING (
    id_consulta IN (
      SELECT id_consulta FROM consulta_medica
      WHERE id_paciente = mi_id_paciente() OR id_medico = mi_id_medico()
    )
    OR es_admin_o_asistente()
  );


-- ─── signos_vitales ───────────────────────────────────────────────────
-- Aquí cambia el WRITE: antes era USING(TRUE) WITH CHECK(TRUE). Lo
-- restringimos para que solo el médico responsable o staff pueda escribir.
DROP POLICY IF EXISTS "auth_read_signos"   ON signos_vitales;
DROP POLICY IF EXISTS "medico_write_signos" ON signos_vitales;
DROP POLICY IF EXISTS "signos_select"      ON signos_vitales;
DROP POLICY IF EXISTS "signos_insert"      ON signos_vitales;
DROP POLICY IF EXISTS "signos_update"      ON signos_vitales;
DROP POLICY IF EXISTS "signos_delete"      ON signos_vitales;

CREATE POLICY "signos_select" ON signos_vitales FOR SELECT TO authenticated
  USING (
    id_paciente = mi_id_paciente()
    OR id_medico = mi_id_medico()
    OR id_consulta IN (
      SELECT id_consulta FROM consulta_medica WHERE id_medico = mi_id_medico()
    )
    OR es_admin_o_asistente()
  );

CREATE POLICY "signos_insert" ON signos_vitales FOR INSERT TO authenticated
  WITH CHECK (
    (mi_id_medico() IS NOT NULL AND id_medico = mi_id_medico())
    OR es_admin_o_asistente()
  );

CREATE POLICY "signos_update" ON signos_vitales FOR UPDATE TO authenticated
  USING (
    (mi_id_medico() IS NOT NULL AND id_medico = mi_id_medico())
    OR es_admin_o_asistente()
  )
  WITH CHECK (
    (mi_id_medico() IS NOT NULL AND id_medico = mi_id_medico())
    OR es_admin_o_asistente()
  );

CREATE POLICY "signos_delete" ON signos_vitales FOR DELETE TO authenticated
  USING (
    (mi_id_medico() IS NOT NULL AND id_medico = mi_id_medico())
    OR es_admin_o_asistente()
  );


-- ─── orden_medica ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_read_orden" ON orden_medica;
DROP POLICY IF EXISTS "orden_select"    ON orden_medica;

CREATE POLICY "orden_select" ON orden_medica FOR SELECT TO authenticated
  USING (
    id_consulta IN (
      SELECT id_consulta FROM consulta_medica
      WHERE id_paciente = mi_id_paciente() OR id_medico = mi_id_medico()
    )
    OR es_admin_o_asistente()
  );

-- WRITE: ya hay medico_write_orden en rls-medico.sql.


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('persona','paciente','cita','consulta_medica',
--                     'diagnostico','sintoma','signos_vitales','orden_medica')
-- ORDER BY tablename, cmd;
