import React, { useState } from 'react';
import {
  Search, Eye, Edit, Trash2, AlertCircle, UserPlus, Heart, User, Users,
} from 'lucide-react';
import { usePacientes } from '../../../hooks';
import {
  Modal, PageHeader, KPI, Input, Textarea, Select, Section,
  Campo, CampoReadOnly, ErrorBox, ErrorBanner, BotonesForm,
  SearchBar, LoadingRow, EmptyRow,
  Toolbar, AccentButton, TableShell, Thead, Tbody, Tr,
  IconButton, ActionGroup, Avatar,
} from '../../../shared/components/ui';
import { pacienteService } from '../../../services';

// ─── Opciones ──────────────────────────────────────────────────────────────────
const TIPOS_SANGRE   = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión libre'];
const GENEROS        = ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'];

// Documento sintético generado por el trigger provision_user_from_auth
// cuando la persona se creó vía Supabase Auth sin documento real.
// Ej: "AUTH-9121ab70-30c". No es un documento real: el admin debe completarlo.
const esDocumentoSintetico = (doc) =>
  typeof doc === 'string' && /^AUTH-[0-9a-f]{1,12}$/i.test(doc);

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Pacientes() {
  const { pacientes, loading, error, reload, setError, softDelete } = usePacientes();
  const [search, setSearch]         = useState('');
  const [detalle, setDetalle]       = useState(null);
  const [editando, setEditando]     = useState(null);
  const [creando, setCreando]       = useState(false);

  const cargar = reload;

  const filtered = pacientes.filter(p => {
    const term = search.toLowerCase();
    return (
      (p.nombre_completo  ?? '').toLowerCase().includes(term) ||
      (!esDocumentoSintetico(p.documento) && (p.documento ?? '').includes(search)) ||
      (p.email            ?? '').toLowerCase().includes(term) ||
      (p.numero_historia  ?? '').toLowerCase().includes(term)
    );
  });

  const eliminar = async (p) => {
    const confirmar = window.confirm(
      `¿Enviar a papelera a ${p.nombre_completo}?\n\n` +
      `El paciente no se borra físicamente — un admin puede restaurarlo. ` +
      `Sus consultas, facturas e historial quedan intactos pero ocultos.`
    );
    if (!confirmar) return;

    setError('');
    try {
      // Soft-delete vía RPC. RLS oculta automáticamente las consultas y
      // demás datos del paciente borrado a usuarios no-admin.
      await softDelete(p.id_paciente);
    } catch (err) {
      console.error('[eliminar paciente]', err);
      setError(err.message ?? 'No se pudo eliminar el paciente');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Gestión de Pacientes"
        descripcion="Información completa de los pacientes registrados"
        eyebrow="Pacientes"
        icon={<Users size={11} strokeWidth={2.25} />}
        variant="emerald"
      >
        <KPI label="Total"    value={loading ? '···' : pacientes.length} />
        <KPI label="Con citas" value={loading ? '···' : pacientes.filter(p => (p.total_citas ?? 0) > 0).length} color="text-emerald-700" />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />

      <Toolbar>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, documento, email o historia…"
        />
        <AccentButton variant="emerald" icon={UserPlus} onClick={() => setCreando(true)}>
          Nuevo paciente
        </AccentButton>
      </Toolbar>

      <TableShell>
        <Thead columnas={[
          'Paciente', 'Documento', 'Edad', 'Contacto', 'Historia',
          { label: 'Citas', align: 'center' },
          { label: 'Acciones', align: 'center' },
        ]} />
        <Tbody>
          {loading ? (
            <LoadingRow colSpan={7} mensaje="Cargando pacientes…" color="emerald" />
          ) : filtered.length === 0 ? (
            <EmptyRow colSpan={7} icon={Search} mensaje="No se encontraron pacientes" />
          ) : filtered.map((p) => (
            <Tr key={p.id_paciente}>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar name={p.nombre_completo} tone="emerald" />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-ink-900">{p.nombre_completo}</p>
                    <p className="text-[11.5px] text-ink-500">{p.email ?? '—'}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3.5">
                {esDocumentoSintetico(p.documento) ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                    <AlertCircle size={10} /> Pendiente
                  </span>
                ) : (
                  <>
                    <span className="font-mono text-[13px] text-ink-900">{p.documento || '—'}</span>
                    <p className="text-[11.5px] text-ink-500 mt-0.5">{p.tipo_documento}</p>
                  </>
                )}
              </td>
              <td className="px-5 py-3.5 text-[13px] text-ink-900 tabular-nums">
                {p.edad != null ? `${p.edad} años` : '—'}
              </td>
              <td className="px-5 py-3.5 text-[13px] text-ink-700">{p.telefono ?? '—'}</td>
              <td className="px-5 py-3.5">
                <span className="inline-flex font-mono text-[11.5px] bg-surface border border-line text-ink-700 px-2 py-0.5 rounded-md">
                  {p.numero_historia}
                </span>
              </td>
              <td className="px-5 py-3.5 text-center text-[14px] font-semibold text-ink-900 tabular-nums">
                {p.total_citas ?? 0}
              </td>
              <td className="px-5 py-3.5">
                <ActionGroup>
                  <IconButton icon={Eye}    tone="brand"  title="Ver detalles" onClick={() => setDetalle(p)}  />
                  <IconButton icon={Edit}   tone="indigo" title="Editar"       onClick={() => setEditando(p)} />
                  <IconButton icon={Trash2} tone="red"    title="Eliminar"     onClick={() => eliminar(p)}    />
                </ActionGroup>
              </td>
            </Tr>
          ))}
        </Tbody>
      </TableShell>

      {detalle  && <ModalDetalle  paciente={detalle}  onClose={() => setDetalle(null)} />}
      {editando && <ModalEditar   paciente={editando} onClose={() => { setEditando(null); cargar(); }} />}
      {creando  && <ModalCrear    onClose={() => { setCreando(false); cargar(); }} />}
    </div>
  );
}

