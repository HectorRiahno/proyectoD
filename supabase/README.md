# Base de datos (Supabase)

Los archivos `.sql` de esta carpeta se ejecutan a mano en **Supabase → SQL Editor**.
Todos son idempotentes (se pueden volver a ejecutar sin romper nada).

## Migraciones de seguridad y trazabilidad

Ejecutar **en este orden**, después de todas las migraciones anteriores:

| # | Archivo | Qué hace |
|---|---------|----------|
| 1 | `migration-seguridad-registro.sql` | El registro público ya no puede ligarse a una persona/paciente existente. |
| 2 | `migration-trazabilidad-auditoria.sql` | Autor fiable (`created_by`), origen de escrituras sin sesión, más tablas en `audit_log` e inicios de sesión. |
| 3 | `migration-restriccion-clinica.sql` | El médico sólo registra consultas de pacientes con cita suya y sólo ve la historia (completa) de pacientes asignados o ya atendidos; sin borrado físico de datos clínicos. |
| 4 | `migration-acceso-historia-clinica.sql` | Registro de lecturas y exportaciones de la historia clínica. |
| 5 | `migration-autoagendamiento-paciente.sql` | El paciente aparta su propia cita desde el portal: catálogo de médicos con horario, límites (3 citas pendientes, 60 días) y ficha de paciente automática. |
| 6 | `migration-tipos-cita-agendables.sql` | Al agendar sólo se puede elegir "Consulta general" o "Control" (los demás tipos quedan para citas antiguas y facturación). |
| 7 | `migration-login-paciente-nacimiento.sql` | El paciente entra con documento + fecha de nacimiento, sin correo ni contraseña (pestaña "Soy paciente"). Bloqueo tras intentos fallidos. |
| 8 | `migration-teleconsulta-whatsapp.sql` | Tipo de cita "Teleconsulta" con enlace de videollamada automático, WhatsApp y autorización por cita, y registro de mensajes enviados. Ver sección "Teleconsulta y avisos por WhatsApp". |

Después de la 2, volver a desplegar la Edge Function:

```bash
npx supabase functions deploy create-user --no-verify-jwt
```

Después de la 7, desplegar la función del ingreso de pacientes:

```bash
npx supabase functions deploy login-paciente --no-verify-jwt
```

## Teleconsulta y avisos por WhatsApp

1. Ejecutar `migration-teleconsulta-whatsapp.sql` (migración 8). Desde ese momento
   "Teleconsulta" aparece como tipo de cita y cada teleconsulta recibe su enlace de
   videollamada. **Esto ya funciona sin WhatsApp**: el paciente ve el enlace en
   «Mis citas» y el personal puede enviarlo con el botón «Enviar por WhatsApp»
   (abre WhatsApp con el mensaje listo, desde su propio número).
2. Para que los mensajes salgan **solos** (confirmación, recordatorio 24 h antes y
   enlace 1 h antes de la teleconsulta) se usa la API oficial de WhatsApp Business:
   - Crear una app en developers.facebook.com → producto **WhatsApp**, con un número
     de teléfono propio de la clínica (no puede estar usándose en la app de WhatsApp).
   - En **WhatsApp Manager → Plantillas de mensajes**, crear (categoría *Utilidad*,
     idioma *Spanish*) estas dos plantillas con este texto exacto:

     `cita_confirmada`
     > Hola {{1}}, tu cita de {{2}} con {{3}} quedó agendada para el {{4}} a las {{5}}. {{6}}. Si no puedes asistir, cancélala desde el portal del paciente.

     `recordatorio_cita`
     > Hola {{1}}, te recordamos tu cita de {{2}} con {{3}} {{4}} a las {{5}}. {{6}}. Si no puedes asistir, cancélala desde el portal del paciente.

   - Crear un **token permanente** (Business Settings → Usuarios del sistema).
3. Desplegar la función y configurar sus secretos (Edge Functions → Secrets):

   ```bash
   npx supabase functions deploy whatsapp-notificar --no-verify-jwt
   ```

   `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `CRON_SECRET`, `CLINICA_NOMBRE`,
   `CLINICA_DIRECCION` (detalle en el encabezado de `functions/whatsapp-notificar/index.ts`).
4. Activar **pg_cron** y **pg_net** (Database → Extensions) y ejecutar `cron-whatsapp.sql`
   con la misma clave de `CRON_SECRET`: revisa cada 10 minutos qué mensajes tocan.

Qué se envió: `SELECT * FROM notificacion_whatsapp ORDER BY created_at DESC;`

Configuración que no está en SQL (Dashboard):

- **Authentication → Sign In / Providers → Email → "Confirm email": activado.**
- **Authentication → URL Configuration → Redirect URLs:** sólo los dominios de la app
  (producción y `http://localhost:5173`).
- **Edge Functions → create-user → `ALLOWED_ORIGINS`:** los mismos dominios, separados por coma.

## Cuentas de prueba (sólo local, no se suben a GitHub)

- `seed-cuentas-prueba.sql`: 15 médicos (uno por especialidad, `<especialidad>@his.test` /
  `Medico123`) y 6 clientes (`cliente1..6@his.test` / `Cliente123`), sin invitación.
- `seed-cuentas-prueba-borrar.sql`: las elimina (o las bloquea si ya tienen datos clínicos).

## Pendiente: migraciones versionadas

Hoy no hay forma de saber qué archivos están aplicados en producción. Para resolverlo con la
CLI de Supabase (requiere Docker y la contraseña de la base):

```bash
npx supabase link --project-ref wwwvvgnwirlyyfzlnpzk
npx supabase db pull            # crea supabase/migrations/<timestamp>_remote_schema.sql
```

Ese archivo es la foto exacta de producción. Desde entonces, cada cambio nuevo se crea con
`npx supabase migration new <nombre>` y se aplica con `npx supabase db push`; los `.sql`
sueltos de esta carpeta quedan como histórico.
