// =====================================================================
// Edge Function: create-user
//
// Sólo un ADMIN autenticado puede llamarla. Crea una cuenta en auth.users
// usando supabase.auth.admin.createUser, con email confirmado para que
// el usuario pueda hacer login inmediatamente.
//
// El trigger SQL `on_auth_user_created` crea automáticamente las filas
// en public.persona, public.usuario y public.asignacion_rol con el
// mismo UUID y el rol indicado.
//
// Deploy:
//   supabase functions deploy create-user
//
// Variables de entorno requeridas en el proyecto Supabase:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    (NO la anon — esto solo en el servidor)
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  email: string;
  password: string;
  nombre?: string;
  rol?: "admin" | "medico" | "asistente" | "cliente";
  especialidad?: string;
  numero_licencia?: string;
  consultorio?: string;
}

function validarPassword(password: string): string | null {
  if (!password || password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/[A-Za-z]/.test(password)) return "Debe contener al menos una letra";
  if (!/\d/.test(password)) return "Debe contener al menos un número";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente con service_role (puede crear usuarios)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // 1. Validar que quien llama sea admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Falta token de autorización" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(jwt);
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Verificar rol admin del que llama
    const { data: rolData } = await supabaseAdmin
      .from("vw_admin_usuarios")
      .select("rol_nombre")
      .eq("auth_user_id", caller.id)
      .maybeSingle();

    if (rolData?.rol_nombre !== "admin") {
      return new Response(JSON.stringify({ error: "Solo administradores pueden crear cuentas" }), {
        status: 403, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 2. Parsear payload
    const body: Payload = await req.json();
    const email = body.email?.toLowerCase().trim();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email requerido" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const pwdError = validarPassword(body.password);
    if (pwdError) {
      return new Response(JSON.stringify({ error: pwdError }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const rol = body.rol ?? "cliente";

    // 3. Crear en auth.users (con email_confirm para que pueda hacer login al instante)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        nombre: body.nombre,
        rol,
      },
    });

    if (createErr) {
      return new Response(JSON.stringify({ error: createErr.message }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const newAuthUserId = created.user!.id;

    // 4. Si el rol es médico, completar la fila en public.medico
    //    (el trigger ya creó persona + usuario + asignacion_rol)
    if (rol === "medico") {
      // Obtener id_persona vía el usuario recién creado
      const { data: usr } = await supabaseAdmin
        .from("usuario")
        .select("id_persona")
        .eq("auth_user_id", newAuthUserId)
        .single();

      if (usr?.id_persona) {
        await supabaseAdmin.from("medico").insert({
          id_persona: usr.id_persona,
          numero_licencia: body.numero_licencia ?? `LIC-${Date.now()}`,
          especialidad: body.especialidad,
          consultorio: body.consultorio,
          activo: true,
        });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      auth_user_id: newAuthUserId,
      email,
      rol,
    }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
