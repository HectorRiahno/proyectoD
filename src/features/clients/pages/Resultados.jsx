import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart, ClipboardList, Calendar, Activity,
  Thermometer, Wind, Star, Paperclip, Download, Eye, FileText,
  Image as ImageIcon, Stethoscope, Loader2,
} from 'lucide-react';
import historialService from '../../../services/historialService';
import { adjuntoService } from '../../../services';
import { useMisAdjuntos } from '../../../hooks';
import {
  AdjuntoViewer,
  PageHeader, ErrorBanner, EmptyState, LoadingState,
  IconButton, ActionGroup,
} from '../../../shared/components/ui';

export default function Resultados() {
  const [signos, setSignos] = useState([]);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('examenes');

  const { adjuntos, loading: loadingAdj } = useMisAdjuntos();

  useEffect(() => {
    let mounted = true;
    Promise.all([
      historialService.getMisSignos(),
      historialService.getMisDiagnosticos(),
    ])
      .then(([s, d]) => {
        if (mounted) {
          setSignos(s);
          setDiagnosticos(d);
        }
      })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando resultados'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Resultados"
        descripcion="Exámenes, signos vitales y diagnósticos registrados"
        eyebrow="Resultados"
        icon={<ClipboardList size={11} strokeWidth={2.25} />}
        variant="sky"
      />

      <ErrorBanner msg={error} />

      {/* Tabs */}
      <div className="inline-flex p-1 rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] gap-1 w-full md:w-auto">
        <Tab activo={tab === 'examenes'} onClick={() => setTab('examenes')} icon={Paperclip}     label="Exámenes"      count={adjuntos.length} />
        <Tab activo={tab === 'signos'}   onClick={() => setTab('signos')}   icon={Heart}         label="Signos vitales" count={signos.length} />
        <Tab activo={tab === 'dx'}       onClick={() => setTab('dx')}       icon={ClipboardList} label="Diagnósticos"  count={diagnosticos.length} />
      </div>

      {tab === 'examenes' ? (
        <ExamenesAdjuntos adjuntos={adjuntos} loading={loadingAdj} />
      ) : loading ? (
        <LoadingState mensaje="Cargando resultados…" />
      ) : tab === 'signos' ? (
        <SignosVitales signos={signos} />
      ) : (
        <Diagnosticos diagnosticos={diagnosticos} />
      )}
    </div>
  );
}

// ─── Tab: Exámenes y archivos adjuntos ─────────────────────────────────────────
function ExamenesAdjuntos({ adjuntos, loading }) {
  const [visor, setVisor] = useState(null);
  const [descargandoId, setDescargandoId] = useState(null);

  const grupos = useMemo(() => {
    const map = new Map();
    for (const a of adjuntos) {
      const key = a.id_consulta;
      if (!map.has(key)) {
        map.set(key, {
          id_consulta:          a.id_consulta,
          fecha_consulta:       a.fecha_consulta,
          motivo_consulta:      a.motivo_consulta,
          impresion_diagnostica: a.impresion_diagnostica,
          medico_nombre:        a.medico_nombre,
          medico_especialidad:  a.medico_especialidad,
          archivos:             [],
        });
      }
      map.get(key).archivos.push(a);
    }
    return Array.from(map.values()).sort((a, b) =>
      String(b.fecha_consulta ?? '').localeCompare(String(a.fecha_consulta ?? ''))
    );
  }, [adjuntos]);

  const descargar = async (a) => {
    setDescargandoId(a.id_adjunto);
    try {
      await adjuntoService.descargar(a);
    } catch (err) {
      alert(`No se pudo descargar: ${err.message ?? err}`);
    } finally {
      setDescargandoId(null);
    }
  };

  if (loading) return <LoadingState mensaje="Cargando exámenes…" />;

  if (grupos.length === 0) {
    return (
      <EmptyState
        icon={Paperclip}
        titulo="No tienes resultados de exámenes"
        descripcion="Tu médico subirá aquí las radiografías, ecografías o resultados de laboratorio cuando estén disponibles."
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {grupos.map(g => (
          <article key={g.id_consulta} className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden">
            {/* Cabecera con info de la consulta */}
            <div className="relative px-5 py-4 bg-sky-50/40 border-b border-sky-100">
              <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-sky-500" />
              <div className="ml-2 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-sky-600 text-white shadow-[0_4px_14px_-6px_rgba(14,165,233,0.45)] flex-shrink-0">
                    <Stethoscope size={15} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold tracking-tight text-ink-900">
                      Consulta del {g.fecha_consulta?.slice(0, 10)}
                    </p>
                    {g.medico_nombre && (
                      <p className="text-[12px] text-ink-600 mt-0.5">
                        Dr(a). {g.medico_nombre}
                        {g.medico_especialidad && <span className="text-ink-500"> · {g.medico_especialidad}</span>}
                      </p>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md bg-white border border-sky-100 text-sky-700 font-medium flex-shrink-0">
                  <Paperclip size={11} strokeWidth={1.75} /> {g.archivos.length} archivo{g.archivos.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Motivo + diagnóstico */}
              <div className="ml-2 mt-3 space-y-1 text-[12.5px]">
                {g.motivo_consulta && (
                  <p className="text-ink-700"><span className="font-medium text-ink-900">Motivo:</span> {g.motivo_consulta}</p>
                )}
                {g.impresion_diagnostica && (
                  <p className="text-sky-800"><span className="font-medium">Diagnóstico:</span> {g.impresion_diagnostica}</p>
                )}
              </div>
            </div>

            {/* Lista de archivos */}
            <ul className="divide-y divide-line/70">
              {g.archivos.map(a => {
                const esImagen = a.tipo_mime?.startsWith('image/');
                return (
                  <li key={a.id_adjunto} className="px-5 py-3 flex items-center gap-3 hover:bg-surface/70 transition-colors">
                    <span className={`inline-flex w-9 h-9 items-center justify-center rounded-md flex-shrink-0 ${esImagen ? 'bg-violet-50 border border-violet-100 text-violet-700' : 'bg-rose-50 border border-rose-100 text-rose-700'}`}>
                      {esImagen
                        ? <ImageIcon size={14} strokeWidth={1.75} />
                        : <FileText size={14} strokeWidth={1.75} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink-900 truncate">{a.nombre_archivo}</p>
                      <p className="text-[11.5px] text-ink-500">
                        {(a.tamanio_bytes / 1024).toFixed(0)} KB · subido {a.fecha_subida?.slice(0, 10)}
                        {a.descripcion && <span> · {a.descripcion}</span>}
                      </p>
                    </div>
                    <ActionGroup>
                      <IconButton icon={Eye} tone="sky" title="Ver" onClick={() => setVisor(a)} />
                      <IconButton
                        icon={descargandoId === a.id_adjunto ? Loader2 : Download}
                        tone="emerald"
                        title="Descargar"
                        onClick={() => descargar(a)}
                        disabled={descargandoId === a.id_adjunto}
                        className={descargandoId === a.id_adjunto ? '[&_svg]:animate-spin' : ''}
                      />
                    </ActionGroup>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>

      {visor && <AdjuntoViewer adjunto={visor} onClose={() => setVisor(null)} />}
    </>
  );
}

function Tab({ activo, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-150',
        activo
          ? 'bg-sky-600 text-white shadow-[0_4px_14px_-6px_rgba(11,18,32,0.35)]'
          : 'text-ink-700 hover:bg-surface',
      ].join(' ')}
    >
      {Icon && <Icon size={13} strokeWidth={1.75} />}
      {label}
      {count != null && (
        <span className={activo ? 'text-white/70' : 'text-ink-500'}>({count})</span>
      )}
    </button>
  );
}

function SignosVitales({ signos }) {
  if (signos.length === 0) {
    return <EmptyState icon={Heart} titulo="No tienes signos vitales registrados" />;
  }

  return (
    <div className="space-y-4">
      {signos.map((s) => (
        <article key={s.id_signos} className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink-900 flex items-center gap-2">
              <Activity className="text-sky-600" size={15} strokeWidth={1.75} />
              Registro de signos vitales
            </h3>
            <p className="text-[11.5px] text-ink-500 flex items-center gap-1 tabular-nums">
              <Calendar size={11} strokeWidth={1.75} />
              {s.fecha_registro ? new Date(s.fecha_registro).toLocaleString('es-ES') : '—'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {(s.presion_sistolica || s.presion_diastolica) && (
              <Metric icon={Heart}      label="Presión arterial"   value={`${s.presion_sistolica ?? '—'}/${s.presion_diastolica ?? '—'}`} unit="mmHg" color="rose" />
            )}
            {s.frecuencia_cardiaca && (
              <Metric icon={Activity}   label="Frec. cardíaca"     value={s.frecuencia_cardiaca}     unit="bpm" color="rose" />
            )}
            {s.frecuencia_respiratoria && (
              <Metric icon={Wind}       label="Frec. respiratoria" value={s.frecuencia_respiratoria} unit="rpm" color="brand" />
            )}
            {s.temperatura && (
              <Metric icon={Thermometer} label="Temperatura"        value={s.temperatura}             unit="°C"  color="amber" />
            )}
            {s.saturacion_oxigeno && (
              <Metric label="SpO₂"   value={s.saturacion_oxigeno} unit="%"  color="sky" />
            )}
            {s.peso && (
              <Metric label="Peso"   value={s.peso}                unit="kg" color="violet" />
            )}
            {s.talla && (
              <Metric label="Talla"  value={s.talla}               unit="m"  color="indigo" />
            )}
          </div>

          {s.observaciones && (
            <div className="mt-4 rounded-lg border border-line bg-surface/60 px-3 py-2">
              <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">Observaciones</p>
              <p className="mt-0.5 text-[13px] text-ink-800">{s.observaciones}</p>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function Metric({ icon: Icon, label, value, unit, color = 'gray' }) {
  const colors = {
    rose:   { tint: 'bg-rose-50',    border: 'border-rose-100',    iconC: 'text-rose-600',    value: 'text-rose-900' },
    brand:  { tint: 'bg-brand-50',   border: 'border-brand-100',   iconC: 'text-brand-700',   value: 'text-brand-900' },
    amber:  { tint: 'bg-amber-50',   border: 'border-amber-100',   iconC: 'text-amber-700',   value: 'text-amber-900' },
    sky:    { tint: 'bg-sky-50',     border: 'border-sky-100',     iconC: 'text-sky-700',     value: 'text-sky-900' },
    violet: { tint: 'bg-violet-50',  border: 'border-violet-100',  iconC: 'text-violet-700',  value: 'text-violet-900' },
    indigo: { tint: 'bg-indigo-50',  border: 'border-indigo-100',  iconC: 'text-indigo-700',  value: 'text-indigo-900' },
    gray:   { tint: 'bg-surface',    border: 'border-line',        iconC: 'text-ink-500',     value: 'text-ink-900' },
  };
  const c = colors[color] ?? colors.gray;
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${c.tint} ${c.border}`}>
      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium opacity-80 flex items-center gap-1">
        {Icon && <Icon size={11} className={c.iconC} strokeWidth={2} />} {label}
      </p>
      <p className={`mt-1 text-[18px] font-semibold tabular-nums leading-none ${c.value}`}>
        {value} <span className="text-[11px] font-normal opacity-70">{unit}</span>
      </p>
    </div>
  );
}

function Diagnosticos({ diagnosticos }) {
  if (diagnosticos.length === 0) {
    return <EmptyState icon={ClipboardList} titulo="No tienes diagnósticos registrados" />;
  }

  return (
    <div className="space-y-3">
      {diagnosticos.map((d) => (
        <article key={d.id_diagnostico} className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] flex items-start gap-4 hover:border-ink-100 hover:shadow-[0_8px_24px_-14px_rgba(11,18,32,0.16)] transition-all duration-200">
          <span className="inline-flex w-11 h-11 items-center justify-center rounded-lg bg-sky-50 border border-sky-100 text-sky-700 flex-shrink-0">
            <ClipboardList size={17} strokeWidth={1.75} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {d.codigo_cie10 && (
                  <span className="font-mono text-[11px] bg-sky-50 text-sky-700 border border-sky-100 px-1.5 py-0.5 rounded-md font-medium">
                    {d.codigo_cie10}
                  </span>
                )}
                {d.es_principal && (
                  <span className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-md font-medium">
                    <Star size={10} className="fill-amber-500 text-amber-500" /> Principal
                  </span>
                )}
                {d.tipo_diagnostico && (
                  <span className="text-[11px] bg-surface text-ink-700 border border-line px-1.5 py-0.5 rounded-md font-medium">
                    {d.tipo_diagnostico}
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-ink-500 flex items-center gap-1 flex-shrink-0 tabular-nums">
                <Calendar size={11} strokeWidth={1.75} />
                {d.fecha?.slice(0, 10) ?? '—'}
              </p>
            </div>
            <p className="text-[13px] text-ink-800">{d.descripcion}</p>
            {d.medico_nombre && (
              <p className="text-[11.5px] text-ink-500 mt-1.5">Emitido por <span className="text-ink-700 font-medium">{d.medico_nombre}</span></p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
