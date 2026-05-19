import { supabase } from '../lib/supabase';

// Flujo de invitación: el admin NO entrega contraseña.
// La Edge Function `create-user` llama a auth.admin.inviteUserByEmail,
// el usuario recibe un correo con un magic link, lo abre y define su
// propia contraseña en la página /set-password de esta app.

export interface InviteUserPayload {
  email:           string;
  nombre:          string;
  rol:             'admin' | 'medico' | 'asistente' | 'cliente';
  especialidad?:   string;
  numero_licencia?: string;
  consultorio?:    string;
}

/**
 * Validador de contraseña fuerte — lo usa la página /set-password
 * cuando el invitado define su clave por primera vez.
 */
export function validarPasswordSegura(password: string): string | null {
  if (!password || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Za-z]/.test(password))       return 'Debe contener al menos una letra';
  if (!/\d/.test(password))             return 'Debe contener al menos un número';
  return null;
}

/**
 * Invita un nuevo usuario. Llama a la Edge Function `create-user` con el
 * JWT del admin. La Edge Function valida el rol, dispara el invite y
 * (si aplica) inserta la fila en `medico`. No se transmite ninguna
 * contraseña — el usuario la pone al aceptar la invitación.
 */
export async function inviteUser(payload: InviteUserPayload) {
  const endpoint = import.meta.env.VITE_CREATE_DOCTOR_URL;
  if (!endpoint) {
    throw new Error(
      'Falta VITE_CREATE_DOCTOR_URL en .env. Deploya la Edge Function ' +
      '`create-user` (npx supabase functions deploy create-user --no-verify-jwt) ' +
      'y añade su URL al archivo .env.'
    );
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error('No hay sesión activa. Inicia sesión como admin.');
  }

  // La Edge Function envía el correo con un link que apunta a esta ruta.
  // Allí el invitado define su contraseña.
  const redirectTo = `${window.location.origin}/set-password`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      email:           payload.email.toLowerCase().trim(),
      nombre:          payload.nombre.trim(),
      rol:             payload.rol,
      especialidad:    payload.especialidad,
      numero_licencia: payload.numero_licencia,
      consultorio:     payload.consultorio,
      redirectTo,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Error invitando usuario');
  }
  return data;
}

// ─── Aliases retrocompatibles con código existente ────────────────────────────
export const createUserAccount  = inviteUser;
export const createDoctorAccount = (payload: Omit<InviteUserPayload, 'rol'>) =>
  inviteUser({ ...payload, rol: 'medico' });
