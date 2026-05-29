import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Search, Edit, Trash2, Eye,
  AlertCircle, Loader2, User, Stethoscope,
  CheckCircle, FileText
} from 'lucide-react';
import { citaService } from '../../../services';
import { useCitas, usePacientesCatalogo, useMedicosActivos } from '../../../hooks';
import { horarioService, tipoConsultaService } from '../../../services';
import {
  Modal, PageHeader, KPI, Campo, CampoReadOnly, ErrorBox, ErrorBanner,
  BotonesForm, SearchBar, LoadingRow, EmptyRow, EstadoBadge, estadoLabel, estadoCls,
  Toolbar, AccentButton, TabPills, TableShell, Thead, Tbody, Tr,
  IconButton, ActionGroup, Avatar,
} from '../../../shared/components/ui';

// ─── Constantes ────────────────────────────────────────────────────────────────
const ESTADOS = ['programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio'];
const FILTROS  = ['todos', ...ESTADOS];

// Helper para el filtro 'todos' (no es un estado válido para EstadoBadge).
const labelFiltro = (e) => (e === 'todos' ? 'Todos' : estadoLabel('cita', e));

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Citas() {
  const {
    citas, loading, error, setError,
    reload: cargar, softDelete,
  } = useCitas({ role: 'admin', realtime: true });
  const [search, setSearch]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFecha, setFiltroFecha]   = useState('');
  const [detalle, setDetalle]       = useState(null);
  const [editando, setEditando]     = useState(null);
  const [creando, setCreando]       = useState(false);

  const filtered = citas.filter(c => {
    const term = search.toLowerCase();
    const matchSearch =
      (c.paciente_nombre    ?? '').toLowerCase().includes(term) ||
      (c.medico_nombre      ?? '').toLowerCase().includes(term) ||
      (c.paciente_documento ?? '').includes(search) ||
      (c.motivo             ?? '').toLowerCase().includes(term);
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
    const matchFecha  = !filtroFecha || (c.fecha ?? '').startsWith(filtroFecha);
    return matchSearch && matchEstado && matchFecha;
  });

  const counts = ESTADOS.reduce((acc, e) => {
    acc[e] = citas.filter(c => c.estado === e).length;
    return acc;
  }, {});

  const eliminar = async (c) => {
    if (!window.confirm(`¿Enviar a papelera la cita de ${c.paciente_nombre}?\n\nNo se borra físicamente — un admin puede restaurarla.`)) return;
    // Soft-delete: marca deleted_at, conserva el registro para auditoría/recuperación.
    try {
      await softDelete(c.id_cita);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Gestión de Citas"
        descripcion="Agenda completa del centro médico"
        eyebrow="Citas"
        icon={<Calendar size={11} strokeWidth={2.25} />}
        variant="blue"
      >
        <KPI label="Total"   value={loading ? '···' : citas.length} />
        <KPI label="Hoy"     value={loading ? '···' : citas.filter(c => c.fecha === new Date().toISOString().split('T')[0]).length} />
        <KPI label="Pendientes" value={loading ? '···' : (counts.programada ?? 0) + (counts.confirmada ?? 0)} color="text-brand-700" />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />

      {/* Filtros */}
      <div className="space-y-3">
        <Toolbar>
          <SearchBar
            className="min-w-[220px]"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por paciente, médico, documento o motivo…"
          />
          <input
            type="date"
            value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
            className="px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
          />
          <div className="flex-1" />
          <AccentButton variant="blue" icon={Calendar} onClick={() => setCreando(true)}>
            Nueva cita
          </AccentButton>
        </Toolbar>

        <TabPills
          value={filtroEstado}
          onChange={setFiltroEstado}
          accent="blue"
          options={FILTROS.map(f => ({
            value: f,
            label: labelFiltro(f),
            count: f === 'todos' ? citas.length : (counts[f] ?? 0),
          }))}
        />
      </div>

      {/* Tabla */}
      <TableShell>
        <Thead columnas={[
          'Fecha / Hora', 'Paciente', 'Médico', 'Tipo', 'Motivo',
          { label: 'Estado', align: 'center' },
          { label: 'Acciones', align: 'center' },
        ]} />
        <Tbody>
          {loading ? (
            <LoadingRow colSpan={7} mensaje="Cargando citas…" />
          ) : filtered.length === 0 ? (
            <EmptyRow colSpan={7} icon={Calendar} mensaje="No hay citas que coincidan" />
          ) : filtered.map((c) => (
            <Tr key={c.id_cita}>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink-900">
                  <Calendar size={13} className="text-brand-600" strokeWidth={1.75} />
                  {c.fecha ?? '—'}
                </div>
                <div className="flex items-center gap-1.5 text-[11.5px] text-ink-500 mt-1">
                  <Clock size={11} strokeWidth={1.75} />
                  {c.hora?.slice(0, 5) ?? '—'}
                </div>
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.paciente_nombre} tone={c.paciente_eliminado ? 'muted' : 'brand'} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[13px] font-medium ${c.paciente_eliminado ? 'text-ink-500 line-through' : 'text-ink-900'}`}>
                        {c.paciente_nombre ?? '—'}
                      </p>
                      {c.paciente_eliminado && (
                        <span title="Paciente eliminado — disponible en Papelera" className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                          <AlertCircle size={9} /> Eliminado
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-ink-500 font-mono">{c.paciente_documento}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Stethoscope size={14} className={`flex-shrink-0 ${c.medico_eliminado ? 'text-ink-300' : 'text-violet-600'}`} strokeWidth={1.75} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[13px] font-medium ${c.medico_eliminado ? 'text-ink-500 line-through' : 'text-ink-900'}`}>
                        {c.medico_nombre ?? '—'}
                      </p>
                      {c.medico_eliminado && (
                        <span title="Médico eliminado — disponible en Papelera" className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                          <AlertCircle size={9} /> Eliminado
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-ink-500">{c.medico_especialidad}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5 text-[13px] text-ink-700">{c.tipo_consulta_nombre ?? '—'}</td>
              <td className="px-5 py-3.5 text-[13px] text-ink-700 max-w-[180px] truncate" title={c.motivo}>
                {c.motivo ?? '—'}
              </td>
              <td className="px-5 py-3.5 text-center">
                <EstadoBadge type="cita" estado={c.estado} />
              </td>
              <td className="px-5 py-3.5">
                <ActionGroup>
                  <IconButton icon={Eye}    tone="brand" title="Ver"      onClick={() => setDetalle(c)}  />
                  <IconButton icon={Edit}   tone="indigo" title="Editar"  onClick={() => setEditando(c)} />
                  <IconButton icon={Trash2} tone="red"   title="Eliminar" onClick={() => eliminar(c)}    />
                </ActionGroup>
              </td>
            </Tr>
          ))}
        </Tbody>
      </TableShell>

      {detalle  && <ModalDetalle cita={detalle}  onClose={() => setDetalle(null)} />}
      {editando && <ModalEditar  cita={editando} onClose={() => { setEditando(null); cargar(); }} />}
      {creando  && <ModalCrear   onClose={() => { setCreando(false); cargar(); }} />}
    </div>
  );
}

