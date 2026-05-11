import React, { useState, useEffect } from 'react';
import { Pill, AlertCircle, Loader2, Calendar, Clock, Stethoscope, Info } from 'lucide-react';
import medicamentoService from '../../../services/medicamentoService';

export default function MisMedicamentos() {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    medicamentoService.getMisMedicamentos()
      .then((data) => { if (mounted) setOrdenes(data); })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando medicamentos'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mis medicamentos</h1>
            <p className="text-sky-100">Tratamientos y prescripciones médicas</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-sky-100 mb-1">Recetas</p>
            <p className="text-4xl font-bold">{loading ? '···' : ordenes.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-sky-600" />
          <p className="text-gray-500">Cargando medicamentos...</p>
        </div>
      ) : ordenes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Pill size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No tienes medicamentos prescritos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ordenes.map((o) => (
            <div key={o.id_orden} className="bg-white rounded-xl shadow-md hover:shadow-lg transition border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-sky-500 to-cyan-600 px-5 py-4 text-white flex items-center gap-3">
                <Pill size={24} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg truncate">{o.medicamento_nombre ?? 'Sin medicamento'}</p>
                  <p className="text-xs opacity-90 truncate">
                    {o.nombre_generico}
                    {o.concentracion && ` · ${o.concentracion}`}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Dosis"      value={o.dosis} />
                  <Stat label="Frecuencia" value={o.frecuencia} />
                  <Stat label="Duración"   value={o.duracion} />
                </div>

                {(o.presentacion || o.via_administracion) && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {o.presentacion && (
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-500">Presentación</p>
                        <p className="font-medium text-gray-800">{o.presentacion}</p>
                      </div>
                    )}
                    {o.via_administracion && (
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-gray-500">Vía de administración</p>
                        <p className="font-medium text-gray-800">{o.via_administracion}</p>
                      </div>
                    )}
                  </div>
                )}

                {o.indicaciones && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-sky-700 uppercase mb-1 flex items-center gap-1">
                      <Info size={12} /> Indicaciones
                    </p>
                    <p className="text-sm text-sky-900">{o.indicaciones}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Stethoscope size={12} className="text-sky-600" />
                    <span className="font-medium">{o.medico_nombre ?? 'Médico'}</span>
                    {o.medico_especialidad && <span className="text-gray-400">· {o.medico_especialidad}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Calendar size={12} />
                    {o.fecha_emision?.slice(0, 10) ?? '—'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
        <p>
          Sigue las indicaciones de tu médico. Si presentas reacciones adversas o tienes dudas sobre tu tratamiento,
          contacta al centro médico inmediatamente.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-1">{value || '—'}</p>
    </div>
  );
}
