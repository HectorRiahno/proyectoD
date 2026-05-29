-- =====================================================================
-- VISTAS POR ROL - Sistema Clínico
--
-- ⚠️  EJECUTAR auth-trigger.sql ANTES DE ESTE ARCHIVO
--    (este archivo depende de la columna usuario.auth_user_id que se
--     agrega en auth-trigger.sql)
--
-- Estructura confirmada:
--   rol              (id_rol, nombre, descripcion)
--   usuario          (id_usuario, username, id_persona, password_hash, activo, ultimo_acceso, created_at, updated_at, auth_user_id)
--   asignacion_rol   (id_asignacion, id_usuario, id_rol, fecha_asignacion)   -- junction usuario↔rol
--   persona          (id_persona, documento, tipo_documento, nombres, apellidos, fecha_nacimiento, genero, telefono, direccion, email)
--   paciente         (id_paciente, id_persona, numero_historia, tipo_sangre, alergias, contacto_emergencia, ocupacion, estado_civil)
--   medico           (id_medico, id_persona, numero_licencia, especialidad, consultorio, anios_experiencia, activo)
--   asistente        (id_asistente, id_persona, id_medico, cargo, activo)
--   cita             (id_cita, id_paciente, id_medico, id_tipo_consulta, fecha_cita, estado, motivo, observaciones, created_at)
--   consulta_medica  (id_consulta, id_cita, id_paciente, id_medico, fecha_consulta, motivo_consulta, examen_fisico, impresion_diagnostica, plan_tratamiento, observaciones)
--   diagnostico      (id_diagnostico, id_consulta, id_tipo_diagnostico, codigo_cie10, descripcion, es_principal, fecha)
--   medicamento      (id_medicamento, id_categoria, nombre, nombre_generico, presentacion, concentracion, via_administracion, stock, precio, activo)
--   orden_medica     (id_orden, id_consulta, id_medicamento, id_tratamiento, dosis, frecuencia, duracion, indicaciones, fecha_emision)
--   signos_vitales   (id_signos, id_paciente, fecha_registro, presion_sistolica, presion_diastolica, frecuencia_cardiaca, temperatura, peso, talla)
--
-- Vínculo con Supabase Auth:
--   auth.uid()  →  usuario.auth_user_id  →  id_persona  →  paciente / medico
-- =====================================================================


-- =====================================================================
-- GUARDIA: verificar que la columna auth_user_id existe
-- =====================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'usuario'
          AND column_name = 'auth_user_id'
    ) THEN
        RAISE EXCEPTION 'Falta la columna public.usuario.auth_user_id. Ejecuta supabase/auth-trigger.sql primero.';
    END IF;
END $$;


-- =====================================================================
-- FUNCIONES HELPER
-- =====================================================================

-- Email del usuario autenticado
CREATE OR REPLACE FUNCTION mi_email()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT LOWER(email) FROM auth.users WHERE id = auth.uid() LIMIT 1;
$$;

-- id_usuario del usuario autenticado (vínculo por UUID auth.users → usuario.auth_user_id)
CREATE OR REPLACE FUNCTION mi_id_usuario()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT id_usuario FROM usuario WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- id_persona del usuario autenticado (a través de usuario.auth_user_id)
CREATE OR REPLACE FUNCTION mi_id_persona()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT id_persona FROM usuario WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- id_paciente del usuario autenticado (si es paciente)
CREATE OR REPLACE FUNCTION mi_id_paciente()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT id_paciente
    FROM paciente
    WHERE id_persona = mi_id_persona()
    LIMIT 1;
$$;

-- id_medico del usuario autenticado (si es médico)
CREATE OR REPLACE FUNCTION mi_id_medico()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT id_medico
    FROM medico
    WHERE id_persona = mi_id_persona()
    LIMIT 1;
$$;

