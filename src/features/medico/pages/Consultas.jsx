import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList, Plus, Edit, Eye, Trash2,
  AlertCircle, Loader2, User, Calendar, X,
  Stethoscope, Activity, Pill, PlusCircle, MinusCircle,
  CheckCircle, FileText, Heart, ChevronDown, ChevronUp,
  BookOpen, FlaskConical, Brain, Star, Paperclip, Printer,
} from 'lucide-react';
import {
  consultaService, citaService, pacienteService,
  medicoService, ordenExamenService,
} from '../../../services';
import { useAuth, useConsultas, useAdjuntos } from '../../../hooks';
import {
  FileUpload, AdjuntoList, AdjuntoViewer,
  PageHeader, KPI, ErrorBanner, SearchBar,
  EmptyState, LoadingState, IconButton, ActionGroup,
} from '../../../shared/components/ui';
import { generarPdfOrdenExamenes } from '../utils/generarPdfOrdenExamenes';

// Una consulta es "de exámenes" si el tipo asociado (vía cita) menciona
// la palabra "examen". Cubre 'Toma de exámenes', 'Revisión de exámenes',
// y cualquier futuro tipo que el admin agregue con esa palabra clave.
const esConsultaExamenes = (c) => /examen/i.test(c?.tipo_consulta_nombre ?? '');

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

