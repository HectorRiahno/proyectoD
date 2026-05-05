import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { roleHomePath } from './config/roles';

import EmployeeLayout from './shared/layouts/EmployeeLayout';
import ClientLayout from './shared/layouts/ClientLayout';

import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';

import AdminHome from './features/admin/pages/Home';
import AdminCitas from './features/admin/pages/Citas';
import AdminInventario from './features/admin/pages/Inventario';
import AdminPacientes from './features/admin/pages/Pacientes';
import AdminReportes from './features/admin/pages/Reportes';
import AdminConfiguracion from './features/admin/pages/Configuracion';
import AdminUsuarios from './features/admin/pages/Usuarios';
import CreateDoctor from './features/admin/components/CreateDoctor';

import MedicoDashboard from './features/medico/pages/MedicoDashboard';

import ClientDashboard from './features/clients/pages/ClientDashboard';
import MiPerfil from './features/clients/pages/MiPerfil';
import MisCitas from './features/clients/pages/MisCitas';
import MisMedicamentos from './features/clients/pages/MisMedicamentos';
import Resultados from './features/clients/pages/Resultados';
import MiHistorial from './features/clients/pages/MiHistorial';
import Documentos from './features/clients/pages/Documentos';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

function RoleRoute({ role, children }) {
  const { estaLogueado, usuarioLogueado } = useAuth();
  if (!estaLogueado) return <Navigate to="/login" replace />;
  if (usuarioLogueado?.rol_nombre !== role) return <Navigate to="/login" replace />;
  return children;
}

export default function AppRoutes() {
  const { estaLogueado, usuarioLogueado, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  const home = roleHomePath(usuarioLogueado?.rol_nombre);

  return (
    <Routes>
      <Route path="/login" element={!estaLogueado ? <Login /> : <Navigate to={home} replace />} />
      <Route path="/register" element={!estaLogueado ? <Register /> : <Navigate to={home} replace />} />

      <Route path="/dashboard" element={<RoleRoute role="admin"><EmployeeLayout /></RoleRoute>}>
        <Route index element={<AdminHome />} />
        <Route path="citas" element={<AdminCitas />} />
        <Route path="inventario" element={<AdminInventario />} />
        <Route path="pacientes" element={<AdminPacientes />} />
        <Route path="usuarios" element={<AdminUsuarios />} />
        <Route path="crear-medico" element={<CreateDoctor />} />
        <Route path="reportes" element={<AdminReportes />} />
        <Route path="configuracion" element={<AdminConfiguracion />} />
      </Route>

      <Route path="/medico" element={<RoleRoute role="medico"><MedicoDashboard /></RoleRoute>} />

      <Route path="/cliente" element={<RoleRoute role="cliente"><ClientLayout /></RoleRoute>}>
        <Route index element={<ClientDashboard />} />
        <Route path="perfil" element={<MiPerfil />} />
        <Route path="citas" element={<MisCitas />} />
        <Route path="medicamentos" element={<MisMedicamentos />} />
        <Route path="resultados" element={<Resultados />} />
        <Route path="historial" element={<MiHistorial />} />
        <Route path="documentos" element={<Documentos />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
