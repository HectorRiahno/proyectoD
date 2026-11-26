-- =====================================================================
-- MIGRACIÓN: Endurecimiento de seguridad (vistas, RLS, grants, funciones)
--
-- PROBLEMA PRINCIPAL
--   En Postgres una vista se ejecuta con los permisos de su DUEÑO
--   (postgres), no del usuario que la consulta → IGNORA el RLS de las
--   tablas. Como todas las vistas tienen GRANT SELECT a `authenticated`
--   (y Supabase además da SELECT a `anon` por defecto), cualquier cuenta
--   —incluido un paciente recién registrado desde /register— podía leer:
--     • vw_admin_pacientes  → todos los pacientes con alergias, tipo de sangre...
--     • vw_admin_usuarios   → todos los usuarios y sus roles
--     • vw_audit_log        → TODO el log de auditoría con snapshots clínicos
--     • vw_medico_ordenes_examen → órdenes de exámenes de todos los pacientes
--     • vw_admin_facturas, vw_admin_citas, vw_asistente_*, etc.
--
-- QUÉ HACE
--   1. Elimina vistas que el frontend no usa.
--   2. Vistas globales (admin / médico) → security_invoker = true:
--      pasan a respetar el RLS de quien consulta. El admin sigue viendo
--      todo; el médico solo lo suyo; el paciente nada.
--   3. Vistas del paciente: se quedan con permisos del dueño (necesitan
--      mostrar el nombre del médico, que el RLS de `persona` no le deja
--      leer) pero se blindan con security_barrier y filtran soft-deleted.
--   4. Vistas internas de reportes → solo accesibles desde las RPC.
--   5. Políticas RLS: elimina las antiguas USING (TRUE) y agrega las que
--      faltaban (usuario, asignacion_rol, factura_contador).
--   6. Revoca todo acceso de `anon` (la app no consulta datos sin login).
--   7. Fija search_path en funciones SECURITY DEFINER y revoca las que no
--      deben llamarse vía RPC.
--   8. Sincroniza usuario.ultimo_acceso con el último login (los KPIs de
--      "usuarios activos" siempre daban 0).
--
-- PRE-REQUISITOS
--   Todas las migraciones anteriores ejecutadas. Postgres ≥ 15.
--   Recomendado: correr supabase/diagnostico-seguridad.sql antes y después.
--
-- Transaccional: si algo falla, no se aplica nada. Idempotente.
-- =====================================================================

BEGIN;

-- ─── 0. Guardia de versión ───────────────────────────────────────────
DO $$
BEGIN
    IF current_setting('server_version_num')::INT < 150000 THEN
        RAISE EXCEPTION 'security_invoker requiere Postgres 15+. Versión actual: %',
            current_setting('server_version');
    END IF;
END $$;


-- =====================================================================
-- 1. ELIMINAR VISTAS SIN USO
--    (sin CASCADE: si algo desconocido depende de ellas, la migración
--     falla y hace rollback en vez de borrar en cadena)
-- =====================================================================
DROP VIEW IF EXISTS vw_asistente_citas_pendientes;   -- depende de calendario
DROP VIEW IF EXISTS vw_asistente_calendario;
DROP VIEW IF EXISTS vw_asistente_pacientes;
DROP VIEW IF EXISTS vw_asistente_medicos_disponibles;
DROP VIEW IF EXISTS vw_medico_diagnosticos;
DROP VIEW IF EXISTS vw_medico_ordenes;
DROP VIEW IF EXISTS vw_kpi_diario;


-- =====================================================================
-- 2. VISTAS GLOBALES → security_invoker (respetan RLS del que consulta)
-- =====================================================================
ALTER VIEW IF EXISTS vw_admin_usuarios         SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_admin_medicos          SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_admin_pacientes        SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_admin_citas            SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_admin_estadisticas     SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_admin_facturas         SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_admin_papelera         SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_audit_log              SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_audit_usuarios         SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_medico_mis_citas       SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_medico_agenda_hoy      SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_medico_mis_pacientes   SET (security_invoker = true);
ALTER VIEW IF EXISTS vw_medico_ordenes_examen  SET (security_invoker = true);