-- Rol del usuario autenticado (admin | medico | asistente | cliente)
CREATE OR REPLACE FUNCTION mi_rol()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT r.nombre
    FROM asignacion_rol ar
    JOIN rol r ON r.id_rol = ar.id_rol
    WHERE ar.id_usuario = mi_id_usuario()
    LIMIT 1;
$$;


-- =====================================================================
-- ============== VISTAS PARA ADMINISTRADOR ============================
-- =====================================================================

-- ---------------------------------------------------------------------
-- vw_admin_usuarios: todos los usuarios con persona y rol
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_admin_usuarios CASCADE;
CREATE VIEW vw_admin_usuarios AS
SELECT
    u.id_usuario,
    u.auth_user_id,
    u.username,
    u.activo,
    u.ultimo_acceso,
    u.created_at,
    p.id_persona,
    p.documento,
    p.nombres,
    p.apellidos,
    (p.nombres || ' ' || p.apellidos)   AS nombre_completo,
    p.email,
    p.telefono,
    r.id_rol,
    r.nombre                            AS rol_nombre
FROM usuario u
LEFT JOIN persona        p  ON p.id_persona  = u.id_persona
LEFT JOIN asignacion_rol ar ON ar.id_usuario = u.id_usuario
LEFT JOIN rol            r  ON r.id_rol      = ar.id_rol;

-- ---------------------------------------------------------------------
-- vw_admin_medicos: lista de médicos con métricas
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_admin_medicos CASCADE;
CREATE VIEW vw_admin_medicos AS
SELECT
    m.id_medico,
    m.numero_licencia,
    m.especialidad,
    m.consultorio,
    m.anios_experiencia,
    m.activo,
    p.id_persona,
    p.documento,
    p.nombres,
    p.apellidos,
    (p.nombres || ' ' || p.apellidos)                                   AS nombre_completo,
    p.email,
    p.telefono,
    COUNT(c.id_cita)                                                    AS total_citas,
    COUNT(c.id_cita) FILTER (WHERE c.fecha_cita::date >= CURRENT_DATE)  AS citas_proximas,
    COUNT(c.id_cita) FILTER (WHERE c.fecha_cita::date = CURRENT_DATE)   AS citas_hoy
FROM medico m
JOIN persona p ON p.id_persona = m.id_persona
LEFT JOIN cita c ON c.id_medico = m.id_medico
GROUP BY m.id_medico, p.id_persona;

-- ---------------------------------------------------------------------
-- vw_admin_pacientes: lista de pacientes con persona y métricas
--
-- NOTA: tipo_sangre / alergias / enfermedades_cronicas viven ahora en
-- historial_clinico (ver migration-historial-clinico.sql). Esta vista
-- las trae con LEFT JOIN para preservar el contrato del frontend.
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_admin_pacientes CASCADE;
CREATE VIEW vw_admin_pacientes AS
SELECT
    pa.id_paciente,
    pa.numero_historia,
    h.tipo_sangre,
    h.alergias,
    h.enfermedades_cronicas,
    pa.contacto_emergencia,
    pa.telefono_emergencia,
    pa.ocupacion,
    pa.estado_civil,
    pe.id_persona,
    pe.documento,
    pe.tipo_documento,
    pe.nombres,
    pe.apellidos,
    (pe.nombres || ' ' || pe.apellidos)                                  AS nombre_completo,
    pe.fecha_nacimiento,
    EXTRACT(YEAR FROM AGE(pe.fecha_nacimiento))::INT                     AS edad,
    pe.genero,
    pe.email,
    pe.telefono,
    pe.direccion,
    COUNT(c.id_cita)                                                     AS total_citas,
    MAX(c.fecha_cita) FILTER (WHERE c.estado = 'completada')             AS ultima_visita
FROM paciente pa
JOIN persona pe ON pe.id_persona = pa.id_persona
LEFT JOIN historial_clinico h ON h.id_paciente = pa.id_paciente
LEFT JOIN cita c ON c.id_paciente = pa.id_paciente AND c.deleted_at IS NULL
WHERE pa.deleted_at IS NULL
GROUP BY pa.id_paciente, pe.id_persona, h.tipo_sangre, h.alergias, h.enfermedades_cronicas;

