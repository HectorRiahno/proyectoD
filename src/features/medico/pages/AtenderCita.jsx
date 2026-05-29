import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Loader2, User, Calendar, Clock,
  Stethoscope, ClipboardList, Pill, Activity, Heart,
  CheckCircle, FileText, Brain, BookOpen, PlusCircle, MinusCircle,
  Star, ChevronDown, ChevronUp, Search, Paperclip, ChevronRight,
  FlaskConical, Printer,
} from 'lucide-react';
import { citaService, consultaService, adjuntoService, medicoService, ordenExamenService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { useAdjuntosPacienteMedico } from '../../../hooks';
import { FileUpload, AdjuntoListPorConsulta, AdjuntoViewer, Modal } from '../../../shared/components/ui';
import { generarPdfOrdenExamenes } from '../utils/generarPdfOrdenExamenes';

// ─── Constantes médicas ────────────────────────────────────────────────────────
const SISTEMAS = [
  'General', 'Cardiovascular', 'Respiratorio', 'Digestivo',
  'Genitourinario', 'Músculo-esquelético', 'Neurológico',
  'Psiquiátrico', 'Piel y mucosas', 'Endocrino / Metabólico',
];
const PRIORIDADES = [
  { v: 1, l: '1 — Principal' },
  { v: 2, l: '2 — Secundario' },
  { v: 3, l: '3 — Terciario' },
  { v: 4, l: '4 — Cuaternario' },
  { v: 5, l: '5 — Quinto' },
];
const TIPOS_DX = [
  { v: 'impresion',           l: 'Impresión diagnóstica' },
  { v: 'confirmado_nuevo',    l: 'Confirmado nuevo' },
  { v: 'confirmado_repetido', l: 'Confirmado repetido' },
];

const calcEdad = (fecha) => {
  if (!fecha) return null;
  const nac = new Date(fecha);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
};

// ─── Página principal ──────────────────────────────────────────────────────────
export default function AtenderCita() {
  const { citaId } = useParams();
  const navigate = useNavigate();
  const { usuarioLogueado } = useAuth();

  const [cita, setCita]           = useState(null);
  const [paciente, setPaciente]   = useState(null);
  const [historia, setHistoria]   = useState({
    consultas: [], diagnosticos: [], signos: [], ordenes: [], ordenesExamen: [],
  });
  const [tiposDx, setTiposDx]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  // Form state
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({
    motivo_consulta: '', enfermedad_actual: '', revision_sistemas: '',
    examen_fisico: '', examenes_complementarios: '',
    impresion_diagnostica: '', analisis_clinico: '', plan_tratamiento: '', observaciones: '',
  });
  const [signos, setSignos] = useState({
    presion_sistolica: '', presion_diastolica: '', frecuencia_cardiaca: '',
    frecuencia_respiratoria: '', temperatura: '', saturacion_oxigeno: '', peso: '', talla: '',
  });
  const [diagnosticos, setDiag] = useState([{
    codigo_cie10: '', descripcion: '', tipo_dx: 'impresion',
    prioridad: 1, id_tipo_diagnostico: '', es_principal: true,
  }]);
  // Archivos seleccionados por el médico antes de guardar la consulta.
  // Se suben al bucket DESPUÉS de crear la consulta (necesitamos id_consulta).
  const [adjuntosPendientes, setAdjuntosPendientes] = useState([]); // [{file, descripcion}]
  const [visorAdjunto, setVisorAdjunto] = useState(null);

  // Orden de exámenes paramédicos. El médico la llena en la pestaña "Exámenes"
  // y al descargar se genera un PDF con datos del paciente + médico para que
  // el paciente lo lleve al laboratorio. No se persiste en BD (es un artefacto
  // físico/PDF), solo se imprime/descarga.
  const [ordenExamenes, setOrdenExamenes] = useState({
    items: [{ nombre: '', observaciones: '' }],
    indicaciones: '',
  });
  const [generandoPdfOrden, setGenerandoPdfOrden] = useState(false);

  // ─── Carga inicial ──────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Cita + paciente + persona
      const citaData = await citaService.getCitaConPaciente(citaId);
      if (!citaData) throw new Error('No se encontró la cita');

      const pac = citaData.paciente;
      const per = pac?.persona;
      setCita(citaData);
      setPaciente({
        id_paciente:           pac?.id_paciente,
        numero_historia:       pac?.numero_historia,
        tipo_sangre:           pac?.historial?.tipo_sangre,
        alergias:              pac?.historial?.alergias,
        enfermedades_cronicas: pac?.historial?.enfermedades_cronicas,
        contacto_emergencia:   pac?.contacto_emergencia,
        telefono_emergencia:   pac?.telefono_emergencia,
        ocupacion:             pac?.ocupacion,
        estado_civil:          pac?.estado_civil,
        documento:             per?.documento,
        nombre_completo:       per ? `${per.nombres} ${per.apellidos}` : '',
        fecha_nacimiento:      per?.fecha_nacimiento,
        edad:                  calcEdad(per?.fecha_nacimiento),
        genero:                per?.genero,
        telefono:              per?.telefono,
        email:                 per?.email,
        direccion:             per?.direccion,
      });

      // 2. Historia clínica completa
      const pacId = pac?.id_paciente;
      if (pacId) {
        const [consultas, signos, tipos] = await Promise.all([
          consultaService.getConsultasPaciente(pacId),
          consultaService.getSignosPacienteRecientes(pacId, 10),
          consultaService.getTiposDiagnostico(),
        ]);

        const [diagsData, ordenesData, examenesData] = await Promise.all([
          consultaService.getDiagnosticosPacienteHistoria(pacId),
          consultaService.getOrdenesPacienteHistoria(pacId),
          // Órdenes de exámenes previas — pueden no existir si la migración
          // aún no se aplicó en Supabase; fallamos silenciosamente.
          ordenExamenService.getPorPaciente(pacId).catch(() => []),
        ]);

        setHistoria({
          consultas,
          diagnosticos: diagsData,
          signos,
          ordenes: ordenesData,
          ordenesExamen: examenesData,
        });
        setTiposDx(tipos);
      }
    } catch (err) {
      setError(err.message ?? 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [citaId]);

  useEffect(() => { cargar(); }, [cargar]);

  // ─── Handlers de formulario ─────────────────────────────────────────────────
  const handleForm   = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSignos = e => setSignos(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleDx     = (idx, field, val) =>
    setDiag(p => p.map((d, i) => i === idx ? { ...d, [field]: val } : d));
  const addDx    = () => setDiag(p => [...p, {
    codigo_cie10: '', descripcion: '', tipo_dx: 'impresion',
    prioridad: p.length + 1, id_tipo_diagnostico: '', es_principal: false,
  }]);
  const removeDx = (idx) => setDiag(p => p.filter((_, i) => i !== idx));

  // ─── Guardar consulta ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paciente?.id_paciente) return;
    setSaving(true);
    setError('');
    try {
      const idMedico = await consultaService.resolveIdMedico(usuarioLogueado?.id_persona);
      if (!idMedico) throw new Error('No se encontró tu perfil de médico.');

      const idConsulta = await consultaService.crearConsultaCompleta(idMedico, {
        consulta: {
          id_paciente: Number(paciente.id_paciente),
          id_cita:     Number(citaId),
          ...form,
        },
        diagnosticos,
        signos,
      });

      // Subir adjuntos pendientes (uno a uno, errores no abortan).
      const erroresAdjuntos = [];
      for (const a of adjuntosPendientes) {
        try {
          await adjuntoService.subir(a.file, idConsulta, a.descripcion);
        } catch (errA) {
          erroresAdjuntos.push(`${a.file.name}: ${errA.message}`);
        }
      }
      if (erroresAdjuntos.length > 0) {
        console.warn('[AtenderCita] adjuntos con error:', erroresAdjuntos);
      }

      // Persistir orden de exámenes si el médico la llenó. Los items con
      // nombre vacío se ignoran. La orden queda ligada a la consulta y
      // visible para el paciente en su portal y en el historial clínico.
      const examenesValidos = ordenExamenes.items.filter(it => (it.nombre ?? '').trim());
      if (examenesValidos.length > 0) {
        try {
          await ordenExamenService.crearConItems({
            id_consulta: idConsulta,
            id_paciente: Number(paciente.id_paciente),
            id_medico:   idMedico,
            indicaciones: ordenExamenes.indicaciones,
            items: examenesValidos,
          });
        } catch (errOrd) {
          console.warn('[AtenderCita] orden de exámenes con error:', errOrd.message);
          // No abortamos: la consulta ya quedó guardada. Solo dejamos rastro.
        }
      }

      await citaService.marcarCompletada(citaId);
      navigate('/medico/citas');
    } catch (err) {
      console.error('[AtenderCita]', err);
      setError(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 size={36} className="animate-spin text-emerald-600 mb-3" />
        <p className="text-gray-500">Cargando cita e historia clínica...</p>
      </div>
    );
  }

  if (error && !cita) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/medico/citas')}
          className="flex items-center gap-2 text-emerald-600 hover:underline">
          <ArrowLeft size={16} /> Volver a Mis citas
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      </div>
    );
  }

  const fecha = cita?.fecha_cita?.slice(0, 10);
  const hora  = cita?.fecha_cita?.slice(11, 16);

  const TABS = [
    { id: 0, label: 'Anamnesis',   icon: <BookOpen size={15} /> },
    { id: 1, label: 'Examen',      icon: <Stethoscope size={15} /> },
    { id: 2, label: 'Diagnóstico', icon: <ClipboardList size={15} /> },
    { id: 3, label: 'Plan',        icon: <Brain size={15} /> },
    { id: 4, label: 'Adjuntos',    icon: <Paperclip size={15} /> },
    { id: 5, label: 'Exámenes',    icon: <FlaskConical size={15} /> },
  ];

  // ─── Handlers de la orden de exámenes (Tab 5) ────────────────────────
  const addExamen = () => setOrdenExamenes(p => ({
    ...p, items: [...p.items, { nombre: '', observaciones: '' }],
  }));
  const removeExamen = (idx) => setOrdenExamenes(p => ({
    ...p, items: p.items.filter((_, i) => i !== idx),
  }));
  const updateExamen = (idx, campo, valor) => setOrdenExamenes(p => ({
    ...p,
    items: p.items.map((it, i) => i === idx ? { ...it, [campo]: valor } : it),
  }));
  const updateIndicaciones = (valor) =>
    setOrdenExamenes(p => ({ ...p, indicaciones: valor }));

  const itemsValidos = ordenExamenes.items.filter(it => (it.nombre ?? '').trim());

  const handleDescargarOrden = async () => {
    if (itemsValidos.length === 0) {
      setError('Agrega al menos un examen antes de descargar la orden.');
      return;
    }
    setGenerandoPdfOrden(true);
    setError('');
    try {
      // Buscar datos del médico (especialidad, licencia, consultorio) para el PDF.
      let medicoData = null;
      try {
        const idMedico = await consultaService.resolveIdMedico(usuarioLogueado?.id_persona);
        if (idMedico) medicoData = await medicoService.getById(idMedico);
      } catch (err) {
        console.warn('[orden examenes] no se pudo cargar perfil médico:', err.message);
      }
      generarPdfOrdenExamenes({
        paciente,
        medico: medicoData,
        medicoFallback: usuarioLogueado,
        cita,
        orden: { items: itemsValidos, indicaciones: ordenExamenes.indicaciones },
      });
    } catch (err) {
      setError(`No se pudo generar la orden: ${err.message ?? err}`);
    } finally {
      setGenerandoPdfOrden(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/medico/citas')}
          className="inline-flex w-9 h-9 items-center justify-center text-ink-700 hover:bg-surface hover:text-ink-900 border border-line rounded-lg transition-colors" title="Volver">
          <ArrowLeft size={16} strokeWidth={1.75} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-semibold tracking-tight text-ink-900">Atender cita</h1>
          <p className="text-[12.5px] text-ink-500 truncate">
            {paciente?.nombre_completo} · <span className="tabular-nums">{fecha} {hora}</span> · Cita #{cita?.id_cita}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md font-medium border bg-amber-50 text-amber-700 border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {cita?.estado === 'en_curso' ? 'En curso' : cita?.estado}
        </span>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 text-[13px] text-red-700 bg-red-50/70 border-l-2 border-red-500 pl-3 pr-3 py-2.5 rounded-r-md">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} /> {error}
        </div>
      )}

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── COLUMNA IZQUIERDA: formulario de consulta ─────────────────── */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden">
            <div className="relative px-5 py-3.5 border-b border-line">
              <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-emerald-500" />
              <h2 className="ml-2 text-[14px] font-semibold tracking-tight text-ink-900 flex items-center gap-2">
                <Stethoscope size={15} className="text-emerald-600" strokeWidth={1.75} /> Consulta médica
              </h2>
              <p className="ml-2 text-[11.5px] text-ink-500">Completa los campos clínicos de esta atención</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-line overflow-x-auto">
              {TABS.map(t => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
                    tab === t.id
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
                      : 'border-transparent text-ink-700 hover:bg-surface'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              {/* ── TAB 0: ANAMNESIS ─────────────────────────────────────── */}
              {tab === 0 && (
                <div className="space-y-4">
                  <Seccion titulo="Motivo y enfermedad actual" color="emerald">
                    <div className="space-y-3">
                      <Textarea label="Motivo de consulta *" name="motivo_consulta"
                        value={form.motivo_consulta} onChange={handleForm}
                        placeholder="¿Por qué consulta el paciente hoy?" rows={2} required />
                      <Textarea label="Enfermedad actual" name="enfermedad_actual"
                        value={form.enfermedad_actual} onChange={handleForm}
                        placeholder="Describe la evolución de la enfermedad..." rows={4} />
                    </div>
                  </Seccion>

                  <Seccion titulo="Revisión por sistemas" color="orange">
                    <p className="text-xs text-gray-500 mb-3">Síntomas adicionales no relacionados con la enfermedad actual.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {SISTEMAS.map(sistema => (
                        <div key={sistema} className="flex items-start gap-2 p-2 bg-white border border-gray-200 rounded-lg">
                          <span className="text-xs font-semibold text-gray-500 w-32 flex-shrink-0 pt-1">{sistema}</span>
                          <input type="text" placeholder="Síntomas o 'Negativo'"
                            onChange={e => {
                              const sistemas = form.revision_sistemas ? form.revision_sistemas.split('\n') : [];
                              const idx = sistemas.findIndex(l => l.startsWith(sistema + ':'));
                              const nuevaLinea = e.target.value.trim() ? `${sistema}: ${e.target.value}` : '';
                              if (idx >= 0) {
                                if (nuevaLinea) sistemas[idx] = nuevaLinea; else sistemas.splice(idx, 1);
                              } else if (nuevaLinea) {
                                sistemas.push(nuevaLinea);
                              }
                              setForm(p => ({ ...p, revision_sistemas: sistemas.filter(Boolean).join('\n') }));
                            }}
                            defaultValue={form.revision_sistemas?.split('\n').find(l => l.startsWith(sistema + ':'))?.replace(sistema + ': ', '') ?? ''}
                            className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-400" />
                        </div>
                      ))}
                    </div>
                  </Seccion>
                </div>
              )}

              {/* ── TAB 1: EXAMEN ─────────────────────────────────────────── */}
              {tab === 1 && (
                <div className="space-y-4">
                  <Seccion titulo="Signos vitales" color="red">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        ['presion_sistolica',       'P. Sistólica',    'mmHg'],
                        ['presion_diastolica',      'P. Diastólica',   'mmHg'],
                        ['frecuencia_cardiaca',     'Frec. Cardíaca',  'bpm'],
                        ['frecuencia_respiratoria', 'Frec. Resp.',     'rpm'],
                        ['temperatura',             'Temperatura',     '°C'],
                        ['saturacion_oxigeno',      'SpO₂',            '%'],
                        ['peso',                    'Peso',            'kg'],
                        ['talla',                   'Talla',           'm'],
                      ].map(([name, label, unit]) => (
                        <div key={name}>
                          <label className="text-xs text-gray-500 block mb-1">{label}</label>
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                            <input type="number" step="0.1" name={name} value={signos[name]} onChange={handleSignos}
                              className="flex-1 px-2 py-2 text-sm focus:outline-none min-w-0" />
                            <span className="px-2 text-xs text-gray-400 bg-gray-50 border-l border-gray-300">{unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Seccion>

                  <Seccion titulo="Examen físico" color="emerald">
                    <Textarea name="examen_fisico" value={form.examen_fisico} onChange={handleForm}
                      placeholder="Cardiopulmonar, abdomen, extremidades, neurológico..." rows={5} />
                  </Seccion>

                  <Seccion titulo="Exámenes complementarios" color="blue">
                    <Textarea name="examenes_complementarios" value={form.examenes_complementarios} onChange={handleForm}
                      placeholder="Resultados de laboratorio, imágenes..." rows={5} />
                  </Seccion>
                </div>
              )}

              {/* ── TAB 2: DIAGNÓSTICO ────────────────────────────────────── */}
              {tab === 2 && (
                <div className="space-y-4">
                  <Seccion titulo="Diagnósticos" color="purple">
                    <div className="space-y-3">
                      {diagnosticos.map((d, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-purple-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              {idx === 0 && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                  <Star size={11} /> Principal
                                </span>
                              )}
                            </div>
                            {diagnosticos.length > 1 && (
                              <button type="button" onClick={() => removeDx(idx)} className="text-red-400 hover:text-red-600">
                                <MinusCircle size={18} />
                              </button>
                            )}
                          </div>
                          <input value={d.descripcion} onChange={e => handleDx(idx, 'descripcion', e.target.value)}
                            placeholder="Descripción diagnóstica *"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                          <div className="grid grid-cols-3 gap-2">
                            <input value={d.codigo_cie10} onChange={e => handleDx(idx, 'codigo_cie10', e.target.value)}
                              placeholder="CIE-10"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono" />
                            <select value={d.tipo_dx} onChange={e => handleDx(idx, 'tipo_dx', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                              {TIPOS_DX.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                            </select>
                            <select value={d.prioridad} onChange={e => handleDx(idx, 'prioridad', Number(e.target.value))}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                              {PRIORIDADES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                            </select>
                          </div>
                          {tiposDx.length > 0 && (
                            <select value={d.id_tipo_diagnostico} onChange={e => handleDx(idx, 'id_tipo_diagnostico', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                              <option value="">Categoría (opcional)</option>
                              {tiposDx.map(t => <option key={t.id_tipo_diagnostico} value={t.id_tipo_diagnostico}>{t.nombre}</option>)}
                            </select>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={addDx}
                        className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium">
                        <PlusCircle size={18} /> Agregar diagnóstico
                      </button>
                    </div>
                  </Seccion>

                  <Seccion titulo="Impresión diagnóstica (texto libre)" color="emerald">
                    <Textarea name="impresion_diagnostica" value={form.impresion_diagnostica} onChange={handleForm}
                      placeholder="Resumen diagnóstico..." rows={3} highlight />
                  </Seccion>
                </div>
              )}

              {/* ── TAB 3: PLAN ───────────────────────────────────────────── */}
              {tab === 3 && (
                <div className="space-y-4">
                  <Seccion titulo="Análisis clínico" color="blue">
                    <Textarea name="analisis_clinico" value={form.analisis_clinico} onChange={handleForm}
                      placeholder="Razonamiento clínico..." rows={5} />
                  </Seccion>
                  <Seccion titulo="Plan de tratamiento" color="emerald">
                    <Textarea name="plan_tratamiento" value={form.plan_tratamiento} onChange={handleForm}
                      placeholder="Medicamentos, dosis, procedimientos, dieta, próxima cita..." rows={6} />
                  </Seccion>
                  <Seccion titulo="Observaciones finales" color="orange">
                    <Textarea name="observaciones" value={form.observaciones} onChange={handleForm}
                      placeholder="Notas adicionales, incapacidad médica..." rows={3} />
                  </Seccion>
                </div>
              )}

              {/* ── TAB 4: ADJUNTOS ──────────────────────────────────────── */}
              {tab === 4 && (
                <div className="space-y-4">
                  <Seccion titulo="Resultados, radiografías y otros archivos" color="purple">
                    <p className="text-xs text-gray-500 mb-3">
                      Adjunta PDFs (resultados de laboratorio) o imágenes (radiografías, fotografías clínicas).
                      Los archivos se suben automáticamente al <strong>Guardar y finalizar cita</strong>.
                    </p>
                    <AdjuntosFormPicker
                      pendientes={adjuntosPendientes}
                      onAdd={(file) => setAdjuntosPendientes(prev => [
                        ...prev, { file, descripcion: '' },
                      ])}
                      onChangeDescripcion={(idx, valor) => setAdjuntosPendientes(prev =>
                        prev.map((p, i) => i === idx ? { ...p, descripcion: valor } : p),
                      )}
                      onRemove={(idx) => setAdjuntosPendientes(prev => prev.filter((_, i) => i !== idx))}
                    />
                  </Seccion>
                </div>
              )}

              {/* ── TAB 5: ORDEN DE EXÁMENES PARAMÉDICOS ────────────────── */}
              {tab === 5 && (
                <div className="space-y-4">
                  <Seccion titulo="Solicitud de exámenes" color="purple">
                    <p className="text-[12px] text-ink-500 mb-3">
                      Ingresa los exámenes a solicitar. Al{' '}
                      <strong className="font-medium">guardar y finalizar la cita</strong>
                      {' '}la orden queda registrada en la historia clínica del paciente, visible
                      para él en su portal y para los demás médicos. Mientras tanto puedes
                      descargar el PDF para entregarle al paciente.
                    </p>

                    <div className="space-y-2">
                      {ordenExamenes.items.map((item, idx) => (
                        <div key={idx} className="rounded-lg border border-line bg-white px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="inline-flex items-center gap-2 text-[11px] font-medium text-violet-700">
                              <span className="inline-flex w-5 h-5 items-center justify-center rounded-md bg-violet-50 border border-violet-100 tabular-nums font-semibold">
                                {idx + 1}
                              </span>
                              Examen
                            </span>
                            {ordenExamenes.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeExamen(idx)}
                                className="text-ink-300 hover:text-red-600 transition-colors p-1"
                                title="Quitar este examen"
                                aria-label="Quitar examen"
                              >
                                <MinusCircle size={15} strokeWidth={1.75} />
                              </button>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              value={item.nombre}
                              onChange={(e) => updateExamen(idx, 'nombre', e.target.value)}
                              placeholder="Nombre del examen (Hemograma completo, glicemia, ecografía abdominal…)"
                              className="w-full px-3 py-2 text-[13px] bg-white border border-line rounded-md text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
                            />
                            <input
                              type="text"
                              value={item.observaciones}
                              onChange={(e) => updateExamen(idx, 'observaciones', e.target.value)}
                              placeholder="Observaciones o preparación (en ayunas, ayuno de 8h, etc.) — opcional"
                              className="w-full px-3 py-1.5 text-[12px] bg-white border border-line rounded-md text-ink-700 placeholder:text-ink-300 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addExamen}
                      className="mt-3 inline-flex items-center gap-2 text-[12.5px] font-medium text-violet-700 hover:text-violet-800 transition-colors"
                    >
                      <PlusCircle size={15} strokeWidth={1.75} /> Agregar otro examen
                    </button>
                  </Seccion>

                  <Seccion titulo="Indicaciones generales" color="blue">
                    <Textarea
                      name="indicaciones"
                      value={ordenExamenes.indicaciones}
                      onChange={(e) => updateIndicaciones(e.target.value)}
                      placeholder="Indicaciones para el paciente, preparación general, urgencia, lugar sugerido para realizar los exámenes…"
                      rows={3}
                    />
                  </Seccion>

                  {/* Resumen y descarga */}
                  <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-[10.5px] uppercase tracking-[0.12em] font-medium text-violet-700">
                          Resumen de la orden
                        </p>
                        <p className="text-[13.5px] font-semibold text-ink-900 mt-1">
                          {itemsValidos.length} examen{itemsValidos.length === 1 ? '' : 'es'} a solicitar
                        </p>
                        <p className="text-[11.5px] text-ink-500 mt-0.5">
                          Para <span className="font-medium text-ink-700">{paciente?.nombre_completo ?? '—'}</span>
                          {paciente?.documento && ` · ${paciente.tipo_documento ?? 'CC'} ${paciente.documento}`}
                        </p>
                      </div>
                      <FileText size={20} className="text-violet-600 flex-shrink-0" strokeWidth={1.5} />
                    </div>

                    <button
                      type="button"
                      onClick={handleDescargarOrden}
                      disabled={itemsValidos.length === 0 || generandoPdfOrden}
                      className="w-full inline-flex items-center justify-center gap-2 bg-violet-700 hover:bg-violet-800 active:scale-[0.99] text-white text-[13.5px] font-medium py-2.5 rounded-xl shadow-[0_1px_2px_rgba(11,18,32,0.10),0_8px_24px_-14px_rgba(124,58,237,0.5)] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {generandoPdfOrden ? (
                        <>
                          <Loader2 size={14} className="animate-spin" strokeWidth={1.75} />
                          Generando PDF…
                        </>
                      ) : (
                        <>
                          <Printer size={14} strokeWidth={1.75} />
                          Descargar orden en PDF
                        </>
                      )}
                    </button>

                    {itemsValidos.length === 0 && (
                      <p className="mt-2 text-center text-[11px] text-ink-500">
                        Llena el nombre de al menos un examen para habilitar la descarga.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Navegación entre tabs */}
              <div className="flex justify-between items-center pt-2 border-t border-line/70">
                <button type="button" onClick={() => setTab(t => Math.max(0, t - 1))} disabled={tab === 0}
                  className="px-3 py-1.5 text-[12.5px] font-medium text-ink-700 hover:text-ink-900 disabled:opacity-40 transition-colors">
                  ← Anterior
                </button>
                <span className="text-[11px] text-ink-500 tabular-nums">{tab + 1} / {TABS.length}</span>
                {tab < TABS.length - 1 ? (
                  <button type="button" onClick={() => setTab(t => t + 1)}
                    className="px-3 py-1.5 text-[12.5px] font-medium text-emerald-700 hover:text-emerald-800 transition-colors">
                    Siguiente →
                  </button>
                ) : <div />}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-3 border-t border-line/70">
                <button type="button" onClick={() => navigate('/medico/citas')}
                  className="flex-1 px-5 py-2.5 bg-white border border-line text-ink-800 rounded-xl hover:bg-surface hover:border-ink-100 active:scale-[0.99] transition-all duration-150 text-[13.5px] font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[13.5px] font-medium shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_24px_-14px_rgba(11,18,32,0.40)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed">
                  {saving
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando…</>
                    : 'Guardar y finalizar cita'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* ── COLUMNA DERECHA: historia clínica ─────────────────────────── */}
        <aside className="lg:col-span-1 space-y-4">
          <PanelHistoria
            paciente={paciente}
            historia={historia}
            citaActual={cita}
            onPreviewAdjunto={setVisorAdjunto}
          />
        </aside>
      </div>

      {visorAdjunto && <AdjuntoViewer adjunto={visorAdjunto} onClose={() => setVisorAdjunto(null)} />}
    </div>
  );
}

// ─── Panel de historia clínica (solo lectura) ─────────────────────────────────
function PanelHistoria({ paciente, historia, citaActual, onPreviewAdjunto }) {
  // Adjuntos de TODAS las consultas previas del paciente
  const { adjuntos: adjuntosPaciente } = useAdjuntosPacienteMedico(paciente?.id_paciente);

  const [open, setOpen] = useState({
    datos: true, antecedentes: true, consultas: true,
    diagnosticos: false, signos: false, recetas: false, adjuntos: false,
  });
  const toggle = (k) => setOpen(p => ({ ...p, [k]: !p[k] }));

  // Consulta abierta en el modal de "Ver detalle". El médico hace clic en
  // una tarjeta de consulta previa y se le muestra todo el contenido clínico
  // (anamnesis, examen, dx, plan, recetas y signos asociados a esa consulta).
  const [consultaDetalle, setConsultaDetalle] = useState(null);

  if (!paciente) return null;

  return (
    <div className="space-y-3 sticky top-4">
      {/* Cabecera del paciente */}
      <div className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden">
        <div className="relative px-4 py-3 border-b border-line">
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-brand-500" />
          <h2 className="ml-2 text-[13.5px] font-semibold tracking-tight text-ink-900 flex items-center gap-2">
            <User size={14} className="text-brand-600" strokeWidth={1.75} /> Historia clínica
          </h2>
          <p className="ml-2 text-[11px] text-ink-500 font-mono">Solo lectura · {paciente.numero_historia}</p>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div>
            <p className="font-bold text-gray-900">{paciente.nombre_completo}</p>
            <p className="text-xs text-gray-500 font-mono">
              {paciente.documento} · {paciente.edad ?? '—'} años · {paciente.genero ?? ''}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Mini label="Sangre"   value={paciente.tipo_sangre} highlight={!!paciente.tipo_sangre} />
            <Mini label="Estado"   value={paciente.estado_civil} />
            <Mini label="Ocupación" value={paciente.ocupacion} />
            <Mini label="Teléfono" value={paciente.telefono} />
          </div>
        </div>
      </div>

      {/* Antecedentes */}
      <Acordeon titulo="Antecedentes y alergias" icon={<Heart size={15} className="text-red-500" />}
        abierto={open.antecedentes} onToggle={() => toggle('antecedentes')}>
        <div className="space-y-2 text-sm">
          {paciente.alergias ? (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
              <strong>⚠ Alergias:</strong> {paciente.alergias}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sin alergias registradas</p>
          )}
          {paciente.enfermedades_cronicas ? (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
              <strong>Enfermedades crónicas:</strong> {paciente.enfermedades_cronicas}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sin enfermedades crónicas</p>
          )}
          {paciente.contacto_emergencia && (
            <p className="text-xs text-gray-600">
              <strong>Emergencia:</strong> {paciente.contacto_emergencia}
              {paciente.telefono_emergencia && ` · ${paciente.telefono_emergencia}`}
            </p>
          )}
        </div>
      </Acordeon>

      {/* Consultas previas */}
      <Acordeon titulo={`Consultas previas (${historia.consultas.length})`}
        icon={<Stethoscope size={15} className="text-emerald-600" />}
        abierto={open.consultas} onToggle={() => toggle('consultas')}>
        {historia.consultas.length === 0 ? (
          <p className="text-[11.5px] text-ink-500">Sin consultas previas.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {historia.consultas.map(c => {
              const esActual = citaActual?.id_cita && c.id_consulta === citaActual.id_cita;
              return (
                <button
                  key={c.id_consulta}
                  type="button"
                  onClick={() => setConsultaDetalle(c)}
                  title="Ver todo el contenido de esta consulta"
                  className={[
                    'group w-full text-left p-2.5 rounded-lg border transition-all duration-150',
                    esActual
                      ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-400'
                      : 'bg-white border-line hover:border-emerald-300 hover:bg-emerald-50/40',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-ink-900">
                        {c.fecha_consulta?.slice(0, 10)}
                        {c.medico?.persona && (
                          <span className="font-normal text-ink-500"> · Dr(a). {c.medico.persona.nombres} {c.medico.persona.apellidos}</span>
                        )}
                      </p>
                      {c.motivo_consulta && (
                        <p className="text-[11.5px] text-ink-700 mt-1 line-clamp-1">
                          <span className="font-medium">Motivo:</span> {c.motivo_consulta}
                        </p>
                      )}
                      {c.impresion_diagnostica && (
                        <p className="text-[11.5px] text-emerald-700 line-clamp-1 mt-0.5">
                          <span className="font-medium">Dx:</span> {c.impresion_diagnostica}
                        </p>
                      )}
                      {c.plan_tratamiento && (
                        <p className="text-[11px] text-ink-500 line-clamp-1 mt-0.5">
                          <span className="font-medium">Plan:</span> {c.plan_tratamiento}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={13} strokeWidth={1.75}
                      className="flex-shrink-0 text-ink-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all duration-150 mt-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Acordeon>

      {/* Diagnósticos */}
      <Acordeon titulo={`Diagnósticos (${historia.diagnosticos.length})`}
        icon={<ClipboardList size={15} className="text-purple-600" />}
        abierto={open.diagnosticos} onToggle={() => toggle('diagnosticos')}>
        {historia.diagnosticos.length === 0 ? (
          <p className="text-xs text-gray-400">Sin diagnósticos registrados</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {historia.diagnosticos.map(d => (
              <div key={d.id_diagnostico} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs">
                {d.es_principal && <Star size={11} className="text-yellow-600 flex-shrink-0 mt-0.5" />}
                {d.codigo_cie10 && <span className="font-mono bg-blue-100 text-blue-700 px-1.5 rounded">{d.codigo_cie10}</span>}
                <span className="flex-1 text-gray-800">{d.descripcion}</span>
                {d.tipo_diagnostico?.nombre && <span className="text-gray-400 text-[10px]">{d.tipo_diagnostico.nombre}</span>}
              </div>
            ))}
          </div>
        )}
      </Acordeon>

      {/* Signos vitales */}
      <Acordeon titulo={`Signos vitales recientes (${historia.signos.length})`}
        icon={<Activity size={15} className="text-red-600" />}
        abierto={open.signos} onToggle={() => toggle('signos')}>
        {historia.signos.length === 0 ? (
          <p className="text-xs text-gray-400">Sin signos vitales registrados</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {historia.signos.map(s => (
              <div key={s.id_signos} className="p-2 bg-gray-50 rounded text-xs space-y-1">
                <p className="font-semibold text-gray-700">{s.fecha_registro?.slice(0, 10)}</p>
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  {s.presion_sistolica   && <Mini label="PA"   value={`${s.presion_sistolica}/${s.presion_diastolica ?? '—'}`} />}
                  {s.frecuencia_cardiaca && <Mini label="FC"   value={`${s.frecuencia_cardiaca} bpm`} />}
                  {s.temperatura         && <Mini label="T°"   value={`${s.temperatura}°C`} />}
                  {s.saturacion_oxigeno  && <Mini label="SpO₂" value={`${s.saturacion_oxigeno}%`} />}
                  {s.peso                && <Mini label="Peso" value={`${s.peso} kg`} />}
                  {s.talla               && <Mini label="Talla" value={`${s.talla} m`} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Acordeon>

      {/* Recetas / órdenes médicas */}
      <Acordeon titulo={`Recetas previas (${historia.ordenes.length})`}
        icon={<Pill size={15} className="text-pink-600" />}
        abierto={open.recetas} onToggle={() => toggle('recetas')}>
        {historia.ordenes.length === 0 ? (
          <p className="text-xs text-gray-400">Sin recetas registradas</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {historia.ordenes.map(o => (
              <div key={o.id_orden} className="p-2 bg-pink-50 border border-pink-100 rounded text-xs">
                <p className="font-semibold text-gray-800">
                  {o.medicamento?.nombre ?? '—'}
                  {o.medicamento?.concentracion && <span className="font-normal text-gray-500"> · {o.medicamento.concentracion}</span>}
                </p>
                <p className="text-gray-600">
                  {[o.dosis, o.frecuencia, o.duracion].filter(Boolean).join(' · ')}
                </p>
                {o.indicaciones && <p className="text-gray-500 italic">{o.indicaciones}</p>}
                <p className="text-[10px] text-gray-400 mt-0.5">{o.fecha_emision?.slice(0, 10)}</p>
              </div>
            ))}
          </div>
        )}
      </Acordeon>

      {/* Adjuntos de consultas previas */}
      <Acordeon titulo={`Adjuntos previos (${adjuntosPaciente.length})`}
        icon={<Paperclip size={15} className="text-indigo-600" />}
        abierto={open.adjuntos} onToggle={() => toggle('adjuntos')}>
        <div className="max-h-72 overflow-y-auto">
          <AdjuntoListPorConsulta adjuntos={adjuntosPaciente} onPreview={onPreviewAdjunto} />
        </div>
      </Acordeon>

      {/* Modal: detalle completo de una consulta previa */}
      {consultaDetalle && (
        <DetalleConsultaPreviaModal
          consulta={consultaDetalle}
          diagnosticos={historia.diagnosticos}
          signos={historia.signos}
          ordenes={historia.ordenes}
          ordenesExamen={historia.ordenesExamen ?? []}
          adjuntos={adjuntosPaciente}
          onPreviewAdjunto={onPreviewAdjunto}
          onClose={() => setConsultaDetalle(null)}
        />
      )}
    </div>
  );
}

// ─── Modal: detalle completo de una consulta previa ─────────────────────────
// Muestra todo el contenido clínico registrado en una consulta puntual:
// anamnesis, examen, signos vitales, diagnósticos, plan, recetas y adjuntos
// asociados. Los signos/diagnósticos/ordenes/adjuntos se filtran por id_consulta.
function DetalleConsultaPreviaModal({
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
    <Modal
      titulo="Detalle de la consulta"
      subtitulo={`${fechaFmt}${horaFmt ? ` · ${horaFmt}` : ''} · ${medicoFmt}`}
      onClose={onClose}
      variant="emerald"
      size="lg"
    >
      <div className="space-y-5">
        {/* Anamnesis */}
        {(consulta.motivo_consulta || consulta.enfermedad_actual || consulta.revision_sistemas) && (
          <SeccionDetalle titulo="Anamnesis" icon={<BookOpen size={11} strokeWidth={2} />}>
            <CampoLargo label="Motivo de consulta"    value={consulta.motivo_consulta} />
            <CampoLargo label="Enfermedad actual"     value={consulta.enfermedad_actual} />
            <CampoLargo label="Revisión por sistemas" value={consulta.revision_sistemas} />
          </SeccionDetalle>
        )}

        {/* Signos vitales asociados a esta consulta */}
        {signosConsulta.length > 0 && (
          <SeccionDetalle titulo="Signos vitales" icon={<Activity size={11} strokeWidth={2} />}>
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
                    {s.presion_sistolica       && <MiniDetalle label="PA"    value={`${s.presion_sistolica}/${s.presion_diastolica ?? '—'}`} />}
                    {s.frecuencia_cardiaca     && <MiniDetalle label="FC"    value={`${s.frecuencia_cardiaca} bpm`} />}
                    {s.frecuencia_respiratoria && <MiniDetalle label="FR"    value={`${s.frecuencia_respiratoria} rpm`} />}
                    {s.temperatura             && <MiniDetalle label="T°"    value={`${s.temperatura}°C`} />}
                    {s.saturacion_oxigeno      && <MiniDetalle label="SpO₂"  value={`${s.saturacion_oxigeno}%`} />}
                    {s.peso                    && <MiniDetalle label="Peso"  value={`${s.peso} kg`} />}
                    {s.talla                   && <MiniDetalle label="Talla" value={`${s.talla} m`} />}
                  </div>
                  {s.observaciones && (
                    <p className="mt-2 pt-2 border-t border-line/70 text-[11.5px] text-ink-700">
                      <span className="font-medium">Observaciones:</span> {s.observaciones}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SeccionDetalle>
        )}

        {/* Examen físico + complementarios */}
        {(consulta.examen_fisico || consulta.examenes_complementarios) && (
          <SeccionDetalle titulo="Examen" icon={<Stethoscope size={11} strokeWidth={2} />}>
            <CampoLargo label="Examen físico"            value={consulta.examen_fisico} />
            <CampoLargo label="Exámenes complementarios" value={consulta.examenes_complementarios} />
          </SeccionDetalle>
        )}

        {/* Diagnósticos */}
        {dxConsulta.length > 0 && (
          <SeccionDetalle titulo={`Diagnósticos (${dxConsulta.length})`} icon={<ClipboardList size={11} strokeWidth={2} />}>
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
          </SeccionDetalle>
        )}

        {/* Plan, impresión y observaciones */}
        {(consulta.impresion_diagnostica || consulta.analisis_clinico || consulta.plan_tratamiento || consulta.observaciones) && (
          <SeccionDetalle titulo="Impresión y plan" icon={<Brain size={11} strokeWidth={2} />}>
            <CampoLargo label="Impresión diagnóstica" value={consulta.impresion_diagnostica} highlight />
            <CampoLargo label="Análisis clínico"      value={consulta.analisis_clinico} />
            <CampoLargo label="Plan de tratamiento"   value={consulta.plan_tratamiento} />
            <CampoLargo label="Observaciones"         value={consulta.observaciones} />
          </SeccionDetalle>
        )}

        {/* Recetas */}
        {ordenesConsulta.length > 0 && (
          <SeccionDetalle titulo={`Recetas (${ordenesConsulta.length})`} icon={<Pill size={11} strokeWidth={2} />}>
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
          </SeccionDetalle>
        )}

        {/* Órdenes de exámenes paramédicos */}
        {examenesConsulta.length > 0 && (
          <SeccionDetalle
            titulo={`Órdenes de exámenes (${examenesConsulta.length})`}
            icon={<FlaskConical size={11} strokeWidth={2} />}
          >
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
          </SeccionDetalle>
        )}

        {/* Adjuntos de esta consulta */}
        {adjuntosConsulta.length > 0 && (
          <SeccionDetalle titulo={`Adjuntos (${adjuntosConsulta.length})`} icon={<Paperclip size={11} strokeWidth={2} />}>
            <AdjuntoListPorConsulta adjuntos={adjuntosConsulta} onPreview={onPreviewAdjunto} />
          </SeccionDetalle>
        )}

        {!hayAlgo && (
          <p className="text-center text-[13px] text-ink-500 py-6">
            Esta consulta no tiene contenido clínico registrado.
          </p>
        )}
      </div>
    </Modal>
  );
}

function SeccionDetalle({ titulo, icon, children }) {
  return (
    <section>
      <p className="text-[10.5px] uppercase tracking-[0.12em] font-medium text-emerald-700 mb-2 flex items-center gap-1.5">
        {icon} {titulo}
      </p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function CampoLargo({ label, value, highlight = false }) {
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

function MiniDetalle({ label, value }) {
  return (
    <div className="rounded border border-line bg-white px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-[0.08em] text-ink-500 leading-tight">{label}</p>
      <p className="text-[12px] font-medium text-ink-900 tabular-nums leading-tight mt-0.5">{value}</p>
    </div>
  );
}

// ─── Sub-componentes UI ────────────────────────────────────────────────────────
function Seccion({ titulo, color = 'gray', children }) {
  const colors = {
    blue:    'border-brand-100   bg-brand-50/40',
    emerald: 'border-emerald-100 bg-emerald-50/40',
    purple:  'border-violet-100  bg-violet-50/40',
    red:     'border-red-100     bg-red-50/40',
    orange:  'border-orange-100  bg-orange-50/40',
  };
  const titles = {
    blue:    'text-brand-700',
    emerald: 'text-emerald-700',
    purple:  'text-violet-700',
    red:     'text-red-700',
    orange:  'text-orange-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] ?? 'border-line bg-surface/60'}`}>
      <p className={`text-[10.5px] font-medium uppercase tracking-[0.12em] mb-3 ${titles[color] ?? 'text-ink-700'}`}>{titulo}</p>
      {children}
    </div>
  );
}

function Textarea({ label, name, value, onChange, rows = 2, required = false, placeholder = '', highlight = false }) {
  return (
    <div>
      {label && <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">{label}</label>}
      <textarea
        name={name} value={value} onChange={onChange} rows={rows} required={required} placeholder={placeholder}
        className={[
          'w-full px-3.5 py-2.5 text-[13.5px] rounded-xl resize-none transition-all duration-150',
          'placeholder:text-ink-300 text-ink-900',
          'focus:outline-none focus:ring-4',
          highlight
            ? 'bg-emerald-50/50 border border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/10'
            : 'bg-white border border-line focus:border-brand-500 focus:ring-brand-500/10',
        ].join(' ')}
      />
    </div>
  );
}

function Acordeon({ titulo, icon, abierto, onToggle, children }) {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors">
        <span className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-ink-900">
          {icon} {titulo}
        </span>
        {abierto
          ? <ChevronUp   size={15} className="text-ink-500" strokeWidth={1.75} />
          : <ChevronDown size={15} className="text-ink-500" strokeWidth={1.75} />}
      </button>
      {abierto && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Mini({ label, value, highlight = false }) {
  return (
    <div className={`px-2 py-1.5 rounded-md ${highlight ? 'bg-rose-50 border border-rose-100' : 'bg-surface border border-line'}`}>
      <p className="text-[10px] text-ink-500 leading-tight uppercase tracking-[0.08em]">{label}</p>
      <p className={`text-[12px] font-medium tabular-nums leading-tight mt-0.5 ${highlight ? 'text-rose-700' : 'text-ink-900'}`}>{value || '—'}</p>
    </div>
  );
}

// ─── Selector de adjuntos diferido ────────────────────────────────────────────
// A diferencia de <FileUpload>, NO sube en el momento — solo acumula archivos
// en el estado del padre. El submit del formulario los sube tras crear la
// consulta (porque necesitamos id_consulta para asociarlos).
function AdjuntosFormPicker({ pendientes, onAdd, onChangeDescripcion, onRemove }) {
  const [error, setError] = React.useState('');
  const inputRef = React.useRef(null);

  const handleFiles = (files) => {
    setError('');
    for (const file of Array.from(files)) {
      try {
        adjuntoService.validarArchivo(file);
        onAdd(file);
      } catch (err) {
        setError(prev => prev ? `${prev}; ${file.name}: ${err.message}` : `${file.name}: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-line rounded-xl p-6 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/40 transition-colors"
      >
        <Paperclip size={24} className="mx-auto mb-2 text-ink-300" strokeWidth={1.75} />
        <p className="text-[13px] text-ink-700">
          Haz clic o arrastra archivos para adjuntar
        </p>
        <p className="text-[11.5px] text-ink-500 mt-1">PDF e imágenes · Máx 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={adjuntoService.acceptString}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 text-[12px] text-red-700 bg-red-50/70 border-l-2 border-red-500 pl-3 pr-3 py-2 rounded-r-md">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">
            Archivos pendientes ({pendientes.length})
          </p>
          {pendientes.map((p, idx) => {
            const isImg = p.file.type.startsWith('image/');
            return (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-line rounded-lg">
                <FileText size={16} className={`flex-shrink-0 mt-0.5 ${isImg ? 'text-violet-600' : 'text-rose-600'}`} strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink-900 truncate">{p.file.name}</p>
                  <p className="text-[11px] text-ink-500">
                    {(p.file.size / 1024).toFixed(0)} KB · {p.file.type}
                  </p>
                  <input
                    type="text"
                    value={p.descripcion}
                    onChange={(e) => onChangeDescripcion(idx, e.target.value)}
                    placeholder="Descripción (opcional, ej: Radiografía PA)"
                    className="w-full mt-2 px-2 py-1.5 text-[12px] border border-line rounded-md focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="text-ink-300 hover:text-red-600 transition-colors flex-shrink-0 p-1"
                  aria-label="Quitar"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <p className="text-[11.5px] text-emerald-700">
            ✓ Se subirán al guardar y finalizar la cita.
          </p>
        </div>
      )}
    </div>
  );
}
