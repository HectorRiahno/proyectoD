// @ts-nocheck
// Runtime de Deno (Supabase Edge Functions).

// =====================================================================
// Edge Function: whatsapp-notificar
//
// Envía por WhatsApp (API oficial de WhatsApp Business / Meta):
//   · confirmación de la cita al agendarla (con el enlace si es teleconsulta)
//   · recordatorio 24 h antes
//   · recordatorio 1 h antes de una teleconsulta, con el enlace para entrar
// Qué toca enviar lo decide la BD: fn_whatsapp_pendientes().
//
// Dos formas de llamarla:
//   1. Programada (pg_cron cada 10 min, supabase/cron-whatsapp.sql):
//      header  x-cron-secret: <CRON_SECRET>   → revisa todas las citas.
//   2. Desde la app justo después de agendar, con la sesión del usuario:
//      body { id_cita } → sólo esa cita, y sólo si el usuario puede verla.
//
// Mientras no estén WHATSAPP_TOKEN y WHATSAPP_PHONE_ID no envía nada y
// responde { configurado: false } (la app funciona igual).
//
// Deploy:
//   npx supabase functions deploy whatsapp-notificar --no-verify-jwt
//
// Secretos (Dashboard → Edge Functions → Secrets):
//   WHATSAPP_TOKEN        token permanente de un usuario del sistema (Meta)
//   WHATSAPP_PHONE_ID     "Phone number ID" del número de WhatsApp Business
//   CRON_SECRET           el mismo valor guardado en Vault (cron-whatsapp.sql)
//   CLINICA_NOMBRE        ej: "Centro Médico Hospitalis"
//   CLINICA_DIRECCION     ej: "Av. Principal #123, Ocaña"
//   WHATSAPP_PLANTILLA_CONFIRMACION  (opcional, por defecto cita_confirmada)
//   WHATSAPP_PLANTILLA_RECORDATORIO  (opcional, por defecto recordatorio_cita)
//   WHATSAPP_IDIOMA                  (opcional, por defecto es)
//   ALLOWED_ORIGINS                  (opcional, igual que create-user)
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;

const ALLOWED_ORIGINS = env("ALLOWED_ORIGINS", "*").split(",").map(s => s.trim()).filter(Boolean);
const GRAPH = "https://graph.facebook.com/v21.0";

function buildCors(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes("*") ? "*" : ALLOWED_ORIGINS.includes(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin":  allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ─── Textos ──────────────────────────────────────────────────────────
// fecha/hora llegan en hora de Colombia ('2026-12-03', '08:30').
function fechaLarga(fecha: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  }).format(new Date(`${fecha}T12:00:00Z`));
}
function hora12(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${sufijo}`;
}
function hoyColombia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

// Parámetros de las plantillas (deben coincidir con lo aprobado en Meta;
// ver supabase/README.md → "Plantillas de WhatsApp"):
//   {{1}} nombre del paciente     {{2}} especialidad o tipo
//   {{3}} médico                  {{4}} día   {{5}} hora
//   {{6}} instrucciones (enlace de teleconsulta o dirección)
function parametros(p: Record<string, string>, tipo: string) {
  let dia = fechaLarga(p.fecha);
  if (tipo !== "confirmacion") {
    dia = p.fecha === hoyColombia() ? `hoy ${dia}` : `mañana ${dia}`;
  }
  const lugar = p.enlace
    ? `Es una teleconsulta: entra desde tu celular o computador con este enlace ${p.enlace}`
    : `Te esperamos en ${env("CLINICA_DIRECCION", "la clínica")}${p.consultorio ? `, consultorio ${p.consultorio}` : ""}. Llega 15 minutos antes`;
  const motivo = p.enlace ? p.tipo_cita : p.especialidad;
  return [p.paciente || "paciente", motivo, `Dr(a). ${p.medico}`, dia, hora12(p.hora), lugar]
    // Meta rechaza parámetros con saltos de línea o 4+ espacios seguidos
    .map(t => String(t).replace(/\s+/g, " ").trim());
}

async function enviarPlantilla(telefono: string, plantilla: string, params: string[]) {
  const r = await fetch(`${GRAPH}/${env("WHATSAPP_PHONE_ID")}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefono,
      type: "template",
      template: {
        name: plantilla,
        language: { code: env("WHATSAPP_IDIOMA", "es") },
        components: [{ type: "body", parameters: params.map(text => ({ type: "text", text })) }],
      },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message ?? `HTTP ${r.status}`);
  return data?.messages?.[0]?.id ?? null;
}

Deno.serve(async (req: Request) => {
  const CORS = buildCors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")    return json({ error: "Método no permitido" }, 405, CORS);

  try {
    const url = env("SUPABASE_URL");
    const admin = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const body = await req.json().catch(() => ({}));

    // ─── ¿Quién llama? ───────────────────────────────────────────────
    let idCita: number | null = null;
    const cronSecret = env("CRON_SECRET");
    const esCron = !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;

    if (!esCron) {
      idCita = Number(body.id_cita) || null;
      const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
      if (!idCita || !jwt) return json({ error: "No autorizado" }, 401, CORS);

      // La cita debe ser visible para quien llama (RLS: su propia cita o personal).
      const usuario = createClient(url, env("SUPABASE_ANON_KEY"), {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth:   { persistSession: false, autoRefreshToken: false },
      });
      const { data: visible } = await usuario.from("cita").select("id_cita").eq("id_cita", idCita).maybeSingle();
      if (!visible) return json({ error: "No autorizado" }, 403, CORS);
    }

    if (!env("WHATSAPP_TOKEN") || !env("WHATSAPP_PHONE_ID")) {
      return json({ ok: true, configurado: false, enviados: 0 }, 200, CORS);
    }

    // ─── Pendientes ──────────────────────────────────────────────────
    const { data: pendientes, error: pErr } = await admin.rpc("fn_whatsapp_pendientes", { p_id_cita: idCita });
    if (pErr) {
      console.error("fn_whatsapp_pendientes:", pErr.message);
      return json({ error: "No se pudieron consultar los envíos pendientes." }, 500, CORS);
    }

    let enviados = 0, fallidos = 0;
    for (const p of pendientes ?? []) {
      const plantilla = p.tipo === "confirmacion"
        ? env("WHATSAPP_PLANTILLA_CONFIRMACION", "cita_confirmada")
        : env("WHATSAPP_PLANTILLA_RECORDATORIO", "recordatorio_cita");
      let wamid = null, error = null;
      try {
        wamid = await enviarPlantilla(p.telefono, plantilla, parametros(p, p.tipo));
        enviados++;
      } catch (e) {
        error = (e as Error).message;
        fallidos++;
        console.error(`WhatsApp cita ${p.id_cita} (${p.tipo}):`, error);
      }
      await admin.rpc("fn_whatsapp_registrar", {
        p_id_cita: p.id_cita, p_tipo: p.tipo, p_estado: error ? "error" : "enviado",
        p_telefono: p.telefono, p_wamid: wamid, p_error: error,
      });
    }

    return json({ ok: true, configurado: true, enviados, fallidos }, 200, CORS);
  } catch (err) {
    console.error("whatsapp-notificar:", (err as Error).message);
    return json({ error: "Error enviando notificaciones." }, 500, CORS);
  }
});
