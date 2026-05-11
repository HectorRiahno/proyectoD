import React, { useState, useEffect } from 'react';
import { FileText, Calendar, AlertCircle, Loader2, Stethoscope, ClipboardList } from 'lucide-react';
import historialService from '../../../services/historialService';

export default function MiHistorial() {
  const [consultas, setConsultas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    historialService.getMiHistorial()
      .then((data) => { if (mounted) setConsultas(data); })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando historial'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mi historia clínica</h1>
            <p className="text-sky-100">Registro de todas tus consultas médicas</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-sky-100 mb-1">Consultas</p>
            <p className="text-4xl font-bold">{loading ? '···' : consultas.length}</p>
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
          <p className="text-gray-500">Cargando historial...</p>
        </div>
      ) : consultas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Aún no tienes consultas registradas</p>
        </div>
      ) : (
        /* Timeline */
        <div className="space-y-4">
          {consultas.map((c, idx) => (
            <button
              key={c.id_consulta}
              onClick={() => setSelected(c)}
              className="w-full text-left bg-white rounded-xl shadow-md hover:shadow-lg transition p-5 border border-gray-100 relative"
            >
              {idx < consultas.length - 1 && (
                <div className="absolute left-7 top-16 w-0.5 h-full bg-sky-100" aria-hidden="true" />
              )}
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-sky-500 to-cyan-600 rounded-full p-3 shadow-md flex-shrink-0">
                  <ClipboardList size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900">
                        {c.medico_nombre ?? 'Consulta médica'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.medico_especialidad ?? 'Consulta general'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                      <Calendar size={12} />
                      {c.fecha_consulta?.slice(0, 10)}
                    </p>
                  </div>

                  {c.motivo_consulta && (
                    <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                      <span className="font-medium text-gray-900">Motivo: </span>
                      {c.motivo_consulta}
                    </p>
                  )}
                  {c.impresion_diagnostica && (
                    <p className="text-sm text-sky-700 line-clamp-1">
                      <span className="font-medium">Diagnóstico: </span>
                      {c.impresion_diagnostica}
                    </p>
                  )}
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
        <div className="sticky top-0 bg-gradient-to-r from-sky-600 to-cyan-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Consulta médica</h2>
            <p className="text-sky-100 text-sm flex items-center gap-2">
              <Stethoscope size={12} />
              {consulta.medico_nombre} · {consulta.fecha_consulta?.slice(0, 10)}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <Seccion titulo="Motivo de consulta" contenido={consulta.motivo_consulta} />
          <Seccion titulo="Impresión diagnóstica" contenido={consulta.impresion_diagnostica} highlight />
          <Seccion titulo="Plan de tratamiento" contenido={consulta.plan_tratamiento} />
          <Seccion titulo="Observaciones" contenido={consulta.observaciones} />

          {!consulta.motivo_consulta && !consulta.impresion_diagnostica && !consulta.plan_tratamiento && !consulta.observaciones && (
            <p className="text-center text-gray-500 py-8">No hay detalles adicionales de esta consulta.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, contenido, highlight = false }) {
  if (!contenido) return null;
  return (
    <div className={`rounded-lg p-4 ${highlight ? 'bg-sky-50 border border-sky-200' : 'bg-gray-50'}`}>
      <p className={`text-xs font-bold uppercase mb-2 ${highlight ? 'text-sky-700' : 'text-gray-600'}`}>
        {titulo}
      </p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{contenido}</p>
    </div>
  );
}
