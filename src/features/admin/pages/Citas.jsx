import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Edit, Eye, UserX, ChevronLeft, ChevronRight,
  AlertCircle, Stethoscope,
  CheckCircle, FileText
} from 'lucide-react';
import { citaService, tipoConsultaService } from '../../../services';
import { useCitas, useMedicosActivos, useSlotsCita } from '../../../hooks';
import {
  Modal, PageHeader, KPI, Campo, CampoReadOnly, ErrorBox, ErrorBanner,
  BotonesForm, SearchBar, LoadingRow, EmptyRow, EstadoBadge, estadoLabel, estadoCls,
  Toolbar, AccentButton, TabPills, TableShell, Thead, Tbody, Tr,
  IconButton, ActionGroup, Avatar,
} from '../../../shared/components/ui';
import AgendarCitaModal, { CampoHora, SlotPickerModal } from '../components/AgendarCitaModal';
import { hoyLocalISO, yaLlegoLocal, fechaDesdeISO, sumarDiasISO } from '../../../shared/utils/fechas';

// ─── Constantes ────────────────────────────────────────────────────────────────
const ESTADOS = ['programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio'];
const FILTROS  = ['todos', ...ESTADOS];

// Helper para el filtro 'todos' (no es un estado válido para EstadoBadge).
const labelFiltro = (e) => (e === 'todos' ? 'Todos' : estadoLabel('cita', e));

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Citas() {
  const {
    citas, loading, error, setError,
    reload: cargar, marcarNoAsistio,
  } = useCitas({ role: 'admin', realtime: true });
  const [search, setSearch]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  // Por defecto se muestra la agenda de hoy; '' = todas las fechas.
  const [filtroFecha, setFiltroFecha]   = useState(hoyLocalISO);
  const [detalle, setDetalle]       = useState(null);
  const [editando, setEditando]     = useState(null);
  const [creando, setCreando]       = useState(false);

  const citasDelDia = filtroFecha
    ? citas
        .filter(c => (c.fecha ?? '').startsWith(filtroFecha))
        .sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''))
    : citas;

  const filtered = citasDelDia.filter(c => {
    const term = search.toLowerCase();
    const matchSearch =
      (c.paciente_nombre    ?? '').toLowerCase().includes(term) ||
      (c.medico_nombre      ?? '').toLowerCase().includes(term) ||
      (c.paciente_documento ?? '').includes(search) ||
      (c.motivo             ?? '').toLowerCase().includes(term);
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  // Los contadores de las pestañas reflejan el día elegido.
  const counts = ESTADOS.reduce((acc, e) => {
    acc[e] = citasDelDia.filter(c => c.estado === e).length;
    return acc;
  }, {});

  // Las citas no se eliminan desde aquí: se cancelan (con motivo) o se
  // marcan "no asistió" desde Editar, para conservar el historial.
  const noAsistio = async (c) => {
    if (!window.confirm(`¿Marcar que ${c.paciente_nombre} no asistió a la cita del ${c.fecha} ${c.hora?.slice(0, 5)}?`)) return;
    try {
      await marcarNoAsistio(c.id_cita);
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
        <KPI label="Hoy"     value={loading ? '···' : citas.filter(c => c.fecha === hoyLocalISO()).length} />
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
          <FiltroDia value={filtroFecha} onChange={setFiltroFecha} />
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
            count: f === 'todos' ? citasDelDia.length : (counts[f] ?? 0),
          }))}
        />

        <p className="text-[12.5px] text-ink-500">
          {filtroFecha ? (
            <>
              Agenda del{' '}
              <span className="font-medium text-ink-800 capitalize">
                {fechaDesdeISO(filtroFecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {filtroFecha === hoyLocalISO() && <span className="text-brand-700 font-medium"> · hoy</span>}
              {' '}— ordenada por hora
            </>
          ) : 'Mostrando citas de todas las fechas'}
        </p>
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
            <EmptyRow colSpan={7} icon={Calendar} mensaje={filtroFecha && citasDelDia.length === 0 ? "No hay citas para este día" : "No hay citas que coincidan"} />
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
                  {ACTIVOS.includes(c.estado) && yaLlegoLocal(c.fecha, c.hora) && (
                    <IconButton icon={UserX} tone="amber" title="Marcar no asistió" onClick={() => noAsistio(c)} />
                  )}
                </ActionGroup>
              </td>
            </Tr>
          ))}
        </Tbody>
      </TableShell>

      {detalle  && <ModalDetalle cita={detalle}  onClose={() => setDetalle(null)} />}
      {editando && <ModalEditar  cita={editando} onClose={() => { setEditando(null); cargar(); }} />}
      {creando  && <AgendarCitaModal onClose={() => { setCreando(false); cargar(); }} />}
    </div>
  );
}

