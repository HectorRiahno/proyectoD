-- =====================================================================
-- REALTIME: habilitar replicación para que cambios en 'cita' se
-- propaguen en vivo al frontend (médico ve cambios del admin al instante).
--
-- Ejecutar en Supabase SQL Editor. Idempotente.
-- Alternativa por UI: Dashboard → Database → Replication → activar 'cita'.
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname    = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename  = 'cita'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cita;
    END IF;
END $$;

-- Verificación:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
