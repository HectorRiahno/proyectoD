-- =====================================================================
-- MIGRACIÓN: cobertura EPS — descuento 100% al marcar pagada
--
-- Regla de negocio: cuando el pago se registra con método = 'EPS', la
-- EPS cubre el 100% del valor y el paciente no paga nada. La factura
-- queda con descuento = subtotal → total = 0.
--
-- El trigger `trg_factura_estado` original bloquea cambios financieros
-- en facturas ya emitidas. Esta migración lo flexibiliza SOLO para la
-- transición específica:  pendiente → pagada CON metodo_pago = 'EPS'.
--
-- Todos los demás campos (id_paciente, id_medico, numero_factura,
-- fecha_emision, subtotal) siguen bloqueados. Solo se permite ajustar
-- descuento/impuesto/total, que serán recomputados por el trigger
-- `trg_factura_recalc` ya existente.
--
-- Idempotente — REPLACE FUNCTION.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.trg_factura_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_es_pago_eps BOOLEAN;
BEGIN
    -- borrador → otro estado: asignar número y fecha_emisión
    IF TG_OP = 'UPDATE' AND OLD.estado = 'borrador' AND NEW.estado IS DISTINCT FROM 'borrador' THEN
        IF NEW.numero_factura IS NULL OR NEW.numero_factura = '' THEN
            NEW.numero_factura := generar_numero_factura();
        END IF;
        IF NEW.fecha_emision IS NULL THEN
            NEW.fecha_emision := NOW();
        END IF;
    END IF;

    -- → pagada: fijar fecha_pago automáticamente
    IF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM 'pagada' AND NEW.estado = 'pagada' THEN
        IF NEW.fecha_pago IS NULL THEN
            NEW.fecha_pago := NOW();
        END IF;
    END IF;

    -- → anulada: fijar fecha_anulacion automáticamente
    IF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM 'anulada' AND NEW.estado = 'anulada' THEN
        IF NEW.fecha_anulacion IS NULL THEN
            NEW.fecha_anulacion := NOW();
        END IF;
    END IF;

    -- Una vez emitida (no-borrador), bloquear edición de campos críticos.
    -- EXCEPCIÓN: pendiente→pagada con metodo='EPS' puede ajustar descuento
    -- para reflejar cobertura 100%.
    IF TG_OP = 'UPDATE' AND OLD.estado != 'borrador' AND OLD.estado != 'vencida' THEN
        v_es_pago_eps := (OLD.estado = 'pendiente'
                       AND NEW.estado = 'pagada'
                       AND UPPER(COALESCE(NEW.metodo_pago, '')) = 'EPS');

        IF NEW.id_paciente    IS DISTINCT FROM OLD.id_paciente    OR
           NEW.id_consulta    IS DISTINCT FROM OLD.id_consulta    OR
           NEW.id_medico      IS DISTINCT FROM OLD.id_medico      OR
           NEW.numero_factura IS DISTINCT FROM OLD.numero_factura OR
           NEW.fecha_emision  IS DISTINCT FROM OLD.fecha_emision  OR
           NEW.subtotal       IS DISTINCT FROM OLD.subtotal       OR
           (NOT v_es_pago_eps AND (
               NEW.descuento     IS DISTINCT FROM OLD.descuento     OR
               NEW.tasa_impuesto IS DISTINCT FROM OLD.tasa_impuesto OR
               NEW.impuesto      IS DISTINCT FROM OLD.impuesto      OR
               NEW.total         IS DISTINCT FROM OLD.total
           ))
        THEN
            RAISE EXCEPTION 'Factura ya emitida (%): no se pueden modificar campos financieros. Anúlala y crea una nueva.', OLD.numero_factura
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- El trigger ya está creado en migration-facturacion.sql; CREATE OR REPLACE
-- de la función basta para que la nueva lógica tome efecto.


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Marcar pagada con EPS (debe permitir set descuento = subtotal):
--    UPDATE factura SET estado='pagada', metodo_pago='EPS',
--                        descuento = subtotal
--      WHERE id_factura = X;   -- debe pasar, total = 0
--
-- 2. Intentar cambiar descuento en factura pendiente con otro método:
--    UPDATE factura SET descuento = 1000 WHERE id_factura = X;
--    -- debe fallar: "no se pueden modificar campos financieros"
