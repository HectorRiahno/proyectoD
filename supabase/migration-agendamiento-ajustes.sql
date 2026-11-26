-- =====================================================================
-- AGENDAMIENTO DE CITAS — ajustes
--
-- Ejecutar en Supabase SQL Editor DESPUÉS de migration-agendamiento-citas.sql
--
--   1. fn_slots_disponibles: los slots avanzan según la duración del
--      tipo de consulta (30 min → 08:00, 08:30, 09:00…), no cada 15 min.
--   2. vw_admin_citas: oculta las citas enviadas a papelera (la versión de
--      views.sql no las filtraba y seguían saliendo en Citas y Dashboard).
--   3. fn_marcar_no_asistio: admin/asistente o el médico de la cita, sólo
--      cuando la hora de la cita ya llegó.
--
-- Es idempotente: se puede re-ejecutar.
-- =====================================================================

BEGIN;

-- ─── 1. Slots al ritmo de la duración de la consulta ─────────────────
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
                   make_interval(mins => p.dur)
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


-- ─── 2. vw_admin_citas sin citas eliminadas ──────────────────────────
-- Igual que en migration-agendamiento-citas.sql, se parte de la
-- definición ACTUAL de la vista (sus columnas varían según qué
-- migraciones se corrieron) y sólo se le agrega el filtro.
DO $$
DECLARE
    v_def   TEXT;
    v_where INTEGER;
    v_opts  TEXT;
BEGIN
    v_def := rtrim(pg_get_viewdef('public.vw_admin_citas'::regclass, true), E'; \n');

    IF v_def ~ 'c\.deleted_at IS NULL' THEN
        RETURN;   -- ya filtra
    END IF;

    IF v_def !~ '\mcita c\M' OR v_def ~ E'\n  (GROUP BY|ORDER BY|LIMIT|UNION)' THEN
        RAISE NOTICE 'vw_admin_citas tiene un formato inesperado; no se modificó.';
        RETURN;
    END IF;

    v_where := position(E'\n  WHERE ' IN v_def);
    IF v_where > 0 THEN
        v_def := left(v_def, v_where - 1)
              || E'\n  WHERE c.deleted_at IS NULL AND ('
              || substr(v_def, v_where + length(E'\n  WHERE ')) || ')';
    ELSE
        v_def := v_def || E'\n  WHERE c.deleted_at IS NULL';
    END IF;

    SELECT ' WITH (' || array_to_string(reloptions, ', ') || ')'
      INTO v_opts
      FROM pg_class WHERE oid = 'public.vw_admin_citas'::regclass AND reloptions IS NOT NULL;

    EXECUTE 'CREATE OR REPLACE VIEW public.vw_admin_citas' || COALESCE(v_opts, '') || ' AS ' || v_def;
END $$;


-- ─── 3. fn_marcar_no_asistio ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_marcar_no_asistio(p_id_cita BIGINT)
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

    IF NOT es_admin_o_asistente() AND v_old.id_medico IS DISTINCT FROM mi_id_medico() THEN
        RAISE EXCEPTION 'No tienes permiso para modificar esta cita.' USING ERRCODE = '42501';
    END IF;

    IF v_old.estado NOT IN ('programada', 'confirmada') THEN
        RAISE EXCEPTION 'Sólo se puede marcar "no asistió" en citas programadas o confirmadas.'
            USING ERRCODE = '22023';
    END IF;

    IF v_old.fecha_cita > fn_ahora_cita() THEN
        RAISE EXCEPTION 'Sólo se puede marcar "no asistió" cuando la hora de la cita ya llegó.'
            USING ERRCODE = '22023';
    END IF;

    UPDATE cita SET estado = 'no_asistio' WHERE id_cita = p_id_cita;
END;
$$;

REVOKE ALL ON FUNCTION fn_marcar_no_asistio(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_marcar_no_asistio(BIGINT) TO authenticated;


COMMIT;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT * FROM fn_slots_disponibles(1, CURRENT_DATE + 1, NULL);   -- cada 30 min
-- SELECT count(*) FROM vw_admin_citas;                              -- sin eliminadas
