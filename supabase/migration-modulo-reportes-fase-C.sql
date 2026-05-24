-- =====================================================================
-- Módulo Reportes — Fase C
-- 7 RPCs para reportes detallados (pacientes, médicos, horarios, financiero,
-- inventario, auditoría, usuarios). Cada RPC retorna JSON listo para
-- consumir desde el frontend.
--
-- Requiere: migration-modulo-reportes.sql (Fase A+B) ejecutada antes.
-- =====================================================================

-- ─── Vistas auxiliares adicionales ───────────────────────────────────────────

-- Pacientes inactivos (sin consulta en > N meses)
CREATE OR REPLACE VIEW vw_pacientes_inactivos AS
SELECT
    p.id_paciente,
    p.numero_historia,
    per.nombres || ' ' || per.apellidos AS nombre_completo,
    per.documento,
    per.email,
    per.telefono,
    (SELECT MAX(c.fecha_consulta) FROM consulta_medica c
        WHERE c.id_paciente = p.id_paciente AND c.deleted_at IS NULL) AS ultima_consulta,
    EXTRACT(DAY FROM NOW() - COALESCE(
        (SELECT MAX(c.fecha_consulta) FROM consulta_medica c
            WHERE c.id_paciente = p.id_paciente AND c.deleted_at IS NULL),
        p.created_at
    ))::INT AS dias_sin_visita
FROM paciente p
JOIN persona per ON per.id_persona = p.id_persona
WHERE p.deleted_at IS NULL;

GRANT SELECT ON vw_pacientes_inactivos TO authenticated;

-- =====================================================================
-- RPC: REPORTE DE PACIENTES
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_reporte_pacientes(
    p_desde DATE, p_hasta DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'desde', p_desde, 'hasta', p_hasta,
        'totales', jsonb_build_object(
            'registrados',  (SELECT COUNT(*) FROM paciente WHERE deleted_at IS NULL),
            'nuevos',       (SELECT COUNT(*) FROM paciente
                WHERE deleted_at IS NULL
                  AND DATE(created_at) BETWEEN p_desde AND p_hasta),
            'atendidos',    (SELECT COUNT(DISTINCT id_paciente) FROM consulta_medica
                WHERE deleted_at IS NULL
                  AND DATE(fecha_consulta) BETWEEN p_desde AND p_hasta),
            'inactivos_12m',(SELECT COUNT(*) FROM vw_pacientes_inactivos
                WHERE dias_sin_visita >= 365)
        ),
        'demografia',      (SELECT jsonb_agg(row_to_json(t)) FROM vw_pacientes_demografia t),
        'nuevos_por_dia',  (SELECT jsonb_agg(jsonb_build_object('dia', dia, 'nuevos', pacientes_nuevos) ORDER BY dia)
            FROM vw_serie_diaria WHERE dia BETWEEN p_desde AND p_hasta),
        'diagnosticos_top',(SELECT jsonb_agg(t) FROM (
            SELECT diagnostico, codigo_cie10, frecuencia, pacientes_unicos
            FROM vw_diagnosticos_frecuentes LIMIT 10
        ) t),
        'frecuentes_top',  (SELECT jsonb_agg(t) FROM (
            SELECT
                p.id_paciente,
                per.nombres || ' ' || per.apellidos AS paciente,
                per.documento,
                COUNT(c.id_consulta) AS visitas,
                MAX(c.fecha_consulta) AS ultima_visita
            FROM paciente p
            JOIN persona per ON per.id_persona = p.id_persona
            JOIN consulta_medica c ON c.id_paciente = p.id_paciente AND c.deleted_at IS NULL
            WHERE DATE(c.fecha_consulta) BETWEEN p_desde AND p_hasta
            GROUP BY p.id_paciente, per.nombres, per.apellidos, per.documento
            ORDER BY visitas DESC
            LIMIT 10
        ) t),
        'inactivos',       (SELECT jsonb_agg(t) FROM (
            SELECT id_paciente, nombre_completo, documento, email, telefono,
                   ultima_consulta, dias_sin_visita
            FROM vw_pacientes_inactivos
            WHERE dias_sin_visita >= 365
            ORDER BY dias_sin_visita DESC
            LIMIT 50
        ) t)
    );
