import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { roleHomePath, normalizeRoleName } from './config/roles';

import EmployeeLayout from './shared/layouts/EmployeeLayout';
import ClientLayout from './shared/layouts/ClientLayout';
import MedicoLayout from './shared/layouts/MedicoLayout';

import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';

import AdminHome from './features/admin/pages/Home';
import AdminCitas from './features/admin/pages/Citas';
import AdminInventario from './features/admin/pages/Inventario';
import AdminPacientes from './features/admin/pages/Pacientes';
import AdminReportes from './features/admin/pages/Reportes';
import AdminConfiguracion from './features/admin/pages/Configuracion';
import AdminUsuarios from './features/admin/pages/Usuarios';
import AdminMedicos  from './features/admin/pages/Medicos';
import AdminHorarios from './features/admin/pages/Horarios';
import CreateDoctor from './features/admin/components/CreateDoctor';

import MedicoDashboard from './features/medico/pages/MedicoDashboard';
import MedicoAgenda from './features/medico/pages/Agenda';
import MedicoMisCitas from './features/medico/pages/MisCitas';
import MedicoMisPacientes from './features/medico/pages/MisPacientes';
import MedicoConsultas from './features/medico/pages/Consultas';
import MedicoDiagnosticos from './features/medico/pages/Diagnosticos';
import MedicoRecetas from './features/medico/pages/Recetas';

import ClientDashboard from './features/clients/pages/ClientDashboard';
import MiPerfil from './features/clients/pages/MiPerfil';
import MisCitas from './features/clients/pages/MisCitas';
import MisMedicamentos from './features/clients/pages/MisMedicamentos';
import Resultados from './features/clients/pages/Resultados';
import MiHistorial from './features/clients/pages/MiHistorial';
import Documentos from './features/clients/pages/Documentos';

// ─── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Cargando sesión...</p>
      </div>
    </div>
  );
}

// ─── Sin rol asignado ──────────────────────────────────────────────────────────
function SinRol() {
  const { logout, usuarioLogueado } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Sin rol asignado</h2>
        <p className="text-gray-600">
          Tu cuenta <strong>{usuarioLogueado?.email}</strong> no tiene un rol asignado todavía.
          Comunícate con el administrador para que te asigne un rol.
        </p>
        <button
          onClick={logout}
          className="w-full px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-semibold"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ─── Guard de ruta por rol ─────────────────────────────────────────────────────
// Acepta un array de roles o un único rol.
// Si el usuario no tiene el rol requerido lo redirige a SU propia home
// (no a /login, para evitar el bucle infinito).
function RoleRoute({ roles, children }) {
  const { estaLogueado, usuarioLogueado, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!estaLogueado) return <Navigate to="/login" replace />;

  const rol = normalizeRoleName(usuarioLogueado?.rol_nombre);

  // Sin rol → página de aviso
  if (!rol) return <Navigate to="/sin-rol" replace />;

  const rolesPermitidos = Array.isArray(roles) ? roles : [roles];
  if (!rolesPermitidos.includes(rol)) {
    // Redirige a la home real del usuario (no a /login)
    return <Navigate to={roleHomePath(rol)} replace />;
  }

  return children;
}

// ─── AppRoutes ─────────────────────────────────────────────────────────────────
export default function AppRoutes() {
  const { estaLogueado, usuarioLogueado, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  const home = roleHomePath(usuarioLogueado?.rol_nombre);

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login"    element={!estaLogueado ? <Login />    : <Navigate to={home} replace />} />
      <Route path="/register" element={!estaLogueado ? <Register /> : <Navigate to={home} replace />} />

      {/* Sin rol */}
      <Route path="/sin-rol" element={estaLogueado ? <SinRol /> : <Navigate to="/login" replace />} />

      {/* Admin */}
      <Route path="/dashboard" element={<RoleRoute roles={['admin', 'asistente']}><EmployeeLayout /></RoleRoute>}>
        <Route index element={<AdminHome />} />
        <Route path="citas"        element={<AdminCitas />} />
        <Route path="inventario"   element={<AdminInventario />} />
        <Route path="pacientes"    element={<AdminPacientes />} />
        <Route path="usuarios"     element={<AdminUsuarios />} />
        <Route path="medicos"      element={<AdminMedicos />} />
        <Route path="horarios"     element={<AdminHorarios />} />
        <Route path="crear-medico" element={<CreateDoctor />} />
        <Route path="reportes"     element={<AdminReportes />} />
        <Route path="configuracion" element={<AdminConfiguracion />} />
      </Route>

      {/* Médico */}
      <Route path="/medico" element={<RoleRoute roles="medico"><MedicoLayout /></RoleRoute>}>
        <Route index element={<MedicoDashboard />} />
        <Route path="agenda"       element={<MedicoAgenda />} />
        <Route path="citas"        element={<MedicoMisCitas />} />
        <Route path="pacientes"    element={<MedicoMisPacientes />} />
        <Route path="consultas"    element={<MedicoConsultas />} />
        <Route path="diagnosticos" element={<MedicoDiagnosticos />} />
        <Route path="recetas"      element={<MedicoRecetas />} />
      </Route>

      {/* Paciente / cliente */}
      <Route path="/cliente" element={<RoleRoute roles="cliente"><ClientLayout /></RoleRoute>}>
        <Route index element={<ClientDashboard />} />
        <Route path="perfil"        element={<MiPerfil />} />
        <Route path="citas"         element={<MisCitas />} />
        <Route path="medicamentos"  element={<MisMedicamentos />} />
        <Route path="resultados"    element={<Resultados />} />
        <Route path="historial"     element={<MiHistorial />} />
        <Route path="documentos"    element={<Documentos />} />
      </Route>

      {/* Raíz y wildcard */}
      <Route path="/" element={<Navigate to={estaLogueado ? home : '/login'} replace />} />
      <Route path="*" element={<Navigate to={estaLogueado ? home : '/login'} replace />} />
    </Routes>
  );
}