-- vw_medico_consultas: había dos versiones incompatibles en el repo
-- (migration-consulta.sql con los campos del modal, y
--  migration-vw-medico-consultas-tipo.sql con tipo_consulta pero SIN esos
--  campos ni filtro de borrados). Se unifican aquí.
DROP VIEW IF EXISTS vw_medico_consultas;
CREATE VIEW vw_medico_consultas
WITH (security_invoker = true) AS
SELECT
    cm.id_consulta,
    cm.id_cita,
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
    cm.id_paciente,
    (pp.nombres || ' ' || pp.apellidos)   AS paciente_nombre,
    pp.documento                          AS paciente_documento,
    pa.numero_historia,
    c.id_tipo_consulta,
    tc.nombre                             AS tipo_consulta_nombre
FROM consulta_medica cm
LEFT JOIN paciente       pa ON pa.id_paciente      = cm.id_paciente
LEFT JOIN persona        pp ON pp.id_persona       = pa.id_persona
LEFT JOIN cita           c  ON c.id_cita           = cm.id_cita
LEFT JOIN tipo_consulta  tc ON tc.id_tipo_consulta = c.id_tipo_consulta
WHERE cm.id_medico = mi_id_medico()
  AND cm.deleted_at IS NULL;


-- =====================================================================
-- 3. VISTAS DEL PACIENTE
--    Siguen con permisos del dueño (filtran por mi_id_paciente() /
--    auth.uid(), así que solo devuelven datos propios). security_barrier
--    impide que filtros del cliente se evalúen antes que el de la vista.
--    Se recrean las que mostraban citas/consultas soft-deleted.
-- =====================================================================
DROP VIEW IF EXISTS vw_paciente_proximas_citas;   -- depende de mis_citas
DROP VIEW IF EXISTS vw_paciente_mis_citas;
CREATE VIEW vw_paciente_mis_citas
WITH (security_barrier = true) AS
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
  AND c.deleted_at IS NULL
ORDER BY c.fecha_cita DESC;

CREATE VIEW vw_paciente_proximas_citas
WITH (security_barrier = true) AS
SELECT *
FROM vw_paciente_mis_citas
WHERE fecha >= CURRENT_DATE
  AND estado IN ('programada', 'confirmada', 'en_curso')
ORDER BY fecha ASC, hora ASC;

DROP VIEW IF EXISTS vw_paciente_mi_historial;
CREATE VIEW vw_paciente_mi_historial
WITH (security_barrier = true) AS
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
    (mp.nombres || ' ' || mp.apellidos) AS medico_nombre,
    me.especialidad                     AS medico_especialidad
FROM consulta_medica cm
LEFT JOIN medico  me ON me.id_medico  = cm.id_medico
LEFT JOIN persona mp ON mp.id_persona = me.id_persona
WHERE cm.id_paciente = mi_id_paciente()
  AND cm.deleted_at IS NULL
ORDER BY cm.fecha_consulta DESC;

DROP VIEW IF EXISTS vw_paciente_mis_medicamentos;
CREATE VIEW vw_paciente_mis_medicamentos
WITH (security_barrier = true) AS
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
  AND cm.deleted_at IS NULL
ORDER BY om.fecha_emision DESC;

DROP VIEW IF EXISTS vw_paciente_mis_diagnosticos;
CREATE VIEW vw_paciente_mis_diagnosticos
WITH (security_barrier = true) AS
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
  AND cm.deleted_at IS NULL
ORDER BY d.fecha DESC;

-- Resto de vistas auto-filtradas: solo se blindan
ALTER VIEW IF EXISTS vw_paciente_mi_perfil           SET (security_barrier = true);
ALTER VIEW IF EXISTS vw_paciente_mis_signos          SET (security_barrier = true);
ALTER VIEW IF EXISTS vw_paciente_mis_facturas        SET (security_barrier = true);
ALTER VIEW IF EXISTS vw_paciente_mis_adjuntos        SET (security_barrier = true);
ALTER VIEW IF EXISTS vw_paciente_mis_ordenes_examen  SET (security_barrier = true);
-- vw_medico_adjuntos_paciente se queda con permisos del dueño a propósito:
-- deja ver adjuntos de otros médicos del mismo paciente (el RLS de
-- consulta_medica no lo permitiría). Ya filtra por es_admin()/mi_id_medico().
ALTER VIEW IF EXISTS vw_medico_adjuntos_paciente     SET (security_barrier = true);

GRANT SELECT ON
    vw_medico_consultas,
    vw_paciente_mis_citas,
    vw_paciente_proximas_citas,
    vw_paciente_mi_historial,
    vw_paciente_mis_medicamentos,
    vw_paciente_mis_diagnosticos
TO authenticated;


-- =====================================================================
-- 4. VISTAS INTERNAS DE REPORTES
--    Solo las consumen las RPC rpc_* (SECURITY DEFINER, ya validan
--    es_admin()). Nadie debe leerlas directo vía API.
-- =====================================================================
DO $$
DECLARE
    v TEXT;
BEGIN
    FOREACH v IN ARRAY ARRAY[
        'vw_serie_diaria', 'vw_horas_pico', 'vw_pacientes_demografia',
        'vw_consultas_por_medico', 'vw_diagnosticos_frecuentes',
        'vw_inventario_critico', 'vw_servicios_top', 'vw_pacientes_inactivos'
    ] LOOP
        IF to_regclass('public.' || v) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', v);
        END IF;
    END LOOP;
END $$;


-- =====================================================================
-- 5. POLÍTICAS RLS
-- =====================================================================

-- ─── 5.a Eliminar políticas antiguas USING (TRUE) ────────────────────
-- (las políticas permisivas se combinan con OR: mientras exista una
--  USING (TRUE), las restrictivas no sirven de nada)
DROP POLICY IF EXISTS "auth_read_persona"        ON persona;
DROP POLICY IF EXISTS "auth_read_paciente"       ON paciente;
DROP POLICY IF EXISTS "auth_read_cita"           ON cita;
DROP POLICY IF EXISTS "auth_read_consulta"       ON consulta_medica;
DROP POLICY IF EXISTS "medico_read_consulta"     ON consulta_medica;
DROP POLICY IF EXISTS "auth_read_diagnostico"    ON diagnostico;
DROP POLICY IF EXISTS "auth_read_sintoma"        ON sintoma;
DROP POLICY IF EXISTS "auth_read_signos"         ON signos_vitales;
DROP POLICY IF EXISTS "medico_write_signos"      ON signos_vitales;
DROP POLICY IF EXISTS "auth_read_orden"          ON orden_medica;
DROP POLICY IF EXISTS "auth_read_asignacion_rol" ON asignacion_rol;

-- ─── 5.b Re-asegurar las políticas restrictivas de lectura ───────────
-- (por si migration-rls-security.sql / soft-delete no se ejecutaron o
--  rls-medico.sql se volvió a correr después y las pisó)
DROP POLICY IF EXISTS "persona_select" ON persona;
CREATE POLICY "persona_select" ON persona FOR SELECT TO authenticated
  USING (
    id_persona = mi_id_persona()
    OR mi_id_medico() IS NOT NULL
    OR es_admin_o_asistente()
  );

DROP POLICY IF EXISTS "paciente_select" ON paciente;
CREATE POLICY "paciente_select" ON paciente FOR SELECT TO authenticated
  USING (
    (id_paciente = mi_id_paciente()
     OR mi_id_medico() IS NOT NULL
     OR es_admin_o_asistente())
    AND (deleted_at IS NULL OR es_admin())
  );

DROP POLICY IF EXISTS "cita_select" ON cita;
CREATE POLICY "cita_select" ON cita FOR SELECT TO authenticated
  USING (
    (id_paciente = mi_id_paciente()
     OR id_medico = mi_id_medico()
     OR es_admin_o_asistente())
    AND (deleted_at IS NULL OR es_admin())
  );

