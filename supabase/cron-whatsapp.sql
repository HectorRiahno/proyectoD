-- =====================================================================
-- ENVÍO AUTOMÁTICO DE RECORDATORIOS POR WHATSAPP (cada 10 minutos)
--
-- Ejecutar UNA vez en el SQL Editor, después de:
--   1. migration-teleconsulta-whatsapp.sql
--   2. desplegar la función: npx supabase functions deploy whatsapp-notificar --no-verify-jwt
--   3. Database → Extensions: activar pg_cron y pg_net
--
-- Antes de ejecutar, reemplazar CAMBIAR-POR-UNA-CLAVE-LARGA por una
-- clave aleatoria (ej: la que da https://www.random.org/strings o
-- `openssl rand -hex 32`) y poner ESA MISMA clave en el secreto
-- CRON_SECRET de la Edge Function (Edge Functions → Secrets).
-- Pegar la clave sólo en el SQL Editor: NO guardarla en este archivo
-- (se sube al repositorio).
-- =====================================================================

-- La clave queda cifrada en Vault, no en texto plano en el cron.
SELECT vault.create_secret('CAMBIAR-POR-UNA-CLAVE-LARGA', 'whatsapp_cron_secret');

-- Si ya existía la tarea, se reemplaza.
SELECT cron.unschedule('whatsapp-recordatorios')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'whatsapp-recordatorios');

SELECT cron.schedule(
    'whatsapp-recordatorios',
    '*/10 * * * *',
    $$
    SELECT net.http_post(
        url     := 'https://wwwvvgnwirlyyfzlnpzk.supabase.co/functions/v1/whatsapp-notificar',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets
                               WHERE name = 'whatsapp_cron_secret')
        ),
        body    := '{}'::jsonb
    );
    $$
);

-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
-- SELECT jobname, schedule, active FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;   -- respuesta de la función
--
-- Para cambiar la clave:
-- SELECT vault.update_secret((SELECT id FROM vault.secrets WHERE name = 'whatsapp_cron_secret'), 'NUEVA-CLAVE');
-- (y actualizar CRON_SECRET en la Edge Function)
--
-- Para apagar el envío automático:
-- SELECT cron.unschedule('whatsapp-recordatorios');
-- =====================================================================
