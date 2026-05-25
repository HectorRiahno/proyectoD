-- =====================================================================
-- MIGRACIÓN: vw_paciente_mis_facturas incluye datos del paciente
--
-- Problema: el PDF de factura que descarga el paciente desde MisFacturas
-- mostraba "—" en los campos de cliente (nombre, documento, email),
-- porque la vista filtra por mi_id_paciente() y no exponía esos campos.
--
-- Para cumplir los requisitos DIAN de factura electrónica, el PDF debe
-- incluir nombre + tipo y número de documento del adquiriente. Esta
-- migración añade esos campos (también email, teléfono, numero_historia)
-- a la vista usada por el paciente.
--
-- Idempotente.
-- =====================================================================

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
    f.tasa_impuesto,
    f.impuesto,
    f.total,
    f.metodo_pago,
    f.observaciones,
    f.motivo_anulacion,
    -- Datos del paciente (necesarios para el PDF DIAN)
    f.id_paciente,
    pa.numero_historia,
    (pe.nombres || ' ' || pe.apellidos)  AS paciente_nombre,
    pe.documento                          AS paciente_documento,
    pe.tipo_documento                     AS paciente_tipo_documento,
    pe.email                              AS paciente_email,
    pe.telefono                           AS paciente_telefono,
    -- Médico (ya existía)
    f.id_medico,
    (mp.nombres || ' ' || mp.apellidos)   AS medico_nombre,
    m.especialidad                        AS medico_especialidad,
    f.id_consulta,
    (SELECT COUNT(*) FROM factura_item fi WHERE fi.id_factura = f.id_factura) AS items_count
FROM factura f
JOIN paciente pa     ON pa.id_paciente = f.id_paciente
JOIN persona  pe     ON pe.id_persona  = pa.id_persona
LEFT JOIN medico  m  ON m.id_medico    = f.id_medico
LEFT JOIN persona mp ON mp.id_persona  = m.id_persona
WHERE f.id_paciente = mi_id_paciente()
  AND f.estado != 'borrador'        -- el paciente nunca ve borradores
  AND f.deleted_at IS NULL
ORDER BY f.fecha_emision DESC;

GRANT SELECT ON vw_paciente_mis_facturas TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- Conectado como paciente:
--   SELECT id_factura, numero_factura, paciente_nombre, paciente_documento,
--          paciente_tipo_documento, paciente_email
--     FROM vw_paciente_mis_facturas LIMIT 5;
-- Todos los campos paciente_* deben venir poblados.
