import React, { useState } from 'react';
import { User, Lock, Mail, Phone, MapPin, Calendar, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    documento: '',
    usuario: '',
    contrasena: '',
    confirmarContrasena: '',
    nombre: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    direccion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.contrasena !== formData.confirmarContrasena) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      // Registrar usuario en Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.contrasena,
        options: {
          data: {
            nombre: formData.nombre,
            documento: formData.documento,
            telefono: formData.telefono,
          }
        }
      });

      if (authError) throw authError;

      // Guardar información adicional en la tabla usuarios
      if (data?.user) {
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert({
            id: data.user.id,
            documento: formData.documento,
            usuario: formData.usuario,
            nombre: formData.nombre,
            email: formData.email,
            telefono: formData.telefono,
            fecha_nacimiento: formData.fechaNacimiento,
            direccion: formData.direccion,
          });

        if (insertError) console.warn('Warning: No se pudo guardar datos adicionales', insertError);
      }

      alert('Registro exitoso. Por favor verifica tu correo electrónico para confirmar tu cuenta.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Error al registrar usuario');
      console.error('Error de registro:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white mb-4 shadow-lg">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Crear Cuenta</h2>
          <p className="text-sm text-gray-500 mt-1">Complete el formulario para registrarse</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Documento</label>
              <input
                name="documento"
                value={formData.documento}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Número de documento"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Usuario</label>
              <div className="relative">
                <input
                  name="usuario"
                  value={formData.usuario}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Nombre de usuario"
                />
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Nombre Completo</label>
            <input
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Nombre completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Email</label>
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="correo@ejemplo.com"
                />
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Teléfono</label>
              <div className="relative">
                <input
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="+57 300 123 4567"
                />
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Fecha de Nacimiento</label>
            <div className="relative">
              <input
                name="fechaNacimiento"
                type="date"
                value={formData.fechaNacimiento}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Dirección</label>
            <div className="relative">
              <input
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Dirección completa"
              />
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Contraseña</label>
              <div className="relative">
                <input
                  name="contrasena"
                  type="password"
                  value={formData.contrasena}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Contraseña"
                />
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
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
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Confirmar contraseña"
                />
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg mt-6"
          >
            Registrarse
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
