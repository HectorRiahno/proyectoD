-- =====================================================================
-- MIGRACIÓN: Borrador automático de factura al guardar una consulta
--
-- Triggers:
--   A) AFTER INSERT en consulta_medica → crea factura en estado 'borrador'
--      con id_paciente / id_medico / id_consulta, y añade línea inicial
--      por el costo del tipo de consulta (si tipo_consulta.costo > 0).
--
--   B) AFTER INSERT en orden_medica → si la consulta tiene factura en
--      borrador, añade una línea con el medicamento + precio + dosis.
--      Si la factura ya fue emitida, no toca nada.
--
-- También expone una RPC `regenerar_factura_borrador(id_consulta)` para
-- forzar la creación si el trigger no se ejecutó (ej. consultas creadas
-- antes de esta migración).
--
-- Idempotente: la función A no crea factura si ya existe una para la
-- consulta. La función B solo añade líneas si hay borrador.
--
-- Pre-requisitos: migration-facturacion.sql ejecutado.
-- =====================================================================


-- =====================================================================
-- A) Trigger: crear factura borrador al insertar consulta_medica
-- =====================================================================
CREATE OR REPLACE FUNCTION public.crear_factura_borrador_consulta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_factura  BIGINT;
    v_existente   BIGINT;
    v_tipo_nombre TEXT;
    v_tipo_id     BIGINT;
    v_costo       NUMERIC(12,2);
BEGIN
    -- Idempotencia: si ya hay factura para esta consulta, no hacer nada
    SELECT id_factura INTO v_existente
    FROM factura
    WHERE id_consulta = NEW.id_consulta
      AND deleted_at IS NULL
    LIMIT 1;
    IF v_existente IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Crear el borrador (totales arrancan en 0 — el trigger de recálculo
    -- los ajustará cuando se añadan items).
    INSERT INTO factura (
        id_paciente, id_medico, id_consulta,
        estado, tasa_impuesto, descuento
    ) VALUES (
        NEW.id_paciente, NEW.id_medico, NEW.id_consulta,
        'borrador', 0, 0
    )
    RETURNING id_factura INTO v_id_factura;

    -- Línea inicial: costo del tipo de consulta (si la cita lo define)
    IF NEW.id_cita IS NOT NULL THEN
        SELECT tc.id_tipo_consulta, tc.nombre, COALESCE(tc.costo, 0)
        INTO v_tipo_id, v_tipo_nombre, v_costo
        FROM cita c
        JOIN tipo_consulta tc ON tc.id_tipo_consulta = c.id_tipo_consulta
        WHERE c.id_cita = NEW.id_cita;

        IF v_costo > 0 THEN
            INSERT INTO factura_item (
                id_factura, descripcion, cantidad, precio_unitario,
                id_tipo_consulta, orden
            ) VALUES (
                v_id_factura,
                'Consulta médica: ' || COALESCE(v_tipo_nombre, 'general'),
                1, v_costo,
                v_tipo_id, 1
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crear_factura_borrador ON consulta_medica;
CREATE TRIGGER trg_crear_factura_borrador
    AFTER INSERT ON consulta_medica
    FOR EACH ROW EXECUTE FUNCTION crear_factura_borrador_consulta();


-- =====================================================================
-- B) Trigger: añadir línea de factura cuando se receta un medicamento
-- =====================================================================
CREATE OR REPLACE FUNCTION public.agregar_factura_item_orden()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_factura BIGINT;
    v_med_nombre TEXT;
    v_med_pres   TEXT;
    v_med_precio NUMERIC(12,2);
    v_orden_n    INTEGER;
