import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Search, User, AlertCircle, Loader2 } from 'lucide-react';
import citaService from '../../../services/citaService';

const ESTADOS = ['todas', 'programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio'];

export default function MisCitas() {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todas');

  useEffect(() => {
    let mounted = true;
    citaService.getMisCitasMedico()
      .then((data) => { if (mounted) setCitas(data); })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando citas'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = citas.filter((c) => {
    const term = search.toLowerCase();
    const matchSearch =
      (c.paciente_nombre ?? '').toLowerCase().includes(term) ||
      (c.paciente_documento ?? '').includes(search) ||
      (c.motivo ?? '').toLowerCase().includes(term);
    const matchEstado = filterEstado === 'todas' || c.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const estadoStyles = {
    programada: 'bg-blue-100 text-blue-700 border-blue-200',
    confirmada: 'bg-green-100 text-green-700 border-green-200',
    en_curso:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    completada: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelada:  'bg-red-100 text-red-700 border-red-200',
    no_asistio: 'bg-orange-100 text-orange-700 border-orange-200',
  };

  const counts = ESTADOS.reduce((acc, e) => {
    acc[e] = e === 'todas' ? citas.length : citas.filter((c) => c.estado === e).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mis citas</h1>
            <p className="text-emerald-100">Todas las citas asignadas a ti</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-100 mb-1">Total</p>
            <p className="text-4xl font-bold">{loading ? '···' : citas.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por paciente, documento o motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={() => setFilterEstado(e)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                filterEstado === e
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {e === 'no_asistio' ? 'No asistió' : e === 'en_curso' ? 'En curso' : e}
              <span className="ml-2 text-xs opacity-80">({counts[e] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b-2 border-emerald-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Fecha / Hora</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Paciente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Motivo</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <Loader2 size={32} className="mx-auto mb-2 animate-spin text-emerald-600" />
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">
                    <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                    No hay citas que coincidan
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => (
                  <tr key={c.id_cita} className={`hover:bg-emerald-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Calendar size={14} className="text-emerald-600" />
                        {c.fecha}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Clock size={12} />
                        {c.hora?.slice(0, 5)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <User size={14} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{c.paciente_nombre ?? '—'}</p>
                          <p className="text-xs text-gray-500 font-mono">{c.paciente_documento ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{c.tipo_consulta ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate" title={c.motivo}>
                      {c.motivo ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium border ${estadoStyles[c.estado] ?? 'bg-gray-100'}`}>
                        {c.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
