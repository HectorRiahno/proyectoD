-- =====================================================================
-- Adjuntos de consulta médica
-- Permite al médico subir PDFs / imágenes (resultados de laboratorio,
-- radiografías, etc.) asociados a una consulta. El paciente puede ver y
-- descargar los adjuntos de SUS consultas.
--
-- Antes de ejecutar esta migration:
--   1. Crear el bucket "consulta-adjuntos" en Supabase Dashboard → Storage
--      - Public: NO (privado, acceso solo con signed URLs)
--      - File size limit: 10 MB
--      - Allowed MIME types: image/*, application/pdf
--   2. Aplicar las policies de bucket que aparecen al final de este archivo.
-- =====================================================================

-- ─── Tabla ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consulta_adjunto (
    id_adjunto      BIGSERIAL PRIMARY KEY,
    id_consulta     BIGINT NOT NULL REFERENCES consulta_medica(id_consulta) ON DELETE CASCADE,
    nombre_archivo  TEXT NOT NULL,           -- nombre original del archivo
    storage_path    TEXT NOT NULL UNIQUE,    -- ruta dentro del bucket: id_consulta/uuid-filename
    tipo_mime       TEXT NOT NULL,           -- image/jpeg, application/pdf, etc.
    tamanio_bytes   INTEGER NOT NULL,
    descripcion     TEXT,                    -- opcional, ej: "Radiografía PA"
    subido_por      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha_subida    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,             -- soft-delete (mismo patrón que el resto)
    deleted_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_consulta_adjunto_consulta
    ON consulta_adjunto(id_consulta) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consulta_adjunto_subido_por
    ON consulta_adjunto(subido_por) WHERE deleted_at IS NULL;

COMMENT ON TABLE consulta_adjunto IS
    'Archivos (PDF, imágenes) adjuntos a una consulta médica. El binario vive en Storage; aquí solo metadatos + path.';

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE consulta_adjunto ENABLE ROW LEVEL SECURITY;

-- Admin ve y modifica todo (incluyendo borrados)
DROP POLICY IF EXISTS p_adjunto_admin_all ON consulta_adjunto;
CREATE POLICY p_adjunto_admin_all ON consulta_adjunto
    FOR ALL TO authenticated
    USING (es_admin())
    WITH CHECK (es_admin());

-- Médico ve los adjuntos de las consultas de pacientes que ha atendido
DROP POLICY IF EXISTS p_adjunto_medico_select ON consulta_adjunto;
CREATE POLICY p_adjunto_medico_select ON consulta_adjunto
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM consulta_medica c
            WHERE c.id_consulta = consulta_adjunto.id_consulta
              AND c.deleted_at IS NULL
              AND (
                  -- Es el médico de esta consulta
                  c.id_medico = mi_id_medico()
                  -- O ha atendido a este paciente alguna vez
                  OR EXISTS (
                      SELECT 1 FROM consulta_medica c2
                      WHERE c2.id_paciente = c.id_paciente
                        AND c2.id_medico   = mi_id_medico()
                        AND c2.deleted_at IS NULL
                  )
              )
        )
    );

-- Médico puede subir adjuntos a SUS consultas
DROP POLICY IF EXISTS p_adjunto_medico_insert ON consulta_adjunto;
CREATE POLICY p_adjunto_medico_insert ON consulta_adjunto
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM consulta_medica c
            WHERE c.id_consulta = consulta_adjunto.id_consulta
              AND c.id_medico   = mi_id_medico()
              AND c.deleted_at IS NULL
        )
    );

-- Médico puede actualizar/borrar adjuntos que él subió
DROP POLICY IF EXISTS p_adjunto_medico_update ON consulta_adjunto;
CREATE POLICY p_adjunto_medico_update ON consulta_adjunto
    FOR UPDATE TO authenticated
    USING (subido_por = auth.uid())
    WITH CHECK (subido_por = auth.uid());

DROP POLICY IF EXISTS p_adjunto_medico_delete ON consulta_adjunto;
CREATE POLICY p_adjunto_medico_delete ON consulta_adjunto
    FOR DELETE TO authenticated
    USING (subido_por = auth.uid());

-- Paciente ve los adjuntos de SUS consultas
DROP POLICY IF EXISTS p_adjunto_paciente_select ON consulta_adjunto;
CREATE POLICY p_adjunto_paciente_select ON consulta_adjunto
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1
              FROM consulta_medica c
              JOIN paciente p ON p.id_paciente = c.id_paciente
              JOIN persona  pe ON pe.id_persona  = p.id_persona
             WHERE c.id_consulta = consulta_adjunto.id_consulta
               AND c.deleted_at IS NULL
               AND lower(pe.email) = lower(coalesce(auth.email(), ''))
        )
    );

-- ─── Vista del paciente: sus adjuntos con info de la consulta ─────────────────
CREATE OR REPLACE VIEW vw_paciente_mis_adjuntos AS
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
    m_per.nombres  || ' ' || m_per.apellidos AS medico_nombre,
    m.especialidad AS medico_especialidad,
    c.id_paciente
FROM consulta_adjunto a
JOIN consulta_medica  c     ON c.id_consulta = a.id_consulta
JOIN paciente         p     ON p.id_paciente = c.id_paciente
JOIN persona          pe    ON pe.id_persona = p.id_persona
LEFT JOIN medico      m     ON m.id_medico   = c.id_medico
LEFT JOIN persona     m_per ON m_per.id_persona = m.id_persona
WHERE a.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND lower(pe.email) = lower(coalesce(auth.email(), ''))
ORDER BY a.fecha_subida DESC;

COMMENT ON VIEW vw_paciente_mis_adjuntos IS
    'Adjuntos visibles para el paciente autenticado (filtrado por auth.email()).';

GRANT SELECT ON vw_paciente_mis_adjuntos TO authenticated;

-- ─── Vista del médico: adjuntos de un paciente que ha atendido ────────────────
CREATE OR REPLACE VIEW vw_medico_adjuntos_paciente AS
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
      OR EXISTS (
          SELECT 1 FROM consulta_medica c2
          WHERE c2.id_paciente = c.id_paciente
            AND c2.id_medico   = mi_id_medico()
            AND c2.deleted_at IS NULL
      )
  )
ORDER BY a.fecha_subida DESC;

GRANT SELECT ON vw_medico_adjuntos_paciente TO authenticated;

-- =====================================================================
-- STORAGE: políticas del bucket "consulta-adjuntos"
-- Después de CREAR el bucket en Dashboard, ejecutar esto desde el SQL editor.
-- =====================================================================

-- Permitir SELECT (leer) a usuarios autenticados; la verdadera autorización
-- se hace generando signed URLs desde la app SOLO si la fila en consulta_adjunto
-- es accesible por RLS. Para reforzar, validamos que la ruta empiece con un
-- id_consulta que el usuario pueda ver.
DROP POLICY IF EXISTS "consulta-adjuntos-read" ON storage.objects;
CREATE POLICY "consulta-adjuntos-read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'consulta-adjuntos'
        AND EXISTS (
            SELECT 1 FROM consulta_adjunto a
            WHERE a.storage_path = storage.objects.name
              AND a.deleted_at IS NULL
        )
    );

-- Médicos suben archivos al bucket; la fila de consulta_adjunto se inserta
-- después con el path resultante.
DROP POLICY IF EXISTS "consulta-adjuntos-insert" ON storage.objects;
CREATE POLICY "consulta-adjuntos-insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'consulta-adjuntos'
        AND mi_id_medico() IS NOT NULL
    );

-- Médico puede borrar archivos que él subió (path empieza con consulta-id/)
DROP POLICY IF EXISTS "consulta-adjuntos-delete" ON storage.objects;
CREATE POLICY "consulta-adjuntos-delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'consulta-adjuntos'
        AND (
            es_admin()
            OR EXISTS (
                SELECT 1 FROM consulta_adjunto a
                WHERE a.storage_path = storage.objects.name
                  AND a.subido_por   = auth.uid()
            )
        )
    );
