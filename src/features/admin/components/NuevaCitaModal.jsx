import React, { useState } from 'react';
import { X, Calendar, Clock, User, FileText, MapPin } from 'lucide-react';

export default function NuevaCitaModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    paciente: '',
    fecha: '',
    hora: '',
    tipo: 'Presencial',
    especialidad: 'Medicina General',
    motivo: '',
    consultorio: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({
      paciente: '',
      fecha: '',
      hora: '',
      tipo: 'Presencial',
      especialidad: 'Medicina General',
      motivo: '',
      consultorio: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Nueva Cita Médica</h2>
            <p className="text-blue-100 text-sm">Complete los datos de la cita</p>
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
              Paciente *
            </label>
            <input
              name="paciente"
              value={formData.paciente}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Nombre completo del paciente"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Calendar className="inline mr-2" size={16} />
                Fecha *
              </label>
              <input
                name="fecha"
                type="date"
                value={formData.fecha}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Clock className="inline mr-2" size={16} />
                Hora *
              </label>
              <input
                name="hora"
                type="time"
                value={formData.hora}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Especialidad *
              </label>
              <select
                name="especialidad"
                value={formData.especialidad}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
              >
                <option>Medicina General</option>
                <option>Cardiología</option>
                <option>Pediatría</option>
                <option>Ginecología</option>
                <option>Dermatología</option>
                <option>Oftalmología</option>
                <option>Traumatología</option>
                <option>Odontología</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de Consulta *
              </label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white"
              >
                <option>Presencial</option>
                <option>Telemedicina</option>
                <option>Domicilio</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <MapPin className="inline mr-2" size={16} />
              Consultorio / Ubicación
            </label>
            <input
              name="consultorio"
              value={formData.consultorio}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Ej: Consultorio 301"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="inline mr-2" size={16} />
              Motivo de la Consulta *
            </label>
            <textarea
              name="motivo"
              value={formData.motivo}
              onChange={handleChange}
              required
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
              placeholder="Describa brevemente el motivo de la cita..."
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
              Agendar Cita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
