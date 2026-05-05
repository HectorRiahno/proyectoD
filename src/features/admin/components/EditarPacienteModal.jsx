import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, FileText, MapPin } from 'lucide-react';

export default function EditarPacienteModal({ paciente, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nombre: '',
    documento: '',
    edad: '',
    telefono: '',
    email: '',
    diagnostico: '',
    ultimaVisita: ''
  });

  useEffect(() => {
    if (paciente) {
      setFormData(paciente);
    }
  }, [paciente]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = paciente 
      ? { ...formData, id: paciente.id }
      : { ...formData, id: Date.now() };
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">
              {paciente ? 'Editar Paciente' : 'Nuevo Paciente'}
            </h2>
            <p className="text-blue-100 text-sm">
              {paciente ? 'Actualiza la información del paciente' : 'Registra un nuevo paciente'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User className="inline mr-2" size={16} />
              Nombre Completo *
            </label>
            <input
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Nombre completo del paciente"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FileText className="inline mr-2" size={16} />
                Documento *
              </label>
              <input
                name="documento"
                value={formData.documento}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Número de documento"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="inline mr-2" size={16} />
                Edad *
              </label>
              <input
                name="edad"
                type="number"
                value={formData.edad}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Edad"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Phone className="inline mr-2" size={16} />
                Teléfono *
              </label>
              <input
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="+57 300 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail className="inline mr-2" size={16} />
                Email *
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="email@ejemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <MapPin className="inline mr-2" size={16} />
              Diagnóstico / Observaciones
            </label>
            <textarea
              name="diagnostico"
              value={formData.diagnostico}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              placeholder="Diagnóstico o observaciones del paciente..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="inline mr-2" size={16} />
              Última Visita
            </label>
            <input
              name="ultimaVisita"
              type="date"
              value={formData.ultimaVisita}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg"
            >
              {paciente ? 'Guardar Cambios' : 'Crear Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
