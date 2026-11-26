-- =====================================================================
-- MIGRACIÓN: Autoagendamiento — el paciente aparta su propia cita
--
-- Ejecutar DESPUÉS de migration-agendamiento-citas.sql y
-- migration-agendamiento-ajustes.sql.
--
-- La base ya validaba el agendamiento (horario del médico, solapes,
-- fecha futura) y fn_agendar_cita ya dejaba al paciente agendar para sí
-- mismo. Faltaba:
--
--   1. fn_medicos_agendables(): catálogo de médicos para el portal.
--      El RLS de `persona` no deja al paciente leer la fila del médico;
--      esta función (SECURITY DEFINER) expone SÓLO nombre, especialidad,
--      consultorio y días de atención de médicos activos con horario.
--
--   2. Límites para quien agenda sin ser personal de la clínica (dentro
--      de fn_agendar_cita, para que no se puedan saltar llamando a la RPC
--      directamente):
--        • máximo 3 citas activas (programada/confirmada) a futuro
--        • máximo 1 cita activa con el mismo médico el mismo día
--        • hasta 60 días de anticipación
--      Admin/asistente no tienen estos límites.
--
--   3. fn_agendar_mi_cita(): la que usa el portal. Si el usuario se
--      registró por su cuenta y aún no tiene ficha de paciente, se la
--      crea (queda en audit_log con él como actor) y agenda.
--
-- La hora se elige con fn_slots_disponibles (ya existente): sólo ofrece
-- horas dentro del horario del médico, libres y futuras. La restricción
-- EXCLUDE de `cita` garantiza que dos personas no aparten la misma hora.
--
-- Nota: una cita apartada por el paciente lo deja "asignado" a ese
-- médico (migration-restriccion-clinica.sql): el médico puede ver su
-- historia y registrarle la consulta, igual que si la agendara recepción.
--
-- Transaccional e idempotente.
-- =====================================================================

BEGIN;

-- ─── 1. Catálogo de médicos para el portal ───────────────────────────
CREATE OR REPLACE FUNCTION public.fn_medicos_agendables()
RETURNS TABLE (
    id_medico    BIGINT,
    nombre       TEXT,
    especialidad TEXT,
    consultorio  TEXT,
    dias         TEXT[]      -- días con atención: {'lunes','miercoles',...}
)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT m.id_medico,
           (p.nombres || ' ' || p.apellidos)::TEXT,
           COALESCE(NULLIF(trim(m.especialidad), ''), 'Medicina General')::TEXT,
           m.consultorio::TEXT,
           ARRAY(
               SELECT d.dia
               FROM unnest(ARRAY['lunes','martes','miercoles','jueves','viernes','sabado','domingo'])
                    WITH ORDINALITY AS d(dia, ord)
               WHERE EXISTS (
                   SELECT 1 FROM horario_medico h
                   WHERE h.id_medico = m.id_medico
                     AND h.disponible IS NOT FALSE
                     AND fn_dia_semana_norm(h.dia_semana) = d.dia
               )
               ORDER BY d.ord
           )
    FROM medico m
    JOIN persona p ON p.id_persona = m.id_persona
    WHERE m.activo IS NOT FALSE
      AND m.deleted_at IS NULL
      AND EXISTS (
          SELECT 1 FROM horario_medico h
          WHERE h.id_medico = m.id_medico AND h.disponible IS NOT FALSE
      )
    ORDER BY 3, 2;
$$;

REVOKE ALL ON FUNCTION public.fn_medicos_agendables() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_medicos_agendables() TO authenticated;


