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
//   SUPABASE_SERVICE_ROLE_KEY     (auto-disponible; sólo para validar al
//                                  caller y enviar la invitación)
//   SUPABASE_ANON_KEY             (auto-disponible; el resto de escrituras
//                                  van con el JWT del admin → audit_log)
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
  documento?: string;           // persona.documento + metadata ({{ .Data.documento }} en el correo)
  nombres?: string;             // si llegan, reemplazan el corte automático de `nombre`
  apellidos?: string;
  telefono?: string;
  especialidad?: string;
  numero_licencia?: string;
  consultorio?: string;
  anios_experiencia?: number;
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

    // Todo lo que no sea validar al caller o enviar la invitación se hace
    // con el JWT del admin que invita, no con service_role: aplica el RLS
    // de admin y el audit_log registra a ese admin como actor del cambio
    // de rol y de las filas persona/medico/paciente.
    const supabaseCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth:   { persistSession: false, autoRefreshToken: false },
    });

    // El documento es único: validar ANTES de crear la cuenta, para no
    // dejar una invitación enviada con la ficha a medias.
    const documento = body.documento?.trim() || null;
    if (documento) {
      const { data: dup } = await supabaseCaller
        .from("persona").select("id_persona, email").eq("documento", documento).maybeSingle();
      if (dup && (dup.email ?? "").toLowerCase() !== email) {
        return json({ error: `Ya existe una persona con el documento ${documento}.` }, 409, CORS);
      }
    }

    // 3. Invitar por email — el usuario pondrá su propia contraseña al aceptar
    const { data: invited, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          nombre: body.nombre,
          rol,
          ...(documento ? { documento } : {}),
        },
        redirectTo: body.redirectTo,
      });

    if (inviteErr) {
      // Errores comunes: usuario ya existe, email inválido, etc.
      return json({ error: inviteErr.message }, 400, CORS);
    }

    const newAuthUserId = invited.user!.id;

    // 4. Esperar a que el trigger provision_user_from_auth termine.
    //    El trigger SIEMPRE crea asignacion_rol con 'cliente' (por seguridad).
    //    Esta función hace el override si pidieron un rol elevado, y luego
    //    inserta la fila específica (medico / paciente).
    let attempts = 0;
    let usr: { id_usuario: number; id_persona: number } | null = null;
    while (attempts < 8 && !usr) {
      const { data } = await supabaseCaller
        .from("usuario")
        .select("id_usuario, id_persona")
        .eq("auth_user_id", newAuthUserId)
        .maybeSingle();
      usr = data;
      if (!usr) {
        await new Promise(r => setTimeout(r, 250));
        attempts++;
      }
    }

    if (!usr) {
      return json({
        error: "El trigger no provisionó al usuario en BD. " +
               "Verifica auth-trigger.sql está cargado en Supabase.",
      }, 500, CORS);
    }

    // 4a. Si el rol pedido NO es 'cliente', sobreescribir asignacion_rol.
    //     (El trigger dejó 'cliente' por defecto, sin importar metadata.rol).
    if (rol !== "cliente") {
      const { data: targetRol } = await supabaseCaller
        .from("rol").select("id_rol").eq("nombre", rol).maybeSingle();

      if (!targetRol?.id_rol) {
        return json({
          error: `El rol '${rol}' no existe en la tabla rol. Ejecuta supabase/migration-rol-cliente.sql.`,
        }, 500, CORS);
      }

      // Cambia la asignación 'cliente' que dejó el trigger en un solo UPDATE
      // (atómico, y queda en el log con el antes/después). Si el trigger no
      // la creó, se inserta.
      const { data: updated, error: updErr } = await supabaseCaller
        .from("asignacion_rol")
        .update({ id_rol: targetRol.id_rol })
        .eq("id_usuario", usr.id_usuario)
        .select("id_asignacion");

      let rolErr = updErr;
      if (!updErr && !updated?.length) {
        const { error: insErr } = await supabaseCaller
          .from("asignacion_rol")
          .insert({ id_usuario: usr.id_usuario, id_rol: targetRol.id_rol });
        rolErr = insErr;
      }
      if (rolErr) {
        return json({
          error: `Cuenta creada pero no se pudo asignar el rol '${rol}': ${rolErr.message}`,
        }, 500, CORS);
      }
    }

    // 4b. Completar la persona con los datos del formulario (el trigger sólo
    //     conoce el email y un nombre sin separar, y pone un documento
    //     sintético 'AUTH-…').
    const personaUpd: Record<string, string> = {};
    if (body.nombres?.trim())   personaUpd.nombres   = body.nombres.trim();
    if (body.apellidos?.trim()) personaUpd.apellidos = body.apellidos.trim();
    if (body.telefono?.trim())  personaUpd.telefono  = body.telefono.trim();
    if (documento)              personaUpd.documento = documento;
    if (Object.keys(personaUpd).length > 0) {
      const { error: perErr } = await supabaseCaller
        .from("persona").update(personaUpd).eq("id_persona", usr.id_persona);
      if (perErr) {
        return json({
          error: `Invitación enviada, pero no se pudieron guardar los datos personales: ${perErr.message}`,
        }, 500, CORS);
      }
    }

    // 4c. Fila en la tabla específica del rol.
    if (rol === "medico") {
      const fichaMedico = {
        especialidad:      body.especialidad!.trim(),
        consultorio:       body.consultorio?.trim() || null,
        anios_experiencia: Number(body.anios_experiencia) || 0,
        activo:            true,
      };
      // Si la persona ya tenía ficha de médico (registrado antes sin
      // cuenta), se actualiza en vez de duplicarla.
      const { data: medExistente } = await supabaseCaller
        .from("medico").select("id_medico").eq("id_persona", usr.id_persona).maybeSingle();

      const { error: medErr } = medExistente
        ? await supabaseCaller.from("medico").update({
            ...fichaMedico,
            ...(body.numero_licencia?.trim() ? { numero_licencia: body.numero_licencia.trim() } : {}),
          }).eq("id_medico", medExistente.id_medico)
        : await supabaseCaller.from("medico").insert({
            ...fichaMedico,
            id_persona:      usr.id_persona,
            numero_licencia: body.numero_licencia?.trim() || `LIC-${Date.now()}`,
          });
      if (medErr) {
        const msg = medErr.code === "23505"
          ? "ya existe un médico con ese número de licencia"
          : medErr.message;
        return json({
          error: `Invitación enviada, pero no se pudo guardar la ficha del médico: ${msg}`,
        }, 500, CORS);
      }
    }

    if (rol === "cliente") {
      const { data: existing } = await supabaseCaller
        .from("paciente").select("id_paciente").eq("id_persona", usr.id_persona).maybeSingle();
      if (!existing) {
        const { error: pacErr } = await supabaseCaller.from("paciente").insert({
          id_persona:      usr.id_persona,
          numero_historia: `HC-${usr.id_persona}-${Date.now().toString(36)}`,
        });
        if (pacErr) console.error("Error insertando paciente:", pacErr.message);
      }
    }

    // (admin y asistente no requieren fila adicional fuera de asignacion_rol)

    return json({
      ok: true,
      auth_user_id: newAuthUserId,
      id_persona: usr.id_persona,
      email,
      rol,
      invited: true,
      message: `Se envió una invitación a ${email}. El usuario debe revisar su correo y definir su contraseña.`,
    }, 200, CORS);

  } catch (err) {
    return json({ error: (err as Error).message }, 500, CORS);
  }
});