DROP POLICY IF EXISTS "consulta_select" ON consulta_medica;
CREATE POLICY "consulta_select" ON consulta_medica FOR SELECT TO authenticated
  USING (
    (id_paciente = mi_id_paciente()
     OR id_medico = mi_id_medico()
     OR es_admin_o_asistente())
    AND (deleted_at IS NULL OR es_admin())
  );

DROP POLICY IF EXISTS "diagnostico_select" ON diagnostico;
CREATE POLICY "diagnostico_select" ON diagnostico FOR SELECT TO authenticated
  USING (
    id_consulta IN (
      SELECT id_consulta FROM consulta_medica
      WHERE id_paciente = mi_id_paciente() OR id_medico = mi_id_medico()
    )
    OR es_admin_o_asistente()
  );

DROP POLICY IF EXISTS "sintoma_select" ON sintoma;
CREATE POLICY "sintoma_select" ON sintoma FOR SELECT TO authenticated
  USING (
    id_consulta IN (
      SELECT id_consulta FROM consulta_medica
      WHERE id_paciente = mi_id_paciente() OR id_medico = mi_id_medico()
    )
    OR es_admin_o_asistente()
  );

DROP POLICY IF EXISTS "orden_select" ON orden_medica;
CREATE POLICY "orden_select" ON orden_medica FOR SELECT TO authenticated
  USING (
    id_consulta IN (
      SELECT id_consulta FROM consulta_medica
      WHERE id_paciente = mi_id_paciente() OR id_medico = mi_id_medico()
    )
    OR es_admin_o_asistente()
  );

DROP POLICY IF EXISTS "signos_select" ON signos_vitales;
DROP POLICY IF EXISTS "signos_insert" ON signos_vitales;
DROP POLICY IF EXISTS "signos_update" ON signos_vitales;
DROP POLICY IF EXISTS "signos_delete" ON signos_vitales;

CREATE POLICY "signos_select" ON signos_vitales FOR SELECT TO authenticated
  USING (
    id_paciente = mi_id_paciente()
    OR id_medico = mi_id_medico()
    OR id_consulta IN (
      SELECT id_consulta FROM consulta_medica WHERE id_medico = mi_id_medico()
    )
    OR es_admin_o_asistente()
  );

CREATE POLICY "signos_insert" ON signos_vitales FOR INSERT TO authenticated
  WITH CHECK (
    (mi_id_medico() IS NOT NULL AND id_medico = mi_id_medico())
    OR es_admin_o_asistente()
  );

CREATE POLICY "signos_update" ON signos_vitales FOR UPDATE TO authenticated
  USING (
    (mi_id_medico() IS NOT NULL AND id_medico = mi_id_medico())
    OR es_admin_o_asistente()
  )
  WITH CHECK (
    (mi_id_medico() IS NOT NULL AND id_medico = mi_id_medico())
    OR es_admin_o_asistente()
  );

CREATE POLICY "signos_delete" ON signos_vitales FOR DELETE TO authenticated
  USING (
    (mi_id_medico() IS NOT NULL AND id_medico = mi_id_medico())
    OR es_admin_o_asistente()
  );

-- ─── 5.c usuario: faltaba política SELECT ────────────────────────────
-- Antes el perfil se leía a través de vw_admin_usuarios (que saltaba el
-- RLS). Ahora que la vista respeta RLS, cada usuario necesita poder leer
-- su propia fila para que AuthContext cargue su perfil y rol.
DROP POLICY IF EXISTS "usuario_select" ON usuario;
CREATE POLICY "usuario_select" ON usuario FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR es_admin());

-- ─── 5.d asignacion_rol: antes cualquiera veía el rol de todos ───────
DROP POLICY IF EXISTS "asignacion_rol_select" ON asignacion_rol;
CREATE POLICY "asignacion_rol_select" ON asignacion_rol FOR SELECT TO authenticated
  USING (id_usuario = mi_id_usuario() OR es_admin());

-- ─── 5.e factura_contador: se creó sin RLS ───────────────────────────
-- Cualquiera podía alterar la numeración de facturas vía API. Solo la
-- función generar_numero_factura() (SECURITY DEFINER) debe tocarla.
ALTER TABLE factura_contador ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON factura_contador FROM anon, authenticated;


-- =====================================================================
-- 6. ANON: sin acceso a datos
--    La app solo usa anon para login / reset de contraseña (Auth API),
--    nunca para consultar tablas. Todas las políticas son TO authenticated.
-- =====================================================================
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;   -- incluye vistas
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Que las tablas/vistas futuras tampoco se den a anon automáticamente
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;


-- =====================================================================
-- 7. FUNCIONES SECURITY DEFINER
-- =====================================================================

-- ─── 7.a Fijar search_path en todas las que no lo tienen ─────────────
-- Sin esto, una función DEFINER puede resolver nombres de tabla en un
-- esquema controlado por el atacante (pg_temp) y ejecutarse como postgres.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS fn
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef
          AND NOT EXISTS (
              SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) cfg
              WHERE cfg LIKE 'search_path=%'
          )
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.fn);
        RAISE NOTICE 'search_path fijado en %', r.fn;
    END LOOP;
END $$;

-- ─── 7.b Funciones internas que NO deben exponerse como RPC ──────────
-- provision_user_from_auth: crea persona/usuario para cualquier UUID.
-- generar_numero_factura:   consume números de factura.
-- recalcular_factura_totales: reescribe totales de cualquier factura.
-- (Los triggers que las llaman corren como postgres, no se ven afectados.)
REVOKE EXECUTE ON FUNCTION public.provision_user_from_auth(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generar_numero_factura()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalcular_factura_totales(BIGINT)          FROM PUBLIC, anon, authenticated;

-- RPC usadas por la app: solo usuarios autenticados
REVOKE EXECUTE ON FUNCTION public.generar_snapshot_diario(DATE)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.evaluar_alertas_inventario()   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.generar_snapshot_diario(DATE)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.evaluar_alertas_inventario()   TO authenticated;


-- =====================================================================
-- 8. FUNCIONAL: sincronizar usuario.ultimo_acceso con el login
--    Nada actualizaba esta columna → "usuarios activos 30d" siempre 0.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_auth_last_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
        UPDATE public.usuario
        SET ultimo_acceso = NEW.last_sign_in_at
        WHERE auth_user_id = NEW.id;
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Nunca bloquear un login por un fallo de sincronización
    RAISE WARNING 'handle_auth_last_sign_in: %', SQLERRM;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_auth_last_sign_in() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_sign_in ON auth.users;
CREATE TRIGGER on_auth_user_sign_in
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_last_sign_in();

-- Backfill con el último login conocido
UPDATE public.usuario u
SET ultimo_acceso = au.last_sign_in_at
FROM auth.users au
WHERE au.id = u.auth_user_id
  AND au.last_sign_in_at IS NOT NULL
  AND u.ultimo_acceso IS DISTINCT FROM au.last_sign_in_at;


COMMIT;


-- =====================================================================
-- VERIFICACIÓN (después de ejecutar)
-- =====================================================================
-- 1. Correr supabase/diagnostico-seguridad.sql:
--    • Bloque 1: las vistas vw_admin_*, vw_audit_*, vw_medico_* (salvo
--      adjuntos) deben mostrar security_invoker = true y anon = false.
--    • Bloque 2: no debe aparecer ninguna tabla.
--    • Bloque 3: solo catálogos (rol, tipo_*, medicamento, medico,
--      horario_medico, asistente, categoria_medicamento).
--    • Bloque 5: vacío.
--
-- 2. Probar en la app con cada rol:
--    • Paciente: Mi perfil, Mis citas, Historial, Facturas → igual que antes.
--      Intentar /admin/pacientes → la lista debe salir VACÍA.
--    • Médico: Agenda, Consultas, Mis pacientes → igual que antes.
--    • Admin: todo igual que antes.
--
-- 3. Dashboard → Advisors → Security Advisor: los errores
--    "security_definer_view" deben bajar a solo las vistas vw_paciente_*
--    y vw_medico_adjuntos_paciente (intencionales, ver sección 3).
--
-- ROLLBACK de las vistas (si algo de la UI se rompe):
--    ALTER VIEW <nombre> SET (security_invoker = false);
-- =====================================================================
