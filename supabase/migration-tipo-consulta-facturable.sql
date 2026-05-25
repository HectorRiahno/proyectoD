-- =====================================================================
-- MIGRACIÓN: catálogo tipo_consulta para uso en facturación
--
-- Agrega entradas estandarizadas al catálogo `tipo_consulta` para que el
-- admin/asistente pueda seleccionarlas al armar líneas de factura sin
-- tipear descripción y precio cada vez.
--
-- No reemplaza ni renombra las existentes ('General', 'Control',
-- 'Urgencia', 'Especialista') que ya tienen citas asociadas por FK.
--
-- Los costos son sugeridos — el admin puede ajustarlos editando esta
-- tabla directamente o desde una futura UI de catálogo.
--
-- Idempotente — usa ON CONFLICT.
-- =====================================================================

INSERT INTO tipo_consulta (nombre, descripcion, duracion_min, costo) VALUES
    ('Consulta general',     'Atención médica general',                   30, 60000),
    ('Revisión de exámenes', 'Revisión y análisis de resultados clínicos', 20, 35000),
    ('Toma de exámenes',     'Toma de muestras / exámenes de laboratorio', 15, 25000)
ON CONFLICT (nombre) DO UPDATE SET
    descripcion  = EXCLUDED.descripcion,
    duracion_min = EXCLUDED.duracion_min,
    costo        = EXCLUDED.costo;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT nombre, costo FROM tipo_consulta ORDER BY nombre;
