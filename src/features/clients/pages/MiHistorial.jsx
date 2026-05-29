import React, { useState } from 'react';
import {
  FileText, Calendar, Stethoscope, ClipboardList,
  FileDown, Paperclip, Loader2, X,
} from 'lucide-react';
import historialService from '../../../services/historialService';
import { useAsyncResource } from '../../../hooks/useAsyncResource';
import { useMisAdjuntos } from '../../../hooks';
import { generarPdfHistorialCliente } from '../../../services';
import {
  AdjuntoList, AdjuntoViewer,
  PageHeader, KPI, ErrorBanner, EmptyState, LoadingState,
} from '../../../shared/components/ui';

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
      <PageHeader
        titulo="Mi historia clínica"
        descripcion="Registro de todas tus consultas médicas"
        eyebrow="Historial"
        icon={<FileText size={11} strokeWidth={2.25} />}
        variant="sky"
      >
        <KPI label="Consultas" value={loading ? '···' : consultas.length} color="text-sky-700" />
        <KPI label="Adjuntos"  value={adjuntosTodos.length} color="text-violet-700" />
        <button
          onClick={descargarPdfCompleto}
          disabled={downloading || loading}
          className="ml-2 self-center inline-flex items-center gap-2 px-3.5 py-2 bg-ink-900 hover:bg-ink-800 text-white rounded-xl text-[12.5px] font-medium shadow-[0_4px_14px_-6px_rgba(11,18,32,0.45)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60"
          title="Descarga un PDF con toda tu historia clínica"
        >
          {downloading
            ? <><Loader2 size={13} className="animate-spin" /> Generando…</>
            : <><FileDown size={13} strokeWidth={1.75} /> Descargar PDF</>}
        </button>
      </PageHeader>

      <ErrorBanner msg={error} />
      <ErrorBanner msg={pdfError} onDismiss={() => setPdfError('')} />

      {/* Panel resumen de adjuntos */}
      {!loading && adjuntosTodos.length > 0 && (
        <section className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip size={15} className="text-sky-600" strokeWidth={1.75} />
            <h2 className="text-[14px] font-semibold tracking-tight text-ink-900">Mis documentos adjuntos</h2>
            <span className="text-[11.5px] text-ink-500">
              ({adjuntosTodos.length}) — resultados de laboratorio, radiografías, etc.
            </span>
          </div>
          <AdjuntoList
            adjuntos={adjuntosTodos}
            onPreview={setVisor}
            emptyMessage="Sin documentos adjuntos."
          />
        </section>
      )}

      {loading ? (
        <LoadingState mensaje="Cargando historial…" />
      ) : consultas.length === 0 ? (
        <EmptyState icon={FileText} titulo="Aún no tienes consultas registradas" />
      ) : (
        <div className="space-y-3">
          {consultas.map((c, idx) => {
            const adjuntos = adjuntosPorConsulta[c.id_consulta] ?? [];
            return (
              <button
                key={c.id_consulta}
                onClick={() => setSelected(c)}
                className="group w-full text-left rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:border-ink-100 hover:shadow-[0_8px_28px_-14px_rgba(11,18,32,0.18)] transition-all duration-200 relative"
              >
                {idx < consultas.length - 1 && (
                  <div className="absolute left-7 top-16 w-px h-full bg-line" aria-hidden="true" />
                )}
                <div className="flex items-start gap-4">
                  <span className="inline-flex w-11 h-11 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-[0_4px_14px_-6px_rgba(14,165,233,0.45)] flex-shrink-0">
                    <ClipboardList size={17} strokeWidth={1.75} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold tracking-tight text-ink-900">
                          {c.medico_nombre ?? 'Consulta médica'}
                        </p>
                        <p className="text-[11.5px] text-ink-500">
                          {c.medico_especialidad ?? 'Consulta general'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {adjuntos.length > 0 && (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 font-medium"
                            title={`${adjuntos.length} archivo(s) adjunto(s)`}
                          >
                            <Paperclip size={10} strokeWidth={1.75} /> {adjuntos.length}
                          </span>
                        )}
                        <p className="text-[11.5px] text-ink-500 flex items-center gap-1 tabular-nums">
                          <Calendar size={11} strokeWidth={1.75} />
                          {c.fecha_consulta?.slice(0, 10)}
                        </p>
                      </div>
                    </div>

                    {c.motivo_consulta && (
                      <p className="text-[12.5px] text-ink-700 line-clamp-2 mb-1">
                        <span className="font-medium text-ink-900">Motivo: </span>
                        {c.motivo_consulta}
                      </p>
                    )}
                    {c.impresion_diagnostica && (
                      <p className="text-[12.5px] text-sky-700 line-clamp-1">
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
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 motion-safe:[animation:hp-fade-up_0.2s_ease-out]">
      <div className="relative bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] border border-line w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex justify-between items-start gap-4 z-10">
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-sky-500" />
          <div className="ml-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">Consulta médica</h2>
            <p className="text-[12px] text-ink-500 mt-0.5 flex items-center gap-1.5">
              <Stethoscope size={11} strokeWidth={1.75} className="text-sky-600" />
              {consulta.medico_nombre} · {consulta.fecha_consulta?.slice(0, 10)}
            </p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 -mt-0.5 -mr-1 text-ink-300 hover:text-ink-900 hover:bg-surface p-1.5 rounded-lg transition-colors">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto">
          <Seccion titulo="Motivo de consulta"    contenido={consulta.motivo_consulta} />
          <Seccion titulo="Impresión diagnóstica" contenido={consulta.impresion_diagnostica} highlight />
          <Seccion titulo="Plan de tratamiento"   contenido={consulta.plan_tratamiento} />
          <Seccion titulo="Observaciones"         contenido={consulta.observaciones} />

          {!consulta.motivo_consulta && !consulta.impresion_diagnostica && !consulta.plan_tratamiento && !consulta.observaciones && (
            <p className="text-center text-[13px] text-ink-500 py-8">No hay detalles adicionales de esta consulta.</p>
          )}

          <div className="pt-3 border-t border-line">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500 mb-3 flex items-center gap-1.5">
              <Paperclip size={11} strokeWidth={1.75} /> Archivos adjuntos ({adjuntos.length})
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
    <div className={`rounded-lg border p-3.5 ${highlight ? 'bg-sky-50/60 border-sky-100' : 'bg-surface/60 border-line'}`}>
      <p className={`text-[10.5px] font-medium uppercase tracking-[0.12em] mb-1.5 ${highlight ? 'text-sky-700' : 'text-ink-500'}`}>
        {titulo}
      </p>
      <p className="text-[13px] text-ink-800 whitespace-pre-wrap">{contenido}</p>
    </div>
  );
}