END $$;

GRANT EXECUTE ON FUNCTION rpc_reporte_pacientes TO authenticated;

-- =====================================================================
-- RPC: REPORTE DE MÉDICOS
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_reporte_medicos(
    p_desde DATE, p_hasta DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'desde', p_desde, 'hasta', p_hasta,
        'totales', jsonb_build_object(
            'medicos_activos',  (SELECT COUNT(*) FROM medico
                WHERE deleted_at IS NULL AND activo = TRUE),
            'consultas_total',  (SELECT COUNT(*) FROM consulta_medica
                WHERE deleted_at IS NULL
                  AND DATE(fecha_consulta) BETWEEN p_desde AND p_hasta),
            'tiempo_promedio',  (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60))::INT
                FROM consulta_medica
                WHERE deleted_at IS NULL
                  AND DATE(fecha_consulta) BETWEEN p_desde AND p_hasta),
            'cancelaciones', (SELECT COUNT(*) FROM cita
                WHERE deleted_at IS NULL AND estado = 'cancelada'
                  AND DATE(fecha_cita) BETWEEN p_desde AND p_hasta)
        ),
        'por_medico', (SELECT jsonb_agg(t ORDER BY t.consultas DESC) FROM (
            SELECT
                m.id_medico,
                per.nombres || ' ' || per.apellidos AS medico,
                m.especialidad,
                COUNT(DISTINCT c.id_consulta) AS consultas,
                COUNT(DISTINCT c.id_paciente) AS pacientes_unicos,
                COUNT(DISTINCT ci.id_cita) FILTER (WHERE ci.estado = 'cancelada') AS canceladas,
                ROUND(AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at))/60))::INT AS min_promedio,
                ROUND(
                    COUNT(DISTINCT c.id_consulta)::NUMERIC
                    / NULLIF((p_hasta - p_desde + 1), 0), 2
                )::NUMERIC AS consultas_por_dia
            FROM medico m
            JOIN persona per ON per.id_persona = m.id_persona
            LEFT JOIN consulta_medica c
                ON c.id_medico = m.id_medico AND c.deleted_at IS NULL
                AND DATE(c.fecha_consulta) BETWEEN p_desde AND p_hasta
            LEFT JOIN cita ci ON ci.id_medico = m.id_medico
                AND DATE(ci.fecha_cita) BETWEEN p_desde AND p_hasta
            WHERE m.deleted_at IS NULL
            GROUP BY m.id_medico, per.nombres, per.apellidos, m.especialidad
        ) t),
        'por_especialidad', (SELECT jsonb_agg(t ORDER BY t.consultas DESC) FROM (
            SELECT
                COALESCE(m.especialidad, 'Sin especialidad') AS especialidad,
                COUNT(DISTINCT c.id_consulta) AS consultas,
                COUNT(DISTINCT m.id_medico) AS medicos
            FROM medico m
            LEFT JOIN consulta_medica c
                ON c.id_medico = m.id_medico AND c.deleted_at IS NULL
                AND DATE(c.fecha_consulta) BETWEEN p_desde AND p_hasta
            WHERE m.deleted_at IS NULL
            GROUP BY m.especialidad
        ) t)
    );
END $$;

GRANT EXECUTE ON FUNCTION rpc_reporte_medicos TO authenticated;

