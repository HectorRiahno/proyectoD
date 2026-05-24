-- =====================================================================
-- MIGRACIÓN: Soft-delete (borrado lógico)
--
-- Reemplaza DELETE físico por marcar `deleted_at` + `deleted_by`.
-- Beneficios:
--   • Nada se pierde — los registros médicos pueden recuperarse.
--   • El audit_log captura la operación como UPDATE.
--   • RLS oculta los borrados a usuarios normales; los admins los ven.
--
-- Tablas con soft-delete:
--   consulta_medica, cita, paciente, medico, factura, asignacion_rol
--
-- Idempotente. Ejecutar DESPUÉS de migration-audit-log.sql.
-- =====================================================================


-- ─── 1. Columnas deleted_at / deleted_by ─────────────────────────────
ALTER TABLE consulta_medica
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE cita
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE paciente
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE medico
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE factura
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE asignacion_rol
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;


-- ─── 2. Índices parciales para consultas WHERE deleted_at IS NULL ────
CREATE INDEX IF NOT EXISTS idx_consulta_medica_active
    ON consulta_medica(id_consulta) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cita_active
    ON cita(id_cita) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_paciente_active
    ON paciente(id_paciente) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_medico_active
    ON medico(id_medico) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_factura_active
    ON factura(id_factura) WHERE deleted_at IS NULL;


-- ─── 3. RPCs de soft-delete (una por tabla — más seguras que un
--       genérico con dynamic SQL que abriría inyección de identificador).
--       SECURITY INVOKER → respeta RLS del caller. Si el caller no puede
--       actualizar la fila, la RPC tampoco lo hará.

-- consulta_medica
CREATE OR REPLACE FUNCTION public.soft_delete_consulta(p_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER
AS $$ BEGIN
    UPDATE consulta_medica
    SET deleted_at = NOW(), deleted_by = auth.uid()
    WHERE id_consulta = p_id AND deleted_at IS NULL;
END; $$;
GRANT EXECUTE ON FUNCTION public.soft_delete_consulta(BIGINT) TO authenticated;

-- cita
CREATE OR REPLACE FUNCTION public.soft_delete_cita(p_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER
AS $$ BEGIN
    UPDATE cita
    SET deleted_at = NOW(), deleted_by = auth.uid()
    WHERE id_cita = p_id AND deleted_at IS NULL;
END; $$;
GRANT EXECUTE ON FUNCTION public.soft_delete_cita(BIGINT) TO authenticated;

-- paciente
CREATE OR REPLACE FUNCTION public.soft_delete_paciente(p_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER
AS $$ BEGIN
    UPDATE paciente
    SET deleted_at = NOW(), deleted_by = auth.uid()
    WHERE id_paciente = p_id AND deleted_at IS NULL;
END; $$;
GRANT EXECUTE ON FUNCTION public.soft_delete_paciente(BIGINT) TO authenticated;

-- medico
CREATE OR REPLACE FUNCTION public.soft_delete_medico(p_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER
AS $$ BEGIN
    UPDATE medico
    SET deleted_at = NOW(), deleted_by = auth.uid()
    WHERE id_medico = p_id AND deleted_at IS NULL;
END; $$;
GRANT EXECUTE ON FUNCTION public.soft_delete_medico(BIGINT) TO authenticated;

-- factura
CREATE OR REPLACE FUNCTION public.soft_delete_factura(p_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER
AS $$ BEGIN
    UPDATE factura
    SET deleted_at = NOW(), deleted_by = auth.uid()
    WHERE id_factura = p_id AND deleted_at IS NULL;
END; $$;
GRANT EXECUTE ON FUNCTION public.soft_delete_factura(BIGINT) TO authenticated;


-- ─── 4. RPCs de restauración (solo admin) ────────────────────────────
CREATE OR REPLACE FUNCTION public.restore_consulta(p_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER
AS $$ BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'Solo administradores pueden restaurar registros' USING ERRCODE = '42501';
    END IF;
    UPDATE consulta_medica SET deleted_at = NULL, deleted_by = NULL WHERE id_consulta = p_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.restore_consulta(BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_cita(p_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER
AS $$ BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'Solo administradores pueden restaurar registros' USING ERRCODE = '42501';
    END IF;
    UPDATE cita SET deleted_at = NULL, deleted_by = NULL WHERE id_cita = p_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.restore_cita(BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_paciente(p_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER
AS $$ BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'Solo administradores pueden restaurar registros' USING ERRCODE = '42501';
    END IF;
    UPDATE paciente SET deleted_at = NULL, deleted_by = NULL WHERE id_paciente = p_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.restore_paciente(BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_medico(p_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER
AS $$ BEGIN
    IF NOT es_admin() THEN
        RAISE EXCEPTION 'Solo administradores pueden restaurar registros' USING ERRCODE = '42501';
    END IF;
    UPDATE medico SET deleted_at = NULL, deleted_by = NULL WHERE id_medico = p_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.restore_medico(BIGINT) TO authenticated;


-- ─── 5. Políticas RLS actualizadas: ocultar borrados a no-admins ─────
-- consulta_medica
DROP POLICY IF EXISTS "consulta_select" ON consulta_medica;
CREATE POLICY "consulta_select" ON consulta_medica FOR SELECT TO authenticated
  USING (
    (id_paciente = mi_id_paciente()
     OR id_medico = mi_id_medico()
     OR es_admin_o_asistente())
    AND (deleted_at IS NULL OR es_admin())
  );

-- cita
DROP POLICY IF EXISTS "cita_select" ON cita;
CREATE POLICY "cita_select" ON cita FOR SELECT TO authenticated
  USING (
    (id_paciente = mi_id_paciente()
     OR id_medico = mi_id_medico()
     OR es_admin_o_asistente())
    AND (deleted_at IS NULL OR es_admin())
  );

-- paciente
DROP POLICY IF EXISTS "paciente_select" ON paciente;
CREATE POLICY "paciente_select" ON paciente FOR SELECT TO authenticated
  USING (
    (id_paciente = mi_id_paciente()
     OR mi_id_medico() IS NOT NULL
     OR es_admin_o_asistente())
    AND (deleted_at IS NULL OR es_admin())
  );


-- ─── 6. Vistas auxiliares para que admins vean lo borrado ────────────
DROP VIEW IF EXISTS vw_admin_papelera CASCADE;
CREATE VIEW vw_admin_papelera AS
SELECT 'consulta_medica' AS tabla, id_consulta AS id_registro,
       deleted_at, deleted_by,
       jsonb_build_object('motivo', motivo_consulta, 'fecha', fecha_consulta) AS resumen
FROM consulta_medica WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'cita', id_cita, deleted_at, deleted_by,
       jsonb_build_object('fecha', fecha_cita, 'motivo', motivo, 'estado', estado)
FROM cita WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'paciente', id_paciente, deleted_at, deleted_by,
       jsonb_build_object('numero_historia', numero_historia)
FROM paciente WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'medico', id_medico, deleted_at, deleted_by,
       jsonb_build_object('numero_licencia', numero_licencia, 'especialidad', especialidad)
FROM medico WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

GRANT SELECT ON vw_admin_papelera TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- 1. Soft-delete:    SELECT public.soft_delete_cita(42);
-- 2. Ver en papelera: SELECT * FROM vw_admin_papelera; (solo admin)
-- 3. Restaurar:      SELECT public.restore_cita(42); (solo admin)
