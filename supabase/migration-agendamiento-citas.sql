-- =====================================================================
-- AGENDAMIENTO DE CITAS — validación en la base de datos
--
-- Ejecutar en Supabase SQL Editor DESPUÉS de:
--   rls-admin.sql, views.sql (mi_id_paciente), migration-soft-delete.sql
--
-- Qué hace:
--   1. Agrega a `cita` la duración (duracion_min), el fin calculado
--      (fecha_fin) y los datos de cancelación.
--   2. Impide a nivel de BD que un médico tenga dos citas activas que se
--      solapen (EXCLUDE con rangos de tiempo). Elimina la race condition
--      de validar sólo en el navegador.
--   3. RPCs que concentran las reglas de agendamiento:
--        fn_slots_disponibles  → horas libres de un médico en una fecha
--        fn_agendar_cita       → crea una cita validada
--        fn_editar_cita        → reprograma / cambia estado validado
--        fn_cancelar_cita      → cancela con motivo obligatorio
--
-- CONVENCIÓN DE ZONA HORARIA
--   `fecha_cita` guarda la hora de pared de Colombia etiquetada como UTC
--   (el frontend siempre envió 'YYYY-MM-DDTHH:MM:00' sin offset y las
--   vistas hacen fecha_cita::date / ::time en UTC). Se mantiene esa
--   convención para no romper vistas ni datos existentes; fn_cita_ts y
--   fn_ahora_cita la encapsulan.
--
-- Es idempotente: se puede re-ejecutar.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── 1. Columnas nuevas ──────────────────────────────────────────────
ALTER TABLE cita
    ADD COLUMN IF NOT EXISTS duracion_min       INTEGER,
    ADD COLUMN IF NOT EXISTS fecha_fin          TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
    ADD COLUMN IF NOT EXISTS cancelada_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelada_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Citas existentes: se agendaron con slots de 15 min, así que se les
-- asigna esa duración (asignarles la del tipo de consulta generaría
-- solapes artificiales con las citas contiguas).
UPDATE cita SET duracion_min = 15 WHERE duracion_min IS NULL;
UPDATE cita SET fecha_fin = fecha_cita + make_interval(mins => duracion_min)
 WHERE fecha_fin IS NULL;

ALTER TABLE cita ALTER COLUMN duracion_min SET NOT NULL;
ALTER TABLE cita ALTER COLUMN fecha_fin    SET NOT NULL;

ALTER TABLE cita DROP CONSTRAINT IF EXISTS cita_duracion_chk;
ALTER TABLE cita ADD  CONSTRAINT cita_duracion_chk CHECK (duracion_min BETWEEN 5 AND 480);


-- ─── 2. Trigger: completa duración y fecha_fin ───────────────────────
-- Cubre también los INSERT/UPDATE directos (seed, médico cambiando
-- estado, etc.) que no pasan por las RPCs.
CREATE OR REPLACE FUNCTION trg_cita_calcular_fin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.duracion_min IS NULL THEN
        SELECT tc.duracion_min INTO NEW.duracion_min
          FROM tipo_consulta tc
         WHERE tc.id_tipo_consulta = NEW.id_tipo_consulta;
        NEW.duracion_min := COALESCE(NEW.duracion_min, 30);
    END IF;
    NEW.fecha_fin := NEW.fecha_cita + make_interval(mins => NEW.duracion_min);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cita_fecha_fin ON cita;
CREATE TRIGGER trg_cita_fecha_fin
    BEFORE INSERT OR UPDATE OF fecha_cita, duracion_min ON cita
    FOR EACH ROW EXECUTE FUNCTION trg_cita_calcular_fin();


-- ─── 3. Pre-chequeo: solapes que ya existen ──────────────────────────
-- Si hay citas activas solapadas, la restricción no se puede crear.
-- Se listan para que se resuelvan (cancelar o mover una de cada par).
DO $$
DECLARE
    v_conflictos TEXT;