-- =====================================================================
-- RPC: REPORTE DE HORARIOS
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_reporte_horarios(
    p_desde DATE, p_hasta DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_dias INT := p_hasta - p_desde + 1;
BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'desde', p_desde, 'hasta', p_hasta,
        'totales', jsonb_build_object(
            'ocupados',    (SELECT COUNT(*) FROM cita
                WHERE deleted_at IS NULL
                  AND DATE(fecha_cita) BETWEEN p_desde AND p_hasta
                  AND estado IN ('confirmada','completada','en_curso')),
            'canceladas',  (SELECT COUNT(*) FROM cita
                WHERE deleted_at IS NULL
                  AND DATE(fecha_cita) BETWEEN p_desde AND p_hasta
                  AND estado = 'cancelada'),
            'no_asistio',  (SELECT COUNT(*) FROM cita
                WHERE deleted_at IS NULL
                  AND DATE(fecha_cita) BETWEEN p_desde AND p_hasta
                  AND estado = 'no_asistio'),
            'completadas', (SELECT COUNT(*) FROM cita
                WHERE deleted_at IS NULL
                  AND DATE(fecha_cita) BETWEEN p_desde AND p_hasta
                  AND estado = 'completada')
        ),
        'horas_pico', (SELECT jsonb_agg(jsonb_build_object('hora', hora, 'citas', citas) ORDER BY hora)
            FROM vw_horas_pico),
        'por_dia_semana', (SELECT jsonb_agg(t ORDER BY dow) FROM (
            SELECT
                EXTRACT(DOW FROM fecha_cita)::INT AS dow,
                CASE EXTRACT(DOW FROM fecha_cita)::INT
                    WHEN 0 THEN 'Domingo'    WHEN 1 THEN 'Lunes'
                    WHEN 2 THEN 'Martes'     WHEN 3 THEN 'Miércoles'
                    WHEN 4 THEN 'Jueves'     WHEN 5 THEN 'Viernes'
                    WHEN 6 THEN 'Sábado'
                END AS dia,
                COUNT(*) AS citas,
                COUNT(*) FILTER (WHERE estado = 'cancelada') AS canceladas
            FROM cita
            WHERE deleted_at IS NULL
              AND DATE(fecha_cita) BETWEEN p_desde AND p_hasta
            GROUP BY dow
        ) t),
        'ocupacion_por_dia', (SELECT jsonb_agg(jsonb_build_object('dia', dia, 'citas', citas, 'canceladas', canceladas) ORDER BY dia)
            FROM vw_serie_diaria WHERE dia BETWEEN p_desde AND p_hasta),
        'reprogramaciones', 0,
        'periodo_dias', v_dias
    );
END $$;

GRANT EXECUTE ON FUNCTION rpc_reporte_horarios TO authenticated;