// ─── Filtro por día: ‹ fecha › · Hoy · Todas ──────────────────────────────────
function FiltroDia({ value, onChange }) {
  const hoy = hoyLocalISO();
  const base = value || hoy;
  const btn = 'inline-flex items-center justify-center h-[42px] px-3 text-[13px] font-medium bg-white border border-line rounded-xl text-ink-700 hover:border-brand-500 hover:text-brand-700 transition-all';
  const activo = 'border-brand-500 bg-brand-50 text-brand-700';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" title="Día anterior" onClick={() => onChange(sumarDiasISO(base, -1))} className={btn}>
        <ChevronLeft size={15} strokeWidth={1.75} />
      </button>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-[42px] px-3.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
      />
      <button type="button" title="Día siguiente" onClick={() => onChange(sumarDiasISO(base, 1))} className={btn}>
        <ChevronRight size={15} strokeWidth={1.75} />
      </button>
      <button type="button" onClick={() => onChange(hoy)} className={`${btn} ${value === hoy ? activo : ''}`}>
        Hoy
      </button>
      <button type="button" onClick={() => onChange('')} className={`${btn} ${!value ? activo : ''}`}>
        Todas
      </button>
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
        {c.estado === 'cancelada' && c.motivo_cancelacion && (
          <Campo label="Motivo de cancelación" value={c.motivo_cancelacion} className="col-span-2" />
        )}
        <Campo label="Observaciones"    value={c.observaciones} className="col-span-2" />
        <Campo label="Historia"         value={c.numero_historia} />
        <Campo label="Creada"           value={c.created_at?.slice(0, 16).replace('T', ' ')} />
      </div>
    </Modal>
  );
}

// ─── Modal: Editar / reprogramar ───────────────────────────────────────────────
//
// Las reglas viven en fn_editar_cita (BD); aquí sólo se reflejan para
// guiar al usuario: qué estados se ofrecen y cuándo se puede mover la cita.
//
const TRANSICIONES = {
  programada: ['confirmada', 'cancelada', 'no_asistio'],
  confirmada: ['programada', 'cancelada', 'no_asistio'],
  en_curso:   ['cancelada'],
  completada: [],
  cancelada:  ['programada', 'confirmada'],
  no_asistio: ['programada', 'confirmada'],
};
const ACTIVOS = ['programada', 'confirmada'];
const INPUT_CLS = 'w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all disabled:bg-surface disabled:text-ink-500';