-- ─── 2. fn_agendar_cita: límites para el autoagendamiento ────────────
-- Misma firma y reglas que en migration-agendamiento-citas.sql; se
-- agrega el bloque "Límites del autoagendamiento".
CREATE OR REPLACE FUNCTION fn_agendar_cita(
    p_id_paciente      BIGINT,
    p_id_medico        BIGINT,
    p_fecha            DATE,
    p_hora             TIME,
    p_id_tipo_consulta BIGINT DEFAULT NULL,
    p_estado           TEXT   DEFAULT 'programada',
    p_motivo           TEXT   DEFAULT NULL,
    p_observaciones    TEXT   DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff BOOLEAN := es_admin_o_asistente();
    v_dur   INTEGER;
    v_id    BIGINT;
    v_hoy   DATE := (now() AT TIME ZONE 'America/Bogota')::DATE;
BEGIN
    IF NOT v_staff AND p_id_paciente IS DISTINCT FROM mi_id_paciente() THEN
        RAISE EXCEPTION 'No tienes permiso para agendar citas para este paciente.' USING ERRCODE = '42501';
    END IF;

    IF NOT v_staff THEN
        p_estado := 'programada';
    ELSIF p_estado NOT IN ('programada', 'confirmada') THEN
        RAISE EXCEPTION 'Una cita nueva sólo puede quedar programada o confirmada.' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM paciente WHERE id_paciente = p_id_paciente AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'El paciente seleccionado no existe.' USING ERRCODE = '22023';
    END IF;

    -- Límites del autoagendamiento
    IF NOT v_staff THEN
        IF p_fecha > v_hoy + 60 THEN
            RAISE EXCEPTION 'Sólo puedes agendar citas con hasta 60 días de anticipación.' USING ERRCODE = '22023';
        END IF;

        -- Serializa los agendamientos del mismo paciente: sin esto, dos
        -- pestañas a la vez podrían pasar ambas el conteo de abajo.
        PERFORM 1 FROM paciente WHERE id_paciente = p_id_paciente FOR UPDATE;

        IF (SELECT count(*) FROM cita c
             WHERE c.id_paciente = p_id_paciente
               AND c.estado IN ('programada', 'confirmada')
               AND c.deleted_at IS NULL
               AND c.fecha_cita > fn_ahora_cita()) >= 3 THEN
            RAISE EXCEPTION 'Ya tienes 3 citas pendientes. Cancela una o espera a que pase para agendar otra.'
                USING ERRCODE = '22023';
        END IF;

        IF EXISTS (SELECT 1 FROM cita c
                    WHERE c.id_paciente = p_id_paciente
                      AND c.id_medico   = p_id_medico
                      AND c.estado IN ('programada', 'confirmada', 'en_curso')
                      AND c.deleted_at IS NULL
                      AND (c.fecha_cita AT TIME ZONE 'UTC')::DATE = p_fecha) THEN
            RAISE EXCEPTION 'Ya tienes una cita con este médico ese día.' USING ERRCODE = '22023';
        END IF;
    END IF;

    v_dur := fn_duracion_tipo(p_id_tipo_consulta);
    PERFORM fn_validar_slot(p_id_medico, p_id_paciente, p_fecha, p_hora, v_dur);

    INSERT INTO cita (id_paciente, id_medico, id_tipo_consulta, fecha_cita,
                      duracion_min, estado, motivo, observaciones)
    VALUES (p_id_paciente, p_id_medico, p_id_tipo_consulta, fn_cita_ts(p_fecha, p_hora),
            v_dur, p_estado, NULLIF(trim(p_motivo), ''), NULLIF(trim(p_observaciones), ''))
    RETURNING id_cita INTO v_id;

    RETURN v_id;
EXCEPTION
    WHEN exclusion_violation THEN
        RAISE EXCEPTION 'Ese horario acaba de ser tomado por otra cita. Elige otra hora.' USING ERRCODE = '23P01';
END;
$$;

REVOKE ALL ON FUNCTION fn_agendar_cita(BIGINT, BIGINT, DATE, TIME, BIGINT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_agendar_cita(BIGINT, BIGINT, DATE, TIME, BIGINT, TEXT, TEXT, TEXT) TO authenticated;


-- ─── 3. fn_agendar_mi_cita: la RPC del portal ────────────────────────
CREATE OR REPLACE FUNCTION public.fn_agendar_mi_cita(
    p_id_medico        BIGINT,
    p_fecha            DATE,
    p_hora             TIME,
    p_id_tipo_consulta BIGINT DEFAULT NULL,
    p_motivo           TEXT   DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_persona  BIGINT := mi_id_persona();
    v_paciente BIGINT := mi_id_paciente();
BEGIN
    IF auth.uid() IS NULL OR v_persona IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para agendar una cita.' USING ERRCODE = '42501';
    END IF;

    -- Usuario registrado por su cuenta: aún no tiene ficha de paciente
    IF v_paciente IS NULL THEN
        IF EXISTS (SELECT 1 FROM paciente WHERE id_persona = v_persona) THEN
            -- existe pero está en la papelera
            RAISE EXCEPTION 'Tu ficha de paciente está inactiva. Comunícate con la clínica.' USING ERRCODE = '42501';
        END IF;

        INSERT INTO paciente (id_persona, numero_historia)
        VALUES (v_persona, 'HC-' || v_persona || '-' || to_char(now(), 'YYMMDDHH24MISS'))
        RETURNING id_paciente INTO v_paciente;
    END IF;

    RETURN fn_agendar_cita(v_paciente, p_id_medico, p_fecha, p_hora,
                           p_id_tipo_consulta, 'programada', p_motivo, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_agendar_mi_cita(BIGINT, DATE, TIME, BIGINT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_agendar_mi_cita(BIGINT, DATE, TIME, BIGINT, TEXT) TO authenticated;

COMMIT;


-- =====================================================================
-- VERIFICACIÓN (iniciar sesión como paciente en la app)
-- =====================================================================
-- 1. Mis citas → "Agendar cita": aparecen especialidades y médicos con
--    horario configurado (si no sale ninguno: Admin → Horarios).
-- 2. Al elegir fecha sólo se ofrecen horas dentro del horario del médico.
-- 3. Apartar la misma hora desde dos sesiones: la segunda recibe
--    "Ese horario acaba de ser tomado por otra cita".
-- 4. Con 3 citas pendientes, la cuarta se rechaza.
-- =====================================================================
