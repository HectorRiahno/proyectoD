import React, { useState } from 'react';
import {
  Search, Plus, Edit, Trash2, Eye,
  Stethoscope, Phone, Mail, ToggleLeft, ToggleRight,
  User, Info,
} from 'lucide-react';
import { medicoService } from '../../../services';
import { useMedicos } from '../../../hooks';
import {
  Modal, PageHeader, KPI, Input, Campo, ErrorBox, ErrorBanner,
  BotonesForm, SearchBar, LoadingRow, EmptyRow,
  Toolbar, AccentButton, TableShell, Thead, Tbody, Tr,
  IconButton, ActionGroup, Avatar,
} from '../../../shared/components/ui';

const ESPECIALIDADES = [
  'Medicina General', 'Cardiología', 'Pediatría', 'Ginecología',
  'Dermatología', 'Oftalmología', 'Traumatología', 'Odontología',
  'Neurología', 'Psiquiatría', 'Oncología', 'Endocrinología',
  'Gastroenterología', 'Urología', 'Otorrinolaringología',
];

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
        eyebrow="Médicos"
        icon={<Stethoscope size={11} strokeWidth={2.25} />}
        variant="violet"
      >
        <KPI label="Total"          value={loading ? '···' : medicos.length} />
        <KPI label="Activos"        value={loading ? '···' : medicos.filter(m => m.activo).length} color="text-emerald-700" />
        <KPI label="Especialidades" value={loading ? '···' : especialidades.length} color="text-violet-700" />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />

      <Toolbar>
        <SearchBar
          className="min-w-[220px]"
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, especialidad, email…"
        />

        <select
          value={filtroEsp}
          onChange={e => setFiltroEsp(e.target.value)}
          className="px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
        >
          <option value="">Todas las especialidades</option>
          {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <div className="inline-flex p-1 border border-line rounded-xl bg-white">
          {[['todos', 'Todos'], ['activo', 'Activos'], ['inactivo', 'Inactivos']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFiltroEstado(v)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all ${
                filtroEstado === v
                  ? 'bg-violet-600 text-white shadow-[0_4px_14px_-6px_rgba(11,18,32,0.35)]'
                  : 'text-ink-700 hover:bg-surface'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <AccentButton variant="violet" icon={Plus} onClick={() => setCreando(true)}>
          Nuevo médico
        </AccentButton>
      </Toolbar>

      <TableShell>
        <Thead columnas={[
          'Médico', 'Especialidad', 'Contacto', 'Consultorio',
          { label: 'Citas hoy', align: 'center' },
          { label: 'Estado',    align: 'center' },
          { label: 'Acciones',  align: 'center' },
        ]} />
        <Tbody>
          {loading ? (
            <LoadingRow colSpan={7} mensaje="Cargando médicos…" />
          ) : filtered.length === 0 ? (
            <EmptyRow colSpan={7} icon={Stethoscope} mensaje="No se encontraron médicos" />
          ) : filtered.map((m) => (
            <Tr key={m.id_medico}>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={m.nombre_completo} tone={m.activo ? 'violet' : 'muted'} />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-ink-900">Dr(a). {m.nombre_completo}</p>
                    <p className="text-[11.5px] text-ink-500 font-mono">{m.documento}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5">
                <span className="inline-flex text-[11.5px] px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 rounded-md font-medium">
                  {m.especialidad ?? '—'}
                </span>
                {m.anios_experiencia > 0 && (
                  <p className="text-[11.5px] text-ink-500 mt-1">{m.anios_experiencia} años</p>
                )}
              </td>
              <td className="px-5 py-3.5">
                <div className="text-[12.5px] space-y-0.5">
                  {m.email    && <p className="flex items-center gap-1.5 text-ink-700"><Mail size={11} className="text-brand-600 flex-shrink-0" strokeWidth={1.75} />{m.email}</p>}
                  {m.telefono && <p className="flex items-center gap-1.5 text-ink-700"><Phone size={11} className="text-emerald-600 flex-shrink-0" strokeWidth={1.75} />{m.telefono}</p>}
                </div>
              </td>
              <td className="px-5 py-3.5 text-[13px] text-ink-700">{m.consultorio ?? '—'}</td>
              <td className="px-5 py-3.5 text-center">
                <p className="text-[14px] font-semibold text-ink-900 tabular-nums">{m.citas_hoy ?? 0}</p>
                <p className="text-[11.5px] text-ink-500">{m.citas_proximas ?? 0} próx.</p>
              </td>
              <td className="px-5 py-3.5 text-center">
                <button
                  onClick={() => toggleActivo(m)}
                  title={m.activo ? 'Desactivar' : 'Activar'}
                  className="mx-auto block"
                >
                  {m.activo
                    ? <ToggleRight size={24} className="text-emerald-500" strokeWidth={1.75} />
                    : <ToggleLeft  size={24} className="text-ink-300" strokeWidth={1.75} />}
                </button>
                <p className="text-[11px] text-ink-500 mt-0.5">{m.activo ? 'Activo' : 'Inactivo'}</p>
              </td>
              <td className="px-5 py-3.5">
                <ActionGroup>
                  <IconButton icon={Eye}    tone="brand"  title="Ver"      onClick={() => setDetalle(m)}  />
                  <IconButton icon={Edit}   tone="indigo" title="Editar"   onClick={() => setEditando(m)} />
                  <IconButton icon={Trash2} tone="red"    title="Eliminar" onClick={() => eliminar(m)}    />
                </ActionGroup>
              </td>
            </Tr>
          ))}
        </Tbody>
      </TableShell>

      {detalle  && <ModalDetalle  medico={detalle}  onClose={() => setDetalle(null)} />}
      {editando && <ModalEditar   medico={editando} onClose={() => { setEditando(null); cargar(); }} />}
      {creando  && <ModalCrear    onClose={() => { setCreando(false); cargar(); }} />}
    </div>
  );
}

// ─── Modal: Ver detalles ───────────────────────────────────────────────────────
function ModalDetalle({ medico: m, onClose }) {
  return (
    <Modal titulo="Detalles del médico" variant="violet" onClose={onClose}>
      <div className="flex items-center gap-4 pb-5 border-b border-line mb-5">
        <Avatar name={m.nombre_completo} tone="violet" size="xl" />
        <div>
          <h3 className="text-[18px] font-semibold tracking-tight text-ink-900">Dr(a). {m.nombre_completo}</h3>
          <p className="text-[13px] font-medium text-violet-700 mt-0.5">{m.especialidad ?? 'Sin especialidad'}</p>
          <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium mt-1.5 inline-flex items-center gap-1.5 border ${m.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-surface text-ink-700 border-line'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${m.activo ? 'bg-emerald-500' : 'bg-ink-300'}`} />
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
    <Modal titulo="Editar médico" variant="violet" onClose={onClose}>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
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
    <Modal titulo="Registrar médico" subtitulo="Se crea el perfil médico en la base de datos" variant="violet" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Aviso */}
        <div className="flex items-start gap-2.5 text-[13px] text-violet-800 bg-violet-50/70 border-l-2 border-violet-500 pl-3 pr-3 py-2.5 rounded-r-md">
          <Info size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p>Se registra el perfil del médico. Para darle acceso al sistema, crea la cuenta en la sección <strong className="font-medium">Usuarios</strong>.</p>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
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