function ModalEditar({ cita, onClose }) {
  const fechaOrig = cita.fecha_cita?.slice(0, 10) ?? '';
  const horaOrig  = cita.fecha_cita?.slice(11, 16) ?? '';
  const [form, setForm] = useState({
    id_medico:          String(cita.id_medico ?? ''),
    id_tipo_consulta:   cita.id_tipo_consulta ? String(cita.id_tipo_consulta) : '',
    fecha:              fechaOrig,
    hora:               horaOrig,
    estado:             cita.estado        ?? 'programada',
    motivo:             cita.motivo        ?? '',
    observaciones:      cita.observaciones ?? '',
    motivo_cancelacion: '',
  });
  const { medicos } = useMedicosActivos();
  const [tiposConsulta, setTiposConsulta] = useState([]);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const { slots, loading: loadingSlots, error: errorSlots } =
    useSlotsCita(form.id_medico, form.fecha, form.id_tipo_consulta, cita.id_cita);

  useEffect(() => {
    tipoConsultaService.getAgendables().then(setTiposConsulta).catch(() => setTiposConsulta([]));
  }, []);

  // Una cita en curso o completada ya no se puede mover.
  const agendaEditable  = !['en_curso', 'completada'].includes(cita.estado);
  const estadosPosibles = [cita.estado, ...(TRANSICIONES[cita.estado] ?? [])];
  const cancelando      = form.estado === 'cancelada' && cita.estado !== 'cancelada';
  const citaYaLlego     = yaLlegoLocal(fechaOrig, horaOrig);

  // El médico actual puede estar inactivo: se mantiene en el select.
  const opcionesMedico = medicos.some(m => String(m.id_medico) === String(cita.id_medico))
    ? medicos
    : [{ id_medico: cita.id_medico, nombre_completo: cita.medico_nombre, especialidad: cita.medico_especialidad }, ...medicos];
  const medicoSel = opcionesMedico.find(m => String(m.id_medico) === form.id_medico) ?? null;
  // Una cita antigua puede tener un tipo que ya no se agenda (Urgencia,
  // Especialista…): se muestra para no perderlo, pero no se puede elegir.
  const tipoAntiguo = cita.id_tipo_consulta
    && !tiposConsulta.some(t => String(t.id_tipo_consulta) === String(cita.id_tipo_consulta))
    ? { id_tipo_consulta: cita.id_tipo_consulta, nombre: cita.tipo_consulta_nombre ?? 'Tipo anterior' }
    : null;

  // Cambiar médico, fecha o tipo invalida la hora: hay que elegir un slot nuevo.
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({
      ...p,
      [name]: value,
      ...(['id_medico', 'fecha', 'id_tipo_consulta'].includes(name) ? { hora: '' } : {}),
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.hora) { setError('Elige una hora disponible.'); return; }
    if (cancelando && !form.motivo_cancelacion.trim()) {
      setError('Indica el motivo de la cancelación.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await citaService.editar(cita.id_cita, {
        id_medico:          Number(form.id_medico),
        fecha:              form.fecha,
        hora:               form.hora,
        estado:             form.estado,
        motivo:             form.motivo,
        observaciones:      form.observaciones,
        motivo_cancelacion: form.motivo_cancelacion,
        id_tipo_consulta:   form.id_tipo_consulta ? Number(form.id_tipo_consulta) : null,
      });
      onClose();
    } catch (err) {
      console.error('[ModalEditar Cita]', err);
      if (err.code === 'CONFLICT') setForm(p => ({ ...p, hora: '' }));
      setError(err.message ?? 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal titulo="Editar cita" subtitulo={`${cita.paciente_nombre} · ${cita.fecha}`} onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="p-4 bg-surface rounded-xl border border-line">
            <CampoReadOnly label="Paciente" value={cita.paciente_nombre} />
          </div>

          {!agendaEditable && (
            <div className="flex items-start gap-2.5 text-[12.5px] text-ink-700 bg-surface border-l-2 border-ink-300 pl-3 pr-3 py-2.5 rounded-r-md">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p>La cita está {estadoLabel('cita', cita.estado).toLowerCase()}: no se puede reprogramar.</p>
            </div>
          )}

          {/* Médico + tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
                <Stethoscope size={14} className="text-ink-500" /> Médico *
              </label>
              <select name="id_medico" value={form.id_medico} onChange={handleChange} required
                disabled={!agendaEditable} className={INPUT_CLS}>
                {opcionesMedico.map(m => (
                  <option key={m.id_medico} value={m.id_medico}>
                    Dr(a). {m.nombre_completo} — {m.especialidad ?? 'General'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
                <FileText size={14} className="text-ink-500" /> Tipo de cita
              </label>
              <select name="id_tipo_consulta" value={form.id_tipo_consulta} onChange={handleChange}
                disabled={!agendaEditable} className={INPUT_CLS}>
                {!cita.id_tipo_consulta && <option value="">Sin tipo (cita antigua)</option>}
                {tipoAntiguo && (
                  <option value={tipoAntiguo.id_tipo_consulta} disabled>
                    {tipoAntiguo.nombre} (ya no se agenda)
                  </option>
                )}
                {tiposConsulta.map(t => (
                  <option key={t.id_tipo_consulta} value={t.id_tipo_consulta}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha + hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-ink-500" /> Fecha *
              </label>
              <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required
                min={form.fecha === fechaOrig ? undefined : hoyLocalISO()}
                disabled={!agendaEditable} className={INPUT_CLS} />
            </div>
            {agendaEditable ? (
              <CampoHora
                hora={form.hora}
                habilitado={!!(form.fecha && form.id_medico)}
                loading={loadingSlots}
                onAbrir={() => setSlotPickerOpen(true)}
              />
            ) : (
              <div>
                <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
                  <Clock size={14} className="text-ink-500" /> Hora
                </label>
                <input value={form.hora} disabled className={INPUT_CLS} />
              </div>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Estado *</label>
            <select name="estado" value={form.estado} onChange={handleChange} required
              disabled={estadosPosibles.length === 1} className={INPUT_CLS}>
              {estadosPosibles.map(e => {
                const bloqueada = e === 'no_asistio' && e !== cita.estado && !citaYaLlego;
                return (
                  <option key={e} value={e} disabled={bloqueada}>
                    {estadoLabel('cita', e)}{bloqueada ? ' (disponible cuando llegue la hora de la cita)' : ''}
                  </option>
                );
              })}
            </select>
            {form.estado !== cita.estado && ACTIVOS.includes(form.estado) && !ACTIVOS.includes(cita.estado) && (
              <p className="text-[11.5px] text-ink-500 mt-1.5">
                Reactivar la cita vuelve a ocupar la agenda: la hora debe estar libre y en el futuro.
              </p>
            )}
          </div>

          {cancelando && (
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Motivo de cancelación *</label>
              <textarea name="motivo_cancelacion" value={form.motivo_cancelacion} onChange={handleChange}
                rows={2} required placeholder="Ej: el paciente pidió cancelar por viaje"
                className={`${INPUT_CLS} placeholder:text-ink-300 resize-none`} />
            </div>
          )}
          {cita.estado === 'cancelada' && cita.motivo_cancelacion && (
            <CampoReadOnly label="Motivo de cancelación" value={cita.motivo_cancelacion} />
          )}

          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Motivo</label>
            <textarea name="motivo" value={form.motivo} onChange={handleChange} rows={2}
              className={`${INPUT_CLS} resize-none`} />
          </div>

          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2}
              placeholder="Notas adicionales de la cita…"
              className={`${INPUT_CLS} placeholder:text-ink-300 resize-none`} />
          </div>

          {form.estado !== cita.estado && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${estadoCls('cita', form.estado)}`}>
              <CheckCircle size={16} />
              <span className="font-medium">Nuevo estado: {estadoLabel('cita', form.estado)}</span>
            </div>
          )}

          {error && <ErrorBox msg={error} />}
          <BotonesForm onCancel={onClose} saving={saving} labelSave="Guardar cambios" />
        </form>
      </Modal>

      {slotPickerOpen && medicoSel && form.fecha && (
        <SlotPickerModal
          medico={medicoSel}
          fecha={form.fecha}
          slots={slots}
          loading={loadingSlots}
          error={errorSlots}
          seleccionada={form.hora}
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
