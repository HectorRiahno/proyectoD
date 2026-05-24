import React, { useState } from 'react';
import {
  FileText, Calendar, AlertCircle, Loader2, Stethoscope, ClipboardList,
  Download, FileDown, Paperclip,
} from 'lucide-react';
import historialService from '../../../services/historialService';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { useMisAdjuntos } from '../../../hooks';
import { generarPdfHistorialCliente, adjuntoService } from '../../../services';
import { AdjuntoList, AdjuntoViewer } from '../../../shared/components/ui';

export default function MiHistorial() {
  const { data: consultas, loading, error } = useAsyncResource(
    () => historialService.getMiHistorial(),
    [],
    { initialData: [] },
  );
  const { adjuntos: adjuntosTodos } = useMisAdjuntos();
  const [selected, setSelected] = useState(null);
  const [visor, setVisor]       = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError]       = useState('');

  // Adjuntos agrupados por id_consulta para mostrar dentro del detalle
  const adjuntosPorConsulta = adjuntosTodos.reduce((acc, a) => {
    (acc[a.id_consulta] ??= []).push(a);
    return acc;
  }, {});

  const descargarPdfCompleto = async () => {
    setDownloading(true);
    setPdfError('');
    try {
      await generarPdfHistorialCliente();
    } catch (err) {
      setPdfError(err.message ?? 'No se pudo generar el PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mi historia clínica</h1>
            <p className="text-sky-100">Registro de todas tus consultas médicas</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-sm text-sky-100 mb-1">Consultas</p>
              <p className="text-4xl font-bold">{loading ? '···' : consultas.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-sky-100 mb-1">Adjuntos</p>
              <p className="text-4xl font-bold">{adjuntosTodos.length}</p>
            </div>
            <button
              onClick={descargarPdfCompleto}
              disabled={downloading || loading}
              className="flex items-center gap-2 px-5 py-3 bg-white text-sky-700 rounded-xl font-semibold shadow-lg hover:bg-sky-50 transition disabled:opacity-60"
              title="Descarga un PDF con toda tu historia clínica"
            >
              {downloading
                ? <><Loader2 size={18} className="animate-spin" /> Generando...</>
                : <><FileDown size={18} /> Descargar PDF completo</>}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}
      {pdfError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {pdfError}
        </div>
      )}

      {/* Panel resumen de adjuntos — accesible aún sin abrir consulta */}
      {!loading && adjuntosTodos.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip size={18} className="text-sky-600" />
            <h2 className="font-bold text-gray-900">Mis documentos adjuntos</h2>
            <span className="text-xs text-gray-500">
              ({adjuntosTodos.length}) — resultados de laboratorio, radiografías, etc.
            </span>
          </div>
          <AdjuntoList
            adjuntos={adjuntosTodos}
            onPreview={setVisor}
            emptyMessage="Sin documentos adjuntos."
          />
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
          {consultas.map((c, idx) => {
            const adjuntos = adjuntosPorConsulta[c.id_consulta] ?? [];
            return (
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
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {adjuntos.length > 0 && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium flex items-center gap-1"
                            title={`${adjuntos.length} archivo(s) adjunto(s)`}
                          >
                            <Paperclip size={11} /> {adjuntos.length}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {c.fecha_consulta?.slice(0, 10)}
                        </p>
                      </div>
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
            );
          })}
        </div>
      )}

      {selected && (
        <DetalleConsulta
          consulta={selected}
          adjuntos={adjuntosPorConsulta[selected.id_consulta] ?? []}
          onPreviewAdjunto={setVisor}
          onClose={() => setSelected(null)}
        />
      )}

      {visor && <AdjuntoViewer adjunto={visor} onClose={() => setVisor(null)} />}
    </div>
  );
}

function DetalleConsulta({ consulta, adjuntos, onPreviewAdjunto, onClose }) {
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

          {/* Adjuntos de esta consulta */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs font-bold uppercase text-gray-600 mb-3 flex items-center gap-1">
              <Paperclip size={12} /> Archivos adjuntos ({adjuntos.length})
            </p>
            <AdjuntoList
              adjuntos={adjuntos}
              onPreview={onPreviewAdjunto}
              emptyMessage="Esta consulta no tiene archivos adjuntos."
            />
          </div>
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