// ─── Modal: Ver detalles ───────────────────────────────────────────────────────
function ModalDetalle({ paciente: p, onClose }) {
  return (
    <Modal titulo="Detalles del paciente" variant="emerald" onClose={onClose} size="lg">
      <div className="flex items-center gap-4 pb-5 border-b border-line mb-5">
        <Avatar name={p.nombre_completo} tone="emerald" size="xl" />
        <div>
          <h3 className="text-[18px] font-semibold tracking-tight text-ink-900">{p.nombre_completo}</h3>
          <p className="text-[12.5px] text-ink-500 mt-0.5">
            {esDocumentoSintetico(p.documento)
              ? <span className="text-amber-700">Documento pendiente</span>
              : <>{p.tipo_documento} {p.documento}</>}
            {p.edad != null && ` · ${p.edad} años`}
            {p.genero && ` · ${p.genero}`}
          </p>
          <p className="text-[11.5px] text-emerald-700 font-mono mt-1">HC: {p.numero_historia}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Campo label="Email"               value={p.email} />
        <Campo label="Teléfono"            value={p.telefono} />
        <Campo label="Fecha de nacimiento" value={p.fecha_nacimiento} />
        <Campo label="Estado civil"        value={p.estado_civil} />
        <Campo label="Ocupación"           value={p.ocupacion} />
        <Campo label="Dirección"           value={p.direccion} className="col-span-2" />
        <Campo label="Contacto emergencia" value={p.contacto_emergencia} />
        <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2">
          <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-rose-700 mb-0.5 flex items-center gap-1">
            <Heart size={11} strokeWidth={2} /> Tipo de sangre
          </p>
          <p className="text-[16px] font-semibold text-rose-900 tabular-nums">{p.tipo_sangre ?? '—'}</p>
        </div>
        <Campo label="Alergias"            value={p.alergias} className="col-span-2" />
        <Campo label="Enf. crónicas"       value={p.enfermedades_cronicas} className="col-span-2" />
        <Campo label="Total citas"         value={p.total_citas ?? 0} />
        <Campo label="Última visita"       value={p.ultima_visita?.slice(0, 10)} />
      </div>
    </Modal>
  );
}

