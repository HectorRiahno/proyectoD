-- =====================================================================
-- MIGRACIÓN: Ajustar FKs que bloquean borrados desde el admin
--
-- Las restricciones sin ON DELETE bloquean operaciones razonables de borrado.
-- Para los registros que tienen valor histórico (factura, reserva) lo
-- correcto es CONSERVAR la fila y solo desvincularla → ON DELETE SET NULL.
--
-- Ejecutar en Supabase SQL Editor. Idempotente.
-- =====================================================================


-- ─── 1. factura.id_consulta ─────────────────────────────────────────
-- Problema: al borrar una cita, en cascada se intenta borrar consulta_medica.
-- Si esa consulta tiene una factura asociada, la restricción
-- 'factura_id_consulta_fkey' (sin ON DELETE) bloquea la operación con:
--   "update or delete on table 'consulta_medica' violates foreign key
--    constraint 'factura_id_consulta_fkey' on table 'factura'"
-- Solución: conservar la factura (auditoría/contabilidad) y desvincularla.
ALTER TABLE factura
    DROP CONSTRAINT IF EXISTS factura_id_consulta_fkey;

ALTER TABLE factura
    ADD CONSTRAINT factura_id_consulta_fkey
        FOREIGN KEY (id_consulta)
        REFERENCES consulta_medica(id_consulta)
        ON DELETE SET NULL;


-- ─── 2. reserva.id_horario ──────────────────────────────────────────
-- Problema: al borrar una franja en 'horario_medico', si hay reservas
-- vinculadas a esa franja la FK 'reserva_id_horario_fkey' (sin ON DELETE)
-- bloquea con:
--   "update or delete on table 'horario_medico' violates foreign key
--    constraint 'reserva_id_horario_fkey' on table 'reserva'"
-- Solución: la reserva conserva fecha/paciente/médico, solo se desvincula
-- de la franja eliminada → ON DELETE SET NULL.
ALTER TABLE reserva
    DROP CONSTRAINT IF EXISTS reserva_id_horario_fkey;

ALTER TABLE reserva
    ADD CONSTRAINT reserva_id_horario_fkey
        FOREIGN KEY (id_horario)
        REFERENCES horario_medico(id_horario)
        ON DELETE SET NULL;


-- ─── Verificación ───────────────────────────────────────────────────
-- SELECT conname, confdeltype
-- FROM pg_constraint
-- WHERE conname IN ('factura_id_consulta_fkey', 'reserva_id_horario_fkey');
-- confdeltype = 'n' significa SET NULL (lo correcto).
