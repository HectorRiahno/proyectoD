# Contexto — Decisiones de autenticación

> Documento de contexto sobre cómo funciona el sistema de autenticación.
> Para setup general del proyecto ver [README.md](./README.md).

---

## 1. Decisión: SOLO email + contraseña

- **No se usa Google OAuth** ni ningún proveedor de terceros.
- El único método de inicio de sesión es **email + contraseña** vía `supabase.auth.signInWithPassword()`.
- En el Dashboard de Supabase: el provider **Email** habilitado; los demás (Google, GitHub, etc.) deshabilitados.

### Implicaciones en el código

- `src/features/auth/pages/Login.jsx` → solo formulario email/password. Sin botón "Continuar con Google".
- `src/contexts/AuthContext.jsx` → solo expone `login(email, password)` y `registro(...)`. No existe `loginConGoogle`.

---

## 2. Flujo de creación de cuentas

**Los usuarios no se auto-registran libremente. Todas las cuentas las crea el ADMINISTRADOR.**

```
┌─────────────────────────────────────────────┐
│  Admin desde el panel:                      │
│    email + password + nombre + rol          │
└────────────────────┬────────────────────────┘
                     │  POST con JWT del admin
                     ▼
┌─────────────────────────────────────────────┐
│  Edge Function: create-user                 │
│  (supabase/functions/create-user/index.ts)  │
│                                             │
│  1. Verifica que el JWT corresponde a un    │
│     usuario con rol 'admin'.                │
│  2. Valida que la contraseña sea fuerte.    │
│  3. Llama a:                                │
│       supabase.auth.admin.createUser({      │
│         email, password,                    │
│         email_confirm: true                 │
│       })                                    │
│     → Supabase hashea con BCRYPT y          │
│       guarda en auth.users (UUID generado). │
└────────────────────┬────────────────────────┘
                     │  INSERT en auth.users
                     ▼
┌─────────────────────────────────────────────┐
│  Trigger SQL: on_auth_user_created          │
│  (supabase/auth-trigger.sql)                │
│                                             │
│  Crea automáticamente:                      │
│    • persona       (con el email)           │
│    • usuario       (auth_user_id = UUID)    │
│    • asignacion_rol (rol indicado)          │
└─────────────────────────────────────────────┘
```

### Por qué Edge Function y no `supabase.auth.signUp` desde el frontend

- `auth.admin.createUser` requiere la `service_role_key`, que **nunca** debe estar en el cliente (compromete toda la base de datos).
- La Edge Function corre en el servidor de Supabase con esa clave segura.
- Además, la Edge Function valida que quien llama es admin **antes** de proceder.

---

## 3. Enlace auth.users ↔ public.usuario

El vínculo se hace por **UUID compartido**, no por email.

```
auth.users                       public.usuario
──────────────                   ──────────────
id  (UUID, generado por          id_usuario     (BIGINT, propio)
     Supabase Auth)              auth_user_id   (UUID) ──┐
                                                          │
email (canónico)                 username       (= email) │
encrypted_password (bcrypt)      id_persona     (FK)      │
                                 password_hash  ('AUTH_MANAGED', placeholder)
                                                          │
                                                          │ FK ON DELETE CASCADE
                                                          ▼
                                              referencia a auth.users(id)
```

### Columna agregada por `auth-trigger.sql`

```sql
ALTER TABLE public.usuario
    ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE
    REFERENCES auth.users(id) ON DELETE CASCADE;
```

Esta columna es el **único campo confiable de vínculo**. Las funciones helper de las vistas la usan:

```sql
-- en supabase/views.sql
CREATE OR REPLACE FUNCTION mi_id_usuario()
RETURNS BIGINT
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$ SELECT id_usuario FROM usuario WHERE auth_user_id = auth.uid() LIMIT 1; $$;
```

Si un admin elimina un usuario en `auth.users`, el `ON DELETE CASCADE` borra automáticamente la fila en `public.usuario` y, en cascada, sus referencias en `asignacion_rol`.

---

## 4. Seguridad de contraseñas

### Almacenamiento

- **Supabase Auth gestiona el hashing con bcrypt**: industry standard, salt por usuario, work factor configurable.
- La columna `public.usuario.password_hash` **no contiene la contraseña real**. Se guarda el literal `'AUTH_MANAGED'` solo para satisfacer un eventual `NOT NULL`. La aplicación nunca consulta este campo para autenticar.
- Toda autenticación pasa por `supabase.auth.signInWithPassword({ email, password })`, que verifica contra `auth.users.encrypted_password` (donde está el bcrypt).

