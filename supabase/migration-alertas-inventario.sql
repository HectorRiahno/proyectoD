-- =====================================================================
-- MIGRACIÓN: alertas automáticas de inventario crítico
--
-- Contexto: la tabla `alerta` (migration-modulo-reportes.sql) existe con
-- RLS solo-admin, pero NADA inserta filas en ella. Por eso la campana
-- del admin nunca mostraba nada aunque hubiera stock crítico.
--
-- Esta migración:
--   1. Crea evaluar_alertas_inventario() — detecta medicamentos con
--      stock ≤ umbral crítico e inserta `alerta` con severidad='crit'.
--      Idempotente: no duplica si ya hay alerta activa para ese item.
--      También resuelve alertas cuyo stock se recuperó.
--   2. Trigger en `medicamento` que la dispara después de INSERT/UPDATE
--      del stock.
--   3. Backfill inicial — evalúa el inventario actual.
--
-- Umbral por defecto: stock ≤ 5 = crítico. Cambiable editando el VAR
-- v_umbral_critico abajo.
--
-- Idempotente. Re-ejecutable.
-- =====================================================================


-- ─── 1. Función evaluadora ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.evaluar_alertas_inventario()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_umbral_critico INT := 5;
    v_insertadas     INT := 0;
BEGIN
    -- 1.a Resolver alertas cuyo medicamento ya superó el umbral
    --     (alguien recargó stock).
    UPDATE alerta SET
        estado      = 'resuelta',
        resuelta_en = NOW()
    WHERE tipo          = 'inventario_bajo'
      AND estado        = 'activa'
      AND entidad_tabla = 'medicamento'
      AND entidad_id IN (
        SELECT id_medicamento FROM medicamento
        WHERE activo = TRUE AND stock > v_umbral_critico
      );

    -- 1.b Insertar alertas nuevas para stock crítico actual,
    --     sin duplicar si ya hay una activa.
    WITH ins AS (
        INSERT INTO alerta (
            tipo, severidad, titulo, mensaje, recomendacion,
            entidad_tabla, entidad_id, metadata
        )
        SELECT
            'inventario_bajo',
            'crit',
            CASE WHEN m.stock = 0
                 THEN 'Sin stock: ' || m.nombre
                 ELSE 'Stock crítico: ' || m.nombre
            END,
            'Quedan ' || m.stock || ' unidad(es) en inventario'
                || COALESCE(' (' || m.presentacion || ')', ''),
            'Reabastecer cuanto antes para no interrumpir tratamientos.',
            'medicamento',
            m.id_medicamento,
            jsonb_build_object(
                'stock',         m.stock,
                'nombre',        m.nombre,
                'presentacion',  m.presentacion,
                'concentracion', m.concentracion
            )
        FROM medicamento m
        WHERE m.activo = TRUE
          AND m.stock <= v_umbral_critico
          AND NOT EXISTS (
            SELECT 1 FROM alerta a
            WHERE a.tipo          = 'inventario_bajo'
              AND a.estado        = 'activa'
              AND a.entidad_tabla = 'medicamento'
              AND a.entidad_id    = m.id_medicamento
          )
        RETURNING id_alerta
    )
    SELECT COUNT(*) INTO v_insertadas FROM ins;

    RETURN v_insertadas;
END $$;

GRANT EXECUTE ON FUNCTION public.evaluar_alertas_inventario() TO authenticated;


-- ─── 2. Trigger en medicamento ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_eval_alertas_medicamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM evaluar_alertas_inventario();
    RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_eval_alertas_medicamento ON medicamento;
CREATE TRIGGER trg_eval_alertas_medicamento
    AFTER INSERT OR UPDATE OF stock ON medicamento
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trg_eval_alertas_medicamento();


-- ─── 3. Backfill — evalúa el estado actual del inventario ────────────
SELECT public.evaluar_alertas_inventario();


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Cuántas alertas críticas activas hay ahora:
--    SELECT severidad, COUNT(*) FROM alerta
--     WHERE estado='activa' GROUP BY severidad;
--
-- 2. Lista detallada:
--    SELECT id_alerta, titulo, mensaje, detectada_en
--      FROM alerta
--     WHERE severidad='crit' AND estado='activa'
--     ORDER BY detectada_en DESC;
--
-- 3. Probar el trigger — bajar stock y ver que se inserta:
--    UPDATE medicamento SET stock = 1
--     WHERE id_medicamento = (SELECT id_medicamento FROM medicamento LIMIT 1);
--    -- → debería aparecer una alerta nueva en la campana del admin
--       (recibido vía realtime sin recargar).
--
-- 4. Subir el stock — la alerta se resuelve sola:
--    UPDATE medicamento SET stock = 100 WHERE id_medicamento = X;
