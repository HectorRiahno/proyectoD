-- =====================================================================
-- MIGRACIÓN: Teleconsulta + avisos por WhatsApp
--
--   1. Tipo de cita "Teleconsulta" (agendable). Al crear una cita de ese
--      tipo, o al cambiarla a ese tipo, la BD le genera un enlace único
--      de videollamada (Jitsi Meet: gratuito, sin instalar nada).
--   2. Por cita: teléfono de WhatsApp y autorización del paciente para
--      recibir mensajes (la exige WhatsApp y la Ley 1581).
--   3. notificacion_whatsapp: cada mensaje enviado (o fallido), para no
--      repetirlo y para que el admin vea qué se envió.
--   4. fn_whatsapp_pendientes(): qué mensajes tocan ahora. La llama la
--      Edge Function `whatsapp-notificar`:
--        · confirmación   → apenas se agenda la cita
--        · recordatorio_24h → un día antes (si se agendó con más de un
--                            día de anticipación)
--        · recordatorio_1h  → una hora antes, sólo teleconsultas (lleva
--                            el enlace para entrar)
--
-- Requiere migration-tipos-cita-agendables.sql. Transaccional e
-- idempotente. Después: desplegar la función y programar el envío
-- automático (supabase/cron-whatsapp.sql).
-- =====================================================================

BEGIN;

-- ─── 1. Tipo "Teleconsulta" ──────────────────────────────────────────
ALTER TABLE tipo_consulta
    ADD COLUMN IF NOT EXISTS es_teleconsulta BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO tipo_consulta (nombre, descripcion, duracion_min, costo, agendable, es_teleconsulta)
VALUES ('Teleconsulta', 'Consulta por videollamada desde el celular o el computador', 30, 50000, TRUE, TRUE)
ON CONFLICT (nombre) DO UPDATE
   SET agendable = TRUE, es_teleconsulta = TRUE;     -- respeta duración y costo si ya existía


-- ─── 2. Columnas en cita ─────────────────────────────────────────────
ALTER TABLE cita
    ADD COLUMN IF NOT EXISTS enlace_teleconsulta TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_telefono   TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_autorizado BOOLEAN NOT NULL DEFAULT FALSE;


-- ─── 3. Enlace de videollamada automático ────────────────────────────
-- Sala con nombre aleatorio de 32 caracteres: imposible de adivinar.
CREATE OR REPLACE FUNCTION public.fn_cita_enlace_teleconsulta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tele BOOLEAN;
BEGIN
    SELECT es_teleconsulta INTO v_tele
      FROM tipo_consulta WHERE id_tipo_consulta = NEW.id_tipo_consulta;

    IF coalesce(v_tele, FALSE) THEN
        IF NEW.enlace_teleconsulta IS NULL THEN
            NEW.enlace_teleconsulta := 'https://meet.jit.si/Teleconsulta-'
                                       || replace(gen_random_uuid()::text, '-', '');
        END IF;
    ELSE
        NEW.enlace_teleconsulta := NULL;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_cita_enlace_teleconsulta() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_cita_enlace_teleconsulta ON cita;
CREATE TRIGGER trg_cita_enlace_teleconsulta
    BEFORE INSERT OR UPDATE OF id_tipo_consulta ON cita
    FOR EACH ROW EXECUTE FUNCTION fn_cita_enlace_teleconsulta();

-- Citas de teleconsulta que ya existieran sin enlace
UPDATE cita c
   SET enlace_teleconsulta = 'https://meet.jit.si/Teleconsulta-' || replace(gen_random_uuid()::text, '-', '')
  FROM tipo_consulta t
 WHERE t.id_tipo_consulta = c.id_tipo_consulta
   AND t.es_teleconsulta
   AND c.enlace_teleconsulta IS NULL;


