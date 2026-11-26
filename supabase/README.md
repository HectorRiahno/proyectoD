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

Después de la 2, volver a desplegar la Edge Function:

```bash
npx supabase functions deploy create-user --no-verify-jwt
```

Después de la 7, desplegar la función del ingreso de pacientes:

```bash
npx supabase functions deploy login-paciente --no-verify-jwt
```

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
