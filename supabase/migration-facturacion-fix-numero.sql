-- =====================================================================
-- FIX: numeración de facturas robusta
--
-- Problema: la función generar_numero_factura() actual incrementa solo el
-- contador `factura_contador`. Si en la tabla `factura` ya existen
-- numeros (por data previa, tests, otro flujo) que coinciden con lo que
-- el contador devuelve, el UNIQUE de numero_factura rechaza el UPDATE:
--   "duplicate key value violates unique constraint factura_numero_factura_key"
--
-- Solución: la nueva función:
--   1. Calcula el MAX(numero_factura) real para el año actual en `factura`.
--   2. Asegura que el contador quede ≥ ese máximo.
--   3. Verifica que el candidato no exista; si existe (race extrema),
--      reintenta hasta 100 veces.
--
-- También sincronizamos el contador con los datos existentes para
-- arrancar sin sorpresas.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.
-- =====================================================================


-- ─── Función generadora robusta ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generar_numero_factura()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_anio       INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
    v_numero     INTEGER;
    v_max_db     INTEGER;
    v_intento    INTEGER := 0;
    v_candidate  TEXT;
BEGIN
    -- 1. Máximo numero ya usado en factura para el año actual
    --    (extrae el último bloque de dígitos del formato FAC-YYYY-NNNN)
    SELECT COALESCE(
        MAX(
            CASE WHEN numero_factura ~ ('^FAC-' || v_anio || '-\d+$')
                 THEN substring(numero_factura from '\d+$')::INTEGER
                 ELSE 0
            END
        ), 0)
    INTO v_max_db
    FROM factura
    WHERE numero_factura LIKE 'FAC-' || v_anio || '-%';

    -- 2. Loop con reintentos: incrementar contador y validar contra factura
    LOOP
        v_intento := v_intento + 1;

        INSERT INTO factura_contador (anio, ultimo_numero)
        VALUES (v_anio, GREATEST(v_max_db, 0) + 1)
        ON CONFLICT (anio) DO UPDATE
            SET ultimo_numero = GREATEST(factura_contador.ultimo_numero, v_max_db) + 1
        RETURNING ultimo_numero INTO v_numero;

        v_candidate := 'FAC-' || v_anio || '-' || LPAD(v_numero::TEXT, 4, '0');

        -- 3. Verificación paranoid: ¿alguien tiene ya ese número?
        IF NOT EXISTS (SELECT 1 FROM factura WHERE numero_factura = v_candidate) THEN
            RETURN v_candidate;
        END IF;

        -- Si existe (race condition extrema), recalcular max y reintentar
        SELECT COALESCE(
            MAX(
                CASE WHEN numero_factura ~ ('^FAC-' || v_anio || '-\d+$')
                     THEN substring(numero_factura from '\d+$')::INTEGER
                     ELSE 0
                END
            ), 0)
        INTO v_max_db
        FROM factura
        WHERE numero_factura LIKE 'FAC-' || v_anio || '-%';

        IF v_intento > 100 THEN
            RAISE EXCEPTION 'No se pudo generar número único de factura tras 100 intentos';
        END IF;
    END LOOP;
END;
$$;


-- ─── Sincronizar contador con la data actual ─────────────────────────
-- Asegura que el contador para cada año ≥ máximo número existente.
INSERT INTO factura_contador (anio, ultimo_numero)
SELECT
    CAST(substring(numero_factura from '^FAC-(\d{4})-') AS INTEGER) AS anio,
    MAX(CAST(substring(numero_factura from '\d+$') AS INTEGER))      AS max_numero
FROM factura
WHERE numero_factura ~ '^FAC-\d{4}-\d+$'
GROUP BY substring(numero_factura from '^FAC-(\d{4})-')
ON CONFLICT (anio) DO UPDATE
    SET ultimo_numero = GREATEST(factura_contador.ultimo_numero, EXCLUDED.ultimo_numero);


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Estado del contador después del fix:
--    SELECT * FROM factura_contador;
--
-- 2. ¿Hay números duplicados en factura?
--    SELECT numero_factura, COUNT(*) FROM factura
--    WHERE numero_factura IS NOT NULL
--    GROUP BY numero_factura HAVING COUNT(*) > 1;
--
-- 3. Probar la función:
--    SELECT generar_numero_factura();  -- debería devolver el siguiente número
--                                      -- libre (no consumirá si no se usa)
--    SELECT * FROM factura_contador;   -- ahora incrementado
--
-- 4. Intentar emitir la factura conflictiva de nuevo:
--    UPDATE factura SET estado = 'pendiente' WHERE id_factura = 10;
