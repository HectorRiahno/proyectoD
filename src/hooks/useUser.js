import { useAuth } from './useAuth';

/**
 * Hook para acceder a los datos del usuario autenticado
 * Simplifica el acceso a información común del usuario
 *
 * @example
 * const { usuario, esAdmin, esDoctor, cargando } = useUser();
 * if (cargando) return <Spinner />;
 * if (!usuario) return <Redirect to="/login" />;
 * return <div>Bienvenido, {usuario.nombre}</div>;
 */
export function useUser() {
  const { usuarioLogueado: usuario, loading: cargando, estaLogueado } = useAuth();

  return {
    usuario,
    cargando,
    estaAutenticado: estaLogueado,
    esAdmin: usuario?.rol_nombre === 'admin',
    esDoctor: usuario?.rol_nombre === 'medico',
    esPaciente: usuario?.rol_nombre === 'cliente',
    tieneRol: (rol) => usuario?.rol_nombre === rol,
  };
}

export default useUser;
