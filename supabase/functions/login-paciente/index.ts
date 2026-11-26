// @ts-nocheck
// Runtime de Deno (Supabase Edge Functions): imports https:// y Deno.* son
// válidos aquí, no en el TS del proyecto.

// =====================================================================
// Edge Function: login-paciente
//
// Ingreso del paciente con DOCUMENTO + FECHA DE NACIMIENTO, sin correo ni
// contraseña (pensado para adultos mayores). Pública: la llama la pestaña
// "Soy paciente" del login antes de tener sesión.
//
//   1. fn_verificar_acceso_paciente (SQL) valida los datos, aplica el
//      bloqueo por intentos fallidos (documento e IP) y rechaza a todo el
//      que tenga un rol de personal (admin, médico, asistente).
//   2. Si el paciente nunca tuvo cuenta, se le crea una: sin contraseña,
//      con su correo si lo tiene o con uno interno, y ligada a su ficha
//      por app_metadata.id_persona (ver provision_user_from_auth).
//   3. Se genera un enlace mágico SIN enviar correo y se canjea aquí
//      mismo por una sesión, que se devuelve al navegador.
//
// Deploy:
//   npx supabase functions deploy login-paciente --no-verify-jwt
//
// Variables (auto-disponibles): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// SUPABASE_ANON_KEY. Opcional: ALLOWED_ORIGINS (igual que create-user).
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*")
  .split(",").map(s => s.trim()).filter(Boolean);

// Dominio de los correos internos (las cuentas sin correo real). Nunca
// se les envía nada: sólo identifica la cuenta en Supabase Auth.
const DOMINIO_INTERNO = "pacientes.his.local";

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

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

const INCORRECTO = "Documento o fecha de nacimiento incorrectos.";

Deno.serve(async (req: Request) => {
  const CORS = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Método no permitido" }, 405, CORS);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const documento = String(body.documento ?? "").trim();
    const fecha     = String(body.fecha_nacimiento ?? "").trim();
    if (!documento || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return json({ error: INCORRECTO }, 401, CORS);
    }

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;

    // 1. Verificar (incluye bloqueo por intentos)
    const { data: v, error: vErr } = await admin.rpc("fn_verificar_acceso_paciente", {
      p_documento: documento,
      p_fecha:     fecha,
      p_ip:        ip,
    });
    if (vErr) {
      console.error("fn_verificar_acceso_paciente:", vErr.message);
      return json({
        error: vErr.code === "PGRST202"
          ? "El ingreso de pacientes no está habilitado. Ejecuta supabase/migration-login-paciente-nacimiento.sql."
          : "No pudimos verificar tus datos. Intenta de nuevo.",
      }, 500, CORS);
    }
    if (v?.bloqueado_hasta) {
      return json({ error: "bloqueado", bloqueado_hasta: v.bloqueado_hasta }, 429, CORS);
    }
    if (!v?.ok) return json({ error: INCORRECTO }, 401, CORS);

    // 2. Cuenta de Auth: la existente o una nueva ligada a su ficha
    let email: string | null = null;
    if (v.auth_user_id) {
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(v.auth_user_id);
      if (uErr || !u?.user?.email) {
        console.error("getUserById:", uErr?.message);
        return json({ error: "Tu cuenta tiene un problema. Comunícate con recepción." }, 500, CORS);
      }
      email = u.user.email;
    } else {
      const docMail = documento.toLowerCase().replace(/[^a-z0-9]/g, "");
      const candidatos = [v.email, `p${docMail}@${DOMINIO_INTERNO}`]
        .filter(Boolean).map((e: string) => e.toLowerCase().trim());

      for (const candidato of candidatos) {
        const { data: creado, error: cErr } = await admin.auth.admin.createUser({
          email:         candidato,
          email_confirm: true,
          app_metadata:  { id_persona: v.id_persona, acceso: "documento_nacimiento" },
          user_metadata: { nombre: v.nombre },
        });
        if (!cErr && creado?.user) { email = candidato; break; }
        // Correo real ya usado por otra cuenta → probar con el interno.
        console.warn("createUser", candidato, cErr?.message);
      }
      if (!email) {
        return json({ error: "No pudimos crear tu acceso. Comunícate con recepción." }, 500, CORS);
      }
    }

    // 3. Enlace mágico (no se envía correo) → sesión
    const { data: link, error: lErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link?.properties?.hashed_token;
    if (lErr || !tokenHash) {
      console.error("generateLink:", lErr?.message);
      return json({ error: "No pudimos iniciar tu sesión. Intenta de nuevo." }, 500, CORS);
    }

    const publico = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: ses, error: sErr } = await publico.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
    if (sErr || !ses?.session) {
      // Cuenta bloqueada (banned) u otro problema de Auth.
      console.error("verifyOtp:", sErr?.message);
      return json({ error: "Tu acceso está deshabilitado. Comunícate con recepción." }, 403, CORS);
    }

    return json({
      access_token:  ses.session.access_token,
      refresh_token: ses.session.refresh_token,
    }, 200, CORS);

  } catch (err) {
    console.error("login-paciente:", (err as Error).message);
    return json({ error: "No pudimos iniciar tu sesión. Intenta de nuevo." }, 500, CORS);
  }
});
