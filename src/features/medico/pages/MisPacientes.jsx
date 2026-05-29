import React, { useState, useEffect } from 'react';
import {
  Users, Eye, AlertCircle, Phone, Mail,
  Heart, FileText, ClipboardList, Activity, Pill, X,
  Calendar, ChevronDown, ChevronUp, ChevronRight, Stethoscope, Paperclip,
  BookOpen, Brain, FlaskConical, Star,
} from 'lucide-react';
import { consultaService, ordenExamenService } from '../../../services';
import { useMisPacientesMedico, useAdjuntosPacienteMedico } from '../../../hooks';
import {
  AdjuntoListPorConsulta, AdjuntoViewer,
  PageHeader, KPI, ErrorBanner, SearchBar,
  EmptyState, LoadingState, Avatar,
} from '../../../shared/components/ui';

export default function MisPacientes() {
  const { pacientes, loading, error } = useMisPacientesMedico();
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [historial, setHistorial] = useState(null);

  const filtered = pacientes.filter((p) => {
    const term = search.toLowerCase();
    return (
      (p.nombre_completo ?? '').toLowerCase().includes(term) ||
      (p.documento ?? '').includes(search) ||
      (p.numero_historia ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Mis pacientes"
        descripcion="Pacientes que has atendido"
        eyebrow="Pacientes"
        icon={<Users size={11} strokeWidth={2.25} />}
        variant="emerald"
      >
        <KPI label="Total" value={loading ? '···' : pacientes.length} />
      </PageHeader>

      <ErrorBanner msg={error} />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre, documento o número de historia…"
      />

      {loading ? (
        <LoadingState mensaje="Cargando pacientes…" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} titulo="No tienes pacientes registrados aún" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <article
              key={p.id_paciente}
              className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:border-ink-100 hover:shadow-[0_8px_28px_-14px_rgba(11,18,32,0.18)] transition-all duration-200"
            >
              <div className="flex items-start gap-3 mb-4">
                <Avatar name={p.nombre_completo} tone="emerald" size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold tracking-tight text-ink-900 truncate">{p.nombre_completo}</p>
                  <p className="text-[11.5px] text-ink-500 font-mono">{p.documento}</p>
                  <p className="text-[11.5px] text-emerald-700 font-medium mt-1">HC {p.numero_historia}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-[12.5px] mb-4">
                {p.edad != null && (
                  <p className="text-ink-700">Edad: <span className="font-medium text-ink-900">{p.edad} años</span></p>
                )}
                {p.tipo_sangre && (
                  <p className="text-ink-700 flex items-center gap-2">
                    <Heart size={11} className="text-rose-500" strokeWidth={2} /> {p.tipo_sangre}
                  </p>
                )}
                {p.ultima_cita_conmigo && (
                  <p className="text-[11.5px] text-ink-500 pt-2 border-t border-line/70 mt-2">
                    Última visita: {new Date(p.ultima_cita_conmigo).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-3 border-t border-line">
                <button
                  onClick={() => setSelected(p)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg transition-colors"
                >
                  <Eye size={13} strokeWidth={1.75} /> Perfil
                </button>
                <button
                  onClick={() => setHistorial(p)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 rounded-lg transition-colors"
                >
                  <ClipboardList size={13} strokeWidth={1.75} /> Historial
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected  && <DetallePaciente paciente={selected}  onClose={() => setSelected(null)} />}
      {historial && <ModalHistorial  paciente={historial} onClose={() => setHistorial(null)} />}
    </div>
  );
}

function DetallePaciente({ paciente, onClose }) {
  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 motion-safe:[animation:hp-fade-up_0.2s_ease-out]">
      <div className="relative bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] border border-line w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex justify-between items-start gap-4 z-10">
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-emerald-500" />
          <div className="flex items-start gap-3 ml-2">
            <Avatar name={paciente.nombre_completo} tone="emerald" size="md" />
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">{paciente.nombre_completo}</h2>
              <p className="text-[12px] text-emerald-700 font-mono mt-0.5">HC {paciente.numero_historia}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 -mt-0.5 -mr-1 text-ink-300 hover:text-ink-900 hover:bg-surface p-1.5 rounded-lg transition-colors">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2.5">
            <InfoP label="Documento"           value={paciente.documento} />
            <InfoP label="Edad"                value={paciente.edad ? `${paciente.edad} años` : '—'} />
            <InfoP label="Tipo de sangre"      value={paciente.tipo_sangre} icon={<Heart size={11} className="text-rose-500" strokeWidth={2} />} />
            <InfoP label="Fecha de nacimiento" value={paciente.fecha_nacimiento} />
            <InfoP label="Email"               value={paciente.email}    icon={<Mail size={11} />} className="col-span-2" />
            <InfoP label="Teléfono"            value={paciente.telefono} icon={<Phone size={11} />} />
            <InfoP label="Estado civil"        value={paciente.estado_civil} />
            <InfoP label="Ocupación"           value={paciente.ocupacion} className="col-span-2" />
            <InfoP label="Contacto emergencia" value={paciente.contacto_emergencia} className="col-span-2" />
          </div>

          {paciente.alergias && (
            <div className="flex items-start gap-2.5 text-[13px] text-rose-800 bg-rose-50/70 border-l-2 border-rose-500 pl-3 pr-3 py-2.5 rounded-r-md">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-600" strokeWidth={2} />
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-rose-700">Alergias</p>
                <p className="text-[13px] text-rose-900 mt-0.5">{paciente.alergias}</p>
              </div>
            </div>
          )}

          {paciente.ultima_cita_conmigo && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 flex items-center gap-3">
              <FileText size={16} className="text-emerald-600" strokeWidth={1.75} />
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.10em] text-emerald-700">Última visita conmigo</p>
                <p className="text-[13px] text-emerald-900">
                  {new Date(paciente.ultima_cita_conmigo).toLocaleDateString('es-ES', { dateStyle: 'long' })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoP({ label, value, icon, className = '' }) {
  return (
    <div className={`rounded-lg border border-line bg-surface/60 px-3 py-2 ${className}`}>
      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="mt-0.5 text-[13.5px] font-medium text-ink-900 break-words">{value || <span className="text-ink-300 font-normal">—</span>}</p>
    </div>
  );
}

// ─── Modal de historial clínico completo ───────────────────────────────────────
function ModalHistorial({ paciente, onClose }) {
  const [consultas, setConsultas]         = useState([]);
  const [signos, setSignos]               = useState([]);
  const [diagnosticos, setDiag]           = useState([]);
  const [ordenes, setOrdenes]             = useState([]);
  const [ordenesExamen, setOrdenesExamen] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [abierto, setAbierto]             = useState({
    consultas: true, signos: false, diagnosticos: false, recetas: false, adjuntos: false,
  });
  const [visorAdjunto, setVisorAdjunto] = useState(null);

  // Consulta seleccionada para ver TODO su contenido en un modal aparte.
  // El médico hace clic en una tarjeta de consulta del acordeón y se le
  // muestran todos los campos clínicos + signos/dx/recetas/exámenes asociados.
  const [consultaDetalle, setConsultaDetalle] = useState(null);

  const { adjuntos: adjuntosPaciente } = useAdjuntosPacienteMedico(paciente.id_paciente);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [c, s, d, o, oe] = await Promise.all([
          consultaService.getConsultasPacienteFichaMedico(paciente.id_paciente),
          consultaService.getSignosPacienteRecientes(paciente.id_paciente, 10),
          consultaService.getDiagnosticosPaciente(paciente.id_paciente),
          consultaService.getOrdenesPaciente(paciente.id_paciente),
          // Órdenes de exámenes del paciente — si la migración no se aplicó
          // todavía, caemos en []. silencioso.
          ordenExamenService.getPorPaciente(paciente.id_paciente).catch(() => []),
        ]);
        setConsultas(c ?? []);
        setSignos(s ?? []);
        setDiag(d ?? []);
        setOrdenes(o ?? []);
        setOrdenesExamen(oe ?? []);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [paciente.id_paciente]);

  const toggle = (key) => setAbierto(p => ({ ...p, [key]: !p[key] }));

  const secciones = [
    { key: 'consultas',    label: `Consultas (${consultas.length})`,       icon: Stethoscope },
    { key: 'diagnosticos', label: `Diagnósticos (${diagnosticos.length})`, icon: ClipboardList },
    { key: 'recetas',      label: `Recetas (${ordenes.length})`,           icon: Pill },
    { key: 'signos',       label: `Signos vitales (${signos.length})`,     icon: Activity },
    { key: 'adjuntos',     label: `Adjuntos (${adjuntosPaciente.length})`, icon: Paperclip },
  ];

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 motion-safe:[animation:hp-fade-up_0.2s_ease-out]">
      <div className="relative bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] border border-line w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex justify-between items-start gap-4 z-10">
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-brand-500" />
          <div className="ml-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">Historia clínica</h2>
            <p className="text-[12px] text-ink-500 mt-0.5">
              {paciente.nombre_completo} · <span className="font-mono text-brand-700">HC {paciente.numero_historia}</span>
            </p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 -mt-0.5 -mr-1 text-ink-300 hover:text-ink-900 hover:bg-surface p-1.5 rounded-lg transition-colors">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto">
          {/* Resumen del paciente */}
          <div className="grid grid-cols-4 gap-2.5">
            <ResumenCard label="Edad"         value={`${paciente.edad ?? '—'} ${paciente.edad ? 'años' : ''}`} />
            <ResumenCard label="Sangre"       value={paciente.tipo_sangre ?? '—'} tono="rose" />
            <ResumenCard label="Consultas"    value={consultas.length} />
            <ResumenCard label="Diagnósticos" value={diagnosticos.length} />
          </div>

          {paciente.alergias && (
            <div className="flex items-start gap-2.5 text-[13px] text-rose-800 bg-rose-50/70 border-l-2 border-rose-500 pl-3 pr-3 py-2.5 rounded-r-md">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-rose-600" strokeWidth={2} />
              <p><strong className="font-medium">Alergias:</strong> {paciente.alergias}</p>
            </div>
          )}

          {loading ? (
            <LoadingState mensaje="Cargando historial…" />
          ) : (
            <>
              {secciones.map(({ key, label, icon: Ico }) => (
                <div key={key} className="border border-line rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggle(key)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-ink-100/40 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink-900">
                      {Ico && <Ico size={14} strokeWidth={1.75} className="text-brand-600" />}
                      {label}
                    </span>
                    {abierto[key]
                      ? <ChevronUp   size={15} className="text-ink-500" strokeWidth={1.75} />
                      : <ChevronDown size={15} className="text-ink-500" strokeWidth={1.75} />}
                  </button>

                  {abierto[key] && (
                    <div className="p-4 space-y-2.5 bg-white">
                      {/* Consultas */}
                      {key === 'consultas' && (
                        consultas.length === 0 ? <p className="text-[12.5px] text-ink-500">Sin consultas registradas.</p> :
                        consultas.map(c => (
                          <button
                            key={c.id_consulta}
                            type="button"
                            onClick={() => setConsultaDetalle(c)}
                            title="Ver todo el contenido de esta consulta"
                            className="group w-full text-left rounded-lg border border-brand-100 bg-brand-50/40 hover:border-brand-300 hover:bg-brand-50 px-3.5 py-3 transition-all duration-150"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-brand-700 font-medium flex items-center gap-1 mb-1.5">
                                  <Calendar size={11} strokeWidth={1.75} /> {c.fecha_consulta?.slice(0, 10)}
                                </p>
                                {c.motivo_consulta && (
                                  <p className="text-[13px] text-ink-800 mb-1 line-clamp-1">
                                    <strong className="font-medium">Motivo:</strong> {c.motivo_consulta}
                                  </p>
                                )}
                                {c.impresion_diagnostica && (
                                  <p className="text-[13px] text-emerald-800 mb-1 line-clamp-1">
                                    <strong className="font-medium">Diagnóstico:</strong> {c.impresion_diagnostica}
                                  </p>
                                )}
                                {c.plan_tratamiento && (
                                  <p className="text-[12.5px] text-ink-600 line-clamp-1">
                                    <strong className="font-medium">Plan:</strong> {c.plan_tratamiento}
                                  </p>
                                )}
                              </div>
                              <ChevronRight
                                size={14}
                                strokeWidth={1.75}
                                className="flex-shrink-0 text-ink-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all duration-150 mt-0.5"
                              />
                            </div>
                          </button>
                        ))
                      )}

                      {/* Diagnósticos */}
                      {key === 'diagnosticos' && (
                        diagnosticos.length === 0 ? <p className="text-[12.5px] text-ink-500">Sin diagnósticos.</p> :
                        diagnosticos.map(d => (
                          <div key={d.id_diagnostico} className="flex items-start gap-3 px-3 py-2.5 bg-surface border border-line rounded-lg">
                            {d.es_principal && <span className="text-[10.5px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">Principal</span>}
                            {d.codigo_cie10 && <span className="text-[10.5px] font-mono bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded whitespace-nowrap">{d.codigo_cie10}</span>}
                            <p className="text-[12.5px] text-ink-800 flex-1">{d.descripcion}</p>
                            <p className="text-[11px] text-ink-500">{d.fecha?.slice(0, 10)}</p>
                          </div>
                        ))
                      )}

                      {/* Recetas */}
                      {key === 'recetas' && (
                        ordenes.length === 0 ? <p className="text-[12.5px] text-ink-500">Sin recetas.</p> :
                        ordenes.map(o => (
                          <div key={o.id_orden} className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-3.5 py-3">
                            <p className="text-[13.5px] font-medium text-ink-900">{o.medicamento?.nombre ?? '—'}</p>
                            <p className="text-[11.5px] text-ink-500">{o.medicamento?.presentacion}</p>
                            <p className="text-[12.5px] text-ink-700 mt-1">
                              {o.dosis && `${o.dosis} · `}{o.frecuencia && `${o.frecuencia} · `}{o.duracion}
                            </p>
                            {o.indicaciones && <p className="text-[11.5px] text-ink-500 mt-1">{o.indicaciones}</p>}
                          </div>
                        ))
                      )}

                      {/* Signos vitales */}
                      {key === 'signos' && (
                        signos.length === 0 ? <p className="text-[12.5px] text-ink-500">Sin signos registrados.</p> :
                        signos.map(s => (
                          <div key={s.id_signos} className="rounded-lg border border-line bg-surface/60 px-3.5 py-3">
                            <p className="text-[11px] text-ink-500 mb-2 flex items-center gap-1">
                              <Calendar size={10} strokeWidth={1.75} /> {new Date(s.fecha_registro).toLocaleString('es-ES')}
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                              {s.presion_sistolica   && <Signo l="Presión" v={`${s.presion_sistolica}/${s.presion_diastolica}`} />}
                              {s.frecuencia_cardiaca && <Signo l="FC"      v={`${s.frecuencia_cardiaca} bpm`} />}
                              {s.temperatura         && <Signo l="Temp."   v={`${s.temperatura}°C`} />}
                              {s.peso                && <Signo l="Peso"    v={`${s.peso} kg`} />}
                              {s.saturacion_oxigeno  && <Signo l="SpO₂"    v={`${s.saturacion_oxigeno}%`} />}
                              {s.talla               && <Signo l="Talla"   v={`${s.talla} m`} />}
                            </div>
                          </div>
                        ))
                      )}

                      {/* Adjuntos */}
                      {key === 'adjuntos' && (
                        <AdjuntoListPorConsulta
                          adjuntos={adjuntosPaciente}
                          onPreview={setVisorAdjunto}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      {visorAdjunto && <AdjuntoViewer adjunto={visorAdjunto} onClose={() => setVisorAdjunto(null)} />}

      {/* Modal anidado: detalle completo de una consulta seleccionada */}
      {consultaDetalle && (
        <DetalleConsultaCompletaModal
          consulta={consultaDetalle}
          diagnosticos={diagnosticos}
          signos={signos}
          ordenes={ordenes}
          ordenesExamen={ordenesExamen}
          adjuntos={adjuntosPaciente}
          onPreviewAdjunto={setVisorAdjunto}
          onClose={() => setConsultaDetalle(null)}
        />
      )}
    </div>
  );
}

// ─── Modal: detalle COMPLETO de una consulta del historial ─────────────────
// Muestra todos los campos clínicos registrados: anamnesis, examen físico,
// signos vitales (filtrados por id_consulta), diagnósticos, plan, recetas,
// órdenes de exámenes paramédicos y adjuntos asociados.
function DetalleConsultaCompletaModal({
  consulta, diagnosticos, signos, ordenes, ordenesExamen,
  adjuntos, onPreviewAdjunto, onClose,
}) {
  const dxConsulta       = (diagnosticos  ?? []).filter(d => d.id_consulta === consulta.id_consulta);
  const signosConsulta   = (signos        ?? []).filter(s => s.id_consulta === consulta.id_consulta);
  const ordenesConsulta  = (ordenes       ?? []).filter(o => o.id_consulta === consulta.id_consulta);
  const examenesConsulta = (ordenesExamen ?? []).filter(o => o.id_consulta === consulta.id_consulta);
  const adjuntosConsulta = (adjuntos      ?? []).filter(a => a.id_consulta === consulta.id_consulta);

  const fechaFmt = consulta.fecha_consulta
    ? new Date(consulta.fecha_consulta).toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';
  const horaFmt = consulta.fecha_consulta
    ? new Date(consulta.fecha_consulta).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null;

  const medicoFmt = consulta.medico?.persona
    ? `Dr(a). ${consulta.medico.persona.nombres} ${consulta.medico.persona.apellidos}`
    : consulta.medico_nombre
      ? `Dr(a). ${consulta.medico_nombre}`
      : '—';

  const hayAlgo = (
    consulta.motivo_consulta || consulta.enfermedad_actual || consulta.revision_sistemas ||
    consulta.examen_fisico || consulta.examenes_complementarios ||
    consulta.impresion_diagnostica || consulta.analisis_clinico ||
    consulta.plan_tratamiento || consulta.observaciones ||
    dxConsulta.length || signosConsulta.length || ordenesConsulta.length ||
    examenesConsulta.length || adjuntosConsulta.length
  );

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4 motion-safe:[animation:hp-fade-up_0.2s_ease-out]">
      <div className="relative bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] border border-line w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex justify-between items-start gap-4 z-10">
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-emerald-500" />
          <div className="ml-2 min-w-0">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">Detalle de la consulta</h2>
            <p className="text-[12px] text-ink-500 mt-0.5 truncate">
              <span className="capitalize">{fechaFmt}</span>
              {horaFmt && ` · ${horaFmt}`} · {medicoFmt}
            </p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 -mt-0.5 -mr-1 text-ink-300 hover:text-ink-900 hover:bg-surface p-1.5 rounded-lg transition-colors">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Anamnesis */}
          {(consulta.motivo_consulta || consulta.enfermedad_actual || consulta.revision_sistemas) && (
            <SeccionDC titulo="Anamnesis" icon={<BookOpen size={11} strokeWidth={2} />}>
              <CampoDC label="Motivo de consulta"    value={consulta.motivo_consulta} />
              <CampoDC label="Enfermedad actual"     value={consulta.enfermedad_actual} />
              <CampoDC label="Revisión por sistemas" value={consulta.revision_sistemas} />
            </SeccionDC>
          )}

          {/* Signos vitales */}
          {signosConsulta.length > 0 && (
            <SeccionDC titulo="Signos vitales" icon={<Activity size={11} strokeWidth={2} />}>
              <div className="space-y-2">
                {signosConsulta.map(s => (
                  <div key={s.id_signos} className="rounded-md border border-line bg-surface/60 px-3 py-2.5">
                    {s.fecha_registro && (
                      <p className="text-[10.5px] text-ink-500 mb-2 flex items-center gap-1">
                        <Calendar size={10} strokeWidth={1.75} />
                        {new Date(s.fecha_registro).toLocaleString('es-ES')}
                      </p>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {s.presion_sistolica       && <MiniDC label="PA"    value={`${s.presion_sistolica}/${s.presion_diastolica ?? '—'}`} />}
                      {s.frecuencia_cardiaca     && <MiniDC label="FC"    value={`${s.frecuencia_cardiaca} bpm`} />}
                      {s.frecuencia_respiratoria && <MiniDC label="FR"    value={`${s.frecuencia_respiratoria} rpm`} />}
                      {s.temperatura             && <MiniDC label="T°"    value={`${s.temperatura}°C`} />}
                      {s.saturacion_oxigeno      && <MiniDC label="SpO₂"  value={`${s.saturacion_oxigeno}%`} />}
                      {s.peso                    && <MiniDC label="Peso"  value={`${s.peso} kg`} />}
                      {s.talla                   && <MiniDC label="Talla" value={`${s.talla} m`} />}
                    </div>
                    {s.observaciones && (
                      <p className="mt-2 pt-2 border-t border-line/70 text-[11.5px] text-ink-700">
                        <span className="font-medium">Observaciones:</span> {s.observaciones}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </SeccionDC>
          )}

          {/* Examen físico + complementarios */}
          {(consulta.examen_fisico || consulta.examenes_complementarios) && (
            <SeccionDC titulo="Examen" icon={<Stethoscope size={11} strokeWidth={2} />}>
              <CampoDC label="Examen físico"            value={consulta.examen_fisico} />
              <CampoDC label="Exámenes complementarios" value={consulta.examenes_complementarios} />
            </SeccionDC>
          )}

          {/* Diagnósticos */}
          {dxConsulta.length > 0 && (
            <SeccionDC titulo={`Diagnósticos (${dxConsulta.length})`} icon={<ClipboardList size={11} strokeWidth={2} />}>
              <ul className="space-y-1.5">
                {dxConsulta.map(d => (
                  <li key={d.id_diagnostico} className="flex items-start gap-2 px-3 py-2 bg-surface border border-line rounded-md">
                    {d.es_principal && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                        <Star size={9} className="fill-amber-500 text-amber-500" /> Principal
                      </span>
                    )}
                    {d.codigo_cie10 && (
                      <span className="text-[10px] font-mono bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {d.codigo_cie10}
                      </span>
                    )}
                    <span className="flex-1 text-[12.5px] text-ink-800">{d.descripcion}</span>
                    {d.tipo_diagnostico?.nombre && (
                      <span className="text-[10.5px] text-ink-500 whitespace-nowrap">{d.tipo_diagnostico.nombre}</span>
                    )}
                  </li>
                ))}
              </ul>
            </SeccionDC>
          )}

          {/* Impresión y plan */}
          {(consulta.impresion_diagnostica || consulta.analisis_clinico || consulta.plan_tratamiento || consulta.observaciones) && (
            <SeccionDC titulo="Impresión y plan" icon={<Brain size={11} strokeWidth={2} />}>
              <CampoDC label="Impresión diagnóstica" value={consulta.impresion_diagnostica} highlight />
              <CampoDC label="Análisis clínico"      value={consulta.analisis_clinico} />
              <CampoDC label="Plan de tratamiento"   value={consulta.plan_tratamiento} />
              <CampoDC label="Observaciones"         value={consulta.observaciones} />
            </SeccionDC>
          )}

          {/* Recetas */}
          {ordenesConsulta.length > 0 && (
            <SeccionDC titulo={`Recetas (${ordenesConsulta.length})`} icon={<Pill size={11} strokeWidth={2} />}>
              <div className="space-y-2">
                {ordenesConsulta.map(o => (
                  <div key={o.id_orden} className="rounded-md border border-emerald-100 bg-emerald-50/40 px-3 py-2.5">
                    <p className="text-[13px] font-medium text-ink-900">
                      {o.medicamento?.nombre ?? '—'}
                      {o.medicamento?.concentracion && (
                        <span className="font-normal text-ink-500"> · {o.medicamento.concentracion}</span>
                      )}
                    </p>
                    {[o.dosis, o.frecuencia, o.duracion].some(Boolean) && (
                      <p className="text-[12px] text-ink-700 mt-0.5">
                        {[o.dosis, o.frecuencia, o.duracion].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {o.indicaciones && (
                      <p className="text-[11.5px] text-ink-500 italic mt-1">{o.indicaciones}</p>
                    )}
                  </div>
                ))}
              </div>
            </SeccionDC>
          )}

          {/* Órdenes de exámenes paramédicos */}
          {examenesConsulta.length > 0 && (
            <SeccionDC titulo={`Órdenes de exámenes (${examenesConsulta.length})`} icon={<FlaskConical size={11} strokeWidth={2} />}>
              <div className="space-y-3">
                {examenesConsulta.map(orden => {
                  const items = Array.isArray(orden.items) ? orden.items : [];
                  return (
                    <div key={orden.id_orden_examen} className="rounded-md border border-violet-100 bg-violet-50/40 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-[12px] font-medium text-violet-800">
                          <span className="font-mono">{orden.numero_orden ?? '—'}</span>
                          <span className="text-ink-500 font-normal">
                            {' · '}
                            {orden.fecha_emision
                              ? new Date(orden.fecha_emision).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </span>
                        </p>
                        <span className="text-[10.5px] text-violet-700 font-medium tabular-nums">
                          {items.length} examen{items.length === 1 ? '' : 'es'}
                        </span>
                      </div>
                      <ul className="space-y-1 text-[12.5px] text-ink-800">
                        {items.map(it => (
                          <li key={it.id_item} className="flex items-start gap-2">
                            <span className="inline-flex w-4 h-4 items-center justify-center rounded-sm bg-violet-100 text-violet-700 text-[9px] font-semibold tabular-nums flex-shrink-0 mt-0.5">
                              {it.orden}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium">{it.nombre}</p>
                              {it.observaciones && (
                                <p className="text-[11.5px] text-ink-500 italic">{it.observaciones}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {orden.indicaciones && (
                        <p className="mt-2 pt-2 border-t border-violet-100/70 text-[11.5px] text-ink-700">
                          <span className="font-medium">Indicaciones:</span> {orden.indicaciones}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </SeccionDC>
          )}

          {/* Adjuntos */}
          {adjuntosConsulta.length > 0 && (
            <SeccionDC titulo={`Adjuntos (${adjuntosConsulta.length})`} icon={<Paperclip size={11} strokeWidth={2} />}>
              <AdjuntoListPorConsulta adjuntos={adjuntosConsulta} onPreview={onPreviewAdjunto} />
            </SeccionDC>
          )}

          {!hayAlgo && (
            <p className="text-center text-[13px] text-ink-500 py-6">
              Esta consulta no tiene contenido clínico registrado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SeccionDC({ titulo, icon, children }) {
  return (
    <section>
      <p className="text-[10.5px] uppercase tracking-[0.12em] font-medium text-emerald-700 mb-2 flex items-center gap-1.5">
        {icon} {titulo}
      </p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function CampoDC({ label, value, highlight = false }) {
  if (!value) return null;
  return (
    <div className={[
      'rounded-md border px-3 py-2',
      highlight ? 'bg-emerald-50/60 border-emerald-100' : 'bg-surface/60 border-line',
    ].join(' ')}>
      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{label}</p>
      <p className={[
        'mt-0.5 text-[13px] whitespace-pre-wrap break-words',
        highlight ? 'text-emerald-900 font-medium' : 'text-ink-800',
      ].join(' ')}>
        {value}
      </p>
    </div>
  );
}

function MiniDC({ label, value }) {
  return (
    <div className="rounded border border-line bg-white px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-[0.08em] text-ink-500 leading-tight">{label}</p>
      <p className="text-[12px] font-medium text-ink-900 tabular-nums leading-tight mt-0.5">{value}</p>
    </div>
  );
}

function ResumenCard({ label, value, tono }) {
  const valueColor = tono === 'rose' ? 'text-rose-700' : 'text-ink-900';
  return (
    <div className="rounded-lg border border-line bg-surface/60 px-3 py-2.5 text-center">
      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 text-[15px] font-semibold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}

function Signo({ l, v }) {
  return (
    <div className="rounded-md border border-line bg-white px-2 py-1.5 text-center">
      <p className="text-[10.5px] text-ink-500">{l}</p>
      <p className="text-[12px] font-medium text-ink-900 tabular-nums">{v}</p>
    </div>
  );
}
