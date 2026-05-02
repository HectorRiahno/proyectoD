import React, { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [documento, setDocumento] = useState('');
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState('empleado');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Intentar iniciar sesión con Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: usuario,
        password: contrasena,
      });

      if (authError) throw authError;

      // Si tiene éxito, redirigir según el tipo de usuario
      if (tipoUsuario === 'empleado') {
        navigate('/dashboard');
      } else {
        navigate('/cliente');
      }
    } catch (err) {
      setError('Credenciales inválidas. Por favor verifica tu usuario y contraseña.');
      console.error('Error de login:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">HospitalIS PRO</h2>
          <p className="text-sm text-gray-500 mt-1">Sistema Integrado de Gestión Hospitalaria</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Tipo de Usuario</label>
            <select
              value={tipoUsuario}
              onChange={(e) => setTipoUsuario(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
            >
              <option value="empleado">Empleado del Hospital</option>
              <option value="cliente">Paciente/Cliente</option>
            </select>
          </div> */}

          {/* <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Documento de Identidad</label>
            <input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Ingrese su documento"
            />
          </div> */}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Usuario</label>
            <div className="relative">
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Nombre de usuario"
              />
              <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Contraseña</label>
            <div className="relative">
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Ingrese su contraseña"
              />
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn className="w-5 h-5" /> Iniciar Sesión
              </>
            )}
          </button>

          {/* <div className="text-center space-y-3 pt-2">
            <a href="#" className="text-sm text-blue-600 hover:text-blue-700 block font-medium">
              ¿Olvidaste tu contraseña?
            </a>
            <div className="border-t pt-3">
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-sm text-gray-600 hover:text-blue-600 transition"
              >
                ¿Usuario nuevo? <span className="font-semibold text-blue-600">Regístrate aquí</span>
              </button>
            </div>
          </div> */}
        </form>
      </div>
    </div>
  );
}
