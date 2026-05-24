-- =====================================================================
-- MIGRACIÓN: Esquema completo de facturación
--
-- Componentes:
--   1. Extender `factura` (estados borrador/pendiente/pagada/anulada/vencida,
--      campos médico, descuento, IVA, fechas pago/anulación, etc.)
--   2. Nueva tabla `factura_item` (líneas de detalle de cada factura)
--   3. Numeración secuencial automática: FAC-2026-0001
--   4. Recálculo automático de subtotal/impuesto/total al cambiar items
--   5. Transiciones de estado controladas por trigger:
--        borrador → pendiente   = asigna número y fecha_emisión
--        pendiente → pagada     = fija fecha_pago
--        cualquiera → anulada   = fija fecha_anulación
--   6. RLS: paciente ve sus facturas, admin/asistente gestionan
--   7. Audit log + audit columns sobre factura y factura_item
--   8. Vistas vw_admin_facturas y vw_paciente_mis_facturas
--
-- Pre-requisitos: migration-audit-columns.sql, migration-audit-log.sql,
-- migration-soft-delete.sql ya ejecutados.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.
-- =====================================================================


-- =====================================================================
-- 1. EXTENDER tabla factura
-- =====================================================================

-- 1.a Permitir numero_factura NULL (los borradores no tienen número)
ALTER TABLE factura ALTER COLUMN numero_factura DROP NOT NULL;

-- 1.b Quitar default NOW() de fecha_emision — debe quedar NULL en borradores
ALTER TABLE factura ALTER COLUMN fecha_emision DROP DEFAULT;

-- 1.c Renovar el CHECK del estado (incluye 'borrador')
ALTER TABLE factura DROP CONSTRAINT IF EXISTS factura_estado_check;
ALTER TABLE factura ADD CONSTRAINT factura_estado_check
    CHECK (estado IN ('borrador','pendiente','pagada','anulada','vencida'));
ALTER TABLE factura ALTER COLUMN estado SET DEFAULT 'borrador';

-- 1.d Nuevas columnas
ALTER TABLE factura
    ADD COLUMN IF NOT EXISTS id_medico         BIGINT REFERENCES medico(id_medico),
    ADD COLUMN IF NOT EXISTS tasa_impuesto     NUMERIC(5,4)  NOT NULL DEFAULT 0
        CHECK (tasa_impuesto >= 0 AND tasa_impuesto <= 1),
    ADD COLUMN IF NOT EXISTS descuento         NUMERIC(12,2) NOT NULL DEFAULT 0
        CHECK (descuento >= 0),
    ADD COLUMN IF NOT EXISTS fecha_pago        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS fecha_anulacion   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_anulacion  TEXT,
    ADD COLUMN IF NOT EXISTS observaciones     TEXT,
    ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- 1.e Índices útiles
