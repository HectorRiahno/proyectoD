import React, { useState } from 'react';
import { User, Lock, Mail, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';

export default function Register() {
  const navigate = useNavigate();
  const { registro, loading, error: authError } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    contrasena: '',
    confirmarContrasena: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre || !formData.email || !formData.contrasena || !formData.confirmarContrasena) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (formData.contrasena !== formData.confirmarContrasena) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await registro(formData.email, formData.contrasena, formData.nombre, 'cliente');
      alert('Registro exitoso. Por favor verifica tu correo electrónico para confirmar tu cuenta.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Error al registrar usuario');
      console.error('Error de registro:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white mb-4 shadow-lg">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Crear Cuenta</h2>
          <p className="text-sm text-gray-500 mt-1">Regístrate para comenzar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Nombre Completo</label>
            <div className="relative">
              <input
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Tu nombre completo"
              />
              <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Email</label>
            <div className="relative">
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="correo@ejemplo.com"
              />
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Contraseña</label>
            <div className="relative">
              <input
                name="contrasena"
                type="password"
                value={formData.contrasena}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Mínimo 6 caracteres"
              />
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Confirmar Contraseña</label>
            <div className="relative">
              <input
                name="confirmarContrasena"
                type="password"
                value={formData.confirmarContrasena}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Confirma tu contraseña"
              />
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-gray-600 hover:text-blue-600 transition"
            >
              ¿Ya tienes cuenta? <span className="font-semibold text-blue-600">Inicia sesión</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
