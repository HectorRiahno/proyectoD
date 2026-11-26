import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { roleHomePath, normalizeRoleName } from './config/roles';
import { supabase } from './lib/supabase';

// Code-splitting por ruta: sólo Landing y Login viajan en el bundle inicial. El resto
// de páginas (y sus librerías: gráficas, PDF, Excel) se descargan al visitarlas.
const EmployeeLayout = lazy(() => import('./shared/layouts/EmployeeLayout'));
const ClientLayout = lazy(() => import('./shared/layouts/ClientLayout'));
const MedicoLayout = lazy(() => import('./shared/layouts/MedicoLayout'));

import Landing from './features/landing/pages/Landing';
import Login from './features/auth/pages/Login';
const Register = lazy(() => import('./features/auth/pages/Register'));
const SetPassword = lazy(() => import('./features/auth/pages/SetPassword'));
const ForgotPassword = lazy(() => import('./features/auth/pages/ForgotPassword'));

const AdminHome = lazy(() => import('./features/admin/pages/Home'));
const AdminCitas = lazy(() => import('./features/admin/pages/Citas'));
const AdminInventario = lazy(() => import('./features/admin/pages/Inventario'));
const AdminPacientes = lazy(() => import('./features/admin/pages/Pacientes'));
const AdminReportes = lazy(() => import('./features/admin/pages/Reportes'));
const AdminConfiguracion = lazy(() => import('./features/admin/pages/Configuracion'));
const AdminUsuarios = lazy(() => import('./features/admin/pages/Usuarios'));
const AdminMedicos = lazy(() => import('./features/admin/pages/Medicos'));
const AdminHorarios = lazy(() => import('./features/admin/pages/Horarios'));
const AdminAuditoria = lazy(() => import('./features/admin/pages/Auditoria'));
const AdminPapelera = lazy(() => import('./features/admin/pages/Papelera'));
const AdminFacturacion = lazy(() => import('./features/admin/pages/Facturacion'));

const MedicoDashboard = lazy(() => import('./features/medico/pages/MedicoDashboard'));
const MedicoAgenda = lazy(() => import('./features/medico/pages/Agenda'));
const MedicoMisCitas = lazy(() => import('./features/medico/pages/MisCitas'));
const MedicoMiHorario = lazy(() => import('./features/medico/pages/MiHorario'));
const MedicoMisPacientes = lazy(() => import('./features/medico/pages/MisPacientes'));
const MedicoConsultas = lazy(() => import('./features/medico/pages/Consultas'));
const MedicoAtenderCita = lazy(() => import('./features/medico/pages/AtenderCita'));

const ClientDashboard = lazy(() => import('./features/clients/pages/ClientDashboard'));
const MiPerfil = lazy(() => import('./features/clients/pages/MiPerfil'));
const MisCitas = lazy(() => import('./features/clients/pages/MisCitas'));
const AgendarCita = lazy(() => import('./features/clients/pages/AgendarCita'));
const Resultados = lazy(() => import('./features/clients/pages/Resultados'));
const MiHistorial = lazy(() => import('./features/clients/pages/MiHistorial'));
const Documentos = lazy(() => import('./features/clients/pages/Documentos'));
const MisFacturas = lazy(() => import('./features/clients/pages/MisFacturas'));

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
    <Suspense fallback={<LoadingScreen />}>
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
        <Route path="horario"      element={<MedicoMiHorario />} />
        <Route path="pacientes"    element={<MedicoMisPacientes />} />
        <Route path="consultas"    element={<MedicoConsultas />} />
        <Route path="atender/:citaId" element={<MedicoAtenderCita />} />
      </Route>

      {/* Paciente / cliente */}
      <Route path="/cliente" element={<RoleRoute roles="cliente"><ClientLayout /></RoleRoute>}>
        <Route index element={<ClientDashboard />} />
        <Route path="perfil"        element={<MiPerfil />} />
        <Route path="citas"         element={<MisCitas />} />
        <Route path="agendar"       element={<AgendarCita />} />
        <Route path="resultados"    element={<Resultados />} />
        <Route path="historial"     element={<MiHistorial />} />
        <Route path="documentos"    element={<Documentos />} />
        <Route path="facturas"      element={<MisFacturas />} />
      </Route>

      {/* Raíz: página de inicio pública; con sesión, directo al panel del rol */}
      <Route path="/" element={estaLogueado ? <Navigate to={home} replace /> : <Landing />} />
      <Route path="*" element={<Navigate to={estaLogueado ? home : '/'} replace />} />
    </Routes>
    </Suspense>
  );
}
