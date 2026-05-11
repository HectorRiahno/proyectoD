import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, AlertCircle, Loader2, User, Calendar, Stethoscope } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function Consultas() {
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    supabase.from('vw_medico_consultas')
      .select('*')
      .order('fecha_consulta', { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error;
        if (mounted) setConsultas(data ?? []);
      })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando consultas'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = consultas.filter((c) => {
    const term = search.toLowerCase();
    return (
      (c.paciente_nombre ?? '').toLowerCase().includes(term) ||
      (c.paciente_documento ?? '').includes(search) ||
      (c.motivo_consulta ?? '').toLowerCase().includes(term) ||
      (c.impresion_diagnostica ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mis consultas</h1>
            <p className="text-emerald-100">Registro de consultas médicas realizadas</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-100 mb-1">Total</p>
            <p className="text-4xl font-bold">{loading ? '···' : consultas.length}</p>
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
            placeholder="Buscar por paciente, motivo o diagnóstico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-emerald-600" />
          <p className="text-gray-500">Cargando consultas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No tienes consultas registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <button
              key={c.id_consulta}
              onClick={() => setSelected(c)}
              className="w-full text-left bg-white rounded-xl shadow-md hover:shadow-lg transition p-5 border border-gray-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="bg-emerald-100 rounded-lg p-2">
                    <Stethoscope size={20} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{c.paciente_nombre ?? '—'}</p>
                    <p className="text-xs text-gray-500 mb-2">
                      Doc {c.paciente_documento ?? '—'} · HC {c.numero_historia ?? '—'}
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      <span className="font-medium">Motivo: </span>
                      {c.motivo_consulta ?? 'No especificado'}
                    </p>
                    {c.impresion_diagnostica && (
                      <p className="text-sm text-gray-600 line-clamp-1 mt-1">
                        <span className="font-medium">Dx: </span>
                        {c.impresion_diagnostica}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {c.fecha_consulta?.slice(0, 10)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <DetalleConsulta consulta={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function DetalleConsulta({ consulta, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Consulta médica</h2>
            <p className="text-emerald-100 text-sm">
              <User size={12} className="inline mr-1" />
              {consulta.paciente_nombre} · {consulta.fecha_consulta?.slice(0, 10)}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <Seccion titulo="Motivo de consulta" contenido={consulta.motivo_consulta} />
          <Seccion titulo="Examen físico" contenido={consulta.examen_fisico} />
          <Seccion titulo="Impresión diagnóstica" contenido={consulta.impresion_diagnostica} highlight />
          <Seccion titulo="Plan de tratamiento" contenido={consulta.plan_tratamiento} />
          <Seccion titulo="Observaciones" contenido={consulta.observaciones} />
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, contenido, highlight = false }) {
  if (!contenido) return null;
  return (
    <div className={`rounded-lg p-4 ${highlight ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
      <p className={`text-xs font-bold uppercase mb-2 ${highlight ? 'text-emerald-700' : 'text-gray-600'}`}>
        {titulo}
      </p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{contenido}</p>
    </div>
  );
}
