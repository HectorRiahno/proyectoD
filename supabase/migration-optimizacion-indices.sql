-- =====================================================================
-- MIGRACIÓN: Optimización de índices
--
-- 1. Agrega índices en llaves foráneas / columnas de búsqueda que se
--    usan en JOINs, políticas RLS y triggers pero no tenían índice.
-- 2. Elimina índices duplicados: columnas UNIQUE ya tienen su propio
--    índice; el CREATE INDEX extra solo hace más lentos los INSERT/UPDATE.
-- 3. Elimina índices parciales inútiles sobre la PK
--    (ON tabla(id) WHERE deleted_at IS NULL → la PK ya cubre ese caso).
--
-- No cambia datos ni comportamiento. Idempotente.
-- =====================================================================

BEGIN;

-- ─── 1. Índices faltantes ────────────────────────────────────────────

-- Políticas RLS (id_medico = mi_id_medico()) y vw_medico_consultas
CREATE INDEX IF NOT EXISTS idx_consulta_medico
    ON consulta_medica(id_medico) WHERE deleted_at IS NULL;

-- Trigger crear_factura_borrador_consulta / agregar_factura_item_orden:
-- buscan la factura por id_consulta en CADA consulta y receta nueva.
CREATE INDEX IF NOT EXISTS idx_factura_consulta
    ON factura(id_consulta) WHERE deleted_at IS NULL;

-- vw_paciente_mis_signos y signos_select (id_paciente = mi_id_paciente())
CREATE INDEX IF NOT EXISTS idx_signos_paciente
    ON signos_vitales(id_paciente, fecha_registro DESC);

-- sintoma_select / medico_write_sintoma filtran por id_consulta
CREATE INDEX IF NOT EXISTS idx_sintoma_consulta
    ON sintoma(id_consulta);

-- Reporte de inventario (medicamentos más recetados)
CREATE INDEX IF NOT EXISTS idx_orden_medicamento
    ON orden_medica(id_medicamento);

-- Horarios por médico
CREATE INDEX IF NOT EXISTS idx_horario_medico
    ON horario_medico(id_medico);

-- provision_user_from_auth y p_adjunto_paciente_select buscan por
-- LOWER(email): el UNIQUE(email) no sirve para expresiones.
CREATE INDEX IF NOT EXISTS idx_persona_email_lower
    ON persona(LOWER(email));


-- ─── 2. Índices duplicados de constraints UNIQUE ─────────────────────
DROP INDEX IF EXISTS idx_persona_documento;      -- persona.documento UNIQUE
DROP INDEX IF EXISTS idx_usuario_username;       -- usuario.username UNIQUE
DROP INDEX IF EXISTS idx_usuario_auth_user_id;   -- usuario.auth_user_id UNIQUE
DROP INDEX IF EXISTS idx_paciente_historia;      -- paciente.numero_historia UNIQUE
DROP INDEX IF EXISTS idx_factura_numero;         -- factura.numero_factura UNIQUE
DROP INDEX IF EXISTS idx_historial_paciente;     -- historial_clinico.id_paciente UNIQUE


-- ─── 3. Índices parciales sobre la PK (sin utilidad) ─────────────────
DROP INDEX IF EXISTS idx_consulta_medica_active;
DROP INDEX IF EXISTS idx_cita_active;
DROP INDEX IF EXISTS idx_paciente_active;
DROP INDEX IF EXISTS idx_medico_active;
DROP INDEX IF EXISTS idx_factura_active;

COMMIT;

-- Actualizar estadísticas para que el planificador use los índices nuevos
ANALYZE;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- Dashboard → Advisors → Performance Advisor → "Rerun linter":
--   deben desaparecer los avisos "Unindexed foreign keys" y
--   "Duplicate Index" de estas tablas.
-- =====================================================================