// ─── Modal: Crear ──────────────────────────────────────────────────────────────
function ModalCrear({ onClose }) {
  const INIT = {
    // persona
    documento: '', tipo_documento: 'CC', nombres: '', apellidos: '',
    fecha_nacimiento: '', genero: '', telefono: '', direccion: '', email: '',
    // paciente
    numero_historia: '', tipo_sangre: '', alergias: '',
    enfermedades_cronicas: '', contacto_emergencia: '',
    telefono_emergencia: '', ocupacion: '', estado_civil: '',
  };
  const [form, setForm]   = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await pacienteService.createCompleto(form);
      onClose();
    } catch (err) {
      console.error('[ModalCrear Paciente]', err);
      setError(err.message ?? 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal titulo="Registrar nuevo paciente" subtitulo="Ingresa los datos del paciente" onClose={onClose} size="lg" variant="emerald">
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Datos personales */}
        <Section titulo="Datos personales" icon={<User size={14} />}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombres *"       name="nombres"    value={form.nombres}    onChange={handleChange} required />
            <Input label="Apellidos *"     name="apellidos"  value={form.apellidos}  onChange={handleChange} required />
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo documento</label>
              <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {['CC','TI','CE','PA','RC'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Número de documento *" name="documento" value={form.documento} onChange={handleChange} required placeholder="Ej: 1090123456" />
            <Input label="Fecha de nacimiento"   name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} />
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Género</label>
              <select name="genero" value={form.genero} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Sin especificar</option>
                {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <Input label="Teléfono"  name="telefono"  value={form.telefono}  onChange={handleChange} placeholder="+57 300..." />
            <Input label="Email"     name="email"     type="email" value={form.email} onChange={handleChange} placeholder="paciente@correo.com" />
            <Input label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección de residencia" className="col-span-2" />
          </div>
        </Section>

        {/* Datos clínicos */}
        <Section titulo="Datos clínicos" icon={<Heart size={14} />}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="N° Historia (auto si vacío)" name="numero_historia" value={form.numero_historia} onChange={handleChange} placeholder="HC-0001" />
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de sangre</label>
              <select name="tipo_sangre" value={form.tipo_sangre} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Desconocido</option>
                {TIPOS_SANGRE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Estado civil</label>
              <select name="estado_civil" value={form.estado_civil} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Sin especificar</option>
                {ESTADOS_CIVILES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <Input label="Ocupación" name="ocupacion" value={form.ocupacion} onChange={handleChange} />
            <Input label="Contacto emergencia"  name="contacto_emergencia"  value={form.contacto_emergencia}  onChange={handleChange} className="col-span-1" />
            <Input label="Teléfono emergencia"  name="telefono_emergencia"  value={form.telefono_emergencia}  onChange={handleChange} className="col-span-1" />
            <Textarea label="Alergias"             name="alergias"             value={form.alergias}             onChange={handleChange} className="col-span-2" />
            <Textarea label="Enfermedades crónicas" name="enfermedades_cronicas" value={form.enfermedades_cronicas} onChange={handleChange} className="col-span-2" />
          </div>
        </Section>

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Registrar paciente" />
      </form>
    </Modal>
  );
}

// ─── Modal: Editar ─────────────────────────────────────────────────────────────
function ModalEditar({ paciente, onClose }) {
  const [form, setForm] = useState({
    // persona
    nombres:         paciente.nombres   ?? '',
    apellidos:       paciente.apellidos ?? '',
    fecha_nacimiento: paciente.fecha_nacimiento ?? '',
    genero:          paciente.genero    ?? '',
    telefono:        paciente.telefono  ?? '',
    direccion:       paciente.direccion ?? '',
    // paciente
    tipo_sangre:          paciente.tipo_sangre          ?? '',
    alergias:             paciente.alergias             ?? '',
    enfermedades_cronicas: paciente.enfermedades_cronicas ?? '',
    contacto_emergencia:  paciente.contacto_emergencia  ?? '',
    telefono_emergencia:  paciente.telefono_emergencia  ?? '',
    ocupacion:            paciente.ocupacion            ?? '',
    estado_civil:         paciente.estado_civil         ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await pacienteService.updateCompleto(
        { id_persona: paciente.id_persona, id_paciente: paciente.id_paciente },
        form,
      );
      onClose();
    } catch (err) {
      console.error('[ModalEditar Paciente]', err);
      setError(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal titulo="Editar paciente" subtitulo={paciente.nombre_completo} onClose={onClose} size="lg" variant="emerald">
      <form onSubmit={handleSubmit} className="space-y-6">

        <Section titulo="Datos personales" icon={<User size={14} />}>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombres *"  name="nombres"   value={form.nombres}   onChange={handleChange} required />
            <Input label="Apellidos *" name="apellidos" value={form.apellidos} onChange={handleChange} required />
            <Input label="Fecha de nacimiento" name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} />
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Género</label>
              <select name="genero" value={form.genero} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Sin especificar</option>
                {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <Input label="Teléfono"  name="telefono"  value={form.telefono}  onChange={handleChange} />
            <Input label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} className="col-span-2" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <CampoReadOnly label="Email"        value={paciente.email}        />
            <CampoReadOnly label="Documento"    value={`${paciente.tipo_documento} ${paciente.documento}`} />
            <CampoReadOnly label="N° Historia"  value={paciente.numero_historia} />
          </div>
          <p className="text-xs text-gray-400 mt-1">* Email, documento e historia son solo lectura.</p>
        </Section>

        <Section titulo="Datos clínicos" icon={<Heart size={14} />}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de sangre</label>
              <select name="tipo_sangre" value={form.tipo_sangre} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Desconocido</option>
                {TIPOS_SANGRE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Estado civil</label>
              <select name="estado_civil" value={form.estado_civil} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Sin especificar</option>
                {ESTADOS_CIVILES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <Input label="Ocupación"            name="ocupacion"           value={form.ocupacion}           onChange={handleChange} />
            <Input label="Contacto emergencia"  name="contacto_emergencia" value={form.contacto_emergencia} onChange={handleChange} />
            <Input label="Teléfono emergencia"  name="telefono_emergencia" value={form.telefono_emergencia} onChange={handleChange} />
            <Textarea label="Alergias"              name="alergias"              value={form.alergias}              onChange={handleChange} className="col-span-2" />
            <Textarea label="Enfermedades crónicas" name="enfermedades_cronicas" value={form.enfermedades_cronicas} onChange={handleChange} className="col-span-2" />
          </div>
        </Section>

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Guardar cambios" />
      </form>
    </Modal>
  );
}