BEGIN
    SELECT string_agg(
             format('  #%s ↔ #%s (médico %s, %s)',
                    a.id_cita, b.id_cita, a.id_medico,
                    to_char(a.fecha_cita AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI')),
             E'\n')
      INTO v_conflictos
      FROM cita a
      JOIN cita b
        ON b.id_medico = a.id_medico
       AND b.id_cita   > a.id_cita
       AND tstzrange(a.fecha_cita, a.fecha_fin) && tstzrange(b.fecha_cita, b.fecha_fin)
     WHERE a.estado IN ('programada', 'confirmada', 'en_curso') AND a.deleted_at IS NULL
       AND b.estado IN ('programada', 'confirmada', 'en_curso') AND b.deleted_at IS NULL;

    IF v_conflictos IS NOT NULL THEN
        RAISE EXCEPTION E'Hay citas activas solapadas. Cancela o mueve una de cada par y vuelve a ejecutar:\n%',
            v_conflictos;
    END IF;
END $$;


-- ─── 4. Restricción: un médico no puede tener citas activas solapadas ─
ALTER TABLE cita DROP CONSTRAINT IF EXISTS cita_sin_solape_medico;
ALTER TABLE cita ADD  CONSTRAINT cita_sin_solape_medico
    EXCLUDE USING gist (
        id_medico                         WITH =,
        tstzrange(fecha_cita, fecha_fin)  WITH &&
    )
    WHERE (estado IN ('programada', 'confirmada', 'en_curso') AND deleted_at IS NULL);


-- ─── 5. Helpers ──────────────────────────────────────────────────────
-- fecha + hora locales → valor de fecha_cita (ver convención arriba)
CREATE OR REPLACE FUNCTION fn_cita_ts(p_fecha DATE, p_hora TIME)
RETURNS TIMESTAMPTZ
LANGUAGE SQL IMMUTABLE
AS $$ SELECT (p_fecha + p_hora) AT TIME ZONE 'UTC' $$;

-- "Ahora" en la misma convención que fecha_cita
CREATE OR REPLACE FUNCTION fn_ahora_cita()
RETURNS TIMESTAMPTZ
LANGUAGE SQL STABLE
AS $$ SELECT (now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'UTC' $$;

-- 'Miércoles' / 'miercoles' / ' MIÉRCOLES ' → 'miercoles'
CREATE OR REPLACE FUNCTION fn_dia_semana_norm(p_dia TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE
AS $$ SELECT translate(lower(trim(p_dia)), 'áéíóú', 'aeiou') $$;

CREATE OR REPLACE FUNCTION fn_dia_semana_de(p_fecha DATE)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE
AS $$
    SELECT (ARRAY['domingo','lunes','martes','miercoles','jueves','viernes','sabado'])
           [EXTRACT(DOW FROM p_fecha)::INT + 1]
$$;

-- Duración de un tipo de consulta (30 min si no hay tipo o no la define)
CREATE OR REPLACE FUNCTION fn_duracion_tipo(p_id_tipo_consulta BIGINT)
RETURNS INTEGER
LANGUAGE SQL STABLE
AS $$
    SELECT COALESCE(
        (SELECT duracion_min FROM tipo_consulta WHERE id_tipo_consulta = p_id_tipo_consulta),
        30)
$$;

-- Valida que (médico, fecha, hora, duración) sea agendable para el
-- paciente. Lanza excepción con mensaje legible si no lo es. El solape
-- con otras citas del médico lo garantiza la restricción EXCLUDE; aquí
-- se revisa igual para dar un mensaje claro antes del INSERT.
CREATE OR REPLACE FUNCTION fn_validar_slot(
    p_id_medico    BIGINT,
    p_id_paciente  BIGINT,
    p_fecha        DATE,
    p_hora         TIME,
    p_duracion_min INTEGER,
    p_excluir_cita BIGINT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
    v_ini    TIMESTAMPTZ := fn_cita_ts(p_fecha, p_hora);
    v_fin    TIMESTAMPTZ := fn_cita_ts(p_fecha, p_hora) + make_interval(mins => p_duracion_min);
    v_ini_m  INTEGER     := EXTRACT(EPOCH FROM p_hora)::INT / 60;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM medico
         WHERE id_medico = p_id_medico AND activo IS NOT FALSE AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'El médico seleccionado no existe o no está activo.' USING ERRCODE = '22023';
    END IF;

    IF v_ini <= fn_ahora_cita() THEN
        RAISE EXCEPTION 'No se pueden agendar citas en una fecha u hora que ya pasó.' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM horario_medico h
         WHERE h.id_medico = p_id_medico
           AND h.disponible IS NOT FALSE
           AND fn_dia_semana_norm(h.dia_semana) = fn_dia_semana_de(p_fecha)
           AND EXTRACT(EPOCH FROM h.hora_inicio)::INT / 60 <= v_ini_m
           AND EXTRACT(EPOCH FROM h.hora_fin)::INT / 60    >= v_ini_m + p_duracion_min
    ) THEN
        RAISE EXCEPTION 'La hora elegida (% min de consulta) no cabe en el horario de atención del médico ese día.',
            p_duracion_min USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1 FROM cita c
         WHERE c.id_medico = p_id_medico
           AND c.estado IN ('programada', 'confirmada', 'en_curso')
           AND c.deleted_at IS NULL
           AND c.id_cita IS DISTINCT FROM p_excluir_cita
           AND tstzrange(c.fecha_cita, c.fecha_fin) && tstzrange(v_ini, v_fin)
    ) THEN
        RAISE EXCEPTION 'El médico ya tiene una cita que se cruza con ese horario. Elige otra hora.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM cita c
         WHERE c.id_paciente = p_id_paciente
           AND c.estado IN ('programada', 'confirmada', 'en_curso')
           AND c.deleted_at IS NULL
           AND c.id_cita IS DISTINCT FROM p_excluir_cita
           AND tstzrange(c.fecha_cita, c.fecha_fin) && tstzrange(v_ini, v_fin)
    ) THEN
        RAISE EXCEPTION 'El paciente ya tiene otra cita que se cruza con ese horario.';
    END IF;
END;
$$;


-- ─── 6. fn_slots_disponibles ─────────────────────────────────────────
-- Slots de 15 min dentro de las franjas del médico para esa fecha, con
-- la duración del tipo de consulta. `disponible` = cabe completo, no se
-- cruza con otra cita activa y no está en el pasado.
-- SECURITY DEFINER: sólo devuelve horas (sin datos de otros pacientes),
-- así puede usarla también el portal del paciente.
CREATE OR REPLACE FUNCTION fn_slots_disponibles(
    p_id_medico        BIGINT,
    p_fecha            DATE,
    p_id_tipo_consulta BIGINT DEFAULT NULL,
    p_excluir_cita     BIGINT DEFAULT NULL
)
RETURNS TABLE (hora TIME, disponible BOOLEAN)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
    WITH params AS (
        SELECT fn_duracion_tipo(p_id_tipo_consulta) AS dur
    ),
    franjas AS (
        SELECT h.hora_inicio, h.hora_fin
          FROM horario_medico h
          JOIN medico m ON m.id_medico = h.id_medico
         WHERE h.id_medico = p_id_medico
           AND h.disponible IS NOT FALSE
           AND m.activo IS NOT FALSE
           AND m.deleted_at IS NULL
           AND fn_dia_semana_norm(h.dia_semana) = fn_dia_semana_de(p_fecha)
    ),
    candidatos AS (
        SELECT DISTINCT gs::TIME AS hora
          FROM franjas f, params p,
               generate_series(
                   p_fecha + f.hora_inicio,
                   p_fecha + f.hora_fin - make_interval(mins => p.dur),
                   INTERVAL '15 minutes'
               ) gs
    )
    SELECT c.hora,
           fn_cita_ts(p_fecha, c.hora) > fn_ahora_cita()
           AND NOT EXISTS (
               SELECT 1 FROM cita x, params p
                WHERE x.id_medico = p_id_medico
                  AND x.estado IN ('programada', 'confirmada', 'en_curso')
                  AND x.deleted_at IS NULL
                  AND x.id_cita IS DISTINCT FROM p_excluir_cita
                  AND tstzrange(x.fecha_cita, x.fecha_fin)
                      && tstzrange(fn_cita_ts(p_fecha, c.hora),
                                   fn_cita_ts(p_fecha, c.hora) + make_interval(mins => p.dur))
           ) AS disponible
      FROM candidatos c
     ORDER BY c.hora;
$$;


-- ─── 7. fn_agendar_cita ──────────────────────────────────────────────
-- Admin/asistente agendan para cualquier paciente; un paciente sólo para
-- sí mismo y siempre en estado 'programada' (base para el portal).
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


-- ─── 8. fn_editar_cita ───────────────────────────────────────────────
-- Reprogramar (médico/fecha/hora/tipo) y/o cambiar estado, con reglas:
--   • completada: no se modifica (sólo motivo/observaciones)
--   • en_curso: sólo puede cancelarse (corrección)
--   • no_asistio: sólo cuando la hora de la cita ya llegó
--   • cancelada: exige motivo de cancelación
--   • reprogramar o reactivar exige un slot válido y futuro
-- en_curso / completada los asigna el flujo del médico, no esta RPC.
CREATE OR REPLACE FUNCTION fn_editar_cita(
    p_id_cita            BIGINT,
    p_id_medico          BIGINT,
    p_fecha              DATE,
    p_hora               TIME,
    p_id_tipo_consulta   BIGINT,
    p_estado             TEXT,
    p_motivo             TEXT DEFAULT NULL,
    p_observaciones      TEXT DEFAULT NULL,
    p_motivo_cancelacion TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old        cita%ROWTYPE;
    v_dur        INTEGER;
    v_ts         TIMESTAMPTZ := fn_cita_ts(p_fecha, p_hora);
    v_agenda_mod BOOLEAN;
    v_activos    CONSTANT TEXT[] := ARRAY['programada', 'confirmada', 'en_curso'];
    v_permitidos TEXT[];
BEGIN
    IF NOT es_admin_o_asistente() THEN
        RAISE EXCEPTION 'No tienes permiso para editar citas.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_old FROM cita
     WHERE id_cita = p_id_cita AND deleted_at IS NULL
       FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cita no existe o fue eliminada.' USING ERRCODE = '22023';
    END IF;

    -- Cambiar el tipo de consulta cambia la duración sólo si es otro tipo
    v_dur := CASE WHEN p_id_tipo_consulta IS NOT DISTINCT FROM v_old.id_tipo_consulta
                  THEN v_old.duracion_min
                  ELSE fn_duracion_tipo(p_id_tipo_consulta) END;

    -- Se compara al minuto: hay citas (seed) con segundos en fecha_cita
    v_agenda_mod := p_id_medico IS DISTINCT FROM v_old.id_medico
                 OR v_ts        IS DISTINCT FROM date_trunc('minute', v_old.fecha_cita)
                 OR v_dur       IS DISTINCT FROM v_old.duracion_min;

    IF p_estado IS NULL OR p_estado NOT IN
       ('programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio') THEN
        RAISE EXCEPTION 'Estado de cita no válido.' USING ERRCODE = '22023';
    END IF;

    -- Transiciones de estado
    IF p_estado IS DISTINCT FROM v_old.estado THEN
        v_permitidos := CASE v_old.estado
            WHEN 'programada' THEN ARRAY['confirmada', 'cancelada', 'no_asistio']
            WHEN 'confirmada' THEN ARRAY['programada', 'cancelada', 'no_asistio']
            WHEN 'en_curso'   THEN ARRAY['cancelada']
            WHEN 'cancelada'  THEN ARRAY['programada', 'confirmada']
            WHEN 'no_asistio' THEN ARRAY['programada', 'confirmada']
            ELSE ARRAY[]::TEXT[]
        END;
        IF NOT p_estado = ANY (v_permitidos) THEN
            RAISE EXCEPTION 'No se puede pasar una cita de "%" a "%".', v_old.estado, p_estado
                USING ERRCODE = '22023';
        END IF;
    END IF;

    IF v_agenda_mod AND v_old.estado IN ('en_curso', 'completada') THEN
        RAISE EXCEPTION 'No se puede reprogramar una cita en curso o completada.' USING ERRCODE = '22023';
    END IF;

    IF v_agenda_mod AND NOT p_estado = ANY (v_activos) THEN
        RAISE EXCEPTION 'Para cambiar fecha, hora o médico la cita debe quedar programada o confirmada.'
            USING ERRCODE = '22023';
    END IF;

    IF p_estado = 'no_asistio' AND v_old.estado <> 'no_asistio' AND v_ts > fn_ahora_cita() THEN
        RAISE EXCEPTION 'Sólo se puede marcar "no asistió" cuando la hora de la cita ya llegó.'
            USING ERRCODE = '22023';
    END IF;

    IF p_estado = 'cancelada' AND v_old.estado <> 'cancelada'
       AND NULLIF(trim(p_motivo_cancelacion), '') IS NULL THEN
        RAISE EXCEPTION 'Indica el motivo de la cancelación.' USING ERRCODE = '22023';
    END IF;

    -- Reprogramar o reactivar ocupa agenda: validar el slot
    IF p_estado = ANY (v_activos)
       AND (v_agenda_mod OR NOT v_old.estado = ANY (v_activos)) THEN
        PERFORM fn_validar_slot(p_id_medico, v_old.id_paciente, p_fecha, p_hora, v_dur, p_id_cita);
    END IF;

    UPDATE cita SET
        id_medico          = p_id_medico,
        id_tipo_consulta   = p_id_tipo_consulta,
        fecha_cita         = CASE WHEN v_agenda_mod THEN v_ts ELSE v_old.fecha_cita END,
        duracion_min       = v_dur,
        estado             = p_estado,
        motivo             = NULLIF(trim(p_motivo), ''),
        observaciones      = NULLIF(trim(p_observaciones), ''),
        motivo_cancelacion = CASE
            WHEN p_estado = 'cancelada' AND v_old.estado <> 'cancelada' THEN trim(p_motivo_cancelacion)
            WHEN p_estado = 'cancelada' THEN v_old.motivo_cancelacion
            ELSE NULL END,
        cancelada_at       = CASE
            WHEN p_estado = 'cancelada' AND v_old.estado <> 'cancelada' THEN now()
            WHEN p_estado = 'cancelada' THEN v_old.cancelada_at
            ELSE NULL END,
        cancelada_por      = CASE
            WHEN p_estado = 'cancelada' AND v_old.estado <> 'cancelada' THEN auth.uid()
            WHEN p_estado = 'cancelada' THEN v_old.cancelada_por
            ELSE NULL END
    WHERE id_cita = p_id_cita;
EXCEPTION
    WHEN exclusion_violation THEN
        RAISE EXCEPTION 'Ese horario acaba de ser tomado por otra cita. Elige otra hora.' USING ERRCODE = '23P01';
END;
$$;


-- ─── 9. fn_cancelar_cita ─────────────────────────────────────────────
-- Admin/asistente o el propio paciente (portal). Sólo citas aún no
-- iniciadas.
CREATE OR REPLACE FUNCTION fn_cancelar_cita(p_id_cita BIGINT, p_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old cita%ROWTYPE;
BEGIN
    SELECT * INTO v_old FROM cita
     WHERE id_cita = p_id_cita AND deleted_at IS NULL
       FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cita no existe o fue eliminada.' USING ERRCODE = '22023';
    END IF;

    IF NOT es_admin_o_asistente() AND v_old.id_paciente IS DISTINCT FROM mi_id_paciente() THEN
        RAISE EXCEPTION 'No tienes permiso para cancelar esta cita.' USING ERRCODE = '42501';
    END IF;

    IF v_old.estado NOT IN ('programada', 'confirmada') THEN
        RAISE EXCEPTION 'Sólo se pueden cancelar citas programadas o confirmadas.' USING ERRCODE = '22023';
    END IF;

    IF NULLIF(trim(p_motivo), '') IS NULL THEN
        RAISE EXCEPTION 'Indica el motivo de la cancelación.' USING ERRCODE = '22023';
    END IF;

    UPDATE cita SET
        estado             = 'cancelada',
        motivo_cancelacion = trim(p_motivo),
        cancelada_at       = now(),
        cancelada_por      = auth.uid()
    WHERE id_cita = p_id_cita;
END;
$$;


-- ─── 10. Permisos ────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION fn_validar_slot(BIGINT, BIGINT, DATE, TIME, INTEGER, BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION fn_slots_disponibles(BIGINT, DATE, BIGINT, BIGINT)           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION fn_agendar_cita(BIGINT, BIGINT, DATE, TIME, BIGINT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION fn_editar_cita(BIGINT, BIGINT, DATE, TIME, BIGINT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION fn_cancelar_cita(BIGINT, TEXT)                               FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION fn_slots_disponibles(BIGINT, DATE, BIGINT, BIGINT)           TO authenticated;
GRANT EXECUTE ON FUNCTION fn_agendar_cita(BIGINT, BIGINT, DATE, TIME, BIGINT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_editar_cita(BIGINT, BIGINT, DATE, TIME, BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_cancelar_cita(BIGINT, TEXT)                               TO authenticated;

-- ─── 11. vw_admin_citas: exponer duración y cancelación ──────────────
-- La vista tiene variantes según qué migraciones se corrieron (views.sql,
-- soft-delete-v2, ...) y CREATE OR REPLACE exige conservar las columnas
-- existentes en su orden. Por eso se toma la definición ACTUAL de la BD
-- y sólo se le agregan las columnas nuevas al final, conservando sus
-- opciones (security_invoker).
DO $$
DECLARE
    v_def  TEXT;
    v_pos  INTEGER;
    v_opts TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'vw_admin_citas'
                  AND column_name = 'motivo_cancelacion') THEN
        RETURN;   -- ya aplicada
    END IF;

    v_def := pg_get_viewdef('public.vw_admin_citas'::regclass, true);
    v_pos := position(E'\n   FROM ' IN v_def);   -- FROM del SELECT principal

    IF v_pos = 0 OR v_def !~ '\mcita c\M' THEN
        RAISE NOTICE 'vw_admin_citas tiene un formato inesperado; no se modificó. '
                     'El motivo de cancelación no se mostrará en el detalle de la cita.';
        RETURN;
    END IF;

    SELECT ' WITH (' || array_to_string(reloptions, ', ') || ')'
      INTO v_opts
      FROM pg_class WHERE oid = 'public.vw_admin_citas'::regclass AND reloptions IS NOT NULL;

    EXECUTE 'CREATE OR REPLACE VIEW public.vw_admin_citas' || COALESCE(v_opts, '') || ' AS '
         || left(v_def, v_pos - 1)
         || E',\n    c.duracion_min,\n    c.motivo_cancelacion,\n    c.cancelada_at'
         || substr(v_def, v_pos);
END $$;

COMMIT;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT * FROM fn_slots_disponibles(1, CURRENT_DATE + 1, NULL);
-- SELECT conname FROM pg_constraint WHERE conname = 'cita_sin_solape_medico';
