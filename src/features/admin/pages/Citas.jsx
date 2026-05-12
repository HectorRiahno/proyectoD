import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, Search, Plus, Edit, Trash2, Eye,
  AlertCircle, Loader2, User, Stethoscope, X,
  CheckCircle, FileText
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ─── Constantes ────────────────────────────────────────────────────────────────
const ESTADOS = ['programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio'];
const FILTROS  = ['todos', ...ESTADOS];

const ESTADO_STYLE = {
  programada: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmada: 'bg-green-100 text-green-700 border-green-200',
  en_curso:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  completada: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelada:  'bg-red-100 text-red-700 border-red-200',
  no_asistio: 'bg-orange-100 text-orange-700 border-orange-200',
};

const estadoLabel = (e) =>
  ({ no_asistio: 'No asistió', en_curso: 'En curso' }[e] ?? e);

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Citas() {
  const [citas, setCitas]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroFecha, setFiltroFecha]   = useState('');
  const [detalle, setDetalle]       = useState(null);
  const [editando, setEditando]     = useState(null);
  const [creando, setCreando]       = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('vw_admin_citas')
      .select('*')
      .order('fecha_cita', { ascending: false });
    if (error) setError(error.message);
    else setCitas(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

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
    if (!window.confirm(`¿Eliminar la cita de ${c.paciente_nombre}?`)) return;
    const { error } = await supabase.from('cita').delete().eq('id_cita', c.id_cita);
    if (error) {
      setError(error.code === '42501'
        ? 'Sin permisos. Ejecuta supabase/rls-admin.sql primero.'
        : error.message);
      return;
    }
    cargar();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Citas</h1>
            <p className="text-blue-100">Agenda completa del centro médico</p>
          </div>
          <div className="flex gap-6 text-center">
            <KPI label="Total"   value={loading ? '···' : citas.length} />
            <KPI label="Hoy"     value={loading ? '···' : citas.filter(c => c.fecha === new Date().toISOString().split('T')[0]).length} />
            <KPI label="Pendientes" value={loading ? '···' : (counts.programada ?? 0) + (counts.confirmada ?? 0)} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 relative min-w-[220px]">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por paciente, médico, documento o motivo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
              {estadoLabel(f)} {f !== 'todos' && <span className="ml-1 opacity-70">({counts[f] ?? 0})</span>}
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
                <tr><td colSpan={7} className="text-center py-12">
                  <Loader2 size={32} className="mx-auto mb-2 animate-spin text-blue-600" />
                  <p className="text-gray-500">Cargando citas...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No hay citas que coincidan</p>
                </td></tr>
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
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User size={14} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{c.paciente_nombre ?? '—'}</p>
                        <p className="text-xs text-gray-500 font-mono">{c.paciente_documento}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Stethoscope size={14} className="text-purple-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.medico_nombre ?? '—'}</p>
                        <p className="text-xs text-gray-500">{c.medico_especialidad}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{c.tipo_consulta_nombre ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-[180px] truncate" title={c.motivo}>
                    {c.motivo ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium border capitalize ${ESTADO_STYLE[c.estado] ?? 'bg-gray-100 text-gray-700'}`}>
                      {estadoLabel(c.estado)}
                    </span>
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
        <div className={`col-span-2 p-3 rounded-lg border text-center ${ESTADO_STYLE[c.estado] ?? ''}`}>
          <p className="text-xs font-bold uppercase">Estado</p>
          <p className="font-bold capitalize text-lg">{estadoLabel(c.estado)}</p>
        </div>
        <Campo label="Paciente"         value={c.paciente_nombre} />
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

// ─── Modal: Crear ──────────────────────────────────────────────────────────────
function ModalCrear({ onClose }) {
  const [form, setForm] = useState({
    id_paciente: '', id_medico: '', id_tipo_consulta: '',
    fecha: '', hora: '', estado: 'programada', motivo: '', observaciones: '',
  });
  const [pacientes, setPacientes]         = useState([]);
  const [medicos, setMedicos]             = useState([]);
  const [tiposConsulta, setTiposConsulta] = useState([]);
  const [loadingData, setLoadingData]     = useState(true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [searchPac, setSearchPac]         = useState('');
  const [searchMed, setSearchMed]         = useState('');

  useEffect(() => {
    const cargar = async () => {
      const [rPac, rMed, rTipo] = await Promise.all([
        supabase.from('vw_admin_pacientes').select('id_paciente, nombre_completo, documento').order('nombre_completo'),
        supabase.from('vw_admin_medicos').select('id_medico, nombre_completo, especialidad').eq('activo', true).order('nombre_completo'),
        supabase.from('tipo_consulta').select('id_tipo_consulta, nombre').order('nombre'),
      ]);
      setPacientes(rPac.data ?? []);
      setMedicos(rMed.data ?? []);
      setTiposConsulta(rTipo.data ?? []);
      setLoadingData(false);
    };
    cargar();
  }, []);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.id_paciente || !form.id_medico || !form.fecha || !form.hora) return;
    setSaving(true);
    setError('');
    try {
      const fecha_cita = `${form.fecha}T${form.hora}:00`;
      const { error } = await supabase.from('cita').insert({
        id_paciente:      Number(form.id_paciente),
        id_medico:        Number(form.id_medico),
        id_tipo_consulta: form.id_tipo_consulta ? Number(form.id_tipo_consulta) : null,
        fecha_cita,
        estado:           form.estado,
        motivo:           form.motivo    || null,
        observaciones:    form.observaciones || null,
      });
      if (error) {
        if (error.code === '42501') throw new Error('Sin permisos. Ejecuta supabase/rls-admin.sql primero.');
        if (error.code === '23503') throw new Error('El paciente o médico seleccionado no existe.');
        throw new Error(error.message);
      }
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
    <Modal titulo="Nueva cita" subtitulo="Agendar una cita médica" onClose={onClose} wide>
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
          </label>
          <div className="relative mb-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Filtrar por nombre o especialidad..."
              value={searchMed}
              onChange={e => { setSearchMed(e.target.value); setForm(p => ({ ...p, id_medico: '' })); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            />
          </div>
          <select
            name="id_medico" value={form.id_medico} onChange={handleChange} required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          >
            <option value="">— Selecciona un médico —</option>
            {medicosFiltrados.map(m => (
              <option key={m.id_medico} value={m.id_medico}>
                Dr(a). {m.nombre_completo} — {m.especialidad ?? 'General'}
              </option>
            ))}
          </select>
          {form.id_medico && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle size={12} /> Médico seleccionado
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
                <option key={e} value={e}>{estadoLabel(e)}</option>
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
    supabase.from('tipo_consulta').select('id_tipo_consulta, nombre').order('nombre')
      .then(({ data }) => setTiposConsulta(data ?? []));
  }, []);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fecha_cita = `${form.fecha}T${form.hora}:00`;
      const { error } = await supabase.from('cita').update({
        fecha_cita,
        estado:           form.estado,
        motivo:           form.motivo        || null,
        observaciones:    form.observaciones || null,
        id_tipo_consulta: form.id_tipo_consulta ? Number(form.id_tipo_consulta) : null,
      }).eq('id_cita', cita.id_cita);
      if (error) {
        if (error.code === '42501') throw new Error('Sin permisos. Ejecuta supabase/rls-admin.sql primero.');
        throw new Error(error.message);
      }
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
              {ESTADOS.map(e => <option key={e} value={e}>{estadoLabel(e)}</option>)}
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
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${ESTADO_STYLE[form.estado] ?? ''}`}>
            <CheckCircle size={16} />
            <span className="font-medium">Nuevo estado: <span className="capitalize">{estadoLabel(form.estado)}</span></span>
          </div>
        )}

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Guardar cambios" />
      </form>
    </Modal>
  );
}

// ─── Sub-componentes UI ────────────────────────────────────────────────────────
function Modal({ titulo, subtitulo, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${wide ? 'max-w-3xl' : 'max-w-2xl'}`}>
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold">{titulo}</h2>
            {subtitulo && <p className="text-blue-100 text-sm">{subtitulo}</p>}
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div>
      <p className="text-sm text-blue-100">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function Campo({ label, value, className = '' }) {
  return (
    <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900">{value || '—'}</p>
    </div>
  );
}

function CampoReadOnly({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-800 text-sm">{value || '—'}</p>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {msg}
    </div>
  );
}

function BotonesForm({ onCancel, saving, labelSave }) {
  return (
    <div className="flex gap-3 pt-4 border-t border-gray-200">
      <button type="button" onClick={onCancel}
        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold">
        Cancelar
      </button>
      <button type="submit" disabled={saving}
        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg disabled:opacity-60">
        {saving ? 'Guardando...' : labelSave}
      </button>
    </div>
  );
}
