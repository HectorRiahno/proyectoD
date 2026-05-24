import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Loader2, User, Calendar, Clock,
  Stethoscope, ClipboardList, Pill, Activity, Heart,
  CheckCircle, FileText, Brain, BookOpen, PlusCircle, MinusCircle,
  Star, ChevronDown, ChevronUp, Search, Paperclip,
} from 'lucide-react';
import { citaService, consultaService, adjuntoService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { useAdjuntosPacienteMedico } from '../../../hooks';
import { FileUpload, AdjuntoListPorConsulta, AdjuntoViewer } from '../../../shared/components/ui';

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
    consultas: [], diagnosticos: [], signos: [], ordenes: [],
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

        const [diagsData, ordenesData] = await Promise.all([
          consultaService.getDiagnosticosPacienteHistoria(pacId),
          consultaService.getOrdenesPacienteHistoria(pacId),
        ]);

        setHistoria({
          consultas,
          diagnosticos: diagsData,
          signos,
          ordenes: ordenesData,
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
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/medico/citas')}
          className="p-2 hover:bg-gray-100 rounded-lg transition" title="Volver">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Atender cita</h1>
          <p className="text-sm text-gray-500">
            {paciente?.nombre_completo} · {fecha} {hora} · Cita #{cita?.id_cita}
          </p>
        </div>
        <div className="text-xs px-3 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
          {cita?.estado === 'en_curso' ? 'En curso' : cita?.estado}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── COLUMNA IZQUIERDA: formulario de consulta ─────────────────── */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3">
              <h2 className="font-bold flex items-center gap-2">
                <Stethoscope size={18} /> Consulta médica
              </h2>
              <p className="text-xs text-emerald-100">Completa los campos clínicos de esta atención</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {TABS.map(t => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                    tab === t.id
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                      : 'border-transparent text-gray-600 hover:text-emerald-600 hover:border-emerald-300'
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

              {/* Navegación entre tabs */}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setTab(t => Math.max(0, t - 1))} disabled={tab === 0}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 transition">
                  ← Anterior
                </button>
                <span className="text-xs text-gray-400">{tab + 1} / {TABS.length}</span>
                {tab < TABS.length - 1 ? (
                  <button type="button" onClick={() => setTab(t => t + 1)}
                    className="px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-800 transition">
                    Siguiente →
                  </button>
                ) : <div />}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => navigate('/medico/citas')}
                  className="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition font-semibold shadow-lg disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Guardar y finalizar cita'}
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

  if (!paciente) return null;

  return (
    <div className="space-y-3 sticky top-4">
      {/* Cabecera del paciente */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
          <h2 className="font-bold flex items-center gap-2">
            <User size={18} /> Historia clínica
          </h2>
          <p className="text-xs text-blue-100">Solo lectura · {paciente.numero_historia}</p>
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
          <p className="text-xs text-gray-400">Sin consultas previas</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {historia.consultas.map(c => (
              <div key={c.id_consulta}
                className={`p-2 rounded-lg border text-xs ${citaActual?.id_cita && c.id_consulta === citaActual.id_cita
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-gray-50 border-gray-200'}`}>
                <p className="font-semibold text-gray-800">
                  {c.fecha_consulta?.slice(0, 10)}
                  {c.medico?.persona && (
                    <span className="font-normal text-gray-500"> · Dr(a). {c.medico.persona.nombres} {c.medico.persona.apellidos}</span>
                  )}
                </p>
                {c.motivo_consulta && <p className="text-gray-700"><strong>Motivo:</strong> {c.motivo_consulta}</p>}
                {c.impresion_diagnostica && <p className="text-emerald-700"><strong>Dx:</strong> {c.impresion_diagnostica}</p>}
                {c.plan_tratamiento && <p className="text-gray-600 truncate" title={c.plan_tratamiento}><strong>Plan:</strong> {c.plan_tratamiento}</p>}
              </div>
            ))}
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
    </div>
  );
}

// ─── Sub-componentes UI ────────────────────────────────────────────────────────
function Seccion({ titulo, color = 'gray', children }) {
  const colors = {
    blue:    'border-blue-200 bg-blue-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    purple:  'border-purple-200 bg-purple-50',
    red:     'border-red-200 bg-red-50',
    orange:  'border-orange-200 bg-orange-50',
  };
  const titles = {
    blue:    'text-blue-700',
    emerald: 'text-emerald-700',
    purple:  'text-purple-700',
    red:     'text-red-700',
    orange:  'text-orange-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] ?? 'border-gray-200 bg-gray-50'}`}>
      <p className={`text-xs font-bold uppercase mb-3 ${titles[color] ?? 'text-gray-600'}`}>{titulo}</p>
      {children}
    </div>
  );
}

function Textarea({ label, name, value, onChange, rows = 2, required = false, placeholder = '', highlight = false }) {
  return (
    <div>
      {label && <label className="text-sm font-medium text-gray-700 mb-2 block">{label}</label>}
      <textarea
        name={name} value={value} onChange={onChange} rows={rows} required={required} placeholder={placeholder}
        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 resize-none ${
          highlight ? 'border-emerald-400 focus:ring-emerald-500 bg-emerald-50' : 'border-gray-300 focus:ring-emerald-500'
        }`}
      />
    </div>
  );
}

function Acordeon({ titulo, icon, abierto, onToggle, children }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
        <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
          {icon} {titulo}
        </span>
        {abierto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {abierto && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Mini({ label, value, highlight = false }) {
  return (
    <div className={`px-2 py-1 rounded ${highlight ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
      <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
      <p className={`font-semibold leading-tight ${highlight ? 'text-red-700' : 'text-gray-800'}`}>{value || '—'}</p>
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
        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition"
      >
        <Paperclip size={28} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          Haz clic o arrastra archivos para adjuntar
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF e imágenes · Máx 10 MB</p>
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
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-xs">{error}</div>
      )}

      {pendientes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-600">Archivos pendientes ({pendientes.length})</p>
          {pendientes.map((p, idx) => {
            const isImg = p.file.type.startsWith('image/');
            return (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                {isImg
                  ? <FileText size={18} className="text-purple-600 flex-shrink-0 mt-0.5" />
                  : <FileText size={18} className="text-red-600   flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(p.file.size / 1024).toFixed(0)} KB · {p.file.type}
                  </p>
                  <input
                    type="text"
                    value={p.descripcion}
                    onChange={(e) => onChangeDescripcion(idx, e.target.value)}
                    placeholder="Descripción (opcional, ej: Radiografía PA)"
                    className="w-full mt-2 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="text-gray-400 hover:text-red-600 transition flex-shrink-0"
                  aria-label="Quitar"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <p className="text-xs text-emerald-700 italic">
            ✓ Se subirán al guardar y finalizar la cita.
          </p>
        </div>
      )}
    </div>
  );
}
