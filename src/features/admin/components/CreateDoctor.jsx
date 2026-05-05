import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { createDoctorAccount } from '../../../services/adminService';
import { User, Mail, Stethoscope, Lock } from 'lucide-react';

export default function CreateDoctor() {
  const navigate = useNavigate();
  const { esAdmin } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    especialidad: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!esAdmin) {
    return (
      <div className="p-6 bg-white shadow rounded-lg">
        <h1 className="text-xl font-semibold text-gray-800">Acceso denegado</h1>
        <p className="mt-2 text-gray-600">Solo los administradores pueden crear cuentas de médicos.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.nombre || !formData.correo || !formData.especialidad || !formData.password) {
      setError('Completa todos los campos antes de continuar.');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      await createDoctorAccount({
        nombre: formData.nombre,
        correo: formData.correo,
        especialidad: formData.especialidad,
        password: formData.password,
        id_rol: 2,
      });
      setSuccess('Cuenta de médico creada correctamente.');
      setFormData({ nombre: '', correo: '', especialidad: '', password: '' });
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta del médico.');
      console.error('Error al crear médico:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Crear cuenta de médico</h1>
          <p className="mt-2 text-gray-600">Esta acción solo puede hacerla un administrador.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del médico"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="medico@hospital.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Especialidad</label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                name="especialidad"
                value={formData.especialidad}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Cardiología, Pediatría, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña temporal</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contraseña segura"
              />
            </div>
          </div>

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>}
          {success && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">{success}</div>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Creando...' : 'Crear médico'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Volver al panel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