-- ─── 4. WhatsApp de la cita (lo llama el frontend tras agendar) ──────
-- Normaliza a formato internacional colombiano: '300 123 4567' → '573001234567'.
CREATE OR REPLACE FUNCTION public.fn_telefono_whatsapp(p_telefono TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    d TEXT := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
BEGIN
    IF d ~ '^3\d{9}$'    THEN RETURN '57' || d; END IF;   -- celular colombiano
    IF d ~ '^573\d{9}$'  THEN RETURN d; END IF;
    -- Otro país: sólo si se escribió con '+' e indicativo (ej: +1 305 555 0100)
    IF trim(p_telefono) LIKE '+%' AND d ~ '^[1-9]\d{9,14}$' AND left(d, 2) <> '57' THEN RETURN d; END IF;
    RETURN NULL;   -- fijos y números incompletos no tienen WhatsApp
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_cita_configurar_whatsapp(
    p_id_cita    BIGINT,
    p_telefono   TEXT,
    p_autorizado BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pac BIGINT;
    v_tel TEXT;
BEGIN
    SELECT id_paciente INTO v_pac FROM cita WHERE id_cita = p_id_cita AND deleted_at IS NULL;
    IF v_pac IS NULL THEN
        RAISE EXCEPTION 'La cita no existe.' USING ERRCODE = '22023';
    END IF;
    IF NOT (es_admin_o_asistente() OR v_pac = mi_id_paciente()) THEN
        RAISE EXCEPTION 'No tienes permiso sobre esta cita.' USING ERRCODE = '42501';
    END IF;

    IF p_autorizado THEN
        v_tel := fn_telefono_whatsapp(p_telefono);
        IF v_tel IS NULL THEN
            RAISE EXCEPTION 'El número de WhatsApp no es válido. Escribe un celular de 10 dígitos, ej: 300 123 4567.'
                USING ERRCODE = '22023';
        END IF;
    END IF;

    UPDATE cita
       SET whatsapp_autorizado = coalesce(p_autorizado, FALSE),
           whatsapp_telefono   = CASE WHEN p_autorizado THEN v_tel END
     WHERE id_cita = p_id_cita;

    RETURN v_tel;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cita_configurar_whatsapp(BIGINT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_cita_configurar_whatsapp(BIGINT, TEXT, BOOLEAN) TO authenticated;


-- ─── 5. Registro de mensajes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notificacion_whatsapp (
    id_notificacion BIGSERIAL PRIMARY KEY,
    id_cita         BIGINT NOT NULL REFERENCES cita(id_cita) ON DELETE CASCADE,
    tipo            TEXT   NOT NULL CHECK (tipo IN ('confirmacion', 'recordatorio_24h', 'recordatorio_1h')),
    estado          TEXT   NOT NULL CHECK (estado IN ('enviado', 'error')),
    intentos        INTEGER NOT NULL DEFAULT 1,
    telefono        TEXT,
    wamid           TEXT,                 -- id del mensaje en WhatsApp
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id_cita, tipo)
);

ALTER TABLE public.notificacion_whatsapp ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notificacion_whatsapp FROM anon, authenticated;
GRANT SELECT ON public.notificacion_whatsapp TO authenticated;

DROP POLICY IF EXISTS notif_whatsapp_select ON public.notificacion_whatsapp;
CREATE POLICY notif_whatsapp_select ON public.notificacion_whatsapp
    FOR SELECT TO authenticated USING (es_admin_o_asistente());

-- Sólo la Edge Function (service_role) registra envíos.
CREATE OR REPLACE FUNCTION public.fn_whatsapp_registrar(
    p_id_cita  BIGINT,
    p_tipo     TEXT,
    p_estado   TEXT,
    p_telefono TEXT,
    p_wamid    TEXT,
    p_error    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO notificacion_whatsapp AS n (id_cita, tipo, estado, telefono, wamid, error)
    VALUES (p_id_cita, p_tipo, p_estado, p_telefono, p_wamid, left(p_error, 500))
    ON CONFLICT (id_cita, tipo) DO UPDATE
       SET estado     = EXCLUDED.estado,
           intentos   = n.intentos + 1,
           telefono   = EXCLUDED.telefono,
           wamid      = coalesce(EXCLUDED.wamid, n.wamid),
           error      = EXCLUDED.error,
           updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.fn_whatsapp_registrar(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_whatsapp_registrar(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;


-- ─── 6. Mensajes pendientes ──────────────────────────────────────────
-- fecha_cita y fn_ahora_cita() usan la misma convención (hora de
-- Colombia guardada como UTC). created_at es un instante real: se
-- convierte a esa convención para compararlo.
-- Un mensaje fallido se reintenta hasta 3 veces.
CREATE OR REPLACE FUNCTION public.fn_whatsapp_pendientes(p_id_cita BIGINT DEFAULT NULL)
RETURNS TABLE (
    id_cita      BIGINT,
    tipo         TEXT,
    telefono     TEXT,
    paciente     TEXT,
    medico       TEXT,
    especialidad TEXT,
    tipo_cita    TEXT,
    fecha        DATE,
    hora         TEXT,
    enlace       TEXT,
    consultorio  TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH base AS (
        SELECT c.id_cita,
               c.whatsapp_telefono                               AS telefono,
               split_part(pp.nombres, ' ', 1)                    AS paciente,
               trim(pm.nombres || ' ' || pm.apellidos)           AS medico,
               coalesce(m.especialidad, 'Medicina General')      AS especialidad,
               coalesce(t.nombre, 'Consulta')                    AS tipo_cita,
               (c.fecha_cita AT TIME ZONE 'UTC')::DATE           AS fecha,
               to_char(c.fecha_cita AT TIME ZONE 'UTC', 'HH24:MI') AS hora,
               c.enlace_teleconsulta                             AS enlace,
               m.consultorio,
               c.fecha_cita,
               (c.created_at AT TIME ZONE 'America/Bogota') AT TIME ZONE 'UTC' AS creada
          FROM cita c
          JOIN paciente pa      ON pa.id_paciente = c.id_paciente
          JOIN persona  pp      ON pp.id_persona  = pa.id_persona
          JOIN medico   m       ON m.id_medico    = c.id_medico
          JOIN persona  pm      ON pm.id_persona  = m.id_persona
          LEFT JOIN tipo_consulta t ON t.id_tipo_consulta = c.id_tipo_consulta
         WHERE c.whatsapp_autorizado
           AND c.whatsapp_telefono IS NOT NULL
           AND c.estado IN ('programada', 'confirmada')
           AND c.deleted_at IS NULL
           AND c.fecha_cita > fn_ahora_cita() - INTERVAL '10 minutes'
           AND (p_id_cita IS NULL OR c.id_cita = p_id_cita)
    ),
    candidatos AS (
        SELECT b.*, 'confirmacion'::TEXT AS tipo FROM base b
        UNION ALL
        SELECT b.*, 'recordatorio_24h' FROM base b
         WHERE b.fecha_cita <= fn_ahora_cita() + INTERVAL '24 hours'
           AND b.fecha_cita >  fn_ahora_cita() + INTERVAL '2 hours'
           AND b.creada     <  b.fecha_cita - INTERVAL '24 hours'
        UNION ALL
        SELECT b.*, 'recordatorio_1h' FROM base b
         WHERE b.enlace IS NOT NULL
           AND b.fecha_cita <= fn_ahora_cita() + INTERVAL '75 minutes'
           AND b.creada     <  b.fecha_cita - INTERVAL '2 hours'
    )
    SELECT k.id_cita, k.tipo, k.telefono, k.paciente, k.medico, k.especialidad,
           k.tipo_cita, k.fecha, k.hora, k.enlace, k.consultorio
      FROM candidatos k
     WHERE NOT EXISTS (
           SELECT 1 FROM notificacion_whatsapp n
            WHERE n.id_cita = k.id_cita AND n.tipo = k.tipo
              AND (n.estado = 'enviado' OR n.intentos >= 3))
       -- la confirmación sólo mientras la cita es reciente (no a citas viejas)
       AND (k.tipo <> 'confirmacion' OR k.creada > fn_ahora_cita() - INTERVAL '1 day')
     ORDER BY k.fecha_cita;
$$;

REVOKE ALL ON FUNCTION public.fn_whatsapp_pendientes(BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_whatsapp_pendientes(BIGINT) TO service_role;

COMMIT;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT nombre, agendable, es_teleconsulta FROM tipo_consulta WHERE agendable;
--   → Consulta general, Control, Teleconsulta
-- SELECT * FROM fn_whatsapp_pendientes();          -- qué se enviaría ahora
-- SELECT * FROM notificacion_whatsapp ORDER BY created_at DESC;
-- =====================================================================
