-- =====================================================================
-- MIGRACIÓN: reportes financieros conscientes de cobertura EPS
--
-- Contexto: con la migración `migration-factura-eps.sql`, las facturas
-- pagadas con metodo='EPS' tienen descuento = subtotal y total = 0
-- (porque el paciente no paga nada). Pero la clínica SÍ recibió ese
-- ingreso de la EPS — así que sumar `total` subestima los ingresos
-- reales y el método EPS aparece con $0 en el desglose por método.
--
-- Esta migración introduce un helper `monto_efectivo_factura()` que
-- devuelve el monto realmente percibido por la clínica:
--   • Si metodo_pago = 'EPS' → ROUND(subtotal * (1 + tasa_impuesto), 2)
--     (subtotal pre-descuento EPS + IVA original)
--   • Otherwise → total
--
-- y actualiza:
--   • vw_serie_diaria.ingresos (gráfico de ingresos diarios)
--   • rpc_reporte_financiero (totales + por_metodo_pago + ticket promedio)
--
-- Idempotente. Re-ejecutable sin efectos colaterales.
-- =====================================================================


-- ─── 1. Helper IMMUTABLE ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.monto_efectivo_factura(
    p_metodo_pago   TEXT,
    p_subtotal      NUMERIC,
    p_tasa_impuesto NUMERIC,
    p_total         NUMERIC
) RETURNS NUMERIC
LANGUAGE SQL IMMUTABLE
AS $$
    SELECT CASE
        WHEN UPPER(COALESCE(p_metodo_pago, '')) = 'EPS'
            THEN ROUND(COALESCE(p_subtotal, 0) * (1 + COALESCE(p_tasa_impuesto, 0)), 2)
        ELSE COALESCE(p_total, 0)
    END;
$$;

GRANT EXECUTE ON FUNCTION public.monto_efectivo_factura(TEXT, NUMERIC, NUMERIC, NUMERIC)
    TO authenticated;


-- ─── 2. vw_serie_diaria — ingresos diarios ───────────────────────────
-- DROP CASCADE porque rpc_reporte_financiero y rpc_reporte_horarios la
-- consumen; las recreamos abajo (financiero) y dejamos la otra intacta
-- usando CREATE OR REPLACE de las RPCs después.
-- En realidad CREATE OR REPLACE VIEW funciona mientras no cambien
-- columnas/tipos — y este cambio solo afecta el valor del SUM interno.
CREATE OR REPLACE VIEW vw_serie_diaria AS
SELECT
    d.dia,
    COALESCE(c.citas, 0)       AS citas,
    COALESCE(c.canceladas, 0)  AS canceladas,
    COALESCE(c.completadas, 0) AS completadas,
    COALESCE(p.nuevos, 0)      AS pacientes_nuevos,
    COALESCE(f.total, 0)       AS ingresos
FROM (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '90 days',
        CURRENT_DATE,
        '1 day'::interval
    )::date AS dia
) d
LEFT JOIN (
    SELECT DATE(fecha_cita) AS d,
        COUNT(*) AS citas,
        COUNT(*) FILTER (WHERE estado = 'cancelada')  AS canceladas,
        COUNT(*) FILTER (WHERE estado = 'completada') AS completadas
    FROM cita WHERE deleted_at IS NULL
    GROUP BY DATE(fecha_cita)
) c ON c.d = d.dia
LEFT JOIN (
    SELECT DATE(created_at) AS d, COUNT(*) AS nuevos
    FROM paciente WHERE deleted_at IS NULL
    GROUP BY DATE(created_at)
) p ON p.d = d.dia
LEFT JOIN (
    SELECT DATE(fecha_emision) AS d,
           SUM(monto_efectivo_factura(metodo_pago, subtotal, tasa_impuesto, total)) AS total
    FROM factura WHERE deleted_at IS NULL
    GROUP BY DATE(fecha_emision)
) f ON f.d = d.dia
ORDER BY d.dia;


-- ─── 3. rpc_reporte_financiero — totales conscientes de EPS ─────────
CREATE OR REPLACE FUNCTION rpc_reporte_financiero(
    p_desde DATE, p_hasta DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT es_admin_o_asistente() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'totales', jsonb_build_object(
            'facturas_emitidas', (SELECT COUNT(*) FROM factura
                WHERE deleted_at IS NULL AND estado != 'borrador'
                  AND DATE(fecha_emision) BETWEEN p_desde AND p_hasta),
            'pagadas',          (SELECT COUNT(*) FROM factura
                WHERE deleted_at IS NULL AND estado = 'pagada'
                  AND DATE(fecha_pago) BETWEEN p_desde AND p_hasta),
            'pendientes',       (SELECT COUNT(*) FROM factura
                WHERE deleted_at IS NULL
                  AND estado IN ('pendiente','vencida')
                  AND DATE(fecha_emision) BETWEEN p_desde AND p_hasta),
            'anuladas',         (SELECT COUNT(*) FROM factura
                WHERE deleted_at IS NULL AND estado = 'anulada'
                  AND DATE(fecha_emision) BETWEEN p_desde AND p_hasta),
            'ingresos_facturados', (SELECT COALESCE(SUM(monto_efectivo_factura(metodo_pago, subtotal, tasa_impuesto, total)),0)
                FROM factura
                WHERE deleted_at IS NULL
                  AND DATE(fecha_emision) BETWEEN p_desde AND p_hasta),
            'ingresos_pagados', (SELECT COALESCE(SUM(monto_efectivo_factura(metodo_pago, subtotal, tasa_impuesto, total)),0)
                FROM factura
                WHERE deleted_at IS NULL AND estado = 'pagada'
                  AND DATE(fecha_pago) BETWEEN p_desde AND p_hasta),
            'por_cobrar',       (SELECT COALESCE(SUM(total),0) FROM factura
                WHERE deleted_at IS NULL AND estado IN ('pendiente','vencida')),
            'ticket_promedio',  (SELECT COALESCE(ROUND(AVG(monto_efectivo_factura(metodo_pago, subtotal, tasa_impuesto, total)),0),0)
                FROM factura
                WHERE deleted_at IS NULL AND estado = 'pagada'
                  AND DATE(fecha_pago) BETWEEN p_desde AND p_hasta)
        ),
        'serie_ingresos', (SELECT jsonb_agg(jsonb_build_object('dia', dia, 'ingresos', ingresos) ORDER BY dia)
            FROM vw_serie_diaria WHERE dia BETWEEN p_desde AND p_hasta),
        'servicios_top', (SELECT jsonb_agg(t) FROM (
            SELECT servicio, veces_vendido, unidades, ingreso_generado
            FROM vw_servicios_top LIMIT 10
        ) t),
        'por_metodo_pago', (SELECT jsonb_agg(t ORDER BY monto DESC) FROM (
            SELECT
                COALESCE(metodo_pago, 'Sin especificar') AS metodo_pago,
                COUNT(*) AS n,
                SUM(monto_efectivo_factura(metodo_pago, subtotal, tasa_impuesto, total)) AS monto
            FROM factura
            WHERE deleted_at IS NULL AND estado = 'pagada'
              AND DATE(fecha_pago) BETWEEN p_desde AND p_hasta
            GROUP BY metodo_pago
        ) t),
        'cartera_vencida', (SELECT jsonb_agg(t ORDER BY dias_mora DESC) FROM (
            SELECT
                f.id_factura,
                f.numero_factura,
                f.paciente_nombre,
                f.medico_nombre,
                f.total,
                f.fecha_emision,
                EXTRACT(DAY FROM NOW() - f.fecha_emision)::INT AS dias_mora
            FROM vw_admin_facturas f
            WHERE f.estado IN ('pendiente','vencida')
              AND f.fecha_emision < NOW() - INTERVAL '30 days'
            ORDER BY f.fecha_emision ASC
            LIMIT 50
        ) t)
    );
END $$;

GRANT EXECUTE ON FUNCTION rpc_reporte_financiero TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Helper independiente:
--    SELECT monto_efectivo_factura('EPS', 100000, 0.19, 0);    -- = 119000
--    SELECT monto_efectivo_factura('Efectivo', 100000, 0, 100000); -- = 100000
--
-- 2. Marca una factura como pagada con EPS y corre el reporte:
--    SELECT rpc_reporte_financiero('2026-01-01'::DATE, '2026-12-31'::DATE)
--      -> por_metodo_pago debe incluir un objeto {metodo_pago:'EPS', n:1, monto:X}
--         donde X = subtotal*(1+tasa).
--
-- 3. La cartera vencida y el campo `por_cobrar` siguen usando `total` —
--    correcto, porque sólo aplica a pendientes/vencidas (sin metodo aún).
