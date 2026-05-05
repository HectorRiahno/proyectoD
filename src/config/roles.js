export const ROLE_ADMIN = 'admin';
export const ROLE_DOCTOR = 'medico';
export const ROLE_CLIENTE = 'cliente';

export const ROLES = [ROLE_ADMIN, ROLE_DOCTOR, ROLE_CLIENTE];

export function normalizeRoleName(role) {
  if (!role) return ROLE_CLIENTE;
  const normalized = String(role).toLowerCase();
  if (normalized === 'admin' || normalized === 'administrador') return ROLE_ADMIN;
  if (normalized === 'medico' || normalized === 'doctor') return ROLE_DOCTOR;
  if (normalized === 'cliente' || normalized === 'paciente') return ROLE_CLIENTE;
  return ROLE_CLIENTE;
}

export function roleHomePath(role) {
  switch (normalizeRoleName(role)) {
    case ROLE_ADMIN:
      return '/dashboard';
    case ROLE_DOCTOR:
      return '/medico';
    case ROLE_CLIENTE:
    default:
      return '/cliente';
  }
}
