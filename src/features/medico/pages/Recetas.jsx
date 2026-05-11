import React, { useState, useEffect } from 'react';
import { Pill, Search, AlertCircle, Loader2, Calendar, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function Recetas() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.from('vw_medico_ordenes')
      .select('*')
      .order('fecha_emision', { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error;
        if (mounted) setOrdenes(data ?? []);
      })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando recetas'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = ordenes.filter((o) => {
    const term = search.toLowerCase();
    return (
      (o.paciente_nombre ?? '').toLowerCase().includes(term) ||
      (o.medicamento_nombre ?? '').toLowerCase().includes(term) ||
      (o.indicaciones ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Recetas emitidas</h1>
            <p className="text-emerald-100">Órdenes médicas y medicamentos prescritos</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-100 mb-1">Total</p>
            <p className="text-4xl font-bold">{loading ? '···' : ordenes.length}</p>
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
            placeholder="Buscar por paciente, medicamento o indicaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-emerald-600" />
          <p className="text-gray-500">Cargando recetas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Pill size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No tienes recetas emitidas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((o) => (
            <div key={o.id_orden} className="bg-white rounded-xl shadow-md hover:shadow-lg transition p-5 border border-gray-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg p-3 shadow-md">
                  <Pill size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{o.medicamento_nombre ?? 'Sin medicamento'}</p>
                  <p className="text-xs text-gray-500">{o.medicamento_presentacion ?? ''}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <Calendar size={12} className="inline mr-1" />
                  {o.fecha_emision?.slice(0, 10)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-3 flex items-center gap-2">
                <User size={14} className="text-emerald-600" />
                <span className="text-sm font-medium text-gray-700">{o.paciente_nombre ?? '—'}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat label="Dosis" value={o.dosis} />
                <Stat label="Frecuencia" value={o.frecuencia} />
                <Stat label="Duración" value={o.duracion} />
              </div>

              {o.indicaciones && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Indicaciones</p>
                  <p className="text-sm text-emerald-900">{o.indicaciones}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
    </div>
  );
}
