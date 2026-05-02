import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

// Layouts
import EmployeeLayout from './shared/layouts/EmployeeLayout';
import ClientLayout from './shared/layouts/ClientLayout';

// Páginas de empleados
import Home from './features/employees/pages/Home';
import Citas from './features/employees/pages/Citas';
import Inventario from './features/employees/pages/Inventario';
import PacientesNuevo from './features/employees/pages/PacientesNuevo';
import Reportes from './features/employees/pages/Reportes';
import Configuracion from './features/employees/pages/Configuracion';
import Usuarios from './features/employees/pages/Usuarios';

// Páginas de clientes
import ClientDashboard from './features/clients/pages/ClientDashboard';
import MiPerfil from './features/clients/pages/MiPerfil';
import MisCitas from './features/clients/pages/MisCitas';
import MisMedicamentos from './features/clients/pages/MisMedicamentos';
import Resultados from './features/clients/pages/Resultados';
import MiHistorial from './features/clients/pages/MiHistorial';
import Documentos from './features/clients/pages/Documentos';

// Componentes de autenticación
import Login from './features/auth/components/Login';
import Register from './features/auth/components/Register';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión actual
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    checkSession();

    // Escuchar cambios en autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!session ? <Register /> : <Navigate to="/dashboard" />} />
      
      {/* Rutas de empleados (protegidas) */}
      <Route path="/dashboard" element={
        session ? <EmployeeLayout /> : <Navigate to="/login" />
      }>
        <Route index element={<Home />} />
        <Route path="citas" element={<Citas />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="pacientes" element={<PacientesNuevo />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>

      {/* Rutas de clientes (protegidas) */}
      <Route path="/cliente" element={
        session ? <ClientLayout /> : <Navigate to="/login" />
      }>
        <Route index element={<ClientDashboard />} />
        <Route path="perfil" element={<MiPerfil />} />
        <Route path="citas" element={<MisCitas />} />
        <Route path="medicamentos" element={<MisMedicamentos />} />
        <Route path="resultados" element={<Resultados />} />
        <Route path="historial" element={<MiHistorial />} />
        <Route path="documentos" element={<Documentos />} />
      </Route>

      {/* Redirección por defecto */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;