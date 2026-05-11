export const ROLE_ADMIN      = 'admin';
export const ROLE_DOCTOR     = 'medico';
export const ROLE_ASISTENTE  = 'asistente';
export const ROLE_CLIENTE    = 'cliente';

export const ROLES = [ROLE_ADMIN, ROLE_DOCTOR, ROLE_ASISTENTE, ROLE_CLIENTE];

export function normalizeRoleName(role) {
  if (!role) return null;
  const normalized = String(role).toLowerCase();
  if (normalized === 'admin' || normalized === 'administrador') return ROLE_ADMIN;
  if (normalized === 'medico' || normalized === 'doctor')       return ROLE_DOCTOR;
  if (normalized === 'asistente')                               return ROLE_ASISTENTE;
  if (normalized === 'cliente' || normalized === 'paciente')    return ROLE_CLIENTE;
  return null;
}

export function roleHomePath(role) {
  switch (normalizeRoleName(role)) {
    case ROLE_ADMIN:     return '/dashboard';
    case ROLE_DOCTOR:    return '/medico';
    case ROLE_ASISTENTE: return '/dashboard';   // asistente usa el mismo layout del empleado
    case ROLE_CLIENTE:   return '/cliente';
    default:             return '/sin-rol';     // usuario autenticado pero sin rol asignado
  }
}