-- ---------------------------------------------------------------------
-- vw_admin_citas: todas las citas con datos de paciente y médico
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_admin_citas CASCADE;
CREATE VIEW vw_admin_citas AS
SELECT
    c.id_cita,
    c.fecha_cita,
    c.fecha_cita::date                            AS fecha,
    c.fecha_cita::time                            AS hora,
    c.estado,
    c.motivo,
    c.observaciones,
    c.created_at,
    -- Paciente
    c.id_paciente,
    pa.numero_historia,
    (pp.nombres || ' ' || pp.apellidos)           AS paciente_nombre,
    pp.documento                                  AS paciente_documento,
    pp.telefono                                   AS paciente_telefono,
    pp.email                                      AS paciente_email,
    -- Médico
    c.id_medico,
    (mp.nombres || ' ' || mp.apellidos)           AS medico_nombre,
    m.especialidad                                AS medico_especialidad,
    m.consultorio                                 AS medico_consultorio,
    -- Tipo consulta
    c.id_tipo_consulta,
    tc.nombre                                     AS tipo_consulta_nombre
FROM cita c
LEFT JOIN paciente      pa ON pa.id_paciente     = c.id_paciente
LEFT JOIN persona       pp ON pp.id_persona      = pa.id_persona
LEFT JOIN medico        m  ON m.id_medico        = c.id_medico
LEFT JOIN persona       mp ON mp.id_persona      = m.id_persona
LEFT JOIN tipo_consulta tc ON tc.id_tipo_consulta = c.id_tipo_consulta;

-- ---------------------------------------------------------------------
-- vw_admin_estadisticas: KPIs globales del sistema
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_admin_estadisticas CASCADE;
CREATE VIEW vw_admin_estadisticas AS
SELECT
    (SELECT COUNT(*) FROM paciente)                                                 AS total_pacientes,
    (SELECT COUNT(*) FROM medico WHERE activo = TRUE)                               AS total_medicos,
    (SELECT COUNT(*) FROM asistente WHERE activo = TRUE)                            AS total_asistentes,
    (SELECT COUNT(*) FROM usuario WHERE activo = TRUE)                              AS usuarios_activos,
    (SELECT COUNT(*) FROM cita)                                                     AS total_citas,
    (SELECT COUNT(*) FROM cita WHERE fecha_cita::date = CURRENT_DATE)               AS citas_hoy,
    (SELECT COUNT(*) FROM cita WHERE fecha_cita::date >= CURRENT_DATE)              AS citas_proximas,
    (SELECT COUNT(*) FROM cita WHERE estado = 'completada')                         AS citas_completadas,
    (SELECT COUNT(*) FROM cita WHERE estado = 'cancelada')                          AS citas_canceladas,
    (SELECT COUNT(*) FROM medicamento WHERE activo = TRUE)                          AS total_medicamentos,
    (SELECT COUNT(*) FROM consulta_medica)                                          AS total_consultas,
    (SELECT COUNT(*) FROM diagnostico)                                              AS total_diagnosticos;


-- =====================================================================
-- ============== VISTAS PARA MÉDICO ===================================
-- =====================================================================
-- Filtran por el médico autenticado (vínculo: auth.email → persona → medico)
-- =====================================================================

-- ---------------------------------------------------------------------
-- vw_medico_mis_citas: citas del médico actual
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_medico_mis_citas CASCADE;
CREATE VIEW vw_medico_mis_citas AS
SELECT
    c.id_cita,
    c.fecha_cita,
    c.fecha_cita::date                          AS fecha,
    c.fecha_cita::time                          AS hora,
    c.estado,
    c.motivo,
    c.observaciones,
    c.id_paciente,
    pa.numero_historia,
    (pp.nombres || ' ' || pp.apellidos)         AS paciente_nombre,
    pp.documento                                AS paciente_documento,
    pp.telefono                                 AS paciente_telefono,
    pp.email                                    AS paciente_email,
    EXTRACT(YEAR FROM AGE(pp.fecha_nacimiento))::INT AS paciente_edad,
    tc.nombre                                   AS tipo_consulta
