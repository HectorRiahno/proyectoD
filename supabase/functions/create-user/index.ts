// @ts-nocheck
// Este archivo corre en el runtime de Deno (Supabase Edge Functions).
// Los imports https://, Deno.* y otros símbolos son válidos en ese contexto,
// no en el TS del proyecto. Por eso se desactiva el type-check del IDE.

// =====================================================================
// Edge Function: create-user (flujo de invitación)
//
// Solo un ADMIN autenticado puede invocarla. NO recibe contraseña.
// Invita por correo usando `auth.admin.inviteUserByEmail`:
//   - Crea la fila en auth.users con un token de invitación.
//   - El trigger `on_auth_user_created` crea persona + usuario + asignacion_rol
//     con los datos de raw_user_meta_data (nombre, rol).
//   - Si el rol es médico, además inserta la fila en public.medico.
//   - Envía correo con un magic link al usuario invitado.
//   - El invitado lo abre, Supabase activa la sesión y lo redirige a
//     `redirectTo` (página /set-password de la app) donde define su clave.
//
// El admin NUNCA conoce la contraseña.
//
// Deploy:
//   npx supabase functions deploy create-user --no-verify-jwt
//
// Variables de entorno (Supabase Dashboard → Project Settings → Edge Functions):
//   SUPABASE_URL                  (auto-disponible)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-disponible)
//   ALLOWED_ORIGINS  (opcional)   ej: "https://tudominio.com,http://localhost:5173"
//                                  Por defecto acepta '*' (DEV). En producción
//                                  setearlo con la lista exacta de dominios.
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*")
  .split(",").map(s => s.trim()).filter(Boolean);

function buildCors(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes("*")
    ? "*"
    : ALLOWED_ORIGINS.includes(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin":  allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

interface Payload {
  email: string;
  nombre?: string;
  rol?: "admin" | "medico" | "asistente" | "cliente";
  especialidad?: string;
  numero_licencia?: string;
  consultorio?: string;
  redirectTo?: string;          // URL absoluta a la página /set-password
}

function json(body: unknown, status: number, cors: Record<string,string>) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const CORS = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // 1. Validar caller = admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Falta token de autorización" }, 401, CORS);

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(jwt);
    if (callerErr || !caller) return json({ error: "Token inválido" }, 401, CORS);

    const { data: rolData } = await supabaseAdmin
      .from("vw_admin_usuarios")
      .select("rol_nombre")
      .eq("auth_user_id", caller.id)
      .maybeSingle();

    if (rolData?.rol_nombre !== "admin") {
      return json({ error: "Solo administradores pueden invitar usuarios" }, 403, CORS);
    }

    // 2. Payload
    const body: Payload = await req.json();
    const email = body.email?.toLowerCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Email inválido" }, 400, CORS);
    }
    if (!body.nombre?.trim()) {
      return json({ error: "Nombre requerido" }, 400, CORS);
    }
    const rol = body.rol ?? "cliente";
    if (!["admin","medico","asistente","cliente"].includes(rol)) {
      return json({ error: `Rol no válido: ${rol}` }, 400, CORS);
    }
    if (rol === "medico" && !body.especialidad?.trim()) {
      return json({ error: "Especialidad requerida para médicos" }, 400, CORS);
    }

    // 3. Invitar por email — el usuario pondrá su propia contraseña al aceptar
    const { data: invited, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          nombre: body.nombre,
          rol,
        },
        redirectTo: body.redirectTo,
      });

    if (inviteErr) {
      // Errores comunes: usuario ya existe, email inválido, etc.
      return json({ error: inviteErr.message }, 400, CORS);
    }

    const newAuthUserId = invited.user!.id;

    // 4. Para médico o cliente, completar la fila específica del rol.
    //    (el trigger ya creó persona + usuario + asignacion_rol)
    if (rol === "medico" || rol === "cliente") {
      // Esperar un instante a que el trigger termine
      let attempts = 0;
      let usr: { id_persona: number } | null = null;
      while (attempts < 5 && !usr?.id_persona) {
        const { data } = await supabaseAdmin
          .from("usuario")
          .select("id_persona")
          .eq("auth_user_id", newAuthUserId)
          .maybeSingle();
        usr = data;
        if (!usr?.id_persona) {
          await new Promise(r => setTimeout(r, 200));
          attempts++;
        }
      }

      if (usr?.id_persona) {
        if (rol === "medico") {
          const { error: medErr } = await supabaseAdmin.from("medico").insert({
            id_persona:      usr.id_persona,
            numero_licencia: body.numero_licencia ?? `LIC-${Date.now()}`,
            especialidad:    body.especialidad,
            consultorio:     body.consultorio,
            activo:          true,
          });
          if (medErr) console.error("Error insertando médico:", medErr.message);
        }

        if (rol === "cliente") {
          // Comprobar primero si ya existe (la persona podría haber sido
          // paciente antes en otro proyecto, o haberse provisionado dos veces)
          const { data: existing } = await supabaseAdmin
            .from("paciente").select("id_paciente").eq("id_persona", usr.id_persona).maybeSingle();
          if (!existing) {
            const { error: pacErr } = await supabaseAdmin.from("paciente").insert({
              id_persona:      usr.id_persona,
              numero_historia: `HC-${usr.id_persona}-${Date.now().toString(36)}`,
            });
            if (pacErr) console.error("Error insertando paciente:", pacErr.message);
          }
        }
      }
    }

    return json({
      ok: true,
      auth_user_id: newAuthUserId,
      email,
      rol,
      invited: true,
      message: `Se envió una invitación a ${email}. El usuario debe revisar su correo y definir su contraseña.`,
    }, 200, CORS);

  } catch (err) {
    return json({ error: (err as Error).message }, 500, CORS);
  }
});
