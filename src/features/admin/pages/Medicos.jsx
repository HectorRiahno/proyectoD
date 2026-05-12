import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Edit, Trash2, Eye, AlertCircle, Loader2,
  Stethoscope, Phone, Mail, ToggleLeft, ToggleRight, X,
  User, Lock, Info
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const ESPECIALIDADES = [
  'Medicina General', 'Cardiología', 'Pediatría', 'Ginecología',
  'Dermatología', 'Oftalmología', 'Traumatología', 'Odontología',
  'Neurología', 'Psiquiatría', 'Oncología', 'Endocrinología',
  'Gastroenterología', 'Urología', 'Otorrinolaringología',
];

const initials = (n) =>
  (n ?? '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Medicos() {
  const [medicos, setMedicos]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [filtroEsp, setFiltroEsp]       = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [detalle, setDetalle]           = useState(null);
  const [editando, setEditando]         = useState(null);
  const [creando, setCreando]           = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('vw_admin_medicos')
      .select('*')
      .order('nombre_completo', { ascending: true });
    if (error) setError(error.message);
    else setMedicos(data ?? []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtered = medicos.filter(m => {
    const term = search.toLowerCase();
    const matchSearch =
      (m.nombre_completo ?? '').toLowerCase().includes(term) ||
      (m.especialidad     ?? '').toLowerCase().includes(term) ||
      (m.email            ?? '').toLowerCase().includes(term) ||
      (m.documento        ?? '').includes(search);
    const matchEsp    = !filtroEsp || m.especialidad === filtroEsp;
    const matchEstado =
      filtroEstado === 'todos'    ? true :
      filtroEstado === 'activo'   ? m.activo === true :
                                    m.activo === false;
    return matchSearch && matchEsp && matchEstado;
  });

  const especialidades = [...new Set(medicos.map(m => m.especialidad).filter(Boolean))].sort();

  const toggleActivo = async (m) => {
    const { error } = await supabase
      .from('medico')
      .update({ activo: !m.activo })
      .eq('id_medico', m.id_medico);
    if (error) {
      const msg = error.code === '42501'
        ? 'Sin permisos. Ejecuta supabase/rls-admin.sql primero.'
        : error.message;
      return setError(msg);
    }
    cargar();
  };

  const eliminar = async (m) => {
    if (!window.confirm(`¿Eliminar a ${m.nombre_completo}?\nEsta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('medico').delete().eq('id_medico', m.id_medico);
    if (error) {
      const msg = error.code === '42501'
        ? 'Sin permisos. Ejecuta supabase/rls-admin.sql primero.'
        : error.message;
      return setError(msg);
    }
    cargar();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Médicos</h1>
            <p className="text-blue-100">Administra el personal médico del centro</p>
          </div>
          <div className="flex gap-8 text-center">
            <KPI label="Total"        value={loading ? '···' : medicos.length} />
            <KPI label="Activos"      value={loading ? '···' : medicos.filter(m => m.activo).length} />
            <KPI label="Especialidades" value={loading ? '···' : especialidades.length} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 relative min-w-[220px]">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, especialidad, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filtroEsp}
            onChange={e => setFiltroEsp(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todas las especialidades</option>
            {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <div className="flex gap-1 border border-gray-300 rounded-xl p-1">
            {[['todos', 'Todos'], ['activo', 'Activos'], ['inactivo', 'Inactivos']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltroEstado(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${filtroEstado === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {l}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCreando(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg"
          >
            <Plus size={20} /> Nuevo médico
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Médico</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Especialidad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Contacto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Consultorio</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Citas hoy</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Estado</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Loader2 size={32} className="mx-auto mb-2 animate-spin text-blue-600" />
                  <p className="text-gray-500">Cargando médicos...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Stethoscope size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No se encontraron médicos</p>
                </td></tr>
              ) : filtered.map((m, idx) => (
                <tr key={m.id_medico} className={`hover:bg-blue-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm ${m.activo ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gray-400'}`}>
                        {initials(m.nombre_completo)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Dr(a). {m.nombre_completo}</p>
                        <p className="text-xs text-gray-500 font-mono">{m.documento}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                      {m.especialidad ?? '—'}
                    </span>
                    {m.anios_experiencia > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{m.anios_experiencia} años</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm space-y-1">
                      {m.email    && <p className="flex items-center gap-1 text-gray-700"><Mail size={12} className="text-blue-500 flex-shrink-0" />{m.email}</p>}
                      {m.telefono && <p className="flex items-center gap-1 text-gray-700"><Phone size={12} className="text-green-500 flex-shrink-0" />{m.telefono}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{m.consultorio ?? '—'}</td>
                  <td className="px-6 py-4 text-center">
                    <p className="font-bold text-gray-900">{m.citas_hoy ?? 0}</p>
                    <p className="text-xs text-gray-500">{m.citas_proximas ?? 0} próx.</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActivo(m)}
                      title={m.activo ? 'Desactivar' : 'Activar'}
                      className="mx-auto block"
                    >
                      {m.activo
                        ? <ToggleRight size={28} className="text-green-500" />
                        : <ToggleLeft  size={28} className="text-gray-400" />}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">{m.activo ? 'Activo' : 'Inactivo'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setDetalle(m)}  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver"><Eye size={17} /></button>
                      <button onClick={() => setEditando(m)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Editar"><Edit size={17} /></button>
                      <button onClick={() => eliminar(m)}    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar"><Trash2 size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detalle  && <ModalDetalle  medico={detalle}  onClose={() => setDetalle(null)} />}
      {editando && <ModalEditar   medico={editando} onClose={() => { setEditando(null); cargar(); }} />}
      {creando  && <ModalCrear    onClose={() => { setCreando(false); cargar(); }} />}
    </div>
  );
}

// ─── Modal: Ver detalles ───────────────────────────────────────────────────────
function ModalDetalle({ medico: m, onClose }) {
  return (
    <Modal titulo="Detalles del médico" onClose={onClose}>
      <div className="flex items-center gap-4 pb-5 border-b mb-5">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
          {initials(m.nombre_completo)}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Dr(a). {m.nombre_completo}</h3>
          <p className="text-purple-600 font-medium">{m.especialidad ?? 'Sin especialidad'}</p>
          <span className={`text-xs px-3 py-1 rounded-full font-medium mt-1 inline-block ${m.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {m.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Documento"           value={m.documento} />
        <Campo label="N° Licencia"         value={m.numero_licencia} />
        <Campo label="Email"               value={m.email} />
        <Campo label="Teléfono"            value={m.telefono} />
        <Campo label="Consultorio"         value={m.consultorio} />
        <Campo label="Años de experiencia" value={m.anios_experiencia ? `${m.anios_experiencia} años` : '—'} />
        <Campo label="Citas hoy"           value={m.citas_hoy     ?? 0} />
        <Campo label="Citas próximas"      value={m.citas_proximas ?? 0} />
        <Campo label="Total citas"         value={m.total_citas    ?? 0} className="col-span-2" />
      </div>
    </Modal>
  );
}

// ─── Modal: Editar ─────────────────────────────────────────────────────────────
function ModalEditar({ medico, onClose }) {
  const [form, setForm] = useState({
    nombres:           medico.nombres   ?? '',
    apellidos:         medico.apellidos ?? '',
    telefono:          medico.telefono  ?? '',
    especialidad:      medico.especialidad     ?? '',
    numero_licencia:   medico.numero_licencia  ?? '',
    consultorio:       medico.consultorio      ?? '',
    anios_experiencia: medico.anios_experiencia ?? 0,
    activo:            medico.activo ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // 1. Actualizar persona
      const r1 = await supabase
        .from('persona')
        .update({ nombres: form.nombres, apellidos: form.apellidos, telefono: form.telefono })
        .eq('id_persona', medico.id_persona);

      if (r1.error) {
        if (r1.error.code === '42501')
          throw new Error('Sin permisos. Ejecuta supabase/rls-admin.sql en Supabase SQL Editor.');
        throw new Error(r1.error.message);
      }

      // 2. Actualizar medico
      const r2 = await supabase
        .from('medico')
        .update({
          especialidad:      form.especialidad,
          numero_licencia:   form.numero_licencia,
          consultorio:       form.consultorio,
          anios_experiencia: Number(form.anios_experiencia),
          activo:            form.activo,
        })
        .eq('id_medico', medico.id_medico);

      if (r2.error) {
        if (r2.error.code === '42501')
          throw new Error('Sin permisos para actualizar medico. Ejecuta supabase/rls-admin.sql.');
        throw new Error(r2.error.message);
      }

      onClose();
    } catch (err) {
      console.error('[ModalEditar] Error:', err);
      setError(err.message ?? 'Error desconocido. Revisa la consola.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal titulo="Editar médico" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombres *"   name="nombres"   value={form.nombres}   onChange={handleChange} required />
          <Input label="Apellidos *" name="apellidos" value={form.apellidos} onChange={handleChange} required />
          <Input label="Teléfono"    name="telefono"  value={form.telefono}  onChange={handleChange} className="col-span-2" />
        </div>

        <div className="border-t pt-4">
          <p className="text-xs font-bold text-gray-500 uppercase mb-3">Información médica</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Especialidad</label>
              <select name="especialidad" value={form.especialidad} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Sin especialidad</option>
                {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <Input label="N° Licencia"         name="numero_licencia"    value={form.numero_licencia}    onChange={handleChange} />
            <Input label="Consultorio"          name="consultorio"        value={form.consultorio}        onChange={handleChange} />
            <Input label="Años de experiencia" name="anios_experiencia"  value={form.anios_experiencia}  onChange={handleChange} type="number" />
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input type="checkbox" name="activo" id="chk-activo" checked={form.activo} onChange={handleChange} className="w-5 h-5 rounded text-blue-600" />
          <label htmlFor="chk-activo" className="text-sm font-medium text-gray-700">Médico activo</label>
        </div>

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Guardar cambios" />
      </form>
    </Modal>
  );
}

// ─── Modal: Crear ──────────────────────────────────────────────────────────────
function ModalCrear({ onClose }) {
  const [form, setForm] = useState({
    nombres: '', apellidos: '', documento: '', telefono: '', email: '',
    especialidad: '', numero_licencia: '', consultorio: '', anios_experiencia: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.nombres || !form.documento || !form.especialidad) return;

    setSaving(true);
    setError('');

    try {
      // ── 1. Obtener o crear persona ─────────────────────────────────
      // Si ya existe una persona con ese email (ej: creada por el trigger
      // de auth cuando el médico se registró), la reutilizamos y solo
      // actualizamos los datos faltantes.
      let id_persona = null;
      let personaCreada = false;

      // Buscar por email si fue proporcionado
      if (form.email) {
        const { data: existente } = await supabase
          .from('persona')
          .select('id_persona')
          .eq('email', form.email.trim().toLowerCase())
          .maybeSingle();

        if (existente?.id_persona) {
          id_persona = existente.id_persona;
          // Completar datos que el trigger no llenó
          await supabase
            .from('persona')
            .update({
              documento:  form.documento.trim(),
              nombres:    form.nombres.trim(),
              apellidos:  form.apellidos.trim(),
              telefono:   form.telefono || null,
            })
            .eq('id_persona', id_persona);
        }
      }

      // Si no encontramos por email, crear persona nueva
      if (!id_persona) {
        const resPersona = await supabase
          .from('persona')
          .insert({
            documento:      form.documento.trim(),
            tipo_documento: 'CC',
            nombres:        form.nombres.trim(),
            apellidos:      form.apellidos.trim(),
            telefono:       form.telefono || null,
            email:          form.email ? form.email.trim().toLowerCase() : null,
          })
          .select('id_persona');

        if (resPersona.error) {
          const { code, message, details } = resPersona.error;
          if (code === '23505') {
            const campo = details?.includes('email') ? 'email' : 'documento';
            throw new Error(`Ya existe una persona con ese ${campo}. Si el médico tiene cuenta en el sistema, ingresa su email para vincularlo automáticamente.`);
          }
          if (code === '42501')
            throw new Error('Sin permisos. Ejecuta supabase/rls-admin.sql en Supabase SQL Editor.');
          throw new Error(message ?? 'Error al crear persona');
        }

        id_persona = resPersona.data?.[0]?.id_persona;
        if (!id_persona) throw new Error('No se obtuvo id_persona tras la inserción.');
        personaCreada = true;
      }

      // ── 2. Verificar que esta persona no tenga ya un médico ────────
      const { data: medicoExiste } = await supabase
        .from('medico')
        .select('id_medico')
        .eq('id_persona', id_persona)
        .maybeSingle();

      if (medicoExiste) {
        throw new Error('Esta persona ya tiene un perfil de médico registrado.');
      }

      // ── 3. Insertar médico ─────────────────────────────────────────
      const licencia = form.numero_licencia.trim() || `LIC-${Date.now()}`;
      const resMedico = await supabase
        .from('medico')
        .insert({
          id_persona,
          numero_licencia:   licencia,
          especialidad:      form.especialidad,
          consultorio:       form.consultorio || null,
          anios_experiencia: Number(form.anios_experiencia) || 0,
          activo:            true,
        });

      if (resMedico.error) {
        // Revertir persona si fue recién creada
        if (personaCreada) {
          await supabase.from('persona').delete().eq('id_persona', id_persona);
        }
        const { code, message } = resMedico.error;
        if (code === '23505')
          throw new Error('Ya existe un médico con ese número de licencia.');
        if (code === '42501')
          throw new Error('Sin permisos para insertar en medico. Ejecuta supabase/rls-admin.sql.');
        throw new Error(message ?? 'Error al crear médico');
      }

      onClose();
    } catch (err) {
      console.error('[ModalCrear] Error:', err);
      setError(err.message ?? 'Error desconocido. Revisa la consola.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal titulo="Registrar médico" subtitulo="Se crea el perfil médico en la base de datos" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Aviso */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-sm text-blue-800">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <p>Se registra el perfil del médico. Para darle acceso al sistema, crea la cuenta en la sección <strong>Usuarios</strong>.</p>
        </div>

        {/* Datos personales */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
            <User size={12} /> Datos personales
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombres *"    name="nombres"    value={form.nombres}    onChange={handleChange} required placeholder="Ej: María Fernanda" />
            <Input label="Apellidos *"  name="apellidos"  value={form.apellidos}  onChange={handleChange} required placeholder="Ej: Gómez Pérez" />
            <Input label="Documento *"  name="documento"  value={form.documento}  onChange={handleChange} required placeholder="Ej: 1090123456" />
            <Input label="Teléfono"     name="telefono"   value={form.telefono}   onChange={handleChange} placeholder="+57 300..." />
            <Input label="Email"        name="email"      type="email" value={form.email} onChange={handleChange} placeholder="medico@hospital.com" className="col-span-2" />
          </div>
        </div>

        {/* Datos médicos */}
        <div className="border-t pt-4">
          <p className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
            <Stethoscope size={12} /> Información médica
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Especialidad *</label>
              <select name="especialidad" value={form.especialidad} onChange={handleChange} required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Seleccionar</option>
                {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <Input label="N° Licencia (opcional)" name="numero_licencia" value={form.numero_licencia} onChange={handleChange} placeholder="MP-12345 (se auto-genera)" />
            <Input label="Consultorio"            name="consultorio"     value={form.consultorio}     onChange={handleChange} placeholder="Ej: 101" />
            <Input label="Años de experiencia"    name="anios_experiencia" type="number" value={form.anios_experiencia} onChange={handleChange} />
          </div>
        </div>

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Registrar médico" />
      </form>
    </Modal>
  );
}

// ─── Sub-componentes UI ────────────────────────────────────────────────────────
function Modal({ titulo, subtitulo, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
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
      <p className="font-semibold text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

function Input({ label, name, type = 'text', value, onChange, required = false, placeholder = '', className = '' }) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-700 mb-2 block">{label}</label>
      <input
        name={name} type={type} value={value} onChange={onChange}
        required={required} placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-center gap-2">
      <AlertCircle size={16} className="flex-shrink-0" /> {msg}
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
