import React, { useState, useEffect } from 'react';
import { Search, Eye, Mail, Phone, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import pacienteService from '../../../services/pacienteService';

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState(null);

  useEffect(() => {
    let mounted = true;
    pacienteService.getAll()
      .then((data) => { if (mounted) setPacientes(data); })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando pacientes'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = pacientes.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.nombre_completo ?? '').toLowerCase().includes(term) ||
      (p.documento ?? '').includes(searchTerm) ||
      (p.email ?? '').toLowerCase().includes(term) ||
      (p.numero_historia ?? '').toLowerCase().includes(term)
    );
  });

  const initials = (nombre) =>
    (nombre ?? '').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Pacientes</h1>
            <p className="text-blue-100">Información completa de los pacientes registrados</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100 mb-1">Total Pacientes</p>
            <p className="text-4xl font-bold">{loading ? '···' : pacientes.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Búsqueda */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, documento, email o historia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg disabled:opacity-60"
            disabled
            title="Los pacientes se crean al registrar un usuario con rol cliente"
          >
            <UserPlus size={20} />
            Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Paciente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Documento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Edad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Contacto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Historia</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Citas</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Loader2 size={32} className="mx-auto mb-2 animate-spin" />
                    Cargando pacientes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <Search size={48} className="mx-auto mb-4 text-gray-300" />
                    No se encontraron pacientes
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => (
                  <tr key={p.id_paciente} className={`hover:bg-blue-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                          {initials(p.nombre_completo)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{p.nombre_completo}</p>
                          <p className="text-xs text-gray-500">{p.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-900">{p.documento}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {p.edad != null ? `${p.edad} años` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{p.telefono ?? '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{p.numero_historia}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {p.total_citas} {p.total_citas === 1 ? 'cita' : 'citas'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedPaciente(p)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Ver detalles"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ver Detalles */}
      {selectedPaciente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold">Detalles del paciente</h2>
                <p className="text-blue-100 text-sm">Historia: {selectedPaciente.numero_historia}</p>
              </div>
              <button onClick={() => setSelectedPaciente(null)} className="text-white hover:bg-white/20 p-2 rounded-lg transition">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {initials(selectedPaciente.nombre_completo)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedPaciente.nombre_completo}</h3>
                  <p className="text-gray-600">
                    {selectedPaciente.edad != null && `${selectedPaciente.edad} años · `}
                    {selectedPaciente.genero ?? 'Género no especificado'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Documento" value={`${selectedPaciente.tipo_documento ?? ''} ${selectedPaciente.documento}`} />
                <Field label="Tipo de sangre" value={selectedPaciente.tipo_sangre} />
                <Field label="Email" value={selectedPaciente.email} icon={<Mail size={14} />} />
                <Field label="Teléfono" value={selectedPaciente.telefono} icon={<Phone size={14} />} />
                <Field label="Dirección" value={selectedPaciente.direccion} className="col-span-2" />
                <Field label="Ocupación" value={selectedPaciente.ocupacion} />
                <Field label="Estado civil" value={selectedPaciente.estado_civil} />
                <Field label="Contacto emergencia" value={selectedPaciente.contacto_emergencia} className="col-span-2" />
                <Field label="Alergias" value={selectedPaciente.alergias} className="col-span-2" />
                <Field label="Total citas" value={selectedPaciente.total_citas} />
                <Field label="Última visita" value={selectedPaciente.ultima_visita?.slice(0, 10)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, icon, className = '' }) {
  return (
    <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
      <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="font-semibold text-gray-900 break-words">{value || '—'}</p>
    </div>
  );
}