FROM cita c
LEFT JOIN paciente      pa ON pa.id_paciente     = c.id_paciente
LEFT JOIN persona       pp ON pp.id_persona      = pa.id_persona
LEFT JOIN tipo_consulta tc ON tc.id_tipo_consulta = c.id_tipo_consulta
WHERE c.id_medico = mi_id_medico();

-- ---------------------------------------------------------------------
-- vw_medico_agenda_hoy: citas del médico para hoy
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_medico_agenda_hoy CASCADE;
CREATE VIEW vw_medico_agenda_hoy AS
SELECT *
FROM vw_medico_mis_citas
WHERE fecha = CURRENT_DATE
ORDER BY hora ASC;

-- ---------------------------------------------------------------------
-- vw_medico_mis_pacientes: pacientes que el médico ha atendido
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_medico_mis_pacientes CASCADE;
CREATE VIEW vw_medico_mis_pacientes AS
SELECT DISTINCT
    pa.id_paciente,
    pa.numero_historia,
    h.tipo_sangre,
    h.alergias,
    pa.contacto_emergencia,
    pa.ocupacion,
    pa.estado_civil,
    pp.documento,
    pp.nombres,
    pp.apellidos,
    (pp.nombres || ' ' || pp.apellidos)              AS nombre_completo,
    pp.email,
    pp.telefono,
    pp.fecha_nacimiento,
    EXTRACT(YEAR FROM AGE(pp.fecha_nacimiento))::INT AS edad,
    (SELECT MAX(c2.fecha_cita)
       FROM cita c2
       WHERE c2.id_paciente = pa.id_paciente
         AND c2.id_medico   = mi_id_medico()
         AND c2.deleted_at IS NULL
    ) AS ultima_cita_conmigo
FROM paciente pa
JOIN persona pp ON pp.id_persona = pa.id_persona
LEFT JOIN historial_clinico h ON h.id_paciente = pa.id_paciente
JOIN cita    c  ON c.id_paciente = pa.id_paciente AND c.deleted_at IS NULL
WHERE c.id_medico = mi_id_medico()
  AND pa.deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- vw_medico_consultas: consultas médicas realizadas por el médico actual
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_medico_consultas CASCADE;
CREATE VIEW vw_medico_consultas AS
SELECT
    cm.id_consulta,
    cm.id_cita,
    cm.fecha_consulta,
    cm.motivo_consulta,
    cm.examen_fisico,
    cm.impresion_diagnostica,
    cm.plan_tratamiento,
    cm.observaciones,
    cm.id_paciente,
    (pp.nombres || ' ' || pp.apellidos) AS paciente_nombre,
    pp.documento                        AS paciente_documento,
    pa.numero_historia
FROM consulta_medica cm
LEFT JOIN paciente pa ON pa.id_paciente = cm.id_paciente
LEFT JOIN persona  pp ON pp.id_persona  = pa.id_persona
WHERE cm.id_medico = mi_id_medico();

-- ---------------------------------------------------------------------
-- vw_medico_diagnosticos: diagnósticos emitidos por el médico
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_medico_diagnosticos CASCADE;
CREATE VIEW vw_medico_diagnosticos AS
SELECT
    d.id_diagnostico,
    d.codigo_cie10,
    d.descripcion,
    d.es_principal,
    d.fecha,
    d.id_consulta,
    td.nombre                           AS tipo_diagnostico,
    cm.id_paciente,
    (pp.nombres || ' ' || pp.apellidos) AS paciente_nombre,
    pp.documento                        AS paciente_documento
