import { supabase } from '../lib/supabase';

export interface CreateUserPayload {
  email: string;
  password: string;
  nombre: string;
  rol: 'admin' | 'medico' | 'asistente' | 'cliente';
  // Específico para médicos
  especialidad?: string;
  numero_licencia?: string;
  consultorio?: string;
}

export interface CreateDoctorPayload extends CreateUserPayload {
  rol: 'medico';
  especialidad: string;
}

/**
 * Validador de contraseña fuerte (debe ejecutarse antes de enviar al servidor).
 */
export function validarPasswordSegura(password: string): string | null {
  if (!password || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (!/[A-Za-z]/.test(password)) return 'Debe contener al menos una letra';
  if (!/\d/.test(password)) return 'Debe contener al menos un número';
  return null;
}

/**
 * Crea una cuenta de usuario via Edge Function (que usa supabase.auth.admin.createUser).
 *
 * Flujo:
 *   1. Edge Function ejecuta auth.admin.createUser({email, password, email_confirm: true})
 *      → Supabase Auth almacena el password con bcrypt
 *   2. Trigger `on_auth_user_created` crea fila en public.persona + public.usuario
 *      con el MISMO UUID y asigna el rol indicado en raw_user_meta_data.rol
 *
 * El admin nunca toca password_hash directamente — Supabase Auth lo gestiona.
 */
export async function createUserAccount(payload: CreateUserPayload) {
  const pwdError = validarPasswordSegura(payload.password);
  if (pwdError) throw new Error(pwdError);

  const endpoint = import.meta.env.VITE_CREATE_DOCTOR_URL;
  if (!endpoint) {
    throw new Error('VITE_CREATE_DOCTOR_URL no está configurado en .env');
  }

  // Token del admin para autenticar la llamada a la Edge Function
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      email: payload.email.toLowerCase().trim(),
      password: payload.password,
      nombre: payload.nombre,
      rol: payload.rol,
      especialidad: payload.especialidad,
      numero_licencia: payload.numero_licencia,
      consultorio: payload.consultorio,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Error creando cuenta');
  }
  return data;
}

/**
 * Compat con código existente: crea cuenta de médico.
 */
export async function createDoctorAccount(payload: Omit<CreateDoctorPayload, 'rol'>) {
  return createUserAccount({ ...payload, rol: 'medico' });
}
