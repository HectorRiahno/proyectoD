import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart, AlertCircle, Loader2, ClipboardList, Calendar, Activity,
  Thermometer, Wind, Star, Paperclip, Download, Eye, FileText,
  Image as ImageIcon, Stethoscope,
} from 'lucide-react';
import historialService from '../../../services/historialService';
import { adjuntoService } from '../../../services';
import { useMisAdjuntos } from '../../../hooks';
import { AdjuntoViewer } from '../../../shared/components/ui';

export default function Resultados() {
  const [signos, setSignos] = useState([]);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('examenes');

  // Adjuntos de exámenes (radiografías, PDFs de resultados) subidos por
  // el médico en sus consultas. Vienen de vw_paciente_mis_adjuntos.
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
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Resultados</h1>
            <p className="text-sky-100">Exámenes, signos vitales y diagnósticos registrados</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md p-2 border border-gray-100 flex gap-2">
        <Tab activo={tab === 'examenes'} onClick={() => setTab('examenes')} icon={<Paperclip size={16} />} label={`Exámenes (${adjuntos.length})`} />
        <Tab activo={tab === 'signos'}   onClick={() => setTab('signos')}   icon={<Heart size={16} />} label={`Signos vitales (${signos.length})`} />
        <Tab activo={tab === 'dx'}       onClick={() => setTab('dx')}       icon={<ClipboardList size={16} />} label={`Diagnósticos (${diagnosticos.length})`} />
      </div>

      {tab === 'examenes' ? (
        <ExamenesAdjuntos adjuntos={adjuntos} loading={loadingAdj} />
      ) : loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-sky-600" />
          <p className="text-gray-500">Cargando resultados...</p>
        </div>
      ) : tab === 'signos' ? (
        <SignosVitales signos={signos} />
      ) : (
        <Diagnosticos diagnosticos={diagnosticos} />
      )}
    </div>
  );
}

