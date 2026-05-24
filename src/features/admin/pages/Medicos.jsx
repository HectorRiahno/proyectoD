import React, { useState } from 'react';
import {
  Search, Plus, Edit, Trash2, Eye, AlertCircle,
  Stethoscope, Phone, Mail, ToggleLeft, ToggleRight,
  User, Info,
} from 'lucide-react';
import { medicoService } from '../../../services';
import { useMedicos } from '../../../hooks';
import {
  Modal, PageHeader, KPI, Input, Campo, ErrorBox, ErrorBanner,
  BotonesForm, SearchBar, LoadingRow, EmptyRow,
} from '../../../shared/components/ui';

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
  const {
    medicos, loading, error, setError,
    reload: cargar, toggleActivo: toggleActivoHook, eliminar: eliminarHook,
  } = useMedicos();
  const [search, setSearch]             = useState('');
  const [filtroEsp, setFiltroEsp]       = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [detalle, setDetalle]           = useState(null);
  const [editando, setEditando]         = useState(null);
  const [creando, setCreando]           = useState(false);

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
    try { await toggleActivoHook(m); }
    catch (err) { setError(err.message); }
  };

  const eliminar = async (m) => {
    if (!window.confirm(`¿Eliminar a ${m.nombre_completo}?\nEsta acción no se puede deshacer.`)) return;
    try { await eliminarHook(m.id_medico); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Gestión de Médicos"
        descripcion="Administra el personal médico del centro"
        variant="blueDeep"
      >
        <KPI label="Total"        value={loading ? '···' : medicos.length} />
        <KPI label="Activos"      value={loading ? '···' : medicos.filter(m => m.activo).length} />
        <KPI label="Especialidades" value={loading ? '···' : especialidades.length} />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-center">
          <SearchBar
            className="min-w-[220px]"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, especialidad, email..."
          />

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
                <LoadingRow colSpan={7} mensaje="Cargando médicos..." />
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={7} icon={Stethoscope} mensaje="No se encontraron médicos" />
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
      await medicoService.editarCompleto(
        { id_persona: medico.id_persona, id_medico: medico.id_medico },
        form,
      );
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
      await medicoService.crearCompleto(form);
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

