import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User } from 'lucide-react';

/**
 * Componente de ejemplo que muestra cómo usar el contexto de autenticación
 * para mostrar los datos del usuario logueado
 */
export function UsuarioLogueadoWidget() {
  const { usuarioLogueado, estaLogueado, loading, logout } = useAuth();

  if (loading) {
    return <div className="text-gray-500">Cargando...</div>;
  }

  if (!estaLogueado) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-gray-800">{usuarioLogueado?.nombre}</span>
        </div>
        <span className="text-sm text-gray-600">{usuarioLogueado?.correo}</span>
        <div className="text-xs text-gray-500 mt-1">
          Rol: {usuarioLogueado?.rol_nombre || 'desconocido'}
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
        title="Cerrar sesión"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
}

export default UsuarioLogueadoWidget;
