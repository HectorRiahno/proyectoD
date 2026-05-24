import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { roleHomePath, normalizeRoleName } from './config/roles';
import { supabase } from './lib/supabase';

import EmployeeLayout from './shared/layouts/EmployeeLayout';
import ClientLayout from './shared/layouts/ClientLayout';
import MedicoLayout from './shared/layouts/MedicoLayout';

import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import SetPassword from './features/auth/pages/SetPassword';
import ForgotPassword from './features/auth/pages/ForgotPassword';

import AdminHome from './features/admin/pages/Home';
import AdminCitas from './features/admin/pages/Citas';
import AdminInventario from './features/admin/pages/Inventario';
import AdminPacientes from './features/admin/pages/Pacientes';
import AdminReportes from './features/admin/pages/Reportes';
import AdminConfiguracion from './features/admin/pages/Configuracion';
import AdminUsuarios from './features/admin/pages/Usuarios';
import AdminMedicos  from './features/admin/pages/Medicos';
import AdminHorarios from './features/admin/pages/Horarios';
import AdminAuditoria from './features/admin/pages/Auditoria';
import AdminPapelera from './features/admin/pages/Papelera';
import AdminFacturacion from './features/admin/pages/Facturacion';
import CreateDoctor from './features/admin/components/CreateDoctor';

import MedicoDashboard from './features/medico/pages/MedicoDashboard';
import MedicoAgenda from './features/medico/pages/Agenda';
import MedicoMisCitas from './features/medico/pages/MisCitas';
import MedicoMisPacientes from './features/medico/pages/MisPacientes';
import MedicoConsultas from './features/medico/pages/Consultas';
import MedicoAtenderCita from './features/medico/pages/AtenderCita';

import ClientDashboard from './features/clients/pages/ClientDashboard';
import MiPerfil from './features/clients/pages/MiPerfil';
import MisCitas from './features/clients/pages/MisCitas';
import MisMedicamentos from './features/clients/pages/MisMedicamentos';
import Resultados from './features/clients/pages/Resultados';
import MiHistorial from './features/clients/pages/MiHistorial';
import Documentos from './features/clients/pages/Documentos';
import MisFacturas from './features/clients/pages/MisFacturas';

// ─── Loading screen ────────────────────────────────────────────────────────────
// Tras 5 segundos cargando, muestra una vía de escape para casos donde la
// sesión queda en estado corrupto (token expirado, refresh fallido, etc.).
function LoadingScreen() {
  const [mostrarEmergencia, setMostrarEmergencia] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMostrarEmergencia(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const limpiarYVolverAlLogin = async () => {
    setLimpiando(true);
    try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) {}
    try {
      localStorage.removeItem('hospitalis-session');
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k);
      });
      sessionStorage.clear();
    } catch (_) {}
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Cargando sesión...</p>

        {mostrarEmergencia && (
          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <p className="text-sm text-amber-800">
              ¿Llevas mucho tiempo cargando? La sesión puede estar atascada
              (token expirado, conexión perdida).
            </p>
            <button
              onClick={limpiarYVolverAlLogin}
              disabled={limpiando}
              className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-semibold disabled:opacity-60"
            >
              {limpiando ? 'Limpiando...' : 'Limpiar sesión e ir al login'}
            </button>
          </div>
        )}
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

      {/* Set-password: accesible siempre. La página decide qué mostrar según si
          el invitado tiene sesión activa (vía detectSessionInUrl) o no. */}
      <Route path="/set-password" element={<SetPassword />} />

      {/* Forgot-password: público, dispara el correo de recuperación. */}
      <Route path="/forgot-password"
        element={!estaLogueado ? <ForgotPassword /> : <Navigate to={home} replace />} />

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
        <Route path="facturacion"  element={<AdminFacturacion />} />
        <Route path="auditoria"    element={<AdminAuditoria />} />
        <Route path="papelera"     element={<AdminPapelera />} />
        <Route path="configuracion" element={<AdminConfiguracion />} />
      </Route>

      {/* Médico */}
      <Route path="/medico" element={<RoleRoute roles="medico"><MedicoLayout /></RoleRoute>}>
        <Route index element={<MedicoDashboard />} />
        <Route path="agenda"       element={<MedicoAgenda />} />
        <Route path="citas"        element={<MedicoMisCitas />} />
        <Route path="pacientes"    element={<MedicoMisPacientes />} />
        <Route path="consultas"    element={<MedicoConsultas />} />
        <Route path="atender/:citaId" element={<MedicoAtenderCita />} />
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
        <Route path="facturas"      element={<MisFacturas />} />
      </Route>

      {/* Raíz y wildcard */}
      <Route path="/" element={<Navigate to={estaLogueado ? home : '/login'} replace />} />
      <Route path="*" element={<Navigate to={estaLogueado ? home : '/login'} replace />} />
    </Routes>
  );
}
