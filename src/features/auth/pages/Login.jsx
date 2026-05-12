import React, { useState } from 'react';
import { Lock, Mail, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !contrasena) {
      setError('Por favor completa todos los campos');
      return;
    }

    try {
      await login(email, contrasena);
      navigate('/');
      // routes.jsx redirige según rol cuando estaLogueado
    } catch (err) {
      const msg = err.message ?? '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Email o contraseña incorrectos. Verifica que uses las credenciales creadas en Supabase Auth.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Correo no confirmado. Pide al administrador que confirme la cuenta en Supabase Dashboard.');
      } else {
        setError(msg || 'Error al iniciar sesión. Intenta de nuevo.');
      }
      console.error('Error de login:', err);
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
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="tu@email.com"
              />
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Contraseña</label>
            <div className="relative">
              <input
                type="password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Ingrese su contraseña"
              />
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {(error || authError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error || authError}
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

        </form>
      </div>
    </div>
  );
}