BEGIN
    -- Buscar la factura BORRADOR de la consulta vinculada
    SELECT id_factura INTO v_id_factura
    FROM factura
    WHERE id_consulta = NEW.id_consulta
      AND estado = 'borrador'
      AND deleted_at IS NULL
    LIMIT 1;

    -- Si no hay borrador o ya fue emitida, salir sin hacer nada
    IF v_id_factura IS NULL THEN
        RETURN NEW;
    END IF;

    -- Datos del medicamento
    SELECT m.nombre, m.presentacion, COALESCE(m.precio, 0)
    INTO v_med_nombre, v_med_pres, v_med_precio
    FROM medicamento m
    WHERE m.id_medicamento = NEW.id_medicamento;

    -- Calcular el siguiente número de orden visual
    SELECT COALESCE(MAX(orden), 0) + 1
    INTO v_orden_n
    FROM factura_item
    WHERE id_factura = v_id_factura;

    INSERT INTO factura_item (
        id_factura, descripcion, cantidad, precio_unitario,
        id_medicamento, id_orden_medica, orden, notas
    ) VALUES (
        v_id_factura,
        'Medicamento: ' || COALESCE(v_med_nombre, '—')
            || CASE WHEN v_med_pres IS NOT NULL THEN ' (' || v_med_pres || ')' ELSE '' END
            || CASE WHEN NEW.dosis  IS NOT NULL THEN ' — ' || NEW.dosis ELSE '' END,
        1,
        v_med_precio,
        NEW.id_medicamento,
        NEW.id_orden,
        v_orden_n,
        NULLIF(CONCAT_WS(' · ', NEW.frecuencia, NEW.duracion, NEW.indicaciones), '')
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agregar_factura_item_orden ON orden_medica;
CREATE TRIGGER trg_agregar_factura_item_orden
    AFTER INSERT ON orden_medica
    FOR EACH ROW EXECUTE FUNCTION agregar_factura_item_orden();


-- =====================================================================
-- C) RPC manual: regenerar borrador para una consulta
--    Útil cuando:
--      • La consulta existía antes de esta migración (sin trigger).
--      • Se anuló la factura anterior y se quiere empezar de nuevo.
--      • El admin quiere repoblar la factura desde los datos clínicos.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.regenerar_factura_borrador(p_id_consulta BIGINT)
RETURNS BIGINT   -- id_factura del borrador
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_id_factura  BIGINT;
    v_existente   factura%ROWTYPE;
    v_consulta    consulta_medica%ROWTYPE;
    v_tipo_id     BIGINT;
    v_tipo_nombre TEXT;
    v_costo       NUMERIC(12,2);
BEGIN
    IF NOT es_admin_o_asistente() THEN
        RAISE EXCEPTION 'Solo admin/asistente pueden generar facturas'
            USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_consulta FROM consulta_medica
    WHERE id_consulta = p_id_consulta AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consulta % no existe o fue eliminada', p_id_consulta;
    END IF;

    -- ¿Ya hay una factura para esta consulta?
    SELECT * INTO v_existente FROM factura
    WHERE id_consulta = p_id_consulta AND deleted_at IS NULL
    LIMIT 1;

    IF FOUND THEN
        IF v_existente.estado <> 'borrador' THEN
            RAISE EXCEPTION 'Ya existe factura % en estado %. Anúlala antes de regenerar.',
                v_existente.numero_factura, v_existente.estado;
        END IF;
        v_id_factura := v_existente.id_factura;
        -- Limpiar items existentes para repoblar
        DELETE FROM factura_item WHERE id_factura = v_id_factura;
    ELSE
        -- Crear borrador nuevo
        INSERT INTO factura (id_paciente, id_medico, id_consulta, estado)
        VALUES (v_consulta.id_paciente, v_consulta.id_medico, p_id_consulta, 'borrador')
        RETURNING id_factura INTO v_id_factura;
    END IF;

    -- Línea de la consulta (si la cita tiene tipo con costo)
    IF v_consulta.id_cita IS NOT NULL THEN
        SELECT tc.id_tipo_consulta, tc.nombre, COALESCE(tc.costo, 0)
        INTO v_tipo_id, v_tipo_nombre, v_costo
        FROM cita c JOIN tipo_consulta tc ON tc.id_tipo_consulta = c.id_tipo_consulta
        WHERE c.id_cita = v_consulta.id_cita;

        IF v_costo > 0 THEN
            INSERT INTO factura_item (id_factura, descripcion, cantidad, precio_unitario,
                                      id_tipo_consulta, orden)
            VALUES (v_id_factura,
                    'Consulta médica: ' || COALESCE(v_tipo_nombre, 'general'),
                    1, v_costo, v_tipo_id, 1);
        END IF;
    END IF;

    -- Líneas por cada orden_medica vinculada a la consulta
    INSERT INTO factura_item (id_factura, descripcion, cantidad, precio_unitario,
                              id_medicamento, id_orden_medica, orden, notas)
    SELECT v_id_factura,
           'Medicamento: ' || COALESCE(m.nombre, '—')
               || CASE WHEN m.presentacion IS NOT NULL THEN ' (' || m.presentacion || ')' ELSE '' END
               || CASE WHEN om.dosis IS NOT NULL THEN ' — ' || om.dosis ELSE '' END,
           1,
           COALESCE(m.precio, 0),
           om.id_medicamento,
           om.id_orden,
           (SELECT COALESCE(MAX(fi.orden), 0) FROM factura_item fi WHERE fi.id_factura = v_id_factura)
             + ROW_NUMBER() OVER (ORDER BY om.id_orden),
           NULLIF(CONCAT_WS(' · ', om.frecuencia, om.duracion, om.indicaciones), '')
    FROM orden_medica om
    LEFT JOIN medicamento m ON m.id_medicamento = om.id_medicamento
    WHERE om.id_consulta = p_id_consulta;

    -- Los triggers de recálculo en factura_item ya actualizaron los totales.
    RETURN v_id_factura;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerar_factura_borrador(BIGINT) TO authenticated;


-- =====================================================================
-- D) Backfill: crear borradores para consultas existentes sin factura
-- =====================================================================
-- Itera sobre todas las consultas no borradas que aún no tienen factura
-- y crea su borrador con líneas pre-llenas. Idempotente.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT cm.id_consulta
        FROM consulta_medica cm
        WHERE cm.deleted_at IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM factura f
              WHERE f.id_consulta = cm.id_consulta AND f.deleted_at IS NULL
          )
    LOOP
        BEGIN
            -- Reusar la lógica del trigger: crear borrador + línea consulta + medicamentos
            INSERT INTO factura (id_paciente, id_medico, id_consulta, estado)
            SELECT id_paciente, id_medico, id_consulta, 'borrador'
            FROM consulta_medica WHERE id_consulta = r.id_consulta;

            -- Líneas: consulta + medicamentos en una sola pasada via la RPC
            -- (nota: no podemos llamar regenerar_factura_borrador aquí porque
            --  requiere es_admin_o_asistente y este DO block corre como
            --  superuser, así que duplicamos lo esencial)
            INSERT INTO factura_item (id_factura, descripcion, cantidad, precio_unitario,
                                      id_tipo_consulta, orden)
            SELECT f.id_factura,
                   'Consulta médica: ' || COALESCE(tc.nombre, 'general'),
                   1, tc.costo, tc.id_tipo_consulta, 1
            FROM factura f
            JOIN consulta_medica cm ON cm.id_consulta = f.id_consulta
            JOIN cita c             ON c.id_cita      = cm.id_cita
            JOIN tipo_consulta tc   ON tc.id_tipo_consulta = c.id_tipo_consulta
            WHERE f.id_consulta = r.id_consulta
              AND tc.costo IS NOT NULL AND tc.costo > 0;

            INSERT INTO factura_item (id_factura, descripcion, cantidad, precio_unitario,
                                      id_medicamento, id_orden_medica, orden)
            SELECT f.id_factura,
                   'Medicamento: ' || COALESCE(m.nombre, '—'),
                   1, COALESCE(m.precio, 0),
                   om.id_medicamento, om.id_orden,
                   1 + ROW_NUMBER() OVER (PARTITION BY f.id_factura ORDER BY om.id_orden)
            FROM factura f
            JOIN orden_medica om ON om.id_consulta = f.id_consulta
            LEFT JOIN medicamento m ON m.id_medicamento = om.id_medicamento
            WHERE f.id_consulta = r.id_consulta;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Backfill: error en consulta % — %', r.id_consulta, SQLERRM;
        END;
    END LOOP;
END $$;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Crear una consulta nueva en la UI del médico (con cita vinculada).
--    Inmediatamente debería existir un borrador de factura:
--      SELECT id_factura, numero_factura, estado, subtotal, total
--      FROM factura
--      ORDER BY id_factura DESC LIMIT 1;
--
-- 2. Si la consulta tenía una orden_medica (medicamento recetado),
--    el borrador debería tener una línea por el medicamento:
--      SELECT * FROM factura_item
--      WHERE id_factura = <id> ORDER BY orden;
--
-- 3. Backfill aplicado correctamente:
--      SELECT COUNT(*) FROM consulta_medica WHERE deleted_at IS NULL;
--      SELECT COUNT(*) FROM factura WHERE deleted_at IS NULL;
--    (deberían ser similares, descontando consultas sin paciente/medico)
--
-- 4. Forzar regeneración manual:
--      SELECT regenerar_factura_borrador(<id_consulta>);