// ─── Constantes ────────────────────────────────────────────────────────────────
const INTENSIDADES = ['Leve', 'Moderada', 'Severa'];

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Consultas() {
  const {
    consultas, loading, error, setError,
    reload: cargar, softDelete,
  } = useConsultas();
  const [search, setSearch]       = useState('');
  const [detalle, setDetalle]     = useState(null);
  const [editando, setEditando]   = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [adjuntando, setAdjuntando] = useState(null);
  const [creando, setCreando]     = useState(false);
  const [citaInicial, setCitaInicial] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Si la URL trae ?citaId=N (viene del botón "Tomar cita" en /medico/citas),
  // abrimos el modal de nueva consulta con esa cita pre-vinculada.
  useEffect(() => {
    const citaId = searchParams.get('citaId');
    if (citaId) {
      setCitaInicial(citaId);
      setCreando(true);
      // Limpiar el param para que un refresh no reabra el modal indefinidamente.
      searchParams.delete('citaId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = consultas.filter(c => {
    const term = search.toLowerCase();
    return (
      (c.paciente_nombre     ?? '').toLowerCase().includes(term) ||
      (c.paciente_documento  ?? '').includes(search) ||
      (c.motivo_consulta     ?? '').toLowerCase().includes(term) ||
      (c.impresion_diagnostica ?? '').toLowerCase().includes(term)
    );
  });

  const eliminarConfirmado = async (c) => {
    try {
      await softDelete(c.id_consulta);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Mis consultas"
        descripcion="Registro clínico de atenciones"
        eyebrow="Consultas"
        icon={<ClipboardList size={11} strokeWidth={2.25} />}
        variant="emerald"
      >
        <KPI label="Total" value={loading ? '···' : consultas.length} />
        <KPI label="Hoy"   value={loading ? '···' : consultas.filter(c => c.fecha_consulta?.startsWith(new Date().toISOString().split('T')[0])).length} color="text-emerald-700" />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar por paciente, motivo o diagnóstico…"
      />

      {/* Lista de consultas */}
      {loading ? (
        <LoadingState mensaje="Cargando consultas…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          titulo="No tienes consultas registradas"
          descripcion="Las consultas aparecen aquí cuando atiendes una cita confirmada."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <article
              key={c.id_consulta}
              className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:border-ink-100 hover:shadow-[0_8px_28px_-14px_rgba(11,18,32,0.18)] transition-all duration-200"
            >
              <div className="p-5 flex items-start gap-4">
                <span className="inline-flex w-11 h-11 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 flex-shrink-0">
                  <Stethoscope size={18} strokeWidth={1.75} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-semibold tracking-tight text-ink-900">{c.paciente_nombre ?? '—'}</p>
                        {c.tipo_consulta_nombre && (
                          <span className={`inline-flex text-[10.5px] font-medium px-2 py-0.5 rounded-md border ${
                            esConsultaExamenes(c)
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            {c.tipo_consulta_nombre}
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-ink-500 font-mono mt-0.5">
                        {c.paciente_documento} · HC {c.numero_historia}
                      </p>
                    </div>
                    <p className="text-[11.5px] text-ink-500 flex items-center gap-1 flex-shrink-0 tabular-nums">
                      <Calendar size={11} strokeWidth={1.75} />
                      {c.fecha_consulta?.slice(0, 10)}
                    </p>
                  </div>
                  <p className="text-[13px] text-ink-700 mb-0.5">
                    <span className="font-medium text-ink-900">Motivo: </span>
                    {c.motivo_consulta || '—'}
                  </p>
                  {c.impresion_diagnostica && (
                    <p className="text-[13px] text-emerald-700 line-clamp-1">
                      <span className="font-medium">Dx: </span>
                      {c.impresion_diagnostica}
                    </p>
                  )}
                </div>
                <ActionGroup>
                  <IconButton icon={Eye}   tone="brand"  title="Ver"    onClick={() => setDetalle(c)} />
                  <IconButton icon={Edit}  tone="indigo" title="Editar" onClick={() => setEditando(c)} />
                  {esConsultaExamenes(c) && (
                    <IconButton icon={Paperclip} tone="amber" title="Adjuntar radiografías / resultados" onClick={() => setAdjuntando(c)} />
                  )}
                  <IconButton icon={Trash2} tone="red" title="Eliminar" onClick={() => setEliminando(c)} />
                </ActionGroup>
              </div>
            </article>
          ))}
        </div>
      )}

      {detalle    && <ModalDetalle   consulta={detalle}   onClose={() => setDetalle(null)} />}
      {editando   && <ModalEditar    consulta={editando}  onClose={() => { setEditando(null); cargar(); }} />}
      {adjuntando && <ModalAdjuntos  consulta={adjuntando} onClose={() => setAdjuntando(null)} />}
      {creando    && <ModalCrear     citaInicial={citaInicial} onClose={() => { setCreando(false); setCitaInicial(null); cargar(); }} />}
      {eliminando && <ModalEliminar  consulta={eliminando} onConfirm={async () => {
        const ok = await eliminarConfirmado(eliminando);
        if (ok) setEliminando(null);
      }} onClose={() => setEliminando(null)} />}
    </div>
  );
}

// ─── Modal: Ver detalles (información completa de la consulta) ─────────────────
function ModalDetalle({ consulta: c, onClose }) {
  const [paciente, setPaciente]         = useState(null);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [sintomas, setSintomas]         = useState([]);
  const [signos, setSignos]             = useState(null);
  const [ordenes, setOrdenes]           = useState([]);

  useEffect(() => {
    Promise.all([
      pacienteService.getDatosCompletos(c.id_paciente),
      consultaService.getDiagnosticosConsulta(c.id_consulta),
      consultaService.getSintomasConsulta(c.id_consulta),
      consultaService.getUltimoSignoConsulta(c.id_consulta),
      consultaService.getOrdenesConsulta(c.id_consulta),
    ]).then(([p, d, s, sv, om]) => {
      setPaciente(p ?? null);
      setDiagnosticos(d ?? []);
      setSintomas(s ?? []);
      setSignos(sv ?? null);
      setOrdenes(om ?? []);
    });
  }, [c.id_consulta, c.id_paciente]);

  const calcEdad = (fecha) => {
    if (!fecha) return null;
    const nac = new Date(fecha);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  };

  const per = paciente?.persona;
  const edad = calcEdad(per?.fecha_nacimiento);

  return (
    <Modal titulo="Detalle de consulta" subtitulo={`${c.paciente_nombre} · ${c.fecha_consulta?.slice(0, 10)}`} onClose={onClose} wide>
      <div className="space-y-4">
        {/* ── Paciente: todos los atributos de persona + paciente ─────────── */}
        <Seccion titulo="Datos del paciente" color="blue">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Nombres"            value={per?.nombres} />
            <Campo label="Apellidos"          value={per?.apellidos} />
            <Campo label="Tipo documento"     value={per?.tipo_documento} />
            <Campo label="Documento"          value={per?.documento} />
            <Campo label="Fecha nacimiento"   value={per?.fecha_nacimiento} />
            <Campo label="Edad"               value={edad != null ? `${edad} años` : '—'} />
            <Campo label="Género"             value={per?.genero} />
            <Campo label="Estado civil"       value={paciente?.estado_civil} />
            <Campo label="Ocupación"          value={paciente?.ocupacion} />
            <Campo label="Teléfono"           value={per?.telefono} />
            <Campo label="Email"              value={per?.email} />
            <Campo label="Dirección"          value={per?.direccion} className="col-span-2" />
          </div>
        </Seccion>

        <Seccion titulo="Información clínica del paciente" color="red">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="N° historia clínica" value={paciente?.numero_historia} />
            <Campo label="Tipo de sangre"      value={paciente?.historial?.tipo_sangre} highlight={!!paciente?.historial?.tipo_sangre} />
            <Campo label="Alergias"            value={paciente?.historial?.alergias} className="col-span-2" highlight={!!paciente?.historial?.alergias} />
            <Campo label="Enfermedades crónicas" value={paciente?.historial?.enfermedades_cronicas} className="col-span-2" />
            <Campo label="Contacto emergencia" value={paciente?.contacto_emergencia} />
            <Campo label="Tel. emergencia"     value={paciente?.telefono_emergencia} />
          </div>
        </Seccion>

        {/* ── Datos de la consulta ─────────────────────────────────────── */}
        <Seccion titulo="Información de la consulta" color="purple">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="ID consulta"    value={`#${c.id_consulta}`} />
            <Campo label="Fecha y hora"   value={c.fecha_consulta?.slice(0, 16).replace('T', ' ')} />
            {c.id_cita && <Campo label="Cita vinculada" value={`#${c.id_cita}`} />}
          </div>
        </Seccion>

        <Seccion titulo="Anamnesis" color="emerald">
          <div className="space-y-3">
            <Campo label="Motivo de consulta"    value={c.motivo_consulta} />
            <Campo label="Enfermedad actual"     value={c.enfermedad_actual} />
            <Campo label="Revisión por sistemas" value={c.revision_sistemas} />
          </div>
        </Seccion>

        <Seccion titulo="Examen" color="red">
          <div className="space-y-3">
            <Campo label="Examen físico"            value={c.examen_fisico} />
            <Campo label="Exámenes complementarios" value={c.examenes_complementarios} />
          </div>
        </Seccion>

        {signos && (
          <Seccion titulo="Signos vitales" color="red">
            <div className="grid grid-cols-4 gap-2 text-sm">
              <Campo label="P. Sistólica"    value={signos.presion_sistolica}       />
              <Campo label="P. Diastólica"   value={signos.presion_diastolica}      />
              <Campo label="F. Cardíaca"     value={signos.frecuencia_cardiaca}     />
              <Campo label="F. Respiratoria" value={signos.frecuencia_respiratoria} />
              <Campo label="Temperatura"     value={signos.temperatura}             />
              <Campo label="SpO₂"            value={signos.saturacion_oxigeno}      />
              <Campo label="Peso"            value={signos.peso}                    />
              <Campo label="Talla"           value={signos.talla}                   />
            </div>
          </Seccion>
        )}

        <Seccion titulo="Diagnóstico y plan" color="emerald">
          <div className="space-y-3">
            <Campo label="Impresión diagnóstica" value={c.impresion_diagnostica} highlight />
            <Campo label="Análisis clínico"      value={c.analisis_clinico} />
            <Campo label="Plan de tratamiento"   value={c.plan_tratamiento} />
            <Campo label="Observaciones"         value={c.observaciones} />
          </div>
        </Seccion>

        {diagnosticos.length > 0 && (
          <Seccion titulo={`Diagnósticos (${diagnosticos.length})`} color="purple">
            <div className="space-y-2">
              {diagnosticos.map(d => (
                <div key={d.id_diagnostico} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {d.es_principal && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">Principal</span>}
                  {d.codigo_cie10 && <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{d.codigo_cie10}</span>}
                  <p className="text-sm text-gray-800 flex-1">{d.descripcion}</p>
                  <p className="text-xs text-gray-500">{d.tipo_diagnostico?.nombre}</p>
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {sintomas.length > 0 && (
          <Seccion titulo={`Síntomas (${sintomas.length})`} color="orange">
            <div className="grid grid-cols-2 gap-2">
              {sintomas.map(s => (
                <div key={s.id_sintoma} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900 text-sm">{s.nombre}</p>
                  {s.intensidad && <p className="text-xs text-gray-500">{s.intensidad} · {s.duracion}</p>}
                </div>
              ))}
            </div>
          </Seccion>
        )}

        {ordenes.length > 0 && (
          <Seccion titulo={`Recetas / órdenes (${ordenes.length})`} color="purple">
            <div className="space-y-2">
              {ordenes.map(o => (
                <div key={o.id_orden} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-medium text-gray-900">
                    {o.medicamento?.nombre ?? '—'}
                    {o.medicamento?.concentracion && <span className="font-normal text-gray-500"> · {o.medicamento.concentracion}</span>}
                  </p>
                  <p className="text-xs text-gray-600">{[o.dosis, o.frecuencia, o.duracion].filter(Boolean).join(' · ')}</p>
                  {o.indicaciones && <p className="text-xs text-gray-500 italic mt-1">{o.indicaciones}</p>}
                </div>
              ))}
            </div>
          </Seccion>
        )}
      </div>
    </Modal>
  );
}

// ─── Modal: Adjuntos (radiografías / resultados) ──────────────────────────────
// Solo se monta para consultas de tipo "examen". El médico puede subir
// imágenes (JPG/PNG/WebP/GIF) o PDFs hasta 10 MB cada uno (límites en
// adjuntoService.TIPOS_PERMITIDOS / TAMANIO_MAX_BYTES).
function ModalAdjuntos({ consulta: c, onClose }) {
  const { adjuntos, loading, error, subir, eliminar, setError } = useAdjuntos(c.id_consulta);
  const [visor, setVisor] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const handleSubir = async (file, descripcion) => {
    setSubiendo(true);
    try {
      await subir(file, descripcion);
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminar = async (a) => {
    if (!window.confirm(`¿Eliminar "${a.nombre_archivo}"? No se podrá recuperar.`)) return;
    try {
      await eliminar(a);
    } catch (err) {
      // El service ya formatea el error; setError viene de useAsyncResource
      setError?.(err.message);
    }
  };

  return (
    <Modal
      titulo="Adjuntos de la consulta"
      subtitulo={`${c.paciente_nombre} · ${c.tipo_consulta_nombre ?? 'Exámenes'} · ${c.fecha_consulta?.slice(0, 10)}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        {/* Aviso contextual */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
          <FlaskConical size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Consulta de exámenes</p>
            <p className="text-xs mt-0.5">
              Sube las radiografías, ecografías, resultados de laboratorio o
              cualquier documento clínico relacionado. Formatos permitidos:
              JPG, PNG, WebP, GIF y PDF. Máximo 10 MB por archivo.
            </p>
          </div>
        </div>

        {/* Drop-zone + upload */}
        <FileUpload
          onUpload={handleSubir}
          disabled={subiendo}
          placeholder="Arrastra radiografías o PDFs aquí, o haz clic para seleccionar"
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError?.('')}><X size={14} /></button>
          </div>
        )}

        {/* Listado de los ya subidos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
              Archivos adjuntos {adjuntos.length > 0 && <span className="text-gray-400 font-normal normal-case">({adjuntos.length})</span>}
            </h3>
          </div>
          <AdjuntoList
            adjuntos={adjuntos}
            loading={loading}
            onPreview={setVisor}
            onDelete={handleEliminar}
            emptyMessage="Aún no hay archivos. Sube el primero arriba."
          />
        </div>

        {/* Cerrar */}
        <div className="flex justify-end pt-3 border-t border-gray-200">
          <button onClick={onClose}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-semibold shadow-sm">
            Listo
          </button>
        </div>
      </div>

      {/* Visor full-screen para ver imagen/PDF */}
      {visor && <AdjuntoViewer adjunto={visor} onClose={() => setVisor(null)} />}
    </Modal>
  );
}

// ─── Modal: Confirmar eliminación ─────────────────────────────────────────────
function ModalEliminar({ consulta: c, onConfirm, onClose }) {
  const [eliminando, setEliminando] = useState(false);

  const handleEliminar = async () => {
    setEliminando(true);
    await onConfirm();
    setEliminando(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <AlertCircle size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Eliminar consulta</h2>
            <p className="text-xs text-red-100">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-gray-700 text-sm">
            ¿Confirmas que deseas eliminar la consulta de:
          </p>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-sm">
            <p className="font-bold text-gray-900">{c.paciente_nombre}</p>
            <p className="text-xs text-gray-500 font-mono">
              {c.paciente_documento} · HC {c.numero_historia}
            </p>
            <p className="text-xs text-gray-500">
              Fecha consulta: {c.fecha_consulta?.slice(0, 10)}
            </p>
            {c.motivo_consulta && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                <span className="font-medium">Motivo:</span> {c.motivo_consulta}
              </p>
            )}
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            Al eliminar la consulta también se borrarán sus diagnósticos, síntomas,
            signos vitales y recetas asociadas (cascada).
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={eliminando}
              className="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold disabled:opacity-60">
              Cancelar
            </button>
            <button onClick={handleEliminar} disabled={eliminando}
              className="flex-1 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              <Trash2 size={16} />
              {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Crear consulta (formulario tabbed completo) ────────────────────────
function ModalCrear({ citaInicial = null, onClose }) {
  const { usuarioLogueado } = useAuth();
  const [tab, setTab]           = useState(0);
  const [form, setForm]         = useState({
    id_paciente: '',
    // Tab 1: Anamnesis
    motivo_consulta: '', enfermedad_actual: '', revision_sistemas: '',
    // Tab 2: Examen
    examen_fisico: '', examenes_complementarios: '',
    // Tab 3: Plan y análisis
    impresion_diagnostica: '', analisis_clinico: '', plan_tratamiento: '', observaciones: '',
  });
  const [signos, setSignos]     = useState({
    presion_sistolica: '', presion_diastolica: '', frecuencia_cardiaca: '',
    frecuencia_respiratoria: '', temperatura: '', saturacion_oxigeno: '', peso: '', talla: '',
  });
  const [diagnosticos, setDiag] = useState([{
    codigo_cie10: '', descripcion: '', tipo_dx: 'impresion',
    prioridad: 1, id_tipo_diagnostico: '', es_principal: true,
  }]);

  const [pacientes, setPacientes]         = useState([]);
  const [citas, setCitas]                 = useState([]);
  const [tiposDx, setTiposDx]             = useState([]);
  const [antecedentes, setAntecedentes]   = useState(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historial, setHistorial]         = useState([]);
  const [loadingHist, setLoadingHist]     = useState(false);
  const [loadingData, setLoadingData]     = useState(true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [searchPac, setSearchPac]         = useState('');
  const [citaVinculada, setCitaVinculada] = useState(citaInicial ? String(citaInicial) : '');

  // Cargar pacientes, citas y tipos de diagnóstico
  useEffect(() => {
    const cargar = async () => {
      // Si llega una citaInicial, incluimos también 'en_curso' por si la cita
      // ya fue marcada como en proceso, y traemos esa cita aunque no esté en
      // los estados habituales (para que aparezca en el dropdown).
      const estadosCita = ['programada', 'confirmada', 'en_curso'];
      const [pacs, citas, tipos] = await Promise.all([
        pacienteService.getCatalogo(),
        citaService.getMisCitasMedicoPorEstado(estadosCita),
        consultaService.getTiposDiagnostico(),
      ]);
      let citasList = citas;

      // Si la cita inicial no está en el listado (por ejemplo, ya completada),
      // la buscamos explícitamente para poder mostrar el contexto al médico.
      if (citaInicial && !citasList.some(c => String(c.id_cita) === String(citaInicial))) {
        const citaExtra = await citaService.getCitaMedicoExtra(citaInicial);
        if (citaExtra) citasList = [citaExtra, ...citasList];
      }

      setPacientes(pacs ?? []);
      setCitas(citasList);
      setTiposDx(tipos ?? []);

      // Pre-rellenar el paciente si hay cita inicial
      if (citaInicial) {
        const cita = citasList.find(c => String(c.id_cita) === String(citaInicial));
        if (cita?.id_paciente) {
          setForm(p => ({ ...p, id_paciente: String(cita.id_paciente) }));
        }
      }

      setLoadingData(false);
    };
    cargar();
  }, [citaInicial]);

  // Cargar antecedentes cuando cambia el paciente
  useEffect(() => {
    if (!form.id_paciente) { setAntecedentes(null); return; }
    pacienteService.getAntecedentes(Number(form.id_paciente))
      .then(setAntecedentes)
      .catch(() => setAntecedentes(null));
  }, [form.id_paciente]);

  const handleForm   = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSignos = e => setSignos(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleDx     = (idx, field, val) =>
    setDiag(p => p.map((d, i) => i === idx ? { ...d, [field]: val } : d));
  const addDx    = () => setDiag(p => [...p, { codigo_cie10: '', descripcion: '', tipo_dx: 'impresion', prioridad: p.length + 1, id_tipo_diagnostico: '', es_principal: false }]);
  const removeDx = (idx) => setDiag(p => p.filter((_, i) => i !== idx));

  const handleCitaSelect = e => {
    setCitaVinculada(e.target.value);
    const cita = citas.find(c => String(c.id_cita) === e.target.value);
    if (cita) setForm(p => ({ ...p, id_paciente: String(cita.id_paciente) }));
  };

  const toggleHistorial = async () => {
    if (!historialOpen && historial.length === 0 && form.id_paciente) {
      setLoadingHist(true);
      try {
        const data = await consultaService.getConsultasPacienteResumen(Number(form.id_paciente), 5);
        setHistorial(data ?? []);
      } finally {
        setLoadingHist(false);
      }
    }
    setHistorialOpen(p => !p);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.id_paciente) { setError('Selecciona un paciente en el Tab Anamnesis.'); return; }
    setSaving(true);
    setError('');
    try {
      const idMedico = await consultaService.resolveIdMedico(usuarioLogueado?.id_persona);
      if (!idMedico) throw new Error('No se encontró tu perfil de médico. Pide al administrador que lo cree en "Médicos".');

      await consultaService.crearConsultaCompleta(idMedico, {
        consulta: {
          id_paciente: Number(form.id_paciente),
          id_cita:     citaVinculada ? Number(citaVinculada) : null,
          ...form,
        },
        diagnosticos,
        signos,
      });

      // Marcar cita como completada (estado final).
      // El "en_curso" intermedio se aplica desde MisCitas.jsx al "Tomar cita".
      if (citaVinculada) {
        await citaService.marcarCompletada(Number(citaVinculada));
      }

      onClose();
    } catch (err) {
      console.error('[ModalCrear Consulta]', err);
      setError(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: 0, label: 'Anamnesis',   icon: <BookOpen size={15} /> },
    { id: 1, label: 'Examen',      icon: <Stethoscope size={15} /> },
    { id: 2, label: 'Diagnóstico', icon: <ClipboardList size={15} /> },
    { id: 3, label: 'Plan',        icon: <Brain size={15} /> },
  ];

  const pacientesFiltrados = pacientes.filter(p =>
    (p.nombre_completo ?? '').toLowerCase().includes(searchPac.toLowerCase()) ||
    (p.documento ?? '').includes(searchPac)
  );

  if (loadingData) {
    return (
      <Modal titulo="Nueva consulta" onClose={onClose} wide>
        <div className="py-12 text-center">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-emerald-600" />
          <p className="text-gray-500">Cargando datos...</p>
        </div>
      </Modal>
    );
  }

  // Información de la cita actualmente vinculada (para mostrar contexto)
  const citaActual = citaVinculada ? citas.find(c => String(c.id_cita) === String(citaVinculada)) : null;

  return (
    <Modal
      titulo={citaInicial ? 'Atender cita médica' : 'Consulta médica'}
      subtitulo={citaInicial ? 'Registra la atención de la cita seleccionada' : 'Completa todos los campos de la consulta'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Banner de cita vinculada (cuando viene de "Tomar cita") */}
        {citaInicial && citaActual && (
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-300 flex items-center gap-3">
            <div className="bg-emerald-600 rounded-lg p-2">
              <Calendar size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-700 uppercase">Atendiendo cita</p>
              <p className="text-sm font-semibold text-gray-900">
                {citaActual.paciente_nombre} · {citaActual.fecha} {citaActual.hora?.slice(0,5)}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Cita #{citaActual.id_cita} · Al guardar, se marcará como completada
              </p>
            </div>
            <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
          </div>
        )}

        {/* Selector de cita (sólo si NO vino preseleccionada) */}
        {!citaInicial && citas.length > 0 && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
            <Calendar size={16} className="text-emerald-600 flex-shrink-0" />
            <select value={citaVinculada} onChange={handleCitaSelect}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm">
              <option value="">— Vincular con cita programada (opcional) —</option>
              {citas.map(c => (
                <option key={c.id_cita} value={c.id_cita}>
                  {c.fecha} {c.hora?.slice(0,5)} · {c.paciente_nombre}
                </option>
              ))}
            </select>
            {citaVinculada && <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />}
          </div>
        )}

        {/* Tabs de navegación */}
        <div className="flex border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
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

        {/* ── TAB 0: ANAMNESIS ──────────────────────────────────────────────── */}
        {tab === 0 && (
          <div className="space-y-4">
            {/* Selector de paciente */}
            <Seccion titulo="Paciente *" color="blue">
              <div className="mb-2 relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
                <input type="text" placeholder="Filtrar por nombre o documento..."
                  value={searchPac} onChange={e => { setSearchPac(e.target.value); }}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <select name="id_paciente" value={form.id_paciente} onChange={handleForm} required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                <option value="">— Selecciona un paciente —</option>
                {pacientesFiltrados.map(p => (
                  <option key={p.id_paciente} value={p.id_paciente}>{p.nombre_completo} · {p.documento}</option>
                ))}
              </select>
            </Seccion>

            {/* Antecedentes del paciente (auto-carga) */}
            {antecedentes && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-amber-700 uppercase">Antecedentes de {antecedentes.nombre_completo}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-gray-700"><strong className="text-red-600">Sangre:</strong> {antecedentes.tipo_sangre || '—'}</span>
                  <span className="text-gray-700"><strong>Edad:</strong> {antecedentes.edad ?? '—'} años</span>
                  <span className="text-gray-700"><strong>Estado civil:</strong> {antecedentes.estado_civil || '—'}</span>
                </div>
                {antecedentes.alergias && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                    <strong>⚠ Alergias:</strong> {antecedentes.alergias}
                  </p>
                )}
                {antecedentes.enfermedades_cronicas && (
                  <p className="text-sm text-gray-700">
                    <strong>Enfermedades crónicas:</strong> {antecedentes.enfermedades_cronicas}
                  </p>
                )}
                {/* Historial de consultas anteriores */}
                {form.id_paciente && (
                  <button type="button" onClick={toggleHistorial}
                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium mt-1">
                    <BookOpen size={13} />
                    {historialOpen ? 'Ocultar historial' : 'Ver historial de consultas anteriores'}
                    {historialOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                )}
                {historialOpen && (
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {loadingHist ? (
                      <p className="text-xs text-gray-400">Cargando...</p>
                    ) : historial.length === 0 ? (
                      <p className="text-xs text-gray-400">Sin consultas anteriores registradas.</p>
                    ) : historial.map(h => (
                      <div key={h.id_consulta} className="bg-white rounded-lg p-2 border border-gray-100 text-xs">
                        <p className="font-semibold text-gray-700">{h.fecha_consulta?.slice(0,10)} — {h.motivo_consulta}</p>
                        {h.impresion_diagnostica && <p className="text-emerald-700">Dx: {h.impresion_diagnostica}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Motivo y enfermedad actual */}
            <Seccion titulo="Motivo y enfermedad actual" color="emerald">
              <div className="space-y-3">
                <Textarea label="Motivo de consulta *" name="motivo_consulta" value={form.motivo_consulta} onChange={handleForm}
                  placeholder="¿Por qué consulta el paciente hoy?" rows={2} required />
                <Textarea label="Enfermedad actual" name="enfermedad_actual" value={form.enfermedad_actual} onChange={handleForm}
                  placeholder="Describe la evolución de la enfermedad: inicio, duración, características, factores agravantes / atenuantes, tratamientos previos..." rows={4} />
              </div>
            </Seccion>

            {/* Revisión por sistemas */}
            <Seccion titulo="Revisión por sistemas" color="orange">
              <p className="text-xs text-gray-500 mb-3">Síntomas adicionales que el paciente refiere, no relacionados directamente con la enfermedad actual.</p>
              <div className="grid grid-cols-2 gap-2">
                {SISTEMAS.map(sistema => (
                  <div key={sistema} className="flex items-start gap-2 p-2 bg-white border border-gray-200 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 w-32 flex-shrink-0 pt-1">{sistema}</span>
                    <input
                      type="text"
                      placeholder="Síntomas o 'Negativo'"
                      onChange={e => {
                        // Actualizar revisión sistemas como texto estructurado
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
                      className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                  </div>
                ))}
              </div>
              {form.revision_sistemas && (
                <p className="text-xs text-gray-400 mt-2">
                  Vista previa: {form.revision_sistemas.split('\n').filter(Boolean).length} sistema(s) con hallazgos
                </p>
              )}
            </Seccion>
          </div>
        )}

        {/* ── TAB 1: EXAMEN ─────────────────────────────────────────────────── */}
        {tab === 1 && (
          <div className="space-y-4">
            {/* Signos vitales */}
            <Seccion titulo="Signos vitales" color="red">
              <div className="grid grid-cols-4 gap-3">
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

            {/* Examen físico */}
            <Seccion titulo="Examen físico" color="emerald">
              <Textarea name="examen_fisico" value={form.examen_fisico} onChange={handleForm}
                placeholder="Descripción del examen físico por sistemas: cardiopulmonar, abdomen, extremidades, neurológico, etc." rows={5} />
            </Seccion>

            {/* Exámenes complementarios */}
            <Seccion titulo="Exámenes complementarios" color="blue">
              <p className="text-xs text-gray-500 mb-2">
                Describe los exámenes solicitados o resultados de laboratorio / imágenes.
              </p>
              <Textarea name="examenes_complementarios" value={form.examenes_complementarios} onChange={handleForm}
                placeholder="Ej:&#10;- Hemograma: dentro de rangos normales&#10;- Glicemia: 180 mg/dL (elevada)&#10;- Rx tórax: sin consolidaciones&#10;- ECG: ritmo sinusal, sin alteraciones" rows={6} />
            </Seccion>
          </div>
        )}

        {/* ── TAB 2: DIAGNÓSTICO ────────────────────────────────────────────── */}
        {tab === 2 && (
          <div className="space-y-4">
            <Seccion titulo="Diagnósticos" color="purple">
              <p className="text-xs text-gray-500 mb-3">
                Define prioridad (1 = principal), tipo y código CIE-10 de cada diagnóstico.
              </p>
              <div className="space-y-3">
                {diagnosticos.map((d, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    {/* Cabecera del diagnóstico */}
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

                    {/* Descripción */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Descripción diagnóstica *</label>
                      <input value={d.descripcion} onChange={e => handleDx(idx, 'descripcion', e.target.value)}
                        placeholder="Ej: Diabetes mellitus tipo 2 sin complicaciones"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>

                    {/* Fila: CIE-10 + Tipo + Prioridad */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Código CIE-10</label>
                        <input value={d.codigo_cie10} onChange={e => handleDx(idx, 'codigo_cie10', e.target.value)}
                          placeholder="E11.9"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Tipo de diagnóstico</label>
                        <select value={d.tipo_dx} onChange={e => handleDx(idx, 'tipo_dx', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                          {TIPOS_DX.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Prioridad</label>
                        <select value={d.prioridad} onChange={e => handleDx(idx, 'prioridad', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                          {PRIORIDADES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Tipo categórico (tabla tipo_diagnostico) */}
                    {tiposDx.length > 0 && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Categoría (tabla tipo_diagnostico)</label>
                        <select value={d.id_tipo_diagnostico} onChange={e => handleDx(idx, 'id_tipo_diagnostico', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                          <option value="">Sin categoría</option>
                          {tiposDx.map(t => <option key={t.id_tipo_diagnostico} value={t.id_tipo_diagnostico}>{t.nombre}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addDx}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium">
                  <PlusCircle size={18} /> Agregar diagnóstico
                </button>
              </div>
            </Seccion>

            {/* Impresión diagnóstica libre */}
            <Seccion titulo="Impresión diagnóstica (texto libre)" color="emerald">
              <Textarea name="impresion_diagnostica" value={form.impresion_diagnostica} onChange={handleForm}
                placeholder="Resumen diagnóstico en texto libre..." rows={3} highlight />
            </Seccion>
          </div>
        )}

        {/* ── TAB 3: PLAN Y ANÁLISIS ────────────────────────────────────────── */}
        {tab === 3 && (
          <div className="space-y-4">
            <Seccion titulo="Análisis clínico del médico" color="blue">
              <p className="text-xs text-gray-500 mb-2">
                Razonamiento clínico: correlación entre síntomas, examen, diagnóstico y plan.
                "¿Por qué este diagnóstico? ¿Por qué este tratamiento?"
              </p>
              <Textarea name="analisis_clinico" value={form.analisis_clinico} onChange={handleForm}
                placeholder="Análisis y razonamiento clínico del médico tratante. Explica el proceso diagnóstico y la justificación del plan de manejo..." rows={5} />
            </Seccion>

            <Seccion titulo="Plan de tratamiento" color="emerald">
              <Textarea name="plan_tratamiento" value={form.plan_tratamiento} onChange={handleForm}
                placeholder="Medicamentos, dosis, duración&#10;Procedimientos indicados&#10;Interconsultas&#10;Recomendaciones no farmacológicas&#10;Actividad física / Dieta&#10;Próxima cita..." rows={6} />
            </Seccion>

            <Seccion titulo="Observaciones finales" color="orange">
              <Textarea name="observaciones" value={form.observaciones} onChange={handleForm}
                placeholder="Notas adicionales, incapacidad médica, advertencias especiales..." rows={3} />
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
          ) : (
            <div />
          )}
        </div>

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Guardar consulta" color="emerald" />
      </form>
    </Modal>
  );
}

// ─── Modal: Editar consulta ────────────────────────────────────────────────────
// Misma estructura que ModalCrear (Atender cita): 4 tabs completas con
// antecedentes del paciente, revisión por sistemas en grid, diagnósticos
// con CIE-10 + categoría, plan completo. El paciente está fijo (no se
// puede cambiar al editar) — se muestra como banner read-only en lugar
// del selector.
function ModalEditar({ consulta, onClose }) {
  const { usuarioLogueado } = useAuth();
  const [tab, setTab]   = useState(0);
  const [form, setForm] = useState({
    motivo_consulta:          consulta.motivo_consulta          ?? '',
    enfermedad_actual:        consulta.enfermedad_actual         ?? '',
    revision_sistemas:        consulta.revision_sistemas         ?? '',
    examen_fisico:            consulta.examen_fisico             ?? '',
    examenes_complementarios: consulta.examenes_complementarios  ?? '',
    impresion_diagnostica:    consulta.impresion_diagnostica     ?? '',
    analisis_clinico:         consulta.analisis_clinico          ?? '',
    plan_tratamiento:         consulta.plan_tratamiento          ?? '',
    observaciones:            consulta.observaciones             ?? '',
  });
  const [signos, setSignos] = useState({
    id_signos: null,
    presion_sistolica: '', presion_diastolica: '', frecuencia_cardiaca: '',
    frecuencia_respiratoria: '', temperatura: '', saturacion_oxigeno: '', peso: '', talla: '',
  });
  const [diagnosticos, setDiag]           = useState([]);
  const [tiposDx, setTiposDx]             = useState([]);
  const [antecedentes, setAntecedentes]   = useState(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [historial, setHistorial]         = useState([]);
  const [loadingHist, setLoadingHist]     = useState(false);
  const [loadingData, setLoadingData]     = useState(true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [visorAdjunto, setVisorAdjunto]   = useState(null);

  // Órdenes de exámenes existentes (las que ya estaban guardadas) + la nueva
  // que el médico puede agregar mientras edita.
  const [ordenesExistentes, setOrdenesExistentes] = useState([]);
  const [nuevaOrden, setNuevaOrden] = useState({
    items: [{ nombre: '', observaciones: '' }],
    indicaciones: '',
  });
  const [generandoPdfOrden, setGenerandoPdfOrden] = useState(false);

  // Adjuntos (uploads inmediatos — la consulta ya existe).
  const {
    adjuntos, loading: loadingAdj, subir: subirAdj, eliminar: eliminarAdj,
  } = useAdjuntos(consulta.id_consulta);

  // Carga inicial: signos, diagnósticos, tipos dx, antecedentes y órdenes de exámenes
  useEffect(() => {
    Promise.all([
      consultaService.getUltimoSignoConsulta(consulta.id_consulta),
      consultaService.getDiagnosticosConsultaSimple(consulta.id_consulta),
      consultaService.getTiposDiagnostico(),
      pacienteService.getAntecedentes(consulta.id_paciente).catch(() => null),
      // Órdenes ya guardadas para esta consulta. Si la tabla todavía no
      // existe en Supabase (migración no aplicada), caemos en []. silencioso.
      ordenExamenService.getPorConsulta(consulta.id_consulta).catch(() => []),
    ]).then(([sv, d, t, ant, ords]) => {
      setOrdenesExistentes(ords ?? []);
      if (sv) {
        setSignos({
          id_signos:               sv.id_signos,
          presion_sistolica:       sv.presion_sistolica       ?? '',
          presion_diastolica:      sv.presion_diastolica      ?? '',
          frecuencia_cardiaca:     sv.frecuencia_cardiaca     ?? '',
          frecuencia_respiratoria: sv.frecuencia_respiratoria ?? '',
          temperatura:             sv.temperatura             ?? '',
          saturacion_oxigeno:      sv.saturacion_oxigeno      ?? '',
          peso:                    sv.peso                    ?? '',
          talla:                   sv.talla                   ?? '',
        });
      }
      setDiag((d ?? []).map(x => ({
        id_diagnostico:      x.id_diagnostico,
        codigo_cie10:        x.codigo_cie10        ?? '',
        descripcion:         x.descripcion         ?? '',
        tipo_dx:             x.tipo_dx             ?? 'impresion',
        prioridad:           x.prioridad           ?? 1,
        id_tipo_diagnostico: x.id_tipo_diagnostico ?? '',
        es_principal:        !!x.es_principal,
      })));
      setTiposDx(t ?? []);
      setAntecedentes(ant);
      setLoadingData(false);
    });
  }, [consulta.id_consulta, consulta.id_paciente]);

  const handleForm   = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSignos = e => setSignos(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleDx     = (idx, field, val) =>
    setDiag(p => p.map((d, i) => i === idx ? { ...d, [field]: val } : d));
  const addDx    = () => setDiag(p => [...p, {
    id_diagnostico: null, codigo_cie10: '', descripcion: '',
    tipo_dx: 'impresion', prioridad: p.length + 1, id_tipo_diagnostico: '',
    es_principal: p.length === 0,
  }]);
  const removeDx = (idx) => setDiag(p => p.filter((_, i) => i !== idx));

  // ─── Handlers de la orden de exámenes (Tab 5) ────────────────────────
  const addExamen = () => setNuevaOrden(p => ({
    ...p, items: [...p.items, { nombre: '', observaciones: '' }],
  }));
  const removeExamen = (idx) => setNuevaOrden(p => ({
    ...p, items: p.items.filter((_, i) => i !== idx),
  }));
  const updateExamen = (idx, campo, valor) => setNuevaOrden(p => ({
    ...p,
    items: p.items.map((it, i) => i === idx ? { ...it, [campo]: valor } : it),
  }));
  const updateIndicaciones = (valor) =>
    setNuevaOrden(p => ({ ...p, indicaciones: valor }));

  const itemsValidos = nuevaOrden.items.filter(it => (it.nombre ?? '').trim());

  const handleDescargarOrden = async () => {
    if (itemsValidos.length === 0) {
      setError('Agrega al menos un examen antes de descargar la orden.');
      return;
    }
    setGenerandoPdfOrden(true);
    setError('');
    try {
      let medicoData = null;
      try {
        const idMedico = await consultaService.resolveIdMedico(usuarioLogueado?.id_persona);
        if (idMedico) medicoData = await medicoService.getById(idMedico);
      } catch (errM) {
        console.warn('[orden examenes] no se pudo cargar perfil médico:', errM.message);
      }
      // Paciente mínimo desde los campos que vienen en `consulta` (joined view).
      const pacienteCtx = {
        id_paciente:     consulta.id_paciente,
        nombre_completo: consulta.paciente_nombre,
        documento:       consulta.paciente_documento,
        tipo_documento:  consulta.paciente_tipo_documento,
        edad:            consulta.paciente_edad,
        genero:          consulta.paciente_genero,
        telefono:        consulta.paciente_telefono,
        numero_historia: consulta.numero_historia,
      };
      generarPdfOrdenExamenes({
        paciente: pacienteCtx,
        medico:   medicoData,
        medicoFallback: usuarioLogueado,
        cita:     { id_cita: consulta.id_cita },
        orden:    { items: itemsValidos, indicaciones: nuevaOrden.indicaciones },
      });
    } catch (err) {
      setError(`No se pudo generar la orden: ${err.message ?? err}`);
    } finally {
      setGenerandoPdfOrden(false);
    }
  };

  const toggleHistorial = async () => {
    if (!historialOpen && historial.length === 0) {
      setLoadingHist(true);
      try {
        const data = await consultaService.getConsultasPacienteResumen(consulta.id_paciente, 5);
        // Excluir la consulta actual del historial (solo mostrar las anteriores)
        setHistorial((data ?? []).filter(h => h.id_consulta !== consulta.id_consulta));
      } finally {
        setLoadingHist(false);
      }
    }
    setHistorialOpen(p => !p);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await consultaService.editarConsultaCompleta(
        consulta.id_consulta,
        consulta.id_paciente,
        { consulta: { ...form }, diagnosticos, signos },
        signos.id_signos,
      );

      // Si el médico agregó exámenes nuevos al editar, crearlos como orden
      // adicional ligada a esta consulta (no toca las órdenes previas).
      if (itemsValidos.length > 0) {
        try {
          const idMedico = await consultaService.resolveIdMedico(usuarioLogueado?.id_persona);
          if (idMedico) {
            await ordenExamenService.crearConItems({
              id_consulta: consulta.id_consulta,
              id_paciente: consulta.id_paciente,
              id_medico:   idMedico,
              indicaciones: nuevaOrden.indicaciones,
              items:        itemsValidos,
            });
          }
        } catch (errOrd) {
          console.warn('[ModalEditar] orden de exámenes con error:', errOrd.message);
          // No abortamos: la consulta ya quedó guardada.
        }
      }

      onClose();
    } catch (err) {
      setError(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: 0, label: 'Anamnesis',   icon: <BookOpen size={15} /> },
    { id: 1, label: 'Examen',      icon: <Stethoscope size={15} /> },
    { id: 2, label: 'Diagnóstico', icon: <ClipboardList size={15} /> },
    { id: 3, label: 'Plan',        icon: <Brain size={15} /> },
    { id: 4, label: 'Adjuntos',    icon: <Paperclip size={15} /> },
    { id: 5, label: 'Exámenes',    icon: <FlaskConical size={15} /> },
  ];

  if (loadingData) {
    return (
      <Modal titulo="Editar consulta" onClose={onClose} wide>
        <div className="py-12 text-center">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-emerald-600" />
          <p className="text-gray-500">Cargando datos de la consulta...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="Editar consulta"
      subtitulo="Actualiza la información de la atención registrada"
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Banner paciente (read-only — no se puede cambiar al editar) */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-300 flex items-center gap-3">
          <div className="bg-emerald-600 rounded-lg p-2">
            <User size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-700 uppercase">Paciente</p>
            <p className="text-sm font-semibold text-gray-900">{consulta.paciente_nombre}</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {consulta.paciente_documento} · HC {consulta.numero_historia} · Consulta #{consulta.id_consulta} · {consulta.fecha_consulta?.slice(0, 10)}
            </p>
          </div>
          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
        </div>

        {/* Tabs de navegación */}
        <div className="flex border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
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

        {/* ── TAB 0: ANAMNESIS ──────────────────────────────────────────────── */}
        {tab === 0 && (
          <div className="space-y-4">
            {/* Antecedentes del paciente */}
            {antecedentes && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-amber-700 uppercase">Antecedentes de {antecedentes.nombre_completo}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="text-gray-700"><strong className="text-red-600">Sangre:</strong> {antecedentes.tipo_sangre || '—'}</span>
                  <span className="text-gray-700"><strong>Edad:</strong> {antecedentes.edad ?? '—'} años</span>
                  <span className="text-gray-700"><strong>Estado civil:</strong> {antecedentes.estado_civil || '—'}</span>
                </div>
                {antecedentes.alergias && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                    <strong>⚠ Alergias:</strong> {antecedentes.alergias}
                  </p>
                )}
                {antecedentes.enfermedades_cronicas && (
                  <p className="text-sm text-gray-700">
                    <strong>Enfermedades crónicas:</strong> {antecedentes.enfermedades_cronicas}
                  </p>
                )}
                <button type="button" onClick={toggleHistorial}
                  className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 font-medium mt-1">
                  <BookOpen size={13} />
                  {historialOpen ? 'Ocultar historial' : 'Ver historial de consultas anteriores'}
                  {historialOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {historialOpen && (
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {loadingHist ? (
                      <p className="text-xs text-gray-400">Cargando...</p>
                    ) : historial.length === 0 ? (
                      <p className="text-xs text-gray-400">Sin consultas anteriores registradas.</p>
                    ) : historial.map(h => (
                      <div key={h.id_consulta} className="bg-white rounded-lg p-2 border border-gray-100 text-xs">
                        <p className="font-semibold text-gray-700">{h.fecha_consulta?.slice(0,10)} — {h.motivo_consulta}</p>
                        {h.impresion_diagnostica && <p className="text-emerald-700">Dx: {h.impresion_diagnostica}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Motivo y enfermedad actual */}
            <Seccion titulo="Motivo y enfermedad actual" color="emerald">
              <div className="space-y-3">
                <Textarea label="Motivo de consulta *" name="motivo_consulta" value={form.motivo_consulta} onChange={handleForm}
                  placeholder="¿Por qué consulta el paciente hoy?" rows={2} required />
                <Textarea label="Enfermedad actual" name="enfermedad_actual" value={form.enfermedad_actual} onChange={handleForm}
                  placeholder="Describe la evolución de la enfermedad: inicio, duración, características, factores agravantes / atenuantes, tratamientos previos..." rows={4} />
              </div>
            </Seccion>

            {/* Revisión por sistemas */}
            <Seccion titulo="Revisión por sistemas" color="orange">
              <p className="text-xs text-gray-500 mb-3">Síntomas adicionales que el paciente refiere, no relacionados directamente con la enfermedad actual.</p>
              <div className="grid grid-cols-2 gap-2">
                {SISTEMAS.map(sistema => (
                  <div key={sistema} className="flex items-start gap-2 p-2 bg-white border border-gray-200 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 w-32 flex-shrink-0 pt-1">{sistema}</span>
                    <input
                      type="text"
                      placeholder="Síntomas o 'Negativo'"
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
                      className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                  </div>
                ))}
              </div>
              {form.revision_sistemas && (
                <p className="text-xs text-gray-400 mt-2">
                  Vista previa: {form.revision_sistemas.split('\n').filter(Boolean).length} sistema(s) con hallazgos
                </p>
              )}
            </Seccion>
          </div>
        )}

        {/* ── TAB 1: EXAMEN ─────────────────────────────────────────────────── */}
        {tab === 1 && (
          <div className="space-y-4">
            {/* Signos vitales */}
            <Seccion titulo="Signos vitales" color="red">
              <div className="grid grid-cols-4 gap-3">
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
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                      <input type="number" step="0.1" name={name} value={signos[name]} onChange={handleSignos}
                        className="flex-1 px-2 py-2 text-sm focus:outline-none min-w-0" />
                      <span className="px-2 text-xs text-gray-400 bg-gray-50 border-l border-gray-300">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Seccion>

            {/* Examen físico */}
            <Seccion titulo="Examen físico" color="emerald">
              <Textarea name="examen_fisico" value={form.examen_fisico} onChange={handleForm}
                placeholder="Descripción del examen físico por sistemas: cardiopulmonar, abdomen, extremidades, neurológico, etc." rows={5} />
            </Seccion>

            {/* Exámenes complementarios */}
            <Seccion titulo="Exámenes complementarios" color="blue">
              <p className="text-xs text-gray-500 mb-2">
                Describe los exámenes solicitados o resultados de laboratorio / imágenes.
              </p>
              <Textarea name="examenes_complementarios" value={form.examenes_complementarios} onChange={handleForm}
                placeholder="Ej:&#10;- Hemograma: dentro de rangos normales&#10;- Glicemia: 180 mg/dL (elevada)&#10;- Rx tórax: sin consolidaciones&#10;- ECG: ritmo sinusal, sin alteraciones" rows={6} />
            </Seccion>
          </div>
        )}

        {/* ── TAB 2: DIAGNÓSTICO ────────────────────────────────────────────── */}
        {tab === 2 && (
          <div className="space-y-4">
            <Seccion titulo="Diagnósticos" color="purple">
              <p className="text-xs text-gray-500 mb-3">
                Define prioridad (1 = principal), tipo y código CIE-10 de cada diagnóstico.
              </p>
              <div className="space-y-3">
                {diagnosticos.length === 0 && (
                  <p className="text-sm text-gray-400 italic">Sin diagnósticos. Agrega uno abajo.</p>
                )}
                {diagnosticos.map((d, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    {/* Cabecera del diagnóstico */}
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
                      <button type="button" onClick={() => removeDx(idx)} className="text-red-400 hover:text-red-600">
                        <MinusCircle size={18} />
                      </button>
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Descripción diagnóstica *</label>
                      <input value={d.descripcion} onChange={e => handleDx(idx, 'descripcion', e.target.value)}
                        placeholder="Ej: Diabetes mellitus tipo 2 sin complicaciones"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>

                    {/* Fila: CIE-10 + Tipo + Prioridad */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Código CIE-10</label>
                        <input value={d.codigo_cie10} onChange={e => handleDx(idx, 'codigo_cie10', e.target.value)}
                          placeholder="E11.9"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 font-mono" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Tipo de diagnóstico</label>
                        <select value={d.tipo_dx} onChange={e => handleDx(idx, 'tipo_dx', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                          {TIPOS_DX.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Prioridad</label>
                        <select value={d.prioridad} onChange={e => handleDx(idx, 'prioridad', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                          {PRIORIDADES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Tipo categórico (tabla tipo_diagnostico) */}
                    {tiposDx.length > 0 && (
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Categoría (tabla tipo_diagnostico)</label>
                        <select value={d.id_tipo_diagnostico} onChange={e => handleDx(idx, 'id_tipo_diagnostico', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                          <option value="">Sin categoría</option>
                          {tiposDx.map(t => <option key={t.id_tipo_diagnostico} value={t.id_tipo_diagnostico}>{t.nombre}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addDx}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-800 font-medium">
                  <PlusCircle size={18} /> Agregar diagnóstico
                </button>
              </div>
            </Seccion>

            {/* Impresión diagnóstica libre */}
            <Seccion titulo="Impresión diagnóstica (texto libre)" color="emerald">
              <Textarea name="impresion_diagnostica" value={form.impresion_diagnostica} onChange={handleForm}
                placeholder="Resumen diagnóstico en texto libre..." rows={3} highlight />
            </Seccion>
          </div>
        )}

        {/* ── TAB 3: PLAN Y ANÁLISIS ────────────────────────────────────────── */}
        {tab === 3 && (
          <div className="space-y-4">
            <Seccion titulo="Análisis clínico del médico" color="blue">
              <p className="text-xs text-gray-500 mb-2">
                Razonamiento clínico: correlación entre síntomas, examen, diagnóstico y plan.
                "¿Por qué este diagnóstico? ¿Por qué este tratamiento?"
              </p>
              <Textarea name="analisis_clinico" value={form.analisis_clinico} onChange={handleForm}
                placeholder="Análisis y razonamiento clínico del médico tratante. Explica el proceso diagnóstico y la justificación del plan de manejo..." rows={5} />
            </Seccion>

            <Seccion titulo="Plan de tratamiento" color="emerald">
              <Textarea name="plan_tratamiento" value={form.plan_tratamiento} onChange={handleForm}
                placeholder="Medicamentos, dosis, duración&#10;Procedimientos indicados&#10;Interconsultas&#10;Recomendaciones no farmacológicas&#10;Actividad física / Dieta&#10;Próxima cita..." rows={6} />
            </Seccion>

            <Seccion titulo="Observaciones finales" color="orange">
              <Textarea name="observaciones" value={form.observaciones} onChange={handleForm}
                placeholder="Notas adicionales, incapacidad médica, advertencias especiales..." rows={3} />
            </Seccion>
          </div>
        )}

        {/* ── TAB 4: ADJUNTOS (uploads inmediatos sobre la consulta existente) */}
        {tab === 4 && (
          <div className="space-y-4">
            <Seccion titulo="Resultados, radiografías y otros archivos" color="purple">
              <p className="text-xs text-gray-500 mb-3">
                Sube PDFs (resultados de laboratorio) o imágenes (radiografías,
                ecografías, fotografías clínicas). Los archivos se guardan
                inmediatamente — no necesitas hacer clic en "Guardar cambios".
              </p>

              <FileUpload
                onUpload={(file, descripcion) => subirAdj(file, descripcion)}
                placeholder="Arrastra archivos aquí o haz clic para seleccionar (PDF, imágenes)"
              />

              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Archivos adjuntos {adjuntos.length > 0 && (
                    <span className="text-gray-400 font-normal normal-case">({adjuntos.length})</span>
                  )}
                </p>
                <AdjuntoList
                  adjuntos={adjuntos}
                  loading={loadingAdj}
                  onPreview={setVisorAdjunto}
                  onDelete={async (a) => {
                    if (!window.confirm(`¿Eliminar "${a.nombre_archivo}"? No se podrá recuperar.`)) return;
                    try { await eliminarAdj(a); }
                    catch (err) { setError(err.message); }
                  }}
                  emptyMessage="Aún no hay archivos adjuntos en esta consulta."
                />
              </div>
            </Seccion>
          </div>
        )}

        {/* ── TAB 5: ÓRDENES DE EXÁMENES ──────────────────────────────────── */}
        {tab === 5 && (
          <div className="space-y-4">
            {/* Órdenes ya guardadas para esta consulta (read-only) */}
            {ordenesExistentes.length > 0 && (
              <Seccion titulo={`Órdenes existentes (${ordenesExistentes.length})`} color="purple">
                <p className="text-[12px] text-ink-500 mb-3">
                  Estas órdenes ya fueron emitidas para esta consulta. Si necesitas
                  pedir exámenes adicionales agrégalos abajo.
                </p>
                <div className="space-y-2.5">
                  {ordenesExistentes.map(o => {
                    const items = Array.isArray(o.items) ? o.items : [];
                    return (
                      <div key={o.id_orden_examen} className="rounded-md border border-violet-100 bg-violet-50/40 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-[12px] font-medium text-violet-800">
                            <span className="font-mono">{o.numero_orden ?? '—'}</span>
                            <span className="text-ink-500 font-normal">
                              {' · '}
                              {o.fecha_emision
                                ? new Date(o.fecha_emision).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                                : '—'}
                            </span>
                          </p>
                          <span className="text-[10.5px] text-violet-700 font-medium tabular-nums">
                            {items.length} examen{items.length === 1 ? '' : 'es'}
                          </span>
                        </div>
                        <ul className="space-y-0.5 text-[12px] text-ink-800">
                          {items.map(it => (
                            <li key={it.id_item} className="flex items-start gap-2">
                              <span className="inline-flex w-4 h-4 items-center justify-center rounded-sm bg-violet-100 text-violet-700 text-[9px] font-semibold tabular-nums flex-shrink-0 mt-0.5">
                                {it.orden}
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium">{it.nombre}</p>
                                {it.observaciones && (
                                  <p className="text-[11px] text-ink-500 italic">{it.observaciones}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                        {o.indicaciones && (
                          <p className="mt-2 pt-1.5 border-t border-violet-100/70 text-[11.5px] text-ink-700">
                            <span className="font-medium">Indicaciones:</span> {o.indicaciones}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Seccion>
            )}

            {/* Nueva orden a agregar */}
            <Seccion
              titulo={ordenesExistentes.length > 0 ? 'Agregar otra orden' : 'Solicitud de exámenes'}
              color="purple"
            >
              <p className="text-[12px] text-ink-500 mb-3">
                Ingresa los exámenes a solicitar. Al{' '}
                <strong className="font-medium">guardar cambios</strong>{' '}
                la orden queda registrada en la historia clínica del paciente. Mientras tanto puedes
                descargar el PDF para entregarle al paciente.
              </p>

              <div className="space-y-2">
                {nuevaOrden.items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-line bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-2 text-[11px] font-medium text-violet-700">
                        <span className="inline-flex w-5 h-5 items-center justify-center rounded-md bg-violet-50 border border-violet-100 tabular-nums font-semibold">
                          {idx + 1}
                        </span>
                        Examen
                      </span>
                      {nuevaOrden.items.length > 1 && (
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
                value={nuevaOrden.indicaciones}
                onChange={(e) => updateIndicaciones(e.target.value)}
                placeholder="Indicaciones para el paciente, preparación general, urgencia, lugar sugerido para realizar los exámenes…"
                rows={3}
              />
            </Seccion>

            {/* Resumen + descarga PDF */}
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10.5px] uppercase tracking-[0.12em] font-medium text-violet-700">
                    Resumen de la nueva orden
                  </p>
                  <p className="text-[13.5px] font-semibold text-ink-900 mt-1">
                    {itemsValidos.length} examen{itemsValidos.length === 1 ? '' : 'es'} a solicitar
                  </p>
                  <p className="text-[11.5px] text-ink-500 mt-0.5">
                    Para <span className="font-medium text-ink-700">{consulta.paciente_nombre ?? '—'}</span>
                    {consulta.paciente_documento && ` · ${consulta.paciente_documento}`}
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
          ) : (
            <div />
          )}
        </div>

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Guardar cambios" color="emerald" />
      </form>

      {/* Visor full-screen para previsualizar adjuntos */}
      {visorAdjunto && <AdjuntoViewer adjunto={visorAdjunto} onClose={() => setVisorAdjunto(null)} />}
    </Modal>
  );
}

// ─── Sub-componentes UI ────────────────────────────────────────────────────────
function Modal({ titulo, subtitulo, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 motion-safe:[animation:hp-fade-up_0.2s_ease-out]">
      <div className={`relative bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] border border-line w-full max-h-[90vh] overflow-hidden flex flex-col ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex justify-between items-start gap-4 z-10">
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-emerald-500" />
          <div className="ml-2 min-w-0">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink-900 truncate">{titulo}</h2>
            {subtitulo && <p className="text-[12.5px] text-ink-500 truncate mt-0.5">{subtitulo}</p>}
          </div>
          <button onClick={onClose} className="flex-shrink-0 -mt-0.5 -mr-1 text-ink-300 hover:text-ink-900 hover:bg-surface p-1.5 rounded-lg transition-colors">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

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

function Campo({ label, value, highlight = false, className = '' }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${highlight ? 'bg-emerald-100/70 border border-emerald-200' : 'bg-white border border-line'} ${className}`}>
      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 text-[13px] font-medium text-ink-900 whitespace-pre-wrap break-words">
        {value || <span className="text-ink-300 font-normal">—</span>}
      </p>
    </div>
  );
}

function CampoReadOnly({ label, value }) {
  return (
    <div>
      <p className="text-[11.5px] font-medium text-ink-500">{label}</p>
      <p className="text-[13px] font-medium text-ink-800 mt-0.5">{value || <span className="text-ink-300">—</span>}</p>
    </div>
  );
}

function Textarea({ label, name, value, onChange, rows = 2, required = false, placeholder = '', highlight = false }) {
  return (
    <div>
      <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">{label}</label>
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

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div role="alert" className="flex items-start gap-2.5 text-[13px] text-red-700 bg-red-50/70 border-l-2 border-red-500 pl-3 pr-3 py-2.5 rounded-r-md">
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} /> {msg}
    </div>
  );
}

function BotonesForm({ onCancel, saving, labelSave, color = 'blue' }) {
  const primary = color === 'emerald'
    ? 'bg-emerald-700 hover:bg-emerald-800'
    : 'bg-ink-900 hover:bg-ink-800';
  return (
    <div className="flex gap-3 pt-5 mt-1 border-t border-line">
      <button type="button" onClick={onCancel} disabled={saving}
        className="flex-1 px-5 py-2.5 bg-white border border-line text-ink-800 rounded-xl hover:bg-surface hover:border-ink-100 active:scale-[0.99] transition-all duration-150 text-[13.5px] font-medium disabled:opacity-60">
        Cancelar
      </button>
      <button type="submit" disabled={saving}
        className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 ${primary} text-white rounded-xl text-[13.5px] font-medium shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_24px_-14px_rgba(11,18,32,0.40)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed`}>
        {saving
          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando…</>
          : labelSave}
      </button>
    </div>
  );
}
