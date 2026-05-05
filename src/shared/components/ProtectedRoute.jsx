import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Componente para proteger rutas según autenticación y rol
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar si está autorizado
 * @param {string} [props.requiredRole] - Nombre del rol requerido ('admin','medico','cliente')
 * @param {string} [props.fallbackPath] - Ruta a donde redirigir si no está autorizado (default: /login)
 *
 * @example
 * <ProtectedRoute requiredRole="admin">
 *   <AdminDashboard />
 * </ProtectedRoute>
 */
function ProtectedRoute({ children, requiredRole = null, fallbackPath = '/login' }) {
  const { estaLogueado, usuarioLogueado, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!estaLogueado) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (requiredRole !== null && usuarioLogueado?.rol_nombre !== requiredRole) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

export default ProtectedRoute;
