-- =====================================================================
-- MIGRACIÓN: Vistas del paciente → security_invoker
--
-- Elimina las 11 alertas "Security Definer View" del Security Advisor.
-- Ejecutar DESPUÉS de migration-seguridad-hardening.sql.
--
-- Por qué estas vistas no se convirtieron en la migración anterior:
--   a) Muestran el nombre del médico, pero el RLS de `persona` no deja al
--      paciente leer la fila del médico (documento, teléfono, dirección...).
--      → Solución: función nombre_medico(id) SECURITY DEFINER que devuelve
--        SOLO el nombre. La vista corre con permisos del paciente y la
--        función expone únicamente ese dato.
--   b) vw_medico_adjuntos_paciente muestra adjuntos de otros médicos del
--      mismo paciente, pero el RLS de consulta_medica solo deja ver las
--      consultas propias.
--      → Solución: el médico puede leer las consultas de pacientes que ya
--        atendió (continuidad asistencial; es la misma regla que ya usan
--        orden_examen y consulta_adjunto).
--
-- Las columnas de cada vista no cambian → el frontend no se toca.
-- Transaccional e idempotente.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. HELPERS
-- =====================================================================

-- Nombre visible de un médico (sin exponer el resto de su `persona`)
CREATE OR REPLACE FUNCTION public.nombre_medico(p_id_medico BIGINT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT p.nombres || ' ' || p.apellidos
    FROM medico m
    JOIN persona p ON p.id_persona = m.id_persona
    WHERE m.id_medico = p_id_medico;
$$;

-- ¿El médico autenticado ha atendido alguna vez a este paciente?
-- SECURITY DEFINER para poder usarla dentro de la política de
-- consulta_medica sin recursión infinita de RLS.
CREATE OR REPLACE FUNCTION public.medico_atendio_paciente(p_id_paciente BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM consulta_medica
        WHERE id_paciente = p_id_paciente
          AND id_medico   = mi_id_medico()
          AND deleted_at IS NULL
    );
$$;

REVOKE EXECUTE ON FUNCTION public.nombre_medico(BIGINT)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.medico_atendio_paciente(BIGINT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.nombre_medico(BIGINT)           TO authenticated;
GRANT  EXECUTE ON FUNCTION public.medico_atendio_paciente(BIGINT) TO authenticated;


-- =====================================================================
-- 2. consulta_medica: el médico ve consultas de pacientes que atendió
-- =====================================================================
DROP POLICY IF EXISTS "consulta_select" ON consulta_medica;
CREATE POLICY "consulta_select" ON consulta_medica FOR SELECT TO authenticated
  USING (
    (id_paciente = mi_id_paciente()
     OR id_medico = mi_id_medico()
     OR medico_atendio_paciente(id_paciente)
     OR es_admin_o_asistente())
    AND (deleted_at IS NULL OR es_admin())
  );


-- =====================================================================
-- 3. RECREAR VISTAS CON security_invoker
--    (sin CASCADE: si algo desconocido depende de ellas, rollback)
-- =====================================================================
DROP VIEW IF EXISTS vw_paciente_proximas_citas;
DROP VIEW IF EXISTS vw_paciente_mis_citas;
DROP VIEW IF EXISTS vw_paciente_mi_perfil;
DROP VIEW IF EXISTS vw_paciente_mis_facturas;
DROP VIEW IF EXISTS vw_paciente_mis_signos;
DROP VIEW IF EXISTS vw_paciente_mis_adjuntos;
DROP VIEW IF EXISTS vw_medico_adjuntos_paciente;
DROP VIEW IF EXISTS vw_paciente_mi_historial;
DROP VIEW IF EXISTS vw_paciente_mis_medicamentos;
DROP VIEW IF EXISTS vw_paciente_mis_diagnosticos;
DROP VIEW IF EXISTS vw_paciente_mis_ordenes_examen;


-- ─── vw_paciente_mi_perfil ───────────────────────────────────────────
CREATE VIEW vw_paciente_mi_perfil
WITH (security_invoker = true) AS
SELECT
    pa.id_paciente,
    pa.numero_historia,
    h.tipo_sangre,
    h.alergias,
    h.enfermedades_cronicas,
    pa.contacto_emergencia,
    pa.ocupacion,
    pa.estado_civil,
    pp.documento, pp.tipo_documento, pp.nombres, pp.apellidos,
    (pp.nombres || ' ' || pp.apellidos)              AS nombre_completo,
    pp.fecha_nacimiento,
    EXTRACT(YEAR FROM AGE(pp.fecha_nacimiento))::INT AS edad,
    pp.genero, pp.email, pp.telefono, pp.direccion
FROM paciente pa
JOIN persona pp ON pp.id_persona = pa.id_persona
LEFT JOIN historial_clinico h ON h.id_paciente = pa.id_paciente
WHERE pa.id_paciente = mi_id_paciente();


-- ─── vw_paciente_mis_citas / proximas ────────────────────────────────
CREATE VIEW vw_paciente_mis_citas
WITH (security_invoker = true) AS
SELECT
    c.id_cita,
    c.fecha_cita,
    c.fecha_cita::date                          AS fecha,
    c.fecha_cita::time                          AS hora,
    c.estado,
    c.motivo,
    c.observaciones,
    c.id_medico,
    nombre_medico(c.id_medico)                  AS medico_nombre,
    m.especialidad                              AS medico_especialidad,
    m.consultorio                               AS medico_consultorio,
    tc.nombre                                   AS tipo_consulta
FROM cita c
LEFT JOIN medico        m  ON m.id_medico         = c.id_medico
LEFT JOIN tipo_consulta tc ON tc.id_tipo_consulta = c.id_tipo_consulta
WHERE c.id_paciente = mi_id_paciente()
  AND c.deleted_at IS NULL
ORDER BY c.fecha_cita DESC;

CREATE VIEW vw_paciente_proximas_citas
WITH (security_invoker = true) AS
SELECT *
FROM vw_paciente_mis_citas
WHERE fecha >= CURRENT_DATE
  AND estado IN ('programada', 'confirmada', 'en_curso')
ORDER BY fecha ASC, hora ASC;


-- ─── vw_paciente_mi_historial ────────────────────────────────────────
CREATE VIEW vw_paciente_mi_historial
WITH (security_invoker = true) AS
SELECT
    cm.id_consulta,
    cm.fecha_consulta,
    cm.motivo_consulta,
    cm.enfermedad_actual,
    cm.revision_sistemas,
    cm.examen_fisico,
    cm.examenes_complementarios,
    cm.analisis_clinico,
    cm.impresion_diagnostica,
    cm.plan_tratamiento,
    cm.observaciones,
    cm.id_medico,
    nombre_medico(cm.id_medico)         AS medico_nombre,
    me.especialidad                     AS medico_especialidad
FROM consulta_medica cm
LEFT JOIN medico me ON me.id_medico = cm.id_medico
WHERE cm.id_paciente = mi_id_paciente()
  AND cm.deleted_at IS NULL
ORDER BY cm.fecha_consulta DESC;


-- ─── vw_paciente_mis_medicamentos ────────────────────────────────────
CREATE VIEW vw_paciente_mis_medicamentos
WITH (security_invoker = true) AS
SELECT
    om.id_orden,
    om.dosis,
    om.frecuencia,
    om.duracion,
    om.indicaciones,
    om.fecha_emision,
    m.id_medicamento,
    m.nombre                            AS medicamento_nombre,
    m.nombre_generico,
    m.presentacion,
    m.concentracion,
    m.via_administracion,
    cm.id_medico,
    nombre_medico(cm.id_medico)         AS medico_nombre,
    me.especialidad                     AS medico_especialidad
FROM orden_medica om
JOIN consulta_medica cm ON cm.id_consulta    = om.id_consulta
LEFT JOIN medicamento m ON m.id_medicamento  = om.id_medicamento
LEFT JOIN medico     me ON me.id_medico      = cm.id_medico
WHERE cm.id_paciente = mi_id_paciente()
  AND cm.deleted_at IS NULL
ORDER BY om.fecha_emision DESC;


-- ─── vw_paciente_mis_diagnosticos ────────────────────────────────────
CREATE VIEW vw_paciente_mis_diagnosticos
WITH (security_invoker = true) AS
SELECT
    d.id_diagnostico,
    d.codigo_cie10,
    d.descripcion,
    d.es_principal,
    d.fecha,
    td.nombre                           AS tipo_diagnostico,
    cm.id_consulta,
    cm.fecha_consulta,
    nombre_medico(cm.id_medico)         AS medico_nombre
FROM diagnostico d
JOIN consulta_medica cm ON cm.id_consulta = d.id_consulta
LEFT JOIN tipo_diagnostico td ON td.id_tipo_diagnostico = d.id_tipo_diagnostico
WHERE cm.id_paciente = mi_id_paciente()
  AND cm.deleted_at IS NULL
ORDER BY d.fecha DESC;


-- ─── vw_paciente_mis_signos ──────────────────────────────────────────
CREATE VIEW vw_paciente_mis_signos
WITH (security_invoker = true) AS
SELECT *
FROM signos_vitales
WHERE id_paciente = mi_id_paciente()
ORDER BY fecha_registro DESC;


-- ─── vw_paciente_mis_facturas ────────────────────────────────────────
CREATE VIEW vw_paciente_mis_facturas
WITH (security_invoker = true) AS
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
    f.id_paciente,
    pa.numero_historia,
    (pe.nombres || ' ' || pe.apellidos)  AS paciente_nombre,
    pe.documento                          AS paciente_documento,
    pe.tipo_documento                     AS paciente_tipo_documento,
    pe.email                              AS paciente_email,
    pe.telefono                           AS paciente_telefono,
    f.id_medico,
    nombre_medico(f.id_medico)            AS medico_nombre,
    m.especialidad                        AS medico_especialidad,
    f.id_consulta,
    (SELECT COUNT(*) FROM factura_item fi WHERE fi.id_factura = f.id_factura) AS items_count
FROM factura f
JOIN paciente pa    ON pa.id_paciente = f.id_paciente
JOIN persona  pe    ON pe.id_persona  = pa.id_persona
LEFT JOIN medico m  ON m.id_medico    = f.id_medico
WHERE f.id_paciente = mi_id_paciente()
  AND f.estado != 'borrador'
  AND f.deleted_at IS NULL
ORDER BY f.fecha_emision DESC;


-- ─── vw_paciente_mis_adjuntos ────────────────────────────────────────
-- Antes filtraba por email; ahora por mi_id_paciente() (más robusto).
CREATE VIEW vw_paciente_mis_adjuntos
WITH (security_invoker = true) AS
SELECT
    a.id_adjunto,
    a.id_consulta,
    a.nombre_archivo,
    a.storage_path,
    a.tipo_mime,
    a.tamanio_bytes,
    a.descripcion,
    a.fecha_subida,
    c.fecha_consulta,
    c.motivo_consulta,
    c.impresion_diagnostica,
    nombre_medico(c.id_medico)  AS medico_nombre,
    m.especialidad              AS medico_especialidad,
    c.id_paciente
FROM consulta_adjunto a
JOIN consulta_medica  c ON c.id_consulta = a.id_consulta
LEFT JOIN medico      m ON m.id_medico   = c.id_medico
WHERE a.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND c.id_paciente = mi_id_paciente()
ORDER BY a.fecha_subida DESC;


-- ─── vw_paciente_mis_ordenes_examen ──────────────────────────────────
CREATE VIEW vw_paciente_mis_ordenes_examen
WITH (security_invoker = true) AS
SELECT
    o.id_orden_examen,
    o.id_consulta,
    o.numero_orden,
    o.fecha_emision,
    o.indicaciones,
    nombre_medico(o.id_medico)  AS medico_nombre,
    m.especialidad              AS medico_especialidad,
    (
        SELECT COALESCE(json_agg(json_build_object(
            'id_item',       it.id_item,
            'orden',         it.orden,
            'nombre',        it.nombre,
            'observaciones', it.observaciones
        ) ORDER BY it.orden, it.id_item), '[]'::json)
        FROM orden_examen_item it
        WHERE it.id_orden_examen = o.id_orden_examen
    ) AS items
FROM orden_examen o
LEFT JOIN medico m ON m.id_medico = o.id_medico
WHERE o.deleted_at IS NULL
  AND o.id_paciente = mi_id_paciente()
ORDER BY o.fecha_emision DESC;


-- ─── vw_medico_adjuntos_paciente ─────────────────────────────────────
CREATE VIEW vw_medico_adjuntos_paciente
WITH (security_invoker = true) AS
SELECT
    a.id_adjunto,
    a.id_consulta,
    a.nombre_archivo,
    a.storage_path,
    a.tipo_mime,
    a.tamanio_bytes,
    a.descripcion,
    a.fecha_subida,
    a.subido_por,
    c.fecha_consulta,
    c.id_paciente,
    c.id_medico,
    c.motivo_consulta,
    c.impresion_diagnostica
FROM consulta_adjunto a
JOIN consulta_medica  c ON c.id_consulta = a.id_consulta
WHERE a.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND (
      es_admin()
      OR c.id_medico = mi_id_medico()
      OR medico_atendio_paciente(c.id_paciente)
  )
ORDER BY a.fecha_subida DESC;


-- ─── Permisos (DROP VIEW los pierde) ─────────────────────────────────
GRANT SELECT ON
    vw_paciente_mi_perfil,
    vw_paciente_mis_citas,
    vw_paciente_proximas_citas,
    vw_paciente_mi_historial,
    vw_paciente_mis_medicamentos,
    vw_paciente_mis_diagnosticos,
    vw_paciente_mis_signos,
    vw_paciente_mis_facturas,
    vw_paciente_mis_adjuntos,
    vw_paciente_mis_ordenes_examen,
    vw_medico_adjuntos_paciente
TO authenticated;

REVOKE ALL ON
    vw_paciente_mi_perfil,
    vw_paciente_mis_citas,
    vw_paciente_proximas_citas,
    vw_paciente_mi_historial,
    vw_paciente_mis_medicamentos,
    vw_paciente_mis_diagnosticos,
    vw_paciente_mis_signos,
    vw_paciente_mis_facturas,
    vw_paciente_mis_adjuntos,
    vw_paciente_mis_ordenes_examen,
    vw_medico_adjuntos_paciente
FROM anon;

COMMIT;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Security Advisor → "Rerun linter": ya no deben aparecer alertas
--    "Security Definer View".
-- 2. Diagnóstico (supabase/diagnostico-seguridad.sql, bloque 1): todas
--    las vistas con security_invoker = true.
-- 3. En la app como PACIENTE: Mis citas, Historial, Medicamentos,
--    Facturas (y su PDF), Documentos/Resultados → deben mostrar el
--    nombre del médico como antes.
-- 4. Como MÉDICO: abrir un paciente atendido también por otro médico →
--    debe ver los adjuntos de ambos.
-- =====================================================================
