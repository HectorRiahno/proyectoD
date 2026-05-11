import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, AlertCircle, Loader2, Star } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function Diagnosticos() {
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.from('vw_medico_diagnosticos')
      .select('*')
      .order('fecha', { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error;
        if (mounted) setDiagnosticos(data ?? []);
      })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando diagnósticos'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = diagnosticos.filter((d) => {
    const term = search.toLowerCase();
    return (
      (d.paciente_nombre ?? '').toLowerCase().includes(term) ||
      (d.descripcion ?? '').toLowerCase().includes(term) ||
      (d.codigo_cie10 ?? '').toLowerCase().includes(term) ||
      (d.paciente_documento ?? '').includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Diagnósticos emitidos</h1>
            <p className="text-emerald-100">Historial de diagnósticos realizados</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-100 mb-1">Total</p>
            <p className="text-4xl font-bold">{loading ? '···' : diagnosticos.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por paciente, código CIE-10 o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b-2 border-emerald-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Paciente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">CIE-10</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Descripción</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Tipo</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Principal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Loader2 size={32} className="mx-auto mb-2 animate-spin text-emerald-600" />
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
                    No tienes diagnósticos registrados
                  </td>
                </tr>
              ) : (
                filtered.map((d, idx) => (
                  <tr key={d.id_diagnostico} className={`hover:bg-emerald-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 text-sm text-gray-700">{d.fecha?.slice(0, 10) ?? '—'}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 text-sm">{d.paciente_nombre ?? '—'}</p>
                      <p className="text-xs text-gray-500 font-mono">{d.paciente_documento ?? ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      {d.codigo_cie10 ? (
                        <span className="font-mono text-sm bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                          {d.codigo_cie10}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-md">{d.descripcion ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{d.tipo_diagnostico ?? '—'}</td>
                    <td className="px-6 py-4 text-center">
                      {d.es_principal && (
                        <Star size={18} className="text-yellow-500 fill-yellow-500 inline" />
                      )}
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
