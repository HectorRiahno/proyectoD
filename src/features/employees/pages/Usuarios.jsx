import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { UserPlus, ShieldCheck, User, Users, Mail, Lock, Phone } from 'lucide-react';

export default function Usuarios() {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    role: 'empleado',
    documento: '',
    telefono: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const roles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'empleado', label: 'Empleado' },
    { value: 'cliente', label: 'Paciente/Cliente' }
  ];

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!form.email || !form.password || !form.nombre) {
      setError('Completa los campos obligatorios.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            nombre: form.nombre,
            documento: form.documento,
            telefono: form.telefono,
            role: form.role
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      setMessage(
        'Usuario creado correctamente. Revisa el correo para validar la cuenta si es necesario.'
      );
      setForm({ nombre: '', email: '', password: '', role: 'empleado', documento: '', telefono: '' });
    } catch (err) {
      setError(err.message || 'No se pudo crear el usuario.');
      console.error('Error creando usuario:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Crear nuevo usuario</h1>
          <p className="text-sm text-gray-500">Interfaz de administración para crear cuentas y asignar roles</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Nombre completo</span>
                <div className="mt-2 relative">
                  <User className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Nombre del usuario"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Correo electrónico</span>
                <div className="mt-2 relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Contraseña</span>
                <div className="mt-2 relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Contraseña segura"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Rol asignado</span>
                <div className="mt-2 relative">
                  <Users className="absolute left-3 top-3 text-gray-400" size={18} />
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {roles.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Documento</span>
                <div className="mt-2 relative">
                  <UserPlus className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="documento"
                    value={form.documento}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Número de documento"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">Teléfono</span>
                <div className="mt-2 relative">
                  <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="+57 300 123 4567"
                  />
                </div>
              </label>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-white font-semibold shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Creando usuario...' : 'Crear usuario'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-blue-50 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-600 p-3 text-white">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Roles disponibles</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Crea usuarios con roles específicos para controlar el acceso: administrador, empleado o cliente.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-white p-4 border border-gray-200">
                <p className="font-semibold text-gray-800">Administrador</p>
                <p className="text-sm text-gray-600 mt-1">Acceso total al sistema y gestión de cuentas.</p>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-gray-200">
                <p className="font-semibold text-gray-800">Empleado</p>
                <p className="text-sm text-gray-600 mt-1">Acceso a tablero médico, citas, pacientes y reportes.</p>
              </div>
              <div className="rounded-2xl bg-white p-4 border border-gray-200">
                <p className="font-semibold text-gray-800">Paciente/Cliente</p>
                <p className="text-sm text-gray-600 mt-1">Acceso a su propio panel, citas, historial y resultados.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}