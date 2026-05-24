-- =====================================================================
-- Módulo: Sistema de Reportes y Seguimiento Hospitalario Inteligente
-- Fases A (cimientos) + B (dashboard funcional).
--
-- Asunciones:
--   - Existen las funciones es_admin() y mi_id_medico()
--   - Tablas operativas con deleted_at: paciente, medico, cita, consulta_medica,
--     factura, factura_item, medicamento, diagnostico, persona, usuario
--   - Vista vw_audit_log ya creada por la migration de auditoría
--
-- Orden de ejecución: este archivo es idempotente — todas las creaciones
-- usan IF NOT EXISTS / CREATE OR REPLACE. Se puede correr completo varias veces.
-- =====================================================================

-- ─── Extensiones ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================================
-- TABLAS
-- =====================================================================

CREATE TABLE IF NOT EXISTS metrica_snapshot (
    id_snapshot              BIGSERIAL PRIMARY KEY,
    fecha                    DATE NOT NULL,
    periodo                  VARCHAR(10) NOT NULL CHECK (periodo IN ('dia','semana','mes')),
    pacientes_nuevos         INTEGER NOT NULL DEFAULT 0,
    pacientes_atendidos      INTEGER NOT NULL DEFAULT 0,
    pacientes_total          INTEGER NOT NULL DEFAULT 0,
    citas_realizadas         INTEGER NOT NULL DEFAULT 0,
    citas_canceladas         INTEGER NOT NULL DEFAULT 0,
    citas_no_asistio         INTEGER NOT NULL DEFAULT 0,
    horarios_ocupados        INTEGER NOT NULL DEFAULT 0,
    horarios_libres          INTEGER NOT NULL DEFAULT 0,
    ingresos_total           NUMERIC(14,2) NOT NULL DEFAULT 0,
    ingresos_pagados         NUMERIC(14,2) NOT NULL DEFAULT 0,
    ingresos_pendientes      NUMERIC(14,2) NOT NULL DEFAULT 0,
    facturas_emitidas        INTEGER NOT NULL DEFAULT 0,
    facturas_pagadas         INTEGER NOT NULL DEFAULT 0,
    inventario_criticos      INTEGER NOT NULL DEFAULT 0,
    usuarios_activos         INTEGER NOT NULL DEFAULT 0,
    consultas_completadas    INTEGER NOT NULL DEFAULT 0,
    tiempo_promedio_consulta INTEGER,
    detalles_json            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(fecha, periodo)
);
CREATE INDEX IF NOT EXISTS idx_snapshot_fecha   ON metrica_snapshot(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_snapshot_periodo ON metrica_snapshot(periodo, fecha DESC);

COMMENT ON TABLE metrica_snapshot IS 'Snapshot diario precalculado de KPIs. Lo llena generar_snapshot_diario().';

CREATE TABLE IF NOT EXISTS reporte_generado (
    id_reporte       BIGSERIAL PRIMARY KEY,
    tipo             VARCHAR(30) NOT NULL,
    formato          VARCHAR(10) NOT NULL CHECK (formato IN ('pdf','excel','json')),
    periodo_desde    DATE NOT NULL,
    periodo_hasta    DATE NOT NULL,
    parametros       JSONB NOT NULL DEFAULT '{}'::jsonb,
    storage_path     TEXT,
    tamanio_bytes    INTEGER,
    generado_por     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    generado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    descargado       BOOLEAN NOT NULL DEFAULT FALSE,
    es_automatico    BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_reporte_tipo_fecha ON reporte_generado(tipo, generado_en DESC);

CREATE TABLE IF NOT EXISTS alerta (
    id_alerta      BIGSERIAL PRIMARY KEY,
    tipo           VARCHAR(40) NOT NULL,
    severidad      VARCHAR(10) NOT NULL CHECK (severidad IN ('info','warn','crit')),
    titulo         TEXT NOT NULL,
    mensaje        TEXT NOT NULL,
    recomendacion  TEXT,
    metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
    entidad_tabla  VARCHAR(40),
    entidad_id     BIGINT,
    estado         VARCHAR(15) NOT NULL DEFAULT 'activa'
        CHECK (estado IN ('activa','vista','resuelta','descartada')),
    resuelta_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resuelta_en    TIMESTAMPTZ,
    detectada_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerta_activas
    ON alerta(estado, severidad, detectada_en DESC) WHERE estado = 'activa';

CREATE TABLE IF NOT EXISTS regla_alerta (
    id_regla          BIGSERIAL PRIMARY KEY,
    codigo            VARCHAR(40) UNIQUE NOT NULL,
    nombre            TEXT NOT NULL,
    descripcion       TEXT,
    activa            BOOLEAN NOT NULL DEFAULT TRUE,
    umbral            JSONB NOT NULL DEFAULT '{}'::jsonb,
    severidad_default VARCHAR(10) NOT NULL DEFAULT 'warn',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracion_kpi (
    id_kpi      BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(40) UNIQUE NOT NULL,
    nombre      TEXT NOT NULL,
    descripcion TEXT,
    formato     VARCHAR(20) NOT NULL DEFAULT 'numero',
    icono       VARCHAR(40),
    color       VARCHAR(20),
    orden       INTEGER NOT NULL DEFAULT 0,
    visible     BOOLEAN NOT NULL DEFAULT TRUE,
    rol_min     VARCHAR(20) NOT NULL DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS informe_automatico (
    id_job            BIGSERIAL PRIMARY KEY,
    tipo              VARCHAR(30) NOT NULL,
    activo            BOOLEAN NOT NULL DEFAULT TRUE,
    cron_expr         VARCHAR(50) NOT NULL,
    destinatarios     JSONB NOT NULL DEFAULT '[]'::jsonb,
    ultima_ejecucion  TIMESTAMPTZ,
    ultimo_id_reporte BIGINT REFERENCES reporte_generado(id_reporte) ON DELETE SET NULL
);

-- =====================================================================
-- SEEDS
-- =====================================================================

INSERT INTO regla_alerta (codigo, nombre, descripcion, umbral, severidad_default) VALUES
('inventario_bajo',       'Stock crítico',                 'Avisa cuando un medicamento llega al stock mínimo', '{"stock_min": 10}', 'warn'),
('inventario_vencido',    'Producto próximo a vencer',     'Productos a < 30 días de vencer',                   '{"dias_antes": 30}', 'warn'),
('cancelaciones_altas',   'Cancelaciones disparadas',      '% cancelación > umbral en últimos 7 días',          '{"pct_max": 0.15}', 'warn'),
('ingresos_caida',        'Caída de ingresos',             'Ingresos semanales < % del promedio',               '{"pct_min": 0.80}', 'crit'),
('demanda_alta_hora',     'Demanda alta franja horaria',   'Detecta franja con > X citas en 30 días',           '{"min_citas": 8}', 'info'),
('paciente_inactivo',     'Paciente sin visita',           '> N meses sin consulta',                            '{"meses_min": 12}', 'info'),
('medico_sobrecargado',   'Médico saturado',               '> N citas en una semana',                           '{"citas_max": 25}', 'warn')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO configuracion_kpi (codigo, nombre, descripcion, formato, icono, color, orden) VALUES
('pacientes_atendidos','Pacientes atendidos','Pacientes únicos atendidos en el período','numero','Users','blue',1),
('pacientes_nuevos','Pacientes nuevos','Pacientes registrados en el período','numero','UserPlus','emerald',2),
('citas_realizadas','Citas realizadas','Citas completadas o en curso','numero','Calendar','blue',3),
('citas_canceladas','Citas canceladas','Citas con estado cancelada','numero','XCircle','red',4),
('horarios_ocupados','Horarios ocupados','Franjas con cita activa','numero','Clock','orange',5),
('ingresos_total','Ingresos','Total facturado en el período','moneda','DollarSign','emerald',6),
('ingresos_pendientes','Por cobrar','Facturas pendientes y vencidas','moneda','AlertCircle','amber',7),
('inventario_criticos','Inventario crítico','Medicamentos con stock <= 10','numero','Package','red',8),
('usuarios_activos','Usuarios activos','Usuarios con login en últimos 30 días','numero','UserCheck','blue',9),
('alertas_activas','Alertas','Alertas inteligentes sin resolver','numero','Bell','red',10)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO informe_automatico (tipo, cron_expr, activo) VALUES
('semanal','0 6 * * 1', TRUE),
('mensual','0 7 1 * *', TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- RLS
-- =====================================================================

ALTER TABLE metrica_snapshot   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporte_generado   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerta             ENABLE ROW LEVEL SECURITY;
ALTER TABLE regla_alerta       ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_kpi  ENABLE ROW LEVEL SECURITY;
ALTER TABLE informe_automatico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_snapshot_admin   ON metrica_snapshot;
CREATE POLICY p_snapshot_admin   ON metrica_snapshot   FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS p_reporte_admin    ON reporte_generado;
CREATE POLICY p_reporte_admin    ON reporte_generado   FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS p_alerta_admin     ON alerta;
CREATE POLICY p_alerta_admin     ON alerta             FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS p_regla_admin      ON regla_alerta;
CREATE POLICY p_regla_admin      ON regla_alerta       FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS p_kpi_admin        ON configuracion_kpi;
CREATE POLICY p_kpi_admin        ON configuracion_kpi  FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

DROP POLICY IF EXISTS p_informe_admin    ON informe_automatico;
CREATE POLICY p_informe_admin    ON informe_automatico FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

-- =====================================================================
-- VISTAS
-- =====================================================================

-- ─── KPIs en vivo del día actual ─────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_kpi_diario AS
WITH hoy AS (SELECT CURRENT_DATE AS d)
SELECT
    (SELECT COUNT(*) FROM paciente WHERE deleted_at IS NULL
        AND DATE(created_at) = (SELECT d FROM hoy))                    AS pacientes_nuevos,
    (SELECT COUNT(DISTINCT id_paciente) FROM consulta_medica
        WHERE deleted_at IS NULL
        AND DATE(fecha_consulta) = (SELECT d FROM hoy))                AS pacientes_atendidos,
    (SELECT COUNT(*) FROM cita WHERE deleted_at IS NULL
        AND DATE(fecha_cita) = (SELECT d FROM hoy)
        AND estado IN ('completada','en_curso','confirmada'))          AS citas_realizadas,
    (SELECT COUNT(*) FROM cita WHERE deleted_at IS NULL
        AND DATE(fecha_cita) = (SELECT d FROM hoy)
        AND estado = 'cancelada')                                       AS citas_canceladas,
    (SELECT COUNT(*) FROM cita WHERE deleted_at IS NULL
        AND DATE(fecha_cita) = (SELECT d FROM hoy)
        AND estado = 'no_asistio')                                      AS citas_no_asistio,
    (SELECT COALESCE(SUM(total), 0) FROM factura
        WHERE deleted_at IS NULL
        AND DATE(fecha_emision) = (SELECT d FROM hoy))                  AS ingresos_dia,
    (SELECT COALESCE(SUM(total), 0) FROM factura
        WHERE deleted_at IS NULL AND estado = 'pagada'
        AND DATE(fecha_pago) = (SELECT d FROM hoy))                     AS ingresos_pagados_dia,
    (SELECT COUNT(*) FROM medicamento
        WHERE activo = TRUE AND stock <= 10)                            AS inventario_criticos,
    (SELECT COUNT(*) FROM usuario WHERE activo = TRUE
        AND ultimo_acceso >= NOW() - INTERVAL '30 days')                AS usuarios_activos_30d,
    (SELECT COUNT(*) FROM alerta WHERE estado = 'activa')               AS alertas_activas;

GRANT SELECT ON vw_kpi_diario TO authenticated;

-- ─── Serie diaria (90 días) — pacientes, citas, ingresos ─────────────────────
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
    SELECT DATE(fecha_emision) AS d, SUM(total) AS total
    FROM factura WHERE deleted_at IS NULL
    GROUP BY DATE(fecha_emision)
) f ON f.d = d.dia
ORDER BY d.dia;

GRANT SELECT ON vw_serie_diaria TO authenticated;

-- ─── Consultas por médico ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_consultas_por_medico AS
SELECT
    m.id_medico,
    per.nombres || ' ' || per.apellidos AS medico,
    m.especialidad,
    COUNT(c.id_consulta) AS total_consultas,
    COUNT(c.id_consulta) FILTER (WHERE c.fecha_consulta >= NOW() - INTERVAL '7 days')  AS semana,
    COUNT(c.id_consulta) FILTER (WHERE c.fecha_consulta >= NOW() - INTERVAL '30 days') AS mes,
    ROUND(AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at))/60))::INT AS minutos_promedio
FROM medico m
JOIN persona per ON per.id_persona = m.id_persona
LEFT JOIN consulta_medica c
    ON c.id_medico = m.id_medico AND c.deleted_at IS NULL
WHERE m.deleted_at IS NULL AND m.activo = TRUE
GROUP BY m.id_medico, per.nombres, per.apellidos, m.especialidad;

GRANT SELECT ON vw_consultas_por_medico TO authenticated;

-- ─── Horas pico ───────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_horas_pico AS
SELECT
    EXTRACT(HOUR FROM fecha_cita)::INT AS hora,
    COUNT(*) AS citas,
    COUNT(*) FILTER (WHERE estado = 'completada') AS completadas,
    COUNT(*) FILTER (WHERE estado = 'cancelada')  AS canceladas
FROM cita
WHERE deleted_at IS NULL
  AND fecha_cita >= NOW() - INTERVAL '30 days'
GROUP BY hora
ORDER BY hora;

GRANT SELECT ON vw_horas_pico TO authenticated;

-- ─── Demografía de pacientes ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_pacientes_demografia AS
SELECT
    COALESCE(per.genero, 'No especificado') AS genero,
    CASE
        WHEN per.fecha_nacimiento IS NULL                                  THEN 'Sin dato'
        WHEN EXTRACT(YEAR FROM AGE(per.fecha_nacimiento)) < 13             THEN '0-12'
        WHEN EXTRACT(YEAR FROM AGE(per.fecha_nacimiento)) < 18             THEN '13-17'
        WHEN EXTRACT(YEAR FROM AGE(per.fecha_nacimiento)) < 30             THEN '18-29'
        WHEN EXTRACT(YEAR FROM AGE(per.fecha_nacimiento)) < 45             THEN '30-44'
        WHEN EXTRACT(YEAR FROM AGE(per.fecha_nacimiento)) < 60             THEN '45-59'
        ELSE '60+'
    END AS rango_edad,
    COUNT(*) AS total
FROM paciente p
JOIN persona per ON per.id_persona = p.id_persona
WHERE p.deleted_at IS NULL
GROUP BY genero, rango_edad
ORDER BY genero, rango_edad;

GRANT SELECT ON vw_pacientes_demografia TO authenticated;

-- ─── Diagnósticos frecuentes ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_diagnosticos_frecuentes AS
SELECT
    LOWER(TRIM(d.descripcion)) AS diagnostico,
    d.codigo_cie10,
    COUNT(*) AS frecuencia,
    COUNT(DISTINCT c.id_paciente) AS pacientes_unicos
FROM diagnostico d
JOIN consulta_medica c ON c.id_consulta = d.id_consulta AND c.deleted_at IS NULL
WHERE d.fecha >= NOW() - INTERVAL '6 months'
GROUP BY LOWER(TRIM(d.descripcion)), d.codigo_cie10
ORDER BY frecuencia DESC;

GRANT SELECT ON vw_diagnosticos_frecuentes TO authenticated;

-- ─── Inventario crítico ───────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_inventario_critico AS
SELECT
    m.id_medicamento,
    m.nombre,
    m.nombre_generico,
    m.presentacion,
    m.stock,
    m.precio,
    cat.nombre AS categoria,
    CASE
        WHEN m.stock = 0       THEN 'agotado'
        WHEN m.stock <= 5      THEN 'critico'
        WHEN m.stock <= 10     THEN 'bajo'
        ELSE 'ok'
    END AS estado_stock
FROM medicamento m
LEFT JOIN categoria_medicamento cat ON cat.id_categoria = m.id_categoria
WHERE m.activo = TRUE AND m.stock <= 20
ORDER BY m.stock ASC;

GRANT SELECT ON vw_inventario_critico TO authenticated;

-- ─── Servicios más vendidos ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_servicios_top AS
SELECT
    LOWER(TRIM(fi.descripcion)) AS servicio,
    COUNT(*) AS veces_vendido,
    SUM(fi.cantidad) AS unidades,
    SUM(fi.subtotal) AS ingreso_generado
FROM factura_item fi
JOIN factura f ON f.id_factura = fi.id_factura
WHERE f.deleted_at IS NULL
  AND f.estado IN ('pagada','pendiente')
  AND f.fecha_emision >= NOW() - INTERVAL '3 months'
GROUP BY LOWER(TRIM(fi.descripcion))
ORDER BY ingreso_generado DESC;

GRANT SELECT ON vw_servicios_top TO authenticated;

-- =====================================================================
-- FUNCIONES
-- =====================================================================

-- ─── Snapshot diario (idempotente — upsert) ───────────────────────────────────
CREATE OR REPLACE FUNCTION generar_snapshot_diario(p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO metrica_snapshot (
        fecha, periodo,
        pacientes_nuevos, pacientes_atendidos, pacientes_total,
        citas_realizadas, citas_canceladas, citas_no_asistio,
        ingresos_total, ingresos_pagados, ingresos_pendientes,
        facturas_emitidas, facturas_pagadas,
        inventario_criticos, usuarios_activos, consultas_completadas
    )
    SELECT
        p_fecha, 'dia',
        (SELECT COUNT(*) FROM paciente
            WHERE DATE(created_at) = p_fecha AND deleted_at IS NULL),
        (SELECT COUNT(DISTINCT id_paciente) FROM consulta_medica
            WHERE DATE(fecha_consulta) = p_fecha AND deleted_at IS NULL),
        (SELECT COUNT(*) FROM paciente WHERE deleted_at IS NULL),
        (SELECT COUNT(*) FROM cita
            WHERE DATE(fecha_cita) = p_fecha AND deleted_at IS NULL
            AND estado IN ('completada','en_curso','confirmada')),
        (SELECT COUNT(*) FROM cita
            WHERE DATE(fecha_cita) = p_fecha AND deleted_at IS NULL
            AND estado = 'cancelada'),
        (SELECT COUNT(*) FROM cita
            WHERE DATE(fecha_cita) = p_fecha AND deleted_at IS NULL
            AND estado = 'no_asistio'),
        (SELECT COALESCE(SUM(total),0) FROM factura
            WHERE DATE(fecha_emision) = p_fecha AND deleted_at IS NULL),
        (SELECT COALESCE(SUM(total),0) FROM factura
            WHERE DATE(fecha_pago) = p_fecha AND estado = 'pagada'
            AND deleted_at IS NULL),
        (SELECT COALESCE(SUM(total),0) FROM factura
            WHERE DATE(fecha_emision) = p_fecha
            AND estado IN ('pendiente','vencida') AND deleted_at IS NULL),
        (SELECT COUNT(*) FROM factura
            WHERE DATE(fecha_emision) = p_fecha AND deleted_at IS NULL),
        (SELECT COUNT(*) FROM factura
            WHERE DATE(fecha_pago) = p_fecha AND estado = 'pagada' AND deleted_at IS NULL),
        (SELECT COUNT(*) FROM medicamento WHERE activo = TRUE AND stock <= 10),
        (SELECT COUNT(*) FROM usuario WHERE activo = TRUE
            AND ultimo_acceso >= NOW() - INTERVAL '30 days'),
        (SELECT COUNT(*) FROM consulta_medica
            WHERE DATE(fecha_consulta) = p_fecha AND deleted_at IS NULL)
    ON CONFLICT (fecha, periodo) DO UPDATE SET
        pacientes_nuevos      = EXCLUDED.pacientes_nuevos,
        pacientes_atendidos   = EXCLUDED.pacientes_atendidos,
        pacientes_total       = EXCLUDED.pacientes_total,
        citas_realizadas      = EXCLUDED.citas_realizadas,
        citas_canceladas      = EXCLUDED.citas_canceladas,
        citas_no_asistio      = EXCLUDED.citas_no_asistio,
        ingresos_total        = EXCLUDED.ingresos_total,
        ingresos_pagados      = EXCLUDED.ingresos_pagados,
        ingresos_pendientes   = EXCLUDED.ingresos_pendientes,
        facturas_emitidas     = EXCLUDED.facturas_emitidas,
        facturas_pagadas      = EXCLUDED.facturas_pagadas,
        inventario_criticos   = EXCLUDED.inventario_criticos,
        usuarios_activos      = EXCLUDED.usuarios_activos,
        consultas_completadas = EXCLUDED.consultas_completadas;
END $$;

COMMENT ON FUNCTION generar_snapshot_diario IS
    'Calcula y guarda los KPIs del día p_fecha en metrica_snapshot. Idempotente vía UPSERT.';

-- =====================================================================
-- RPC: rpc_dashboard_kpis(periodo) — endpoint principal del dashboard
-- =====================================================================

CREATE OR REPLACE FUNCTION rpc_dashboard_kpis(
    p_periodo TEXT DEFAULT 'mes'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_desde DATE; v_hasta DATE;
    v_desde_prev DATE; v_hasta_prev DATE;
    v_actual JSONB; v_anterior JSONB;
    v_horas_pico JSONB;
    v_serie JSONB;
BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    CASE p_periodo
        WHEN 'hoy' THEN
            v_desde := CURRENT_DATE; v_hasta := CURRENT_DATE;
            v_desde_prev := CURRENT_DATE - 1; v_hasta_prev := CURRENT_DATE - 1;
        WHEN 'semana' THEN
            v_desde := CURRENT_DATE - 6; v_hasta := CURRENT_DATE;
            v_desde_prev := CURRENT_DATE - 13; v_hasta_prev := CURRENT_DATE - 7;
        WHEN 'mes' THEN
            v_desde := CURRENT_DATE - 29; v_hasta := CURRENT_DATE;
            v_desde_prev := CURRENT_DATE - 59; v_hasta_prev := CURRENT_DATE - 30;
        WHEN 'trimestre' THEN
            v_desde := CURRENT_DATE - 89; v_hasta := CURRENT_DATE;
            v_desde_prev := CURRENT_DATE - 179; v_hasta_prev := CURRENT_DATE - 90;
        ELSE
            v_desde := CURRENT_DATE - 29; v_hasta := CURRENT_DATE;
            v_desde_prev := CURRENT_DATE - 59; v_hasta_prev := CURRENT_DATE - 30;
    END CASE;

    -- ── Periodo actual: suma de snapshots ─────────────────────────────
    SELECT jsonb_build_object(
        'pacientes_nuevos',     COALESCE(SUM(pacientes_nuevos),     0),
        'pacientes_atendidos',  COALESCE(SUM(pacientes_atendidos),  0),
        'citas_realizadas',     COALESCE(SUM(citas_realizadas),     0),
        'citas_canceladas',     COALESCE(SUM(citas_canceladas),     0),
        'citas_no_asistio',     COALESCE(SUM(citas_no_asistio),     0),
        'ingresos_total',       COALESCE(SUM(ingresos_total),       0),
        'ingresos_pagados',     COALESCE(SUM(ingresos_pagados),     0),
        'ingresos_pendientes',  COALESCE(SUM(ingresos_pendientes),  0),
        'facturas_emitidas',    COALESCE(SUM(facturas_emitidas),    0),
        'facturas_pagadas',     COALESCE(SUM(facturas_pagadas),     0),
        'consultas_completadas',COALESCE(SUM(consultas_completadas),0)
    ) INTO v_actual
    FROM metrica_snapshot
    WHERE periodo = 'dia' AND fecha BETWEEN v_desde AND v_hasta;

    -- ── Periodo anterior ──────────────────────────────────────────────
    SELECT jsonb_build_object(
        'pacientes_nuevos',    COALESCE(SUM(pacientes_nuevos),    0),
        'pacientes_atendidos', COALESCE(SUM(pacientes_atendidos), 0),
        'citas_realizadas',    COALESCE(SUM(citas_realizadas),    0),
        'citas_canceladas',    COALESCE(SUM(citas_canceladas),    0),
        'ingresos_total',      COALESCE(SUM(ingresos_total),      0),
        'ingresos_pagados',    COALESCE(SUM(ingresos_pagados),    0)
    ) INTO v_anterior
    FROM metrica_snapshot
    WHERE periodo = 'dia' AND fecha BETWEEN v_desde_prev AND v_hasta_prev;

    -- ── Serie diaria del período ──────────────────────────────────────
    SELECT jsonb_agg(jsonb_build_object(
        'dia', dia, 'citas', citas, 'canceladas', canceladas,
        'pacientes_nuevos', pacientes_nuevos, 'ingresos', ingresos
    ) ORDER BY dia)
    INTO v_serie
    FROM vw_serie_diaria
    WHERE dia BETWEEN v_desde AND v_hasta;

    -- ── Horas pico (siempre últimos 30 días) ──────────────────────────
    SELECT jsonb_agg(jsonb_build_object('hora', hora, 'citas', citas) ORDER BY hora)
    INTO v_horas_pico
    FROM vw_horas_pico;

    RETURN jsonb_build_object(
        'periodo',  p_periodo,
        'desde',    v_desde, 'hasta', v_hasta,
        'desde_prev', v_desde_prev, 'hasta_prev', v_hasta_prev,
        'actual',   COALESCE(v_actual, '{}'::jsonb),
        'anterior', COALESCE(v_anterior, '{}'::jsonb),
        'horarios_ocupados', (
            SELECT COUNT(*) FROM cita
            WHERE DATE(fecha_cita) BETWEEN v_desde AND v_hasta
              AND deleted_at IS NULL AND estado NOT IN ('cancelada')
        ),
        'inventario_criticos', (
            SELECT COUNT(*) FROM medicamento WHERE activo = TRUE AND stock <= 10
        ),
        'usuarios_activos', (
            SELECT COUNT(*) FROM usuario
            WHERE activo = TRUE AND ultimo_acceso >= NOW() - INTERVAL '30 days'
        ),
        'alertas_activas', (
            SELECT COUNT(*) FROM alerta WHERE estado = 'activa'
        ),
        'serie',      COALESCE(v_serie, '[]'::jsonb),
        'horas_pico', COALESCE(v_horas_pico, '[]'::jsonb),
        'demografia', (SELECT jsonb_agg(row_to_json(t)) FROM vw_pacientes_demografia t),
        'top_medicos', (SELECT jsonb_agg(t) FROM (
            SELECT id_medico, medico, especialidad, mes
            FROM vw_consultas_por_medico ORDER BY mes DESC LIMIT 5
        ) t),
        'inventario_critico_top', (SELECT jsonb_agg(t) FROM (
            SELECT * FROM vw_inventario_critico WHERE estado_stock IN ('critico','agotado','bajo')
            ORDER BY stock ASC LIMIT 5
        ) t)
    );
END $$;

GRANT EXECUTE ON FUNCTION rpc_dashboard_kpis TO authenticated;

-- =====================================================================
-- BACKFILL — Ejecutar UNA VEZ tras crear todo lo anterior
-- =====================================================================

-- Llena los últimos 90 días de snapshots. Idempotente, se puede repetir.
DO $$
DECLARE
    v_dia DATE;
BEGIN
    FOR v_dia IN
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '90 days',
            CURRENT_DATE,
            '1 day'::interval
        )::date
    LOOP
        PERFORM generar_snapshot_diario(v_dia);
    END LOOP;
END $$;

-- =====================================================================
-- CRON — Snapshots automáticos diarios
-- =====================================================================
-- Si pg_cron está habilitado, registramos el job. Si ya existe se ignora.
-- IMPORTANTE: pg_cron solo está disponible en planes Supabase Pro+. Si tu
-- proyecto es Free, comenta este bloque y ejecuta el snapshot manualmente
-- desde la app (botón "Recalcular hoy" en el dashboard, que llamará rpc).

DO $$
BEGIN
    -- Solo schedule si no existe ya
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'snapshot_diario') THEN
        PERFORM cron.schedule('snapshot_diario', '5 0 * * *',
            'SELECT generar_snapshot_diario();');
    END IF;
EXCEPTION
    WHEN undefined_table OR undefined_function THEN
        RAISE NOTICE 'pg_cron no disponible — saltando schedule. El snapshot puede ejecutarse manualmente.';
END $$;