FROM diagnostico d
JOIN consulta_medica cm     ON cm.id_consulta       = d.id_consulta
LEFT JOIN tipo_diagnostico td ON td.id_tipo_diagnostico = d.id_tipo_diagnostico
LEFT JOIN paciente pa       ON pa.id_paciente       = cm.id_paciente
LEFT JOIN persona  pp       ON pp.id_persona        = pa.id_persona
WHERE cm.id_medico = mi_id_medico();

-- ---------------------------------------------------------------------
-- vw_medico_ordenes: órdenes médicas emitidas por el médico
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_medico_ordenes CASCADE;
CREATE VIEW vw_medico_ordenes AS
SELECT
    om.id_orden,
    om.dosis,
    om.frecuencia,
    om.duracion,
    om.indicaciones,
    om.fecha_emision,
    om.id_consulta,
    om.id_medicamento,
    m.nombre                            AS medicamento_nombre,
    m.presentacion                      AS medicamento_presentacion,
    cm.id_paciente,
    (pp.nombres || ' ' || pp.apellidos) AS paciente_nombre
FROM orden_medica om
JOIN consulta_medica cm ON cm.id_consulta = om.id_consulta
LEFT JOIN medicamento m ON m.id_medicamento = om.id_medicamento
LEFT JOIN paciente pa   ON pa.id_paciente   = cm.id_paciente
LEFT JOIN persona  pp   ON pp.id_persona    = pa.id_persona
WHERE cm.id_medico = mi_id_medico();


-- =====================================================================
-- ============== VISTAS PARA ASISTENTE ================================
-- =====================================================================

-- ---------------------------------------------------------------------
-- vw_asistente_calendario: todas las citas próximas
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_asistente_calendario CASCADE;
CREATE VIEW vw_asistente_calendario AS
SELECT
    c.id_cita,
    c.fecha_cita,
    c.fecha_cita::date                      AS fecha,
    c.fecha_cita::time                      AS hora,
    c.estado,
    c.motivo,
    c.id_paciente,
    (pp.nombres || ' ' || pp.apellidos)     AS paciente_nombre,
    pp.documento                            AS paciente_documento,
    pp.telefono                             AS paciente_telefono,
    c.id_medico,
    (mp.nombres || ' ' || mp.apellidos)     AS medico_nombre,
    m.especialidad                          AS medico_especialidad,
    m.consultorio                           AS medico_consultorio,
    tc.nombre                               AS tipo_consulta
FROM cita c
LEFT JOIN paciente pa  ON pa.id_paciente     = c.id_paciente
LEFT JOIN persona  pp  ON pp.id_persona      = pa.id_persona
LEFT JOIN medico   m   ON m.id_medico        = c.id_medico
LEFT JOIN persona  mp  ON mp.id_persona      = m.id_persona
LEFT JOIN tipo_consulta tc ON tc.id_tipo_consulta = c.id_tipo_consulta
WHERE c.fecha_cita >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY c.fecha_cita ASC;

-- ---------------------------------------------------------------------
-- vw_asistente_citas_pendientes: citas que requieren gestión
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_asistente_citas_pendientes CASCADE;
CREATE VIEW vw_asistente_citas_pendientes AS
SELECT *
FROM vw_asistente_calendario
WHERE estado IN ('programada','confirmada');

-- ---------------------------------------------------------------------
-- vw_asistente_pacientes: lista resumida de pacientes
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_asistente_pacientes CASCADE;
CREATE VIEW vw_asistente_pacientes AS
SELECT
    pa.id_paciente,
    pa.numero_historia,
    pp.documento,
    (pp.nombres || ' ' || pp.apellidos)              AS nombre_completo,
    pp.email,
    pp.telefono,
    EXTRACT(YEAR FROM AGE(pp.fecha_nacimiento))::INT AS edad,
    pa.contacto_emergencia
FROM paciente pa
JOIN persona pp ON pp.id_persona = pa.id_persona
ORDER BY pp.nombres ASC, pp.apellidos ASC;

