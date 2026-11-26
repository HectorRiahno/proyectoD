-- =====================================================================
-- MIGRACIÓN: Registro de accesos a la historia clínica
--
-- Hasta ahora audit_log sólo registraba cambios: no quedaba rastro de
-- quién CONSULTÓ o EXPORTÓ la historia clínica de un paciente, que es lo
-- primero que se pide en una auditoría (Res. 1995/1999, Ley 1581).
--
-- fn_registrar_acceso_hc(id_paciente, accion, detalle) escribe en
-- audit_log:
--     tabla       = 'historia_clinica'
--     operacion   = 'LECTURA' | 'EXPORTACION'
--     id_registro = id_paciente
--     after_data  = { accion, asignado, detalle }
--
-- QUIÉN PUEDE LEER qué historia lo decide el RLS
-- (migration-restriccion-clinica.sql); esta RPC sólo deja constancia.
-- La llama el frontend al abrir cada pantalla, así que un cliente
-- modificado podría omitir el registro (no saltarse el RLS).
--
-- Requiere migration-trazabilidad-auditoria.sql y
-- migration-restriccion-clinica.sql. Transaccional e idempotente.
-- =====================================================================

BEGIN;

-- ─── 1. audit_log admite LECTURA / EXPORTACION ────────────────────────
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_operacion_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_operacion_check
    CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LECTURA', 'EXPORTACION'));

CREATE INDEX IF NOT EXISTS idx_audit_log_hc_paciente
    ON audit_log(id_registro, ocurrio_en DESC)
    WHERE tabla = 'historia_clinica';


-- ─── 2. RPC ───────────────────────────────────────────────────────────
-- Médico: sólo pacientes que puede ver (asignados o ya atendidos).
-- Admin/asistente: cualquier paciente.
-- Paciente: sólo el suyo (p.ej. al exportar su historial en PDF).
CREATE OR REPLACE FUNCTION public.fn_registrar_acceso_hc(
    p_id_paciente BIGINT,
    p_accion      TEXT,
    p_detalle     JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid       UUID := auth.uid();
    v_es_medico BOOLEAN := mi_id_medico() IS NOT NULL;
    v_nombre    TEXT;
    v_rol       TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
    END IF;

    IF p_accion NOT IN ('ver_historial', 'ver_consulta', 'atender_cita',
                        'ver_antecedentes', 'exportar_pdf') THEN
        RAISE EXCEPTION 'Acción de acceso no válida: %', p_accion USING ERRCODE = '22023';
    END IF;

    IF NOT (es_admin_o_asistente()
            OR (v_es_medico AND medico_puede_ver_paciente(p_id_paciente))
            OR p_id_paciente = mi_id_paciente()) THEN
        RAISE EXCEPTION 'No tienes permiso sobre este paciente.' USING ERRCODE = '42501';
    END IF;

    SELECT (p.nombres || ' ' || p.apellidos), r.nombre
    INTO v_nombre, v_rol
    FROM usuario u
    JOIN persona p ON p.id_persona = u.id_persona
    LEFT JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
    LEFT JOIN rol r ON r.id_rol = ar.id_rol
    WHERE u.auth_user_id = v_uid
    ORDER BY ar.id_asignacion DESC NULLS LAST
    LIMIT 1;

    INSERT INTO audit_log (tabla, operacion, id_registro, actor_uuid, actor_nombre, actor_rol, after_data)
    VALUES (
        'historia_clinica',
        CASE WHEN p_accion LIKE 'exportar_%' THEN 'EXPORTACION' ELSE 'LECTURA' END,
        p_id_paciente::TEXT,
        v_uid, v_nombre, v_rol,
        jsonb_build_object(
            'accion',   p_accion,
            -- ¿Tenía el médico una cita con el paciente en ese momento?
            -- (false = lo ve porque ya lo atendió antes; NULL si no es médico)
            'asignado', CASE WHEN v_es_medico THEN medico_tiene_cita_con(p_id_paciente) END,
            'detalle',  COALESCE(p_detalle, '{}'::jsonb)
        )
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_registrar_acceso_hc(BIGINT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_registrar_acceso_hc(BIGINT, TEXT, JSONB) TO authenticated;

COMMIT;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- Quién abrió la historia de un paciente:
-- SELECT ocurrio_en, actor_nombre, actor_rol, operacion,
--        after_data ->> 'accion' AS accion
-- FROM vw_audit_log
-- WHERE tabla = 'historia_clinica' AND id_registro = '<id_paciente>';
-- =====================================================================