CREATE INDEX IF NOT EXISTS idx_factura_estado          ON factura(estado);
CREATE INDEX IF NOT EXISTS idx_factura_medico          ON factura(id_medico);
CREATE INDEX IF NOT EXISTS idx_factura_fecha_emision   ON factura(fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_factura_numero          ON factura(numero_factura);


-- =====================================================================
-- 2. TABLA factura_item (líneas de detalle)
-- =====================================================================
CREATE TABLE IF NOT EXISTS factura_item (
    id_item            BIGSERIAL PRIMARY KEY,
    id_factura         BIGINT NOT NULL REFERENCES factura(id_factura) ON DELETE CASCADE,
    descripcion        VARCHAR(255) NOT NULL,
    cantidad           NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    precio_unitario    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0),
    subtotal           NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    -- Referencias opcionales al origen del item (para reportes)
    id_tipo_consulta   BIGINT REFERENCES tipo_consulta(id_tipo_consulta),
    id_medicamento     BIGINT REFERENCES medicamento(id_medicamento),
    id_procedimiento   BIGINT REFERENCES procedimiento(id_procedimiento),
    id_orden_medica    BIGINT REFERENCES orden_medica(id_orden) ON DELETE SET NULL,
    orden              INTEGER DEFAULT 1,
    notas              TEXT,
    -- Audit (los llena set_audit_fields)
    created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    updated_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factura_item_factura ON factura_item(id_factura);

ALTER TABLE factura_item ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 3. AUDIT COLUMNS + AUDIT LOG para factura y factura_item
-- =====================================================================
-- factura: añadir columnas faltantes (created_by, updated_*) si no existen
ALTER TABLE factura
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Triggers set_audit_fields (reutiliza función de migration-audit-columns.sql)
DROP TRIGGER IF EXISTS trg_audit_factura ON factura;
CREATE TRIGGER trg_audit_factura
    BEFORE INSERT OR UPDATE ON factura
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

DROP TRIGGER IF EXISTS trg_audit_factura_item ON factura_item;
CREATE TRIGGER trg_audit_factura_item
    BEFORE INSERT OR UPDATE ON factura_item
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- Audit log (reutiliza audit_log_trigger de migration-audit-log.sql)
DROP TRIGGER IF EXISTS trg_audit_log_factura ON factura;
CREATE TRIGGER trg_audit_log_factura
    AFTER INSERT OR UPDATE OR DELETE ON factura
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_factura');

DROP TRIGGER IF EXISTS trg_audit_log_factura_item ON factura_item;
CREATE TRIGGER trg_audit_log_factura_item
    AFTER INSERT OR UPDATE OR DELETE ON factura_item
    FOR EACH ROW EXECUTE FUNCTION audit_log_trigger('id_item');


-- =====================================================================
-- 4. NUMERACIÓN SECUENCIAL POR AÑO (FAC-YYYY-NNNN)
-- =====================================================================
CREATE TABLE IF NOT EXISTS factura_contador (
    anio           INTEGER PRIMARY KEY,
    ultimo_numero  INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generar_numero_factura()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_anio   INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
    v_numero INTEGER;
BEGIN
    -- ON CONFLICT atomic: contador thread-safe bajo concurrencia
    INSERT INTO factura_contador (anio, ultimo_numero)
    VALUES (v_anio, 1)
    ON CONFLICT (anio) DO UPDATE
        SET ultimo_numero = factura_contador.ultimo_numero + 1
    RETURNING ultimo_numero INTO v_numero;

    RETURN 'FAC-' || v_anio || '-' || LPAD(v_numero::TEXT, 4, '0');
END;
$$;


-- =====================================================================
-- 5. RECÁLCULO AUTOMÁTICO DE TOTALES
-- =====================================================================
-- Función pura: recalcula subtotal/impuesto/total de UNA factura
-- a partir de sus items. Idempotente y segura para llamar desde triggers.
CREATE OR REPLACE FUNCTION public.recalcular_factura_totales(p_id_factura BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subtotal NUMERIC(12,2);
    v_tasa     NUMERIC(5,4);
    v_desc     NUMERIC(12,2);
    v_neto     NUMERIC(12,2);
    v_iva      NUMERIC(12,2);
    v_total    NUMERIC(12,2);
BEGIN
    SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal
    FROM factura_item WHERE id_factura = p_id_factura;

    SELECT COALESCE(tasa_impuesto, 0), COALESCE(descuento, 0)
    INTO v_tasa, v_desc
    FROM factura WHERE id_factura = p_id_factura;

    v_neto  := GREATEST(v_subtotal - v_desc, 0);
    v_iva   := ROUND(v_neto * v_tasa, 2);
    v_total := ROUND(v_neto + v_iva, 2);

    UPDATE factura
    SET subtotal = v_subtotal,
        impuesto = v_iva,
        total    = v_total
    WHERE id_factura = p_id_factura;
END;
$$;

-- Trigger en factura_item: recalcula al INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.trg_factura_item_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM recalcular_factura_totales(COALESCE(NEW.id_factura, OLD.id_factura));
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_factura_item_recalc ON factura_item;
CREATE TRIGGER trg_factura_item_recalc
    AFTER INSERT OR UPDATE OR DELETE ON factura_item
    FOR EACH ROW EXECUTE FUNCTION trg_factura_item_recalc();

-- Trigger en factura: si cambia descuento o tasa_impuesto, recalcular.
CREATE OR REPLACE FUNCTION public.trg_factura_recalc()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.descuento IS DISTINCT FROM OLD.descuento
       OR NEW.tasa_impuesto IS DISTINCT FROM OLD.tasa_impuesto THEN
        PERFORM recalcular_factura_totales(NEW.id_factura);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_factura_recalc ON factura;
CREATE TRIGGER trg_factura_recalc
    AFTER UPDATE OF descuento, tasa_impuesto ON factura
    FOR EACH ROW EXECUTE FUNCTION trg_factura_recalc();


-- =====================================================================
-- 6. TRANSICIONES DE ESTADO controladas por trigger
-- =====================================================================
CREATE OR REPLACE FUNCTION public.trg_factura_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- Una vez emitida (no-borrador), bloquear edición de campos críticos
    -- (excepto el estado y campos de pago/anulación). Esto evita que el
    -- admin altere el subtotal de una factura ya emitida.
    IF TG_OP = 'UPDATE' AND OLD.estado != 'borrador' AND OLD.estado != 'vencida' THEN
        -- Solo se permite cambiar: estado, fecha_pago, fecha_anulacion,
        -- motivo_anulacion, metodo_pago, observaciones, deleted_*, updated_*
        IF NEW.id_paciente   IS DISTINCT FROM OLD.id_paciente   OR
           NEW.id_consulta   IS DISTINCT FROM OLD.id_consulta   OR
           NEW.id_medico     IS DISTINCT FROM OLD.id_medico     OR
           NEW.numero_factura IS DISTINCT FROM OLD.numero_factura OR
           NEW.fecha_emision  IS DISTINCT FROM OLD.fecha_emision  OR
           NEW.subtotal      IS DISTINCT FROM OLD.subtotal      OR
           NEW.descuento     IS DISTINCT FROM OLD.descuento     OR
           NEW.tasa_impuesto IS DISTINCT FROM OLD.tasa_impuesto OR
           NEW.impuesto      IS DISTINCT FROM OLD.impuesto      OR
           NEW.total         IS DISTINCT FROM OLD.total
        THEN
            RAISE EXCEPTION 'Factura ya emitida (%): no se pueden modificar campos financieros. Anúlala y crea una nueva.', OLD.numero_factura
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_factura_estado ON factura;
CREATE TRIGGER trg_factura_estado
    BEFORE UPDATE ON factura
    FOR EACH ROW EXECUTE FUNCTION trg_factura_estado();


-- =====================================================================
-- 7. RLS POLICIES
-- =====================================================================

-- ─── factura ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "factura_select"        ON factura;
DROP POLICY IF EXISTS "factura_insert_admin"  ON factura;
DROP POLICY IF EXISTS "factura_update_admin"  ON factura;
DROP POLICY IF EXISTS "factura_delete_admin"  ON factura;

CREATE POLICY "factura_select" ON factura FOR SELECT TO authenticated
    USING (
      (id_paciente = mi_id_paciente() OR es_admin_o_asistente())
      AND (deleted_at IS NULL OR es_admin())
    );

CREATE POLICY "factura_insert_admin" ON factura FOR INSERT TO authenticated
    WITH CHECK (es_admin_o_asistente());

CREATE POLICY "factura_update_admin" ON factura FOR UPDATE TO authenticated
    USING    (es_admin_o_asistente())
    WITH CHECK (es_admin_o_asistente());

CREATE POLICY "factura_delete_admin" ON factura FOR DELETE TO authenticated
    USING (es_admin());

GRANT SELECT, INSERT, UPDATE ON factura TO authenticated;


-- ─── factura_item ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "factura_item_select"        ON factura_item;
DROP POLICY IF EXISTS "factura_item_write_borrador" ON factura_item;

-- Puede leer las líneas si puede leer la factura padre
CREATE POLICY "factura_item_select" ON factura_item FOR SELECT TO authenticated
    USING (
      id_factura IN (
        SELECT id_factura FROM factura
        WHERE id_paciente = mi_id_paciente() OR es_admin_o_asistente()
      )
    );

-- Solo se pueden modificar las líneas si la factura está en 'borrador'
-- (una vez emitida, está congelada — cualquier corrección requiere anular).
CREATE POLICY "factura_item_write_borrador" ON factura_item FOR ALL TO authenticated
    USING (
      es_admin_o_asistente()
      AND id_factura IN (SELECT id_factura FROM factura WHERE estado = 'borrador')
    )
    WITH CHECK (
      es_admin_o_asistente()
      AND id_factura IN (SELECT id_factura FROM factura WHERE estado = 'borrador')
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON factura_item TO authenticated;


-- =====================================================================
-- 8. VISTAS
-- =====================================================================
DROP VIEW IF EXISTS vw_admin_facturas CASCADE;
CREATE VIEW vw_admin_facturas AS
SELECT
    f.id_factura,
    f.numero_factura,
    f.estado,
    f.fecha_emision,
    f.fecha_pago,
    f.fecha_anulacion,
    f.fecha_vencimiento,
    f.motivo_anulacion,
    f.subtotal,
    f.descuento,
    f.tasa_impuesto,
    f.impuesto,
    f.total,
    f.metodo_pago,
    f.observaciones,
    f.id_paciente,
    pa.numero_historia,
    (pe.nombres || ' ' || pe.apellidos)        AS paciente_nombre,
    pe.documento                               AS paciente_documento,
    pe.email                                   AS paciente_email,
    pe.telefono                                AS paciente_telefono,
    f.id_medico,
    (mp.nombres || ' ' || mp.apellidos)        AS medico_nombre,
    m.especialidad                             AS medico_especialidad,
    f.id_consulta,
    f.created_at,
    f.created_by,
    f.updated_at,
    f.updated_by,
    f.deleted_at,
    (SELECT COUNT(*) FROM factura_item fi WHERE fi.id_factura = f.id_factura) AS items_count
FROM factura f
LEFT JOIN paciente pa ON pa.id_paciente = f.id_paciente
LEFT JOIN persona  pe ON pe.id_persona  = pa.id_persona
LEFT JOIN medico   m  ON m.id_medico    = f.id_medico
LEFT JOIN persona  mp ON mp.id_persona  = m.id_persona
WHERE f.deleted_at IS NULL;

GRANT SELECT ON vw_admin_facturas TO authenticated;


DROP VIEW IF EXISTS vw_paciente_mis_facturas CASCADE;
CREATE VIEW vw_paciente_mis_facturas AS
SELECT
    f.id_factura,
    f.numero_factura,
    f.estado,
    f.fecha_emision,
    f.fecha_vencimiento,
    f.fecha_pago,
    f.subtotal,
    f.descuento,
    f.impuesto,
    f.total,
    f.metodo_pago,
    f.id_medico,
    (mp.nombres || ' ' || mp.apellidos) AS medico_nombre,
    m.especialidad                      AS medico_especialidad,
    f.id_consulta,
    (SELECT COUNT(*) FROM factura_item fi WHERE fi.id_factura = f.id_factura) AS items_count
FROM factura f
LEFT JOIN medico m  ON m.id_medico  = f.id_medico
LEFT JOIN persona mp ON mp.id_persona = m.id_persona
WHERE f.id_paciente = mi_id_paciente()
  AND f.estado != 'borrador'        -- el paciente nunca ve borradores
  AND f.deleted_at IS NULL
ORDER BY f.fecha_emision DESC;

GRANT SELECT ON vw_paciente_mis_facturas TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Crear borrador:
--   INSERT INTO factura (id_paciente, id_medico, id_consulta, tasa_impuesto)
--   VALUES (1, 1, 1, 0.19) RETURNING id_factura, numero_factura, estado;
--   --> numero_factura = NULL, estado = 'borrador'
--
-- 2. Añadir líneas:
--   INSERT INTO factura_item (id_factura, descripcion, cantidad, precio_unitario)
--   VALUES (X, 'Consulta general', 1, 50000),
--          (X, 'Medicamento Y',    2, 12000);
--   --> el trigger recalcula automáticamente subtotal/iva/total en factura
--
-- 3. Emitir:
--   UPDATE factura SET estado = 'pendiente' WHERE id_factura = X;
--   --> numero_factura asignado (FAC-2026-0001), fecha_emision = NOW()
--
-- 4. Pagar:
--   UPDATE factura SET estado = 'pagada', metodo_pago = 'efectivo' WHERE id_factura = X;
--   --> fecha_pago = NOW()
--
-- 5. Intentar editar emitida — debe fallar:
--   UPDATE factura SET descuento = 5000 WHERE id_factura = X;
--   --> ERROR: Factura ya emitida (FAC-2026-0001)...