// ─── Tab: Exámenes y archivos adjuntos ─────────────────────────────────────────
// Agrupa los adjuntos por consulta para que el paciente vea el contexto:
// fecha, médico, motivo, diagnóstico y la lista de archivos descargables.
function ExamenesAdjuntos({ adjuntos, loading }) {
  const [visor, setVisor] = useState(null);
  const [descargandoId, setDescargandoId] = useState(null);

  // Agrupar por id_consulta — cada consulta puede tener varios archivos
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
        <Loader2 size={32} className="mx-auto mb-2 animate-spin text-sky-600" />
        <p className="text-gray-500">Cargando exámenes...</p>
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
        <Paperclip size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-700 font-medium">No tienes resultados de exámenes</p>
        <p className="text-xs text-gray-500 mt-1">
          Tu médico subirá aquí las radiografías, ecografías o resultados de
          laboratorio cuando estén disponibles.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {grupos.map(g => (
          <div key={g.id_consulta} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            {/* Cabecera con info de la consulta */}
            <div className="bg-gradient-to-r from-sky-50 to-cyan-50 border-b border-sky-100 px-5 py-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="bg-sky-600 rounded-lg p-2 flex-shrink-0">
                    <Stethoscope size={16} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm">
                      Consulta del {g.fecha_consulta?.slice(0, 10)}
                    </p>
                    {g.medico_nombre && (
                      <p className="text-xs text-gray-600">
                        Dr(a). {g.medico_nombre}
                        {g.medico_especialidad && <span className="text-gray-400"> · {g.medico_especialidad}</span>}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-sky-100 text-sky-700 flex items-center gap-1 flex-shrink-0">
                  <Paperclip size={11} /> {g.archivos.length} archivo{g.archivos.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Motivo + diagnóstico — contexto clínico */}
              <div className="mt-3 space-y-1.5 text-sm">
                {g.motivo_consulta && (
                  <p className="text-gray-700"><span className="font-semibold">Motivo:</span> {g.motivo_consulta}</p>
                )}
                {g.impresion_diagnostica && (
                  <p className="text-sky-800"><span className="font-semibold">Diagnóstico:</span> {g.impresion_diagnostica}</p>
                )}
              </div>
            </div>

            {/* Lista de archivos */}
            <div className="divide-y divide-gray-100">
              {g.archivos.map(a => {
                const esImagen = a.tipo_mime?.startsWith('image/');
                return (
                  <div key={a.id_adjunto} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition">
                    <div className={`rounded-lg p-2 flex-shrink-0 ${esImagen ? 'bg-purple-100' : 'bg-red-100'}`}>
                      {esImagen
                        ? <ImageIcon size={16} className="text-purple-700" />
                        : <FileText size={16} className="text-red-700" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.nombre_archivo}</p>
                      <p className="text-xs text-gray-500">
                        {(a.tamanio_bytes / 1024).toFixed(0)} KB · subido {a.fecha_subida?.slice(0, 10)}
                        {a.descripcion && <span> · {a.descripcion}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => setVisor(a)}
                      title="Ver"
                      className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition flex-shrink-0"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => descargar(a)}
                      disabled={descargandoId === a.id_adjunto}
                      title="Descargar"
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition flex-shrink-0 disabled:opacity-50"
                    >
                      {descargandoId === a.id_adjunto
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Download size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {visor && <AdjuntoViewer adjunto={visor} onClose={() => setVisor(null)} />}
    </>
  );
}

function Tab({ activo, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
        activo ? 'bg-sky-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SignosVitales({ signos }) {
  if (signos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
        <Heart size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No tienes signos vitales registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {signos.map((s) => (
        <div key={s.id_signos} className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Activity className="text-sky-600" size={18} />
              Registro de signos vitales
            </h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar size={12} />
              {s.fecha_registro ? new Date(s.fecha_registro).toLocaleString('es-ES') : '—'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(s.presion_sistolica || s.presion_diastolica) && (
              <Metric
                icon={<Heart size={16} className="text-red-500" />}
                label="Presión arterial"
                value={`${s.presion_sistolica ?? '—'}/${s.presion_diastolica ?? '—'}`}
                unit="mmHg"
                color="red"
              />
            )}
            {s.frecuencia_cardiaca && (
              <Metric
                icon={<Activity size={16} className="text-pink-500" />}
                label="Frec. cardíaca"
                value={s.frecuencia_cardiaca}
                unit="bpm"
                color="pink"
              />
            )}
            {s.frecuencia_respiratoria && (
              <Metric
                icon={<Wind size={16} className="text-blue-500" />}
                label="Frec. respiratoria"
                value={s.frecuencia_respiratoria}
                unit="rpm"
                color="blue"
              />
            )}
            {s.temperatura && (
              <Metric
                icon={<Thermometer size={16} className="text-orange-500" />}
                label="Temperatura"
                value={s.temperatura}
                unit="°C"
                color="orange"
              />
            )}
            {s.saturacion_oxigeno && (
              <Metric label="SpO₂"   value={s.saturacion_oxigeno} unit="%"  color="cyan" />
            )}
            {s.peso && (
              <Metric label="Peso"   value={s.peso}                 unit="kg" color="purple" />
            )}
            {s.talla && (
              <Metric label="Talla"  value={s.talla}                unit="m"  color="indigo" />
            )}
          </div>

          {s.observaciones && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Observaciones</p>
              <p className="text-sm text-gray-800">{s.observaciones}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Metric({ icon, label, value, unit, color = 'gray' }) {
  const colors = {
    red:    'bg-red-50 border-red-200 text-red-900',
    pink:   'bg-pink-50 border-pink-200 text-pink-900',
    blue:   'bg-blue-50 border-blue-200 text-blue-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    cyan:   'bg-cyan-50 border-cyan-200 text-cyan-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    gray:   'bg-gray-50 border-gray-200 text-gray-900',
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-80 mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-xl font-bold">
        {value} <span className="text-xs font-normal opacity-70">{unit}</span>
      </p>
    </div>
  );
}

function Diagnosticos({ diagnosticos }) {
  if (diagnosticos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
        <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No tienes diagnósticos registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {diagnosticos.map((d) => (
        <div key={d.id_diagnostico} className="bg-white rounded-xl shadow-md border border-gray-100 p-5 flex items-start gap-4">
          <div className="bg-sky-100 rounded-lg p-3 flex-shrink-0">
            <ClipboardList size={20} className="text-sky-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {d.codigo_cie10 && (
                  <span className="font-mono text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded">
                    {d.codigo_cie10}
                  </span>
                )}
                {d.es_principal && (
                  <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded font-medium">
                    <Star size={10} className="fill-yellow-500" /> Principal
                  </span>
                )}
                {d.tipo_diagnostico && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {d.tipo_diagnostico}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 flex-shrink-0">
                <Calendar size={12} />
                {d.fecha?.slice(0, 10) ?? '—'}
              </p>
            </div>
            <p className="text-sm text-gray-800 mb-2">{d.descripcion}</p>
            {d.medico_nombre && (
              <p className="text-xs text-gray-500">Emitido por {d.medico_nombre}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
