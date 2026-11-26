-- =====================================================================
-- MIGRACIÓN: Optimización de políticas RLS
--
-- Problema: en una política, `mi_id_medico()` / `es_admin()` / `auth.uid()`
-- se evalúan UNA VEZ POR FILA. En una tabla de 10.000 citas son 10.000
-- llamadas (cada una hace su propio SELECT a usuario/persona/medico).
--
-- Solución (recomendada por Supabase, aviso "Auth RLS Initialization
-- Plan"): envolverlas en un sub-SELECT → `(SELECT mi_id_medico())`.
-- Postgres lo convierte en un InitPlan y lo evalúa UNA SOLA VEZ por
-- consulta. Mismo resultado, mucho menos trabajo.
--
-- En vez de reescribir cada política a mano (y arriesgar copiar una
-- versión vieja del repo), este script lee las políticas REALES de la BD
-- desde pg_policies y las modifica con ALTER POLICY: conserva nombre,
-- comando y roles; solo cambia las expresiones.
--
-- Solo toca llamadas SIN argumentos (dependen del usuario, no de la fila).
-- medico_atendio_paciente(id_paciente) depende de la fila → no se toca.
--
-- Idempotente: las llamadas ya envueltas no se vuelven a envolver.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    r         RECORD;
    v_using   TEXT;
    v_check   TEXT;
    v_sql     TEXT;
    v_total   INT := 0;
    -- (?<!SELECT ) evita volver a envolver lo que ya está como
    -- "( SELECT mi_id_medico() AS mi_id_medico)" tras una ejecución previa.
    c_patron  CONSTANT TEXT :=
        '(?<!SELECT )\m(auth\.uid|auth\.email|mi_id_medico|mi_id_paciente|'
        'mi_id_persona|mi_id_usuario|es_admin_o_asistente|es_admin)\(\)';
BEGIN
    FOR r IN
        SELECT schemaname, tablename, policyname, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        v_using := regexp_replace(r.qual,       c_patron, '(SELECT \1())', 'g');
        v_check := regexp_replace(r.with_check, c_patron, '(SELECT \1())', 'g');

        IF v_using IS DISTINCT FROM r.qual OR v_check IS DISTINCT FROM r.with_check THEN
            v_sql := format('ALTER POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
            IF v_using IS NOT NULL THEN
                v_sql := v_sql || format(' USING (%s)', v_using);
            END IF;
            IF v_check IS NOT NULL THEN
                v_sql := v_sql || format(' WITH CHECK (%s)', v_check);
            END IF;

            EXECUTE v_sql;
            v_total := v_total + 1;
            RAISE NOTICE 'Optimizada: %.%', r.tablename, r.policyname;
        END IF;
    END LOOP;

    RAISE NOTICE 'Políticas optimizadas: %', v_total;
END $$;

COMMIT;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. No debe quedar ninguna llamada sin envolver (resultado vacío):
--
--    SELECT tablename, policyname
--    FROM pg_policies
--    WHERE schemaname = 'public'
--      AND (qual       ~ '(?<!SELECT )\m(auth\.uid|mi_id_\w+|es_admin\w*)\(\)'
--        OR with_check ~ '(?<!SELECT )\m(auth\.uid|mi_id_\w+|es_admin\w*)\(\)');
--
-- 2. Advisors → Performance Advisor → "Rerun linter": deben desaparecer
--    los avisos "Auth RLS Initialization Plan".
--
-- 3. Probar la app con admin, médico y paciente (debe verse todo igual).
-- =====================================================================