// ─── Modal: Ver detalles ───────────────────────────────────────────────────────
function ModalDetalle({ cita: c, onClose }) {
  return (
    <Modal titulo="Detalles de la cita" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Fecha"            value={c.fecha} />
        <Campo label="Hora"             value={c.hora?.slice(0, 5)} />
        <div className={`col-span-2 p-3 rounded-lg border text-center ${estadoCls('cita', c.estado)}`}>
          <p className="text-xs font-bold uppercase">Estado</p>
          <p className="font-bold capitalize text-lg">{estadoLabel('cita', c.estado)}</p>
        </div>
        {(c.paciente_eliminado || c.medico_eliminado) && (
          <div className="col-span-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>Aviso histórico:</strong>{' '}
              {c.paciente_eliminado && <span>el paciente fue eliminado. </span>}
              {c.medico_eliminado && <span>el médico fue eliminado. </span>}
              Ambos están disponibles en Papelera.
            </div>
          </div>
        )}
        <Campo label="Paciente"         value={c.paciente_nombre + (c.paciente_eliminado ? ' (eliminado)' : '')} />
        <Campo label="Documento"        value={c.paciente_documento} />
        <Campo label="Teléfono pac."    value={c.paciente_telefono} />
        <Campo label="Email pac."       value={c.paciente_email} />
        <Campo label="Médico"           value={c.medico_nombre} />
        <Campo label="Especialidad"     value={c.medico_especialidad} />
        <Campo label="Consultorio"      value={c.medico_consultorio} />
        <Campo label="Tipo consulta"    value={c.tipo_consulta_nombre} />
        <Campo label="Motivo"           value={c.motivo} className="col-span-2" />
        <Campo label="Observaciones"    value={c.observaciones} className="col-span-2" />
        <Campo label="Historia"         value={c.numero_historia} />
        <Campo label="Creada"           value={c.created_at?.slice(0, 16).replace('T', ' ')} />
      </div>
    </Modal>
  );
}