-- =====================================================================
-- RPC: REPORTE FINANCIERO
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_reporte_financiero(
    p_desde DATE, p_hasta DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'desde', p_desde, 'hasta', p_hasta,
        'totales', jsonb_build_object(
            'emitidas',         (SELECT COUNT(*) FROM factura
                WHERE deleted_at IS NULL
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
            'ingresos_facturados', (SELECT COALESCE(SUM(total),0) FROM factura
                WHERE deleted_at IS NULL
                  AND DATE(fecha_emision) BETWEEN p_desde AND p_hasta),
            'ingresos_pagados', (SELECT COALESCE(SUM(total),0) FROM factura
                WHERE deleted_at IS NULL AND estado = 'pagada'
                  AND DATE(fecha_pago) BETWEEN p_desde AND p_hasta),
            'por_cobrar',       (SELECT COALESCE(SUM(total),0) FROM factura
                WHERE deleted_at IS NULL AND estado IN ('pendiente','vencida')),
            'ticket_promedio',  (SELECT COALESCE(ROUND(AVG(total),0),0) FROM factura
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
                SUM(total) AS monto
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
-- RPC: REPORTE DE INVENTARIO
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_reporte_inventario()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'totales', jsonb_build_object(
            'total_medicamentos', (SELECT COUNT(*) FROM medicamento WHERE activo = TRUE),
            'agotados',           (SELECT COUNT(*) FROM medicamento WHERE activo=TRUE AND stock=0),
            'criticos',           (SELECT COUNT(*) FROM medicamento WHERE activo=TRUE AND stock>0 AND stock<=5),
            'bajos',              (SELECT COUNT(*) FROM medicamento WHERE activo=TRUE AND stock>5 AND stock<=10),
            'valor_inventario',   (SELECT COALESCE(SUM(stock*precio),0) FROM medicamento WHERE activo=TRUE),
            'categorias',         (SELECT COUNT(*) FROM categoria_medicamento)
        ),
        'criticos', (SELECT jsonb_agg(t) FROM (
            SELECT id_medicamento, nombre, nombre_generico, presentacion, stock,
                   precio, categoria, estado_stock
            FROM vw_inventario_critico
            ORDER BY stock ASC
        ) t),
        'mas_usados', (SELECT jsonb_agg(t ORDER BY t.recetas DESC) FROM (
            SELECT
                m.id_medicamento,
                m.nombre,
                m.presentacion,
                COUNT(o.id_orden) AS recetas,
                m.stock,
                m.precio
            FROM medicamento m
            LEFT JOIN orden_medica o ON o.id_medicamento = m.id_medicamento
            WHERE m.activo = TRUE
              AND (o.fecha_emision IS NULL OR o.fecha_emision >= NOW() - INTERVAL '90 days')
            GROUP BY m.id_medicamento, m.nombre, m.presentacion, m.stock, m.precio
            HAVING COUNT(o.id_orden) > 0
            ORDER BY recetas DESC
            LIMIT 15
        ) t),
        'por_categoria', (SELECT jsonb_agg(t ORDER BY total DESC) FROM (
            SELECT
                COALESCE(cat.nombre, 'Sin categoría') AS categoria,
                COUNT(m.id_medicamento) AS total,
                COALESCE(SUM(m.stock * m.precio), 0) AS valor
            FROM medicamento m
            LEFT JOIN categoria_medicamento cat ON cat.id_categoria = m.id_categoria
            WHERE m.activo = TRUE
            GROUP BY cat.nombre
        ) t)
    );
END $$;

GRANT EXECUTE ON FUNCTION rpc_reporte_inventario TO authenticated;

-- =====================================================================
-- RPC: REPORTE DE AUDITORÍA
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_reporte_auditoria(
    p_desde DATE,
    p_hasta DATE,
    p_tabla     TEXT DEFAULT NULL,
    p_operacion TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'desde', p_desde, 'hasta', p_hasta,
        'totales', (
            SELECT jsonb_build_object(
                'total',  COUNT(*),
                'insert', COUNT(*) FILTER (WHERE operacion = 'INSERT'),
                'update', COUNT(*) FILTER (WHERE operacion = 'UPDATE'),
                'delete', COUNT(*) FILTER (WHERE operacion = 'DELETE')
            )
            FROM vw_audit_log
            WHERE DATE(ocurrio_en) BETWEEN p_desde AND p_hasta
              AND (p_tabla     IS NULL OR tabla     = p_tabla)
              AND (p_operacion IS NULL OR operacion = p_operacion)
        ),
        'por_dia', (SELECT jsonb_agg(t ORDER BY dia) FROM (
            SELECT
                DATE(ocurrio_en) AS dia,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE operacion = 'INSERT') AS insertados,
                COUNT(*) FILTER (WHERE operacion = 'UPDATE') AS modificados,
                COUNT(*) FILTER (WHERE operacion = 'DELETE') AS eliminados
            FROM vw_audit_log
            WHERE DATE(ocurrio_en) BETWEEN p_desde AND p_hasta
              AND (p_tabla     IS NULL OR tabla     = p_tabla)
              AND (p_operacion IS NULL OR operacion = p_operacion)
            GROUP BY DATE(ocurrio_en)
        ) t),
        'por_tabla', (SELECT jsonb_agg(t ORDER BY total DESC) FROM (
            SELECT
                tabla,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE operacion = 'INSERT') AS insertados,
                COUNT(*) FILTER (WHERE operacion = 'UPDATE') AS modificados,
                COUNT(*) FILTER (WHERE operacion = 'DELETE') AS eliminados
            FROM vw_audit_log
            WHERE DATE(ocurrio_en) BETWEEN p_desde AND p_hasta
              AND (p_operacion IS NULL OR operacion = p_operacion)
            GROUP BY tabla
        ) t),
        'por_actor', (SELECT jsonb_agg(t ORDER BY total DESC) FROM (
            SELECT
                COALESCE(actor_nombre, '(sistema)') AS actor,
                actor_rol,
                COUNT(*) AS total
            FROM vw_audit_log
            WHERE DATE(ocurrio_en) BETWEEN p_desde AND p_hasta
              AND (p_tabla     IS NULL OR tabla     = p_tabla)
              AND (p_operacion IS NULL OR operacion = p_operacion)
            GROUP BY actor_nombre, actor_rol
            LIMIT 20
        ) t)
    );
END $$;

GRANT EXECUTE ON FUNCTION rpc_reporte_auditoria TO authenticated;

-- =====================================================================
-- RPC: REPORTE DE USUARIOS
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_reporte_usuarios()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;

    RETURN jsonb_build_object(
        'totales', jsonb_build_object(
            'total',     (SELECT COUNT(*) FROM usuario),
            'activos',   (SELECT COUNT(*) FROM usuario WHERE activo = TRUE),
            'inactivos', (SELECT COUNT(*) FROM usuario WHERE activo = FALSE),
            'conectados_30d', (SELECT COUNT(*) FROM usuario
                WHERE activo = TRUE AND ultimo_acceso >= NOW() - INTERVAL '30 days'),
            'nunca_conectados',(SELECT COUNT(*) FROM usuario WHERE ultimo_acceso IS NULL)
        ),
        'por_rol', (SELECT jsonb_agg(t ORDER BY total DESC) FROM (
            SELECT
                COALESCE(rol_nombre, 'sin rol') AS rol,
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE activo = TRUE) AS activos
            FROM vw_admin_usuarios
            GROUP BY rol_nombre
        ) t),
        'ultimos_accesos', (SELECT jsonb_agg(t) FROM (
            SELECT
                id_usuario,
                nombre_completo,
                email,
                username,
                rol_nombre,
                activo,
                ultimo_acceso
            FROM vw_admin_usuarios
            ORDER BY ultimo_acceso DESC NULLS LAST
            LIMIT 30
        ) t),
        'sin_conectar_30d', (SELECT jsonb_agg(t) FROM (
            SELECT
                id_usuario,
                nombre_completo,
                email,
                rol_nombre,
                ultimo_acceso
            FROM vw_admin_usuarios
            WHERE activo = TRUE
              AND (ultimo_acceso IS NULL OR ultimo_acceso < NOW() - INTERVAL '30 days')
            ORDER BY ultimo_acceso ASC NULLS FIRST
            LIMIT 30
        ) t)
    );
END $$;

GRANT EXECUTE ON FUNCTION rpc_reporte_usuarios TO authenticated;

-- =====================================================================
-- RPC: REGISTRAR DESCARGA DE REPORTE
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_registrar_descarga_reporte(
    p_tipo TEXT, p_formato TEXT,
    p_desde DATE, p_hasta DATE,
    p_parametros JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_id BIGINT;
BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;
    INSERT INTO reporte_generado (
        tipo, formato, periodo_desde, periodo_hasta, parametros, generado_por, descargado
    ) VALUES (
        p_tipo, p_formato, p_desde, p_hasta, p_parametros, auth.uid(), TRUE
    ) RETURNING id_reporte INTO v_id;
    RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION rpc_registrar_descarga_reporte TO authenticated;