### Validación

Aplicada en **tres capas** (defensa en profundidad):

| Capa | Archivo | Reglas |
|---|---|---|
| Frontend (registro) | `src/contexts/AuthContext.jsx` → `validarPassword()` | ≥ 8 chars, ≥ 1 letra, ≥ 1 número |
| Frontend (admin) | `src/services/adminService.ts` → `validarPasswordSegura()` | Mismas reglas |
| Servidor | `supabase/functions/create-user/index.ts` → `validarPassword()` | Mismas reglas |

La validación del servidor es la **autoritativa**: aunque alguien bypass el frontend, la Edge Function rechaza contraseñas débiles.

### Email confirmation

Las cuentas se crean con `email_confirm: true` para que el usuario pueda hacer login inmediato (el admin no necesita esperar a que el usuario confirme su email).

### Recomendaciones adicionales

Activar en Dashboard Supabase:
- **Authentication → Settings → Password strength**: nivel "strong"
- **Authentication → Settings → Leaked password protection**: ON (cruza con HaveIBeenPwned)
- **Authentication → Rate limits**: dejar valores por defecto (suficientes contra brute force)

---

## 5. Bootstrap del primer admin

Como el flujo requiere que un admin cree usuarios, el primer admin se crea **manualmente**:

1. Dashboard de Supabase → **Authentication → Users → Add user**
   - Email: el del administrador
   - Password: contraseña segura (≥ 8 chars, letras + números)
   - Auto Confirm User: ✓
2. El trigger `on_auth_user_created` ya creó las filas en `persona`, `usuario` y `asignacion_rol` (con rol `cliente` por defecto).
3. Promover a admin en SQL Editor:

```sql
UPDATE asignacion_rol
SET id_rol = (SELECT id_rol FROM rol WHERE nombre = 'admin')
WHERE id_usuario = (
    SELECT id_usuario FROM usuario
    WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = 'admin@tudominio.com')
);
```

Después, ese admin ya puede crear todos los demás usuarios desde la UI.

---

## 6. Archivos clave del sistema de auth

| Archivo | Función |
|---|---|
| `supabase/auth-trigger.sql` | Agrega `auth_user_id` + trigger de auto-creación + sync de email + backfill |
| `supabase/views.sql` | Funciones `mi_email()`, `mi_id_usuario()`, `mi_id_persona()`, vistas filtradas por `auth.uid()` |
| `supabase/functions/create-user/index.ts` | Edge Function para que el admin cree cuentas con `service_role_key` |
| `src/contexts/AuthContext.jsx` | `login()`, `registro()`, `validarPassword()`, sin OAuth |
| `src/features/auth/pages/Login.jsx` | Formulario email/password (sin botón Google) |
| `src/services/adminService.ts` | `createUserAccount()` que llama a la Edge Function con el JWT del admin |
| `src/services/usuarioService.ts` | `getByAuthUserId(uuid)` para buscar por UUID de auth.users |

---

## 7. Flujo end-to-end

```
1. Admin se autentica con email/password → recibe JWT.
2. Admin llena formulario "Crear usuario" en la UI.
3. Frontend valida password fuerte → POST a la Edge Function con JWT.
4. Edge Function valida JWT, verifica rol admin, valida password.
5. Edge Function llama auth.admin.createUser → INSERT en auth.users.
6. Trigger SQL se dispara → crea persona + usuario + asignacion_rol.
7. Si el rol es médico, la Edge Function además inserta en `medico`.
8. El nuevo usuario ya puede hacer login con email/password.
9. Al hacer login, AuthContext busca su perfil vía usuario.auth_user_id.
10. Las vistas (vw_medico_mis_citas, vw_paciente_mi_perfil, etc.) filtran
    automáticamente por auth.uid() == usuario.auth_user_id.
```

---

## 8. Qué NO hacer

- ❌ No usar `supabase.auth.signUp` desde el frontend público (eso permitiría auto-registro sin control del admin).
- ❌ No almacenar contraseñas en texto plano ni en `public.usuario.password_hash`.
- ❌ No exponer la `service_role_key` en el cliente. Solo en variables de entorno de la Edge Function.
- ❌ No hacer JOIN entre `auth.users` y `public.usuario` por email — el email puede cambiar. Usar siempre `auth_user_id`.
- ❌ No eliminar filas de `auth.users` directamente desde SQL; usar `supabase.auth.admin.deleteUser()` para que el cascade limpie correctamente.