// ─── Helpers para horario / día ────────────────────────────────────────────────
const DIAS_JS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const diaSemanaDe = (fechaISO) => {
  if (!fechaISO) return null;
  const [y, m, d] = fechaISO.split('-').map(Number);
  return DIAS_JS[new Date(y, m - 1, d).getDay()];
};
const horaAMin = (t) => {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

// ─── Modal: Crear ──────────────────────────────────────────────────────────────
//
// Flujo: paciente → fecha → médico → "Elegir hora" (modal de slots de 15min)
// El selector de hora muestra las franjas del médico para ese día de la semana,
// dividido en bloques de 15 minutos, y deshabilita los slots ya ocupados por
// otras citas (excluyendo canceladas).
//
function ModalCrear({ onClose }) {
  const [form, setForm] = useState({
    id_paciente: '', id_medico: '', id_tipo_consulta: '',
    fecha: '', hora: '', estado: 'programada', motivo: '', observaciones: '',
  });
  const { pacientes: pacs } = usePacientesCatalogo();
  const { medicos: meds }   = useMedicosActivos();
  const [tiposConsulta, setTiposConsulta] = useState([]);
  const [horarios, setHorarios]           = useState([]);   // franjas de todos los médicos
  const [horasOcupadas, setHorasOcupadas] = useState([]);   // HH:mm ya tomadas por el médico en esa fecha
  const [loadingOcupadas, setLoadingOcupadas] = useState(false);
  const [loadingData, setLoadingData]     = useState(true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [searchPac, setSearchPac]         = useState('');
  const [searchMed, setSearchMed]         = useState('');
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const pacientes = pacs;
  const medicos = meds;

  useEffect(() => {
    Promise.all([
      tipoConsultaService.getAll(),
      horarioService.getDisponibles(),
    ]).then(([tipos, hors]) => {
      setTiposConsulta(tipos);
      setHorarios(hors);
    }).finally(() => setLoadingData(false));
  }, []);

  // Cada vez que cambian fecha + médico: recargar las horas ocupadas de ese
  // médico en esa fecha y limpiar la hora ya elegida (puede dejar de ser válida).
  useEffect(() => {
    if (!form.fecha || !form.id_medico) { setHorasOcupadas([]); return; }
    setForm(p => p.hora ? ({ ...p, hora: '' }) : p);
    let cancelado = false;
    setLoadingOcupadas(true);
    citaService.getHorasOcupadasMedico(Number(form.id_medico), form.fecha)
      .then(horas => { if (!cancelado) setHorasOcupadas(horas); })
      .catch(err => { if (!cancelado) console.error('[getHorasOcupadasMedico]', err); })
      .finally(() => { if (!cancelado) setLoadingOcupadas(false); });
    return () => { cancelado = true; };
  }, [form.fecha, form.id_medico]);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.id_paciente || !form.id_medico || !form.fecha || !form.hora) return;
    setSaving(true);
    setError('');
    try {
      await citaService.crear({
        id_paciente:      Number(form.id_paciente),
        id_medico:        Number(form.id_medico),
        id_tipo_consulta: form.id_tipo_consulta ? Number(form.id_tipo_consulta) : null,
        fecha:            form.fecha,
        hora:             form.hora,
        estado:           form.estado,
        motivo:           form.motivo,
        observaciones:    form.observaciones,
      });
      onClose();
    } catch (err) {
      console.error('[ModalCrear Cita]', err);
      setError(err.message ?? 'Error al crear cita');
    } finally {
      setSaving(false);
    }
  };

  const pacientesFiltrados = pacientes.filter(p =>
    (p.nombre_completo ?? '').toLowerCase().includes(searchPac.toLowerCase()) ||
    (p.documento ?? '').includes(searchPac)
  );

  const medicosFiltrados = medicos.filter(m =>
    (m.nombre_completo ?? '').toLowerCase().includes(searchMed.toLowerCase()) ||
    (m.especialidad ?? '').toLowerCase().includes(searchMed.toLowerCase())
  );

  const medicoSel = medicos.find(m => String(m.id_medico) === String(form.id_medico)) ?? null;
  const dia       = diaSemanaDe(form.fecha);
  const puedeElegirHora = !!(form.fecha && form.id_medico);

  if (loadingData) {
    return (
      <Modal titulo="Nueva cita" onClose={onClose}>
        <div className="py-12 text-center">
          <Loader2 size={24} className="mx-auto mb-2 animate-spin text-brand-600" strokeWidth={1.75} />
          <p className="text-[13px] text-ink-500">Cargando datos…</p>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal titulo="Nueva cita" subtitulo="Agendar una cita médica" onClose={onClose} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Paciente */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-ink-500" /> Paciente *
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink-300 pointer-events-none" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Filtrar por nombre o documento…"
                value={searchPac}
                onChange={e => { setSearchPac(e.target.value); setForm(p => ({ ...p, id_paciente: '' })); }}
                className="w-full pl-9 pr-3.5 py-2 text-[13px] bg-white border border-line rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
            <select
              name="id_paciente" value={form.id_paciente} onChange={handleChange} required
              className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
            >
              <option value="">— Selecciona un paciente —</option>
              {pacientesFiltrados.map(p => (
                <option key={p.id_paciente} value={p.id_paciente}>
                  {p.nombre_completo} · {p.documento}
                </option>
              ))}
            </select>
            {form.id_paciente && (
              <p className="text-[11.5px] text-emerald-700 mt-1.5 flex items-center gap-1">
                <CheckCircle size={11} strokeWidth={2} /> Paciente seleccionado
              </p>
            )}
            {pacientes.length === 0 && (
              <p className="text-[11.5px] text-amber-700 mt-1.5">No hay pacientes registrados aún.</p>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-ink-500" /> Fecha *
            </label>
            <input
              name="fecha" type="date" value={form.fecha}
              onChange={handleChange} required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
            />
            {form.fecha && dia && (
              <p className="text-[11.5px] text-ink-500 mt-1.5">
                <span className="capitalize font-medium text-ink-700">{dia}</span> ·
                {' '}{new Date(form.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Médico */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
              <Stethoscope size={14} className="text-ink-500" /> Médico *
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-ink-300 pointer-events-none" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Filtrar por nombre o especialidad…"
                value={searchMed}
                onChange={e => { setSearchMed(e.target.value); setForm(p => ({ ...p, id_medico: '' })); }}
                className="w-full pl-9 pr-3.5 py-2 text-[13px] bg-white border border-line rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              />
            </div>
            <select
              name="id_medico" value={form.id_medico} onChange={handleChange} required
              className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
            >
              <option value="">
                {medicosFiltrados.length === 0
                  ? '— Sin médicos —'
                  : '— Selecciona un médico —'}
              </option>
              {medicosFiltrados.map(m => (
                <option key={m.id_medico} value={m.id_medico}>
                  Dr(a). {m.nombre_completo} — {m.especialidad ?? 'General'}
                </option>
              ))}
            </select>
            {form.id_medico && (
              <p className="text-[11.5px] text-emerald-700 mt-1.5 flex items-center gap-1">
                <CheckCircle size={11} strokeWidth={2} /> Médico seleccionado
              </p>
            )}
            {medicos.length === 0 && (
              <p className="text-[11.5px] text-amber-700 mt-1.5">No hay médicos activos registrados aún.</p>
            )}
          </div>

          {/* Hora — botón que abre el SlotPickerModal */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
              <Clock size={14} className="text-ink-500" /> Hora *
              <span className="ml-1 text-[11px] font-normal text-ink-500">
                · slots de 15 minutos
              </span>
            </label>
            <button
              type="button"
              onClick={() => setSlotPickerOpen(true)}
              disabled={!puedeElegirHora}
              className={[
                'w-full inline-flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13.5px] rounded-xl border transition-all duration-150',
                !puedeElegirHora
                  ? 'bg-surface border-line text-ink-300 cursor-not-allowed'
                  : form.hora
                    ? 'bg-brand-50 border-brand-200 text-brand-800 hover:border-brand-500 hover:bg-brand-50'
                    : 'bg-white border-line text-ink-700 hover:border-brand-500 hover:bg-brand-50/40',
              ].join(' ')}
            >
              <span className="inline-flex items-center gap-2">
                <Clock size={14} strokeWidth={1.75} />
                {!puedeElegirHora
                  ? 'Primero selecciona fecha y médico'
                  : form.hora
                    ? <span className="font-mono font-medium tabular-nums">{form.hora}</span>
                    : 'Elegir hora disponible…'}
              </span>
              {puedeElegirHora && (
                <span className="text-[11.5px] font-medium text-brand-700">
                  {form.hora ? 'Cambiar' : 'Ver slots'} →
                </span>
              )}
            </button>
            {puedeElegirHora && loadingOcupadas && (
              <p className="text-[11.5px] text-ink-500 mt-1.5 inline-flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" strokeWidth={2} /> Cargando disponibilidad…
              </p>
            )}
          </div>

          {/* Tipo consulta + Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Tipo de consulta</label>
              <select name="id_tipo_consulta" value={form.id_tipo_consulta} onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all">
                <option value="">Sin tipo específico</option>
                {tiposConsulta.map(t => (
                  <option key={t.id_tipo_consulta} value={t.id_tipo_consulta}>{t.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Estado inicial</label>
              <select name="estado" value={form.estado} onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all">
                {['programada', 'confirmada'].map(e => (
                  <option key={e} value={e}>{estadoLabel('cita', e)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-ink-500" /> Motivo de consulta
            </label>
            <textarea
              name="motivo" value={form.motivo} onChange={handleChange} rows={3}
              placeholder="Describa brevemente el motivo de la cita…"
              className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all resize-none"
            />
          </div>

          {error && <ErrorBox msg={error} />}
          <BotonesForm onCancel={onClose} saving={saving} labelSave="Agendar cita" />
        </form>
      </Modal>

      {slotPickerOpen && medicoSel && form.fecha && (
        <SlotPickerModal
          medico={medicoSel}
          fecha={form.fecha}
          horarios={horarios}
          ocupadas={horasOcupadas}
          loading={loadingOcupadas}
          onPick={(hora) => {
            setForm(p => ({ ...p, hora }));
            setSlotPickerOpen(false);
          }}
          onClose={() => setSlotPickerOpen(false)}
        />
      )}
    </>
  );
}

// ─── Selector de hora: grid de slots de 15 min ────────────────────────────────
function SlotPickerModal({ medico, fecha, horarios, ocupadas, loading, onPick, onClose }) {
  const dia = diaSemanaDe(fecha);

  // Franjas del médico para ese día (deshabilitar disponible=false)
  const franjas = horarios.filter(h =>
    h.id_medico === medico.id_medico &&
    h.dia_semana === dia &&
    h.disponible !== false,
  );

  // Generar slots de 15 min dentro de cada franja, ordenados y deduplicados
  const slots = (() => {
    const set = new Set();
    for (const f of franjas) {
      let t = horaAMin(f.hora_inicio);
      const fin = horaAMin(f.hora_fin);
      while (t + 15 <= fin) {
        const hh = String(Math.floor(t / 60)).padStart(2, '0');
        const mm = String(t % 60).padStart(2, '0');
        set.add(`${hh}:${mm}`);
        t += 15;
      }
    }
    return [...set].sort();
  })();

  const ocupadasSet = new Set(ocupadas.map(s => (s ?? '').slice(0, 5)));
  const libres = slots.filter(s => !ocupadasSet.has(s)).length;

  const fechaFmt = new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <Modal
      titulo="Elegir hora disponible"
      subtitulo={`Dr(a). ${medico.nombre_completo} · ${fechaFmt}`}
      onClose={onClose}
      size="md"
    >
      {loading ? (
        <div className="py-10 text-center">
          <Loader2 size={22} className="mx-auto mb-2 animate-spin text-brand-600" strokeWidth={1.75} />
          <p className="text-[13px] text-ink-500">Verificando disponibilidad…</p>
        </div>
      ) : franjas.length === 0 ? (
        <div className="flex items-start gap-2.5 text-[13px] text-amber-800 bg-amber-50/70 border-l-2 border-amber-500 pl-3 pr-3 py-3 rounded-r-md">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="font-medium">Sin franjas para el {dia}</p>
            <p className="mt-0.5 text-amber-700">
              Este médico no tiene horarios configurados para ese día de la semana.
              Revisa la sección <strong className="font-medium">Horarios</strong> o elige otra fecha.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Resumen + leyenda */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[12.5px] text-ink-500">
              <span className="font-semibold text-ink-900 tabular-nums">{libres}</span>
              <span className="text-ink-500"> de </span>
              <span className="tabular-nums">{slots.length}</span>
              <span className="text-ink-500"> slots libres</span>
            </p>
            <div className="flex items-center gap-3 text-[11.5px]">
              <span className="inline-flex items-center gap-1 text-ink-700">
                <span className="w-2.5 h-2.5 rounded-sm border border-line bg-white" /> Libre
              </span>
              <span className="inline-flex items-center gap-1 text-ink-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-surface border border-line" /> Ocupado
              </span>
            </div>
          </div>

          {/* Grid de slots */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {slots.map(s => {
              const ocupado = ocupadasSet.has(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={ocupado}
                  onClick={() => onPick(s)}
                  className={[
                    'inline-flex items-center justify-center py-2.5 rounded-lg text-[13px] font-mono font-medium tabular-nums border transition-all duration-150',
                    ocupado
                      ? 'bg-surface border-line text-ink-300 cursor-not-allowed line-through'
                      : 'bg-white border-line text-ink-900 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.97]',
                  ].join(' ')}
                  title={ocupado ? `Slot ${s} ocupado` : `Seleccionar ${s}`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {libres === 0 && (
            <div className="mt-4 flex items-start gap-2.5 text-[12.5px] text-amber-800 bg-amber-50/70 border-l-2 border-amber-500 pl-3 pr-3 py-2.5 rounded-r-md">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p>Este médico no tiene slots libres para esta fecha. Prueba con otra fecha u otro médico.</p>
            </div>
          )}

          <p className="mt-4 text-[11px] text-ink-500 italic text-center">
            Cada consulta dura aproximadamente 15 minutos. Los slots ocupados se muestran tachados y no son seleccionables.
          </p>
        </>
      )}
    </Modal>
  );
}

// ─── Modal: Editar ─────────────────────────────────────────────────────────────
function ModalEditar({ cita, onClose }) {
  const fechaOrig = cita.fecha_cita?.slice(0, 10) ?? '';
  const horaOrig  = cita.fecha_cita?.slice(11, 16) ?? '';
  const [form, setForm] = useState({
    fecha:         fechaOrig,
    hora:          horaOrig,
    estado:        cita.estado        ?? 'programada',
    motivo:        cita.motivo        ?? '',
    observaciones: cita.observaciones ?? '',
    id_tipo_consulta: cita.id_tipo_consulta ?? '',
  });
  const [tiposConsulta, setTiposConsulta] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    tipoConsultaService.getAll().then(setTiposConsulta).catch(() => setTiposConsulta([]));
  }, []);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await citaService.editar(cita.id_cita, {
        fecha:            form.fecha,
        hora:             form.hora,
        estado:           form.estado,
        motivo:           form.motivo,
        observaciones:    form.observaciones,
        id_tipo_consulta: form.id_tipo_consulta ? Number(form.id_tipo_consulta) : null,
      });
      onClose();
    } catch (err) {
      console.error('[ModalEditar Cita]', err);
      setError(err.message ?? 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal titulo="Editar cita" subtitulo={`${cita.paciente_nombre} · ${cita.fecha}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Info de sólo lectura */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl">
          <CampoReadOnly label="Paciente" value={cita.paciente_nombre} />
          <CampoReadOnly label="Médico"   value={`Dr(a). ${cita.medico_nombre}`} />
        </div>

        {/* Fecha y hora */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Fecha *</label>
            <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Hora *</label>
            <input name="hora" type="time" value={form.hora} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Estado */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Estado *</label>
            <select name="estado" value={form.estado} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {ESTADOS.map(e => <option key={e} value={e}>{estadoLabel('cita', e)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Tipo consulta</label>
            <select name="id_tipo_consulta" value={form.id_tipo_consulta} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Sin tipo específico</option>
              {tiposConsulta.map(t => (
                <option key={t.id_tipo_consulta} value={t.id_tipo_consulta}>{t.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Motivo */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Motivo</label>
          <textarea name="motivo" value={form.motivo} onChange={handleChange} rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {/* Observaciones */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Observaciones</label>
          <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Notas adicionales de la cita..." />
        </div>

        {/* Indicador estado */}
        {form.estado && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${estadoCls('cita', form.estado)}`}>
            <CheckCircle size={16} />
            <span className="font-medium">Nuevo estado: <span className="capitalize">{estadoLabel('cita', form.estado)}</span></span>
          </div>
        )}

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Guardar cambios" />
      </form>
    </Modal>
  );
}

