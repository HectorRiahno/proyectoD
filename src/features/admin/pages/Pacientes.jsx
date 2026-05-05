import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Filter, Download, UserPlus, Mail, Phone } from 'lucide-react';
import { pacientesList } from '../../../shared/data/pacientesList';
import EditarPacienteModal from '../components/EditarPacienteModal';

export default function Pacientes() {
  const [pacientes, setPacientes] = useState(pacientesList);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const filteredPacientes = pacientes.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.documento.includes(searchTerm) ||
                         p.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleEdit = (paciente) => {
    setSelectedPaciente(paciente);
    setShowEditModal(true);
  };

  const handleView = (paciente) => {
    setSelectedPaciente(paciente);
    setShowViewModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro de eliminar este paciente?')) {
      setPacientes(pacientes.filter(p => p.id !== id));
    }
  };

  const handleSave = (updatedPaciente) => {
    setPacientes(pacientes.map(p => 
      p.id === updatedPaciente.id ? updatedPaciente : p
    ));
    setShowEditModal(false);
  };

  const handleAddNew = () => {
    setSelectedPaciente(null);
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Pacientes</h1>
            <p className="text-blue-100">Administra la información completa de los pacientes</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100 mb-1">Total Pacientes</p>
            <p className="text-4xl font-bold">{pacientes.length}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Activos</p>
              <p className="text-2xl font-bold text-gray-900">{pacientes.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <UserPlus className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Nuevos (Mes)</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Plus className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">En Tratamiento</p>
              <p className="text-2xl font-bold text-gray-900">45</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Mail className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Citas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Phone className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, documento o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg"
          >
            <Plus size={20} />
            Nuevo Paciente
          </button>

          <button className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold">
            <Download size={20} />
            Exportar
          </button>
        </div>
      </div>

      {/* Tabla de Pacientes */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Paciente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Edad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Diagnóstico</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Última Visita</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPacientes.map((paciente, index) => (
                <tr key={paciente.id} className={`hover:bg-blue-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                        {paciente.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{paciente.nombre}</p>
                        <p className="text-xs text-gray-500">{paciente.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-900">{paciente.documento}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{paciente.edad} años</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{paciente.telefono}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{paciente.diagnostico}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{paciente.ultimaVisita}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleView(paciente)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Ver detalles"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(paciente)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(paciente.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPacientes.length === 0 && (
            <div className="text-center py-12">
              <Search size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No se encontraron pacientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Editar */}
      {showEditModal && (
        <EditarPacienteModal
          paciente={selectedPaciente}
          onClose={() => setShowEditModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Modal Ver Detalles */}
      {showViewModal && selectedPaciente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold">Detalles del Paciente</h2>
                <p className="text-blue-100 text-sm">Información completa</p>
              </div>
              <button 
                onClick={() => setShowViewModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {selectedPaciente.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedPaciente.nombre}</h3>
                  <p className="text-gray-600">{selectedPaciente.edad} años</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1">Documento</p>
                  <p className="font-mono font-semibold text-gray-900">{selectedPaciente.documento}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1">Teléfono</p>
                  <p className="font-semibold text-gray-900">{selectedPaciente.telefono}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                  <p className="font-semibold text-gray-900">{selectedPaciente.email}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Diagnóstico</p>
                  <p className="font-semibold text-gray-900">{selectedPaciente.diagnostico}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1">Última Visita</p>
                  <p className="font-semibold text-gray-900">{selectedPaciente.ultimaVisita}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