-- ---------------------------------------------------------------------
-- vw_asistente_medicos_disponibles: médicos para asignar citas
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_asistente_medicos_disponibles CASCADE;
CREATE VIEW vw_asistente_medicos_disponibles AS
SELECT
    m.id_medico,
    m.numero_licencia,
    m.especialidad,
    m.consultorio,
    (pp.nombres || ' ' || pp.apellidos)                         AS nombre_completo,
    pp.email,
    pp.telefono,
    COUNT(c.id_cita) FILTER (WHERE c.fecha_cita::date = CURRENT_DATE) AS citas_hoy
FROM medico m
JOIN persona pp ON pp.id_persona = m.id_persona
LEFT JOIN cita c ON c.id_medico = m.id_medico
WHERE m.activo = TRUE
GROUP BY m.id_medico, pp.id_persona
ORDER BY pp.nombres ASC;


-- =====================================================================
-- ============== VISTAS PARA PACIENTE (CLIENTE) =======================
-- =====================================================================
-- Filtran por el paciente autenticado vía mi_id_paciente()
-- =====================================================================

-- ---------------------------------------------------------------------
-- vw_paciente_mi_perfil: perfil del paciente autenticado
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_paciente_mi_perfil CASCADE;
CREATE VIEW vw_paciente_mi_perfil AS
SELECT
    pa.id_paciente,
    pa.numero_historia,
    h.tipo_sangre,
    h.alergias,
    h.enfermedades_cronicas,
    pa.contacto_emergencia,
    pa.ocupacion,
    pa.estado_civil,
    pp.documento,
    pp.tipo_documento,
    pp.nombres,
    pp.apellidos,
    (pp.nombres || ' ' || pp.apellidos)              AS nombre_completo,
    pp.fecha_nacimiento,
    EXTRACT(YEAR FROM AGE(pp.fecha_nacimiento))::INT AS edad,
    pp.genero,
    pp.email,
    pp.telefono,
    pp.direccion
FROM paciente pa
JOIN persona pp ON pp.id_persona = pa.id_persona
LEFT JOIN historial_clinico h ON h.id_paciente = pa.id_paciente
WHERE pa.id_paciente = mi_id_paciente();

-- ---------------------------------------------------------------------
-- vw_paciente_mis_citas: citas del paciente autenticado
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_paciente_mis_citas CASCADE;
CREATE VIEW vw_paciente_mis_citas AS
SELECT
    c.id_cita,
    c.fecha_cita,
    c.fecha_cita::date                          AS fecha,
    c.fecha_cita::time                          AS hora,
    c.estado,
    c.motivo,
    c.observaciones,
    c.id_medico,
    (mp.nombres || ' ' || mp.apellidos)         AS medico_nombre,
    m.especialidad                              AS medico_especialidad,
    m.consultorio                               AS medico_consultorio,
    tc.nombre                                   AS tipo_consulta
FROM cita c
LEFT JOIN medico   m   ON m.id_medico        = c.id_medico
LEFT JOIN persona  mp  ON mp.id_persona      = m.id_persona
LEFT JOIN tipo_consulta tc ON tc.id_tipo_consulta = c.id_tipo_consulta
WHERE c.id_paciente = mi_id_paciente()
ORDER BY c.fecha_cita DESC;

-- ---------------------------------------------------------------------
-- vw_paciente_proximas_citas: solo las próximas (abiertas + de hoy en adelante)
-- Una cita ya completada/cancelada/no_asistio NO es próxima aunque su
-- fecha sea futura — son históricas. Filtramos por estado abierto para
-- que no se cuele en el dashboard del paciente.
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_paciente_proximas_citas CASCADE;
CREATE VIEW vw_paciente_proximas_citas AS
SELECT *
FROM vw_paciente_mis_citas
WHERE fecha >= CURRENT_DATE
  AND estado IN ('programada', 'confirmada', 'en_curso')
ORDER BY fecha ASC, hora ASC;

-- ---------------------------------------------------------------------
-- vw_paciente_mis_medicamentos: medicamentos recetados al paciente
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_paciente_mis_medicamentos CASCADE;
CREATE VIEW vw_paciente_mis_medicamentos AS
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
    (mp.nombres || ' ' || mp.apellidos) AS medico_nombre,
    me.especialidad                     AS medico_especialidad
FROM orden_medica om
JOIN consulta_medica cm ON cm.id_consulta = om.id_consulta
LEFT JOIN medicamento m ON m.id_medicamento = om.id_medicamento
LEFT JOIN medico  me ON me.id_medico  = cm.id_medico
LEFT JOIN persona mp ON mp.id_persona = me.id_persona
WHERE cm.id_paciente = mi_id_paciente()
ORDER BY om.fecha_emision DESC;

-- ---------------------------------------------------------------------
-- vw_paciente_mi_historial: consultas y diagnósticos del paciente
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_paciente_mi_historial CASCADE;
CREATE VIEW vw_paciente_mi_historial AS
SELECT
    cm.id_consulta,
    cm.fecha_consulta,
    cm.motivo_consulta,
    cm.impresion_diagnostica,
    cm.plan_tratamiento,
    cm.observaciones,
    cm.id_medico,
    (mp.nombres || ' ' || mp.apellidos) AS medico_nombre,
    me.especialidad                     AS medico_especialidad
FROM consulta_medica cm
LEFT JOIN medico  me ON me.id_medico  = cm.id_medico
LEFT JOIN persona mp ON mp.id_persona = me.id_persona
WHERE cm.id_paciente = mi_id_paciente()
ORDER BY cm.fecha_consulta DESC;

-- ---------------------------------------------------------------------
-- vw_paciente_mis_diagnosticos: diagnósticos del paciente
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_paciente_mis_diagnosticos CASCADE;
CREATE VIEW vw_paciente_mis_diagnosticos AS
SELECT
    d.id_diagnostico,
    d.codigo_cie10,
    d.descripcion,
    d.es_principal,
    d.fecha,
    td.nombre                           AS tipo_diagnostico,
    cm.id_consulta,
    cm.fecha_consulta,
    (mp.nombres || ' ' || mp.apellidos) AS medico_nombre
FROM diagnostico d
JOIN consulta_medica cm ON cm.id_consulta = d.id_consulta
LEFT JOIN tipo_diagnostico td ON td.id_tipo_diagnostico = d.id_tipo_diagnostico
LEFT JOIN medico  me ON me.id_medico  = cm.id_medico
LEFT JOIN persona mp ON mp.id_persona = me.id_persona
WHERE cm.id_paciente = mi_id_paciente()
ORDER BY d.fecha DESC;

-- ---------------------------------------------------------------------
-- vw_paciente_mis_signos: signos vitales del paciente
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_paciente_mis_signos CASCADE;
CREATE VIEW vw_paciente_mis_signos AS
SELECT *
FROM signos_vitales
WHERE id_paciente = mi_id_paciente()
ORDER BY fecha_registro DESC;


-- =====================================================================
-- PERMISOS (GRANT) PARA usuarios autenticados
-- =====================================================================
GRANT SELECT ON
    vw_admin_usuarios,
    vw_admin_medicos,
    vw_admin_pacientes,
    vw_admin_citas,
    vw_admin_estadisticas,
    vw_medico_mis_citas,
    vw_medico_agenda_hoy,
    vw_medico_mis_pacientes,
    vw_medico_consultas,
    vw_medico_diagnosticos,
    vw_medico_ordenes,
    vw_asistente_calendario,
    vw_asistente_citas_pendientes,
    vw_asistente_pacientes,
    vw_asistente_medicos_disponibles,
    vw_paciente_mi_perfil,
    vw_paciente_mis_citas,
    vw_paciente_proximas_citas,
    vw_paciente_mis_medicamentos,
    vw_paciente_mi_historial,
    vw_paciente_mis_diagnosticos,
    vw_paciente_mis_signos
TO authenticated;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT table_name FROM information_schema.views
-- WHERE table_schema = 'public' AND table_name LIKE 'vw_%'
-- ORDER BY table_name;
