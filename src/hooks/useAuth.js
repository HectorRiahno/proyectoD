import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { ROLE_ADMIN, ROLE_DOCTOR, ROLE_CLIENTE } from '../config/roles';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de <AuthProvider>');
  }

  const { usuarioLogueado } = context;

  return {
    ...context,
    esAdmin: usuarioLogueado?.rol_nombre === ROLE_ADMIN,
    esDoctor: usuarioLogueado?.rol_nombre === ROLE_DOCTOR,
    esPaciente: usuarioLogueado?.rol_nombre === ROLE_CLIENTE,
  };
}

export default useAuth;
