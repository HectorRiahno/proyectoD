-- =====================================================================
-- MIGRACIÓN: Eliminar tablas que la aplicación no usa
--
-- Estas tablas vienen del diagrama original (schema.sql) y solo tienen
-- datos de prueba de seed.sql. Ningún archivo del frontend, servicio,
-- vista, RPC ni Edge Function las lee o escribe:
--   reserva, estado_general, vacuna,
--   cirugia, procedimiento_quirurgico, procedimiento, tipo_procedimiento,
--   tratamiento, categoria_tratamiento
--
-- También se quitan dos columnas de tablas en uso que apuntaban a ellas
-- (siempre NULL desde la app):
--   orden_medica.id_tratamiento   → tratamiento
--   factura_item.id_procedimiento → procedimiento
--
-- RESPALDO: antes de borrar, todo se copia al esquema `respaldo_legacy`
-- (no expuesto por la API). Para revertir, ver el final del archivo.
--
-- Sin CASCADE: si algo desconocido depende de estas tablas, la migración
-- falla y hace rollback completo. Idempotente.
-- =====================================================================

BEGIN;

-- ─── 1. Respaldo ─────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS respaldo_legacy;
REVOKE ALL ON SCHEMA respaldo_legacy FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'reserva', 'estado_general', 'vacuna',
        'cirugia', 'procedimiento_quirurgico', 'procedimiento', 'tipo_procedimiento',
        'tratamiento', 'categoria_tratamiento'
    ] LOOP
        IF to_regclass('public.' || t) IS NOT NULL
           AND to_regclass('respaldo_legacy.' || t) IS NULL THEN
            EXECUTE format('CREATE TABLE respaldo_legacy.%I AS TABLE public.%I', t, t);
            RAISE NOTICE 'Respaldada: %', t;
        END IF;
    END LOOP;

    -- Vínculos de las columnas que se eliminan
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'orden_medica'
                 AND column_name = 'id_tratamiento')
       AND to_regclass('respaldo_legacy.orden_medica_tratamiento') IS NULL THEN
        CREATE TABLE respaldo_legacy.orden_medica_tratamiento AS
            SELECT id_orden, id_tratamiento FROM public.orden_medica
            WHERE id_tratamiento IS NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'factura_item'
                 AND column_name = 'id_procedimiento')
       AND to_regclass('respaldo_legacy.factura_item_procedimiento') IS NULL THEN
        CREATE TABLE respaldo_legacy.factura_item_procedimiento AS
            SELECT id_item, id_procedimiento FROM public.factura_item
            WHERE id_procedimiento IS NOT NULL;
    END IF;
END $$;


-- ─── 2. Quitar columnas que apuntan a tablas eliminadas ──────────────
ALTER TABLE orden_medica DROP COLUMN IF EXISTS id_tratamiento;
ALTER TABLE factura_item DROP COLUMN IF EXISTS id_procedimiento;


-- ─── 3. Eliminar tablas (hijas antes que padres) ─────────────────────
DROP TABLE IF EXISTS procedimiento_quirurgico;
DROP TABLE IF EXISTS cirugia;
DROP TABLE IF EXISTS procedimiento;
DROP TABLE IF EXISTS tipo_procedimiento;
DROP TABLE IF EXISTS tratamiento;
DROP TABLE IF EXISTS categoria_tratamiento;
DROP TABLE IF EXISTS reserva;
DROP TABLE IF EXISTS estado_general;
DROP TABLE IF EXISTS vacuna;

COMMIT;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'respaldo_legacy' ORDER BY 1;   -- 11 tablas de respaldo
--
-- La app debe funcionar exactamente igual (ninguna pantalla las usaba).
--
-- =====================================================================
-- REVERTIR (si algún día se necesitan)
-- =====================================================================
-- CREATE TABLE public.vacuna AS TABLE respaldo_legacy.vacuna;
-- (repetir por tabla; luego recrear PKs/FKs/RLS tomando schema.sql
--  como referencia)
--
-- Cuando estés seguro de no necesitarlas:
-- DROP SCHEMA respaldo_legacy CASCADE;
-- =====================================================================
