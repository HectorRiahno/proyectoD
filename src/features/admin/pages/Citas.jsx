import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Search, Plus, Edit, Trash2, Eye,
  AlertCircle, Loader2, User, Stethoscope,
  CheckCircle, FileText
} from 'lucide-react';
import { citaService } from '../../../services';
import { useCitas, usePacientesCatalogo, useMedicosActivos } from '../../../hooks';
import { horarioService, tipoConsultaService } from '../../../services';
import {
  Modal, PageHeader, KPI, Campo, CampoReadOnly, ErrorBox, ErrorBanner,
  BotonesForm, SearchBar, LoadingRow, EmptyRow, EstadoBadge, estadoLabel, estadoCls,
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
        variant="blue"
      >
        <KPI label="Total"   value={loading ? '···' : citas.length} />
        <KPI label="Hoy"     value={loading ? '···' : citas.filter(c => c.fecha === new Date().toISOString().split('T')[0]).length} />
        <KPI label="Pendientes" value={loading ? '···' : (counts.programada ?? 0) + (counts.confirmada ?? 0)} />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <SearchBar
            className="min-w-[220px]"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por paciente, médico, documento o motivo..."
          />
          <input
            type="date"
            value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setCreando(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg"
          >
            <Plus size={20} /> Nueva cita
          </button>
        </div>

        {/* Tabs de estado */}
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(f => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize ${
                filtroEstado === f ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {labelFiltro(f)} {f !== 'todos' && <span className="ml-1 opacity-70">({counts[f] ?? 0})</span>}
              {f === 'todos' && <span className="ml-1 opacity-70">({citas.length})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Fecha / Hora</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Paciente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Médico</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Motivo</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Estado</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <LoadingRow colSpan={7} mensaje="Cargando citas..." />
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={7} icon={Calendar} mensaje="No hay citas que coincidan" />
              ) : filtered.map((c, idx) => (
                <tr key={c.id_cita} className={`hover:bg-blue-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Calendar size={14} className="text-blue-600" />
                      {c.fecha ?? '—'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Clock size={12} />
                      {c.hora?.slice(0, 5) ?? '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${c.paciente_eliminado ? 'bg-gray-200' : 'bg-blue-100'}`}>
                        <User size={14} className={c.paciente_eliminado ? 'text-gray-500' : 'text-blue-600'} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`font-semibold text-sm ${c.paciente_eliminado ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {c.paciente_nombre ?? '—'}
                          </p>
                          {c.paciente_eliminado && (
                            <span title="Paciente eliminado — disponible en Papelera" className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-bold whitespace-nowrap">
                              <AlertCircle size={9} /> Eliminado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-mono">{c.paciente_documento}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Stethoscope size={14} className={`flex-shrink-0 ${c.medico_eliminado ? 'text-gray-400' : 'text-purple-600'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-semibold ${c.medico_eliminado ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {c.medico_nombre ?? '—'}
                          </p>
                          {c.medico_eliminado && (
                            <span title="Médico eliminado — disponible en Papelera" className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-bold whitespace-nowrap">
                              <AlertCircle size={9} /> Eliminado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{c.medico_especialidad}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{c.tipo_consulta_nombre ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-[180px] truncate" title={c.motivo}>
                    {c.motivo ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <EstadoBadge type="cita" estado={c.estado} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setDetalle(c)}  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver"><Eye size={17} /></button>
                      <button onClick={() => setEditando(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Editar"><Edit size={17} /></button>
                      <button onClick={() => eliminar(c)}    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar"><Trash2 size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
function ModalCrear({ onClose }) {
  const [form, setForm] = useState({
    id_paciente: '', id_medico: '', id_tipo_consulta: '',
    fecha: '', hora: '', estado: 'programada', motivo: '', observaciones: '',
  });
  const { pacientes: pacs } = usePacientesCatalogo();
  const { medicos: meds }   = useMedicosActivos();
  const [tiposConsulta, setTiposConsulta] = useState([]);
  const [horarios, setHorarios]           = useState([]);  // franjas horarias de todos los médicos
  const [conflictos, setConflictos]       = useState([]);  // id_medico ocupados a fecha+hora
  const [checkingConf, setCheckingConf]   = useState(false);
  const [loadingData, setLoadingData]     = useState(true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [searchPac, setSearchPac]         = useState('');
  const [searchMed, setSearchMed]         = useState('');
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

  // Cada vez que cambian fecha+hora: consultar qué médicos ya tienen cita en ese slot
  useEffect(() => {
    if (!form.fecha || !form.hora) { setConflictos([]); return; }
    let cancelado = false;
    setCheckingConf(true);
    citaService.getMedicosOcupados(form.fecha, form.hora)
      .then(ids => {
        if (cancelado) return;
        setConflictos(ids);
      })
      .finally(() => { if (!cancelado) setCheckingConf(false); });
    return () => { cancelado = true; };
  }, [form.fecha, form.hora]);

  // Calcular qué médicos están disponibles: tienen franja que cubre la hora Y no tienen cita en ese slot
  const dia     = diaSemanaDe(form.fecha);
  const horaMin = horaAMin(form.hora);
  const medicosDisponibles = (!form.fecha || !form.hora)
    ? []
    : medicos.filter(m => {
        const enFranja = horarios.some(h =>
          h.id_medico === m.id_medico &&
          h.dia_semana === dia &&
          horaAMin(h.hora_inicio) <= horaMin &&
          horaMin < horaAMin(h.hora_fin)
        );
        return enFranja && !conflictos.includes(m.id_medico);
      });

  // Si el médico seleccionado deja de ser válido (cambió fecha/hora), limpiar selección
  useEffect(() => {
    if (!form.id_medico) return;
    if (!form.fecha || !form.hora) return;
    if (!medicosDisponibles.some(m => String(m.id_medico) === String(form.id_medico))) {
      setForm(p => ({ ...p, id_medico: '' }));
    }
  }, [medicosDisponibles, form.id_medico, form.fecha, form.hora]);

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

  const medicosFiltrados = medicosDisponibles.filter(m =>
    (m.nombre_completo ?? '').toLowerCase().includes(searchMed.toLowerCase()) ||
    (m.especialidad ?? '').toLowerCase().includes(searchMed.toLowerCase())
  );

  const fechaHoraListas = !!(form.fecha && form.hora);

  if (loadingData) {
    return (
      <Modal titulo="Nueva cita" onClose={onClose}>
        <div className="py-12 text-center">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-blue-600" />
          <p className="text-gray-500">Cargando datos...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titulo="Nueva cita" subtitulo="Agendar una cita médica" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Fecha y hora */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="col-span-2">
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Calendar size={14} /> Fecha *
            </label>
            <input
              name="fecha" type="date" value={form.fecha}
              onChange={handleChange} required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Clock size={14} /> Hora *
            </label>
            <input
              name="hora" type="time" value={form.hora}
              onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Paciente */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <User size={14} /> Paciente *
          </label>
          <div className="relative mb-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Filtrar por nombre o documento..."
              value={searchPac}
              onChange={e => { setSearchPac(e.target.value); setForm(p => ({ ...p, id_paciente: '' })); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            />
          </div>
          <select
            name="id_paciente" value={form.id_paciente} onChange={handleChange} required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          >
            <option value="">— Selecciona un paciente —</option>
            {pacientesFiltrados.map(p => (
              <option key={p.id_paciente} value={p.id_paciente}>
                {p.nombre_completo} · {p.documento}
              </option>
            ))}
          </select>
          {form.id_paciente && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle size={12} /> Paciente seleccionado
            </p>
          )}
          {pacientes.length === 0 && (
            <p className="text-xs text-orange-600 mt-1">No hay pacientes registrados aún.</p>
          )}
        </div>

        {/* Médico */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Stethoscope size={14} /> Médico *
            {fechaHoraListas && dia && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                — disponibles el {dia} a las {form.hora}
              </span>
            )}
          </label>
          <div className="relative mb-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Filtrar por nombre o especialidad..."
              value={searchMed}
              onChange={e => { setSearchMed(e.target.value); setForm(p => ({ ...p, id_medico: '' })); }}
              disabled={!fechaHoraListas}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <select
            name="id_medico" value={form.id_medico} onChange={handleChange} required
            disabled={!fechaHoraListas || checkingConf}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {!fechaHoraListas
                ? '— Primero selecciona fecha y hora —'
                : checkingConf
                  ? '— Verificando disponibilidad... —'
                  : medicosFiltrados.length === 0
                    ? '— Ningún médico disponible en ese horario —'
                    : '— Selecciona un médico —'}
            </option>
            {medicosFiltrados.map(m => (
              <option key={m.id_medico} value={m.id_medico}>
                Dr(a). {m.nombre_completo} — {m.especialidad ?? 'General'}
              </option>
            ))}
          </select>

          {/* Feedback bajo el dropdown */}
          {form.id_medico && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle size={12} /> Médico seleccionado
            </p>
          )}
          {fechaHoraListas && !checkingConf && medicosDisponibles.length === 0 && (
            <p className="text-xs text-orange-600 mt-1 flex items-start gap-1">
              <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
              No hay médicos con franja horaria activa el {dia} a las {form.hora}, o todos ya tienen una cita en ese slot.
              Revisa "Horarios" o cambia fecha/hora.
            </p>
          )}
          {fechaHoraListas && !checkingConf && medicosDisponibles.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {medicosDisponibles.length} médico{medicosDisponibles.length === 1 ? '' : 's'} con franja en ese horario y sin conflicto.
            </p>
          )}
          {medicos.length === 0 && (
            <p className="text-xs text-orange-600 mt-1">No hay médicos activos registrados aún.</p>
          )}
        </div>

        {/* Tipo consulta + Estado */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Tipo de consulta</label>
            <select name="id_tipo_consulta" value={form.id_tipo_consulta} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Sin tipo específico</option>
              {tiposConsulta.map(t => (
                <option key={t.id_tipo_consulta} value={t.id_tipo_consulta}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Estado inicial</label>
            <select name="estado" value={form.estado} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {['programada', 'confirmada'].map(e => (
                <option key={e} value={e}>{estadoLabel('cita', e)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Motivo */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <FileText size={14} /> Motivo de consulta
          </label>
          <textarea
            name="motivo" value={form.motivo} onChange={handleChange} rows={3}
            placeholder="Describa brevemente el motivo de la cita..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Agendar cita" />
      </form>
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

