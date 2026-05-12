import React, { useState, useEffect } from 'react';
import {
  Search, Eye, Plus, Edit, Trash2, AlertCircle,
  Loader2, UserPlus, Mail, Phone, X, Heart,
  User, IdCard, MapPin, Calendar, Info
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ─── Opciones ──────────────────────────────────────────────────────────────────
const TIPOS_SANGRE   = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ESTADOS_CIVILES = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión libre'];
const GENEROS        = ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'];

const initials = (n) =>
  (n ?? '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();

// ─── Página ────────────────────────────────────────────────────────────────────
export default function Pacientes() {
  const [pacientes, setPacientes]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [detalle, setDetalle]       = useState(null);
  const [editando, setEditando]     = useState(null);
  const [creando, setCreando]       = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('vw_admin_pacientes')
      .select('*')
      .order('nombre_completo', { ascending: true });
    if (error) setError(error.message);
    else setPacientes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtered = pacientes.filter(p => {
    const term = search.toLowerCase();
    return (
      (p.nombre_completo  ?? '').toLowerCase().includes(term) ||
      (p.documento        ?? '').includes(search) ||
      (p.email            ?? '').toLowerCase().includes(term) ||
      (p.numero_historia  ?? '').toLowerCase().includes(term)
    );
  });

  const eliminar = async (p) => {
    const confirmar = window.confirm(
      `¿Eliminar a ${p.nombre_completo}?\n\n` +
      `Se intentará eliminar el perfil del paciente.\n` +
      `Si tiene consultas o facturas registradas, se eliminarán también.`
    );
    if (!confirmar) return;

    setError('');
    try {
      // Eliminar registros dependientes sin CASCADE en el schema
      await supabase.from('orden_medica')
        .delete()
        .in('id_consulta',
          supabase.from('consulta_medica').select('id_consulta').eq('id_paciente', p.id_paciente)
        );

      await supabase.from('diagnostico')
        .delete()
        .in('id_consulta',
          supabase.from('consulta_medica').select('id_consulta').eq('id_paciente', p.id_paciente)
        );

      await supabase.from('sintoma')
        .delete()
        .in('id_consulta',
          supabase.from('consulta_medica').select('id_consulta').eq('id_paciente', p.id_paciente)
        );

      await supabase.from('consulta_medica').delete().eq('id_paciente', p.id_paciente);
      await supabase.from('factura').delete().eq('id_paciente', p.id_paciente);
      await supabase.from('cirugia').delete().eq('id_paciente', p.id_paciente);

      // Ahora sí borrar el paciente (el resto tiene ON DELETE CASCADE en el schema)
      const { error } = await supabase.from('paciente').delete().eq('id_paciente', p.id_paciente);
      if (error) {
        if (error.code === '42501') throw new Error('Sin permisos. Ejecuta supabase/rls-admin.sql primero.');
        throw new Error(error.message);
      }
      cargar();
    } catch (err) {
      console.error('[eliminar paciente]', err);
      setError(err.message ?? 'No se pudo eliminar el paciente');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Pacientes</h1>
            <p className="text-blue-100">Información completa de los pacientes registrados</p>
          </div>
          <div className="flex gap-8 text-center">
            <div>
              <p className="text-sm text-blue-100">Total</p>
              <p className="text-3xl font-bold">{loading ? '···' : pacientes.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-100">Con citas</p>
              <p className="text-3xl font-bold">{loading ? '···' : pacientes.filter(p => (p.total_citas ?? 0) > 0).length}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Búsqueda + acciones */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, documento, email o historia..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setCreando(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg"
          >
            <UserPlus size={20} /> Nuevo paciente
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Paciente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Documento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Edad</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Contacto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Historia</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Citas</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Loader2 size={32} className="mx-auto mb-2 animate-spin text-blue-600" />
                  <p className="text-gray-500">Cargando pacientes...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Search size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No se encontraron pacientes</p>
                </td></tr>
              ) : filtered.map((p, idx) => (
                <tr key={p.id_paciente} className={`hover:bg-blue-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm flex-shrink-0">
                        {initials(p.nombre_completo)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{p.nombre_completo}</p>
                        <p className="text-xs text-gray-500">{p.email ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-900">{p.documento}</span>
                    <p className="text-xs text-gray-500">{p.tipo_documento}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {p.edad != null ? `${p.edad} años` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{p.telefono ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {p.numero_historia}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-gray-900">{p.total_citas ?? 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setDetalle(p)}  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver detalles"><Eye size={17} /></button>
                      <button onClick={() => setEditando(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Editar"><Edit size={17} /></button>
                      <button onClick={() => eliminar(p)}    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar"><Trash2 size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detalle  && <ModalDetalle  paciente={detalle}  onClose={() => setDetalle(null)} />}
      {editando && <ModalEditar   paciente={editando} onClose={() => { setEditando(null); cargar(); }} />}
      {creando  && <ModalCrear    onClose={() => { setCreando(false); cargar(); }} />}
    </div>
  );
}

// ─── Modal: Ver detalles ───────────────────────────────────────────────────────
function ModalDetalle({ paciente: p, onClose }) {
  return (
    <Modal titulo="Detalles del paciente" onClose={onClose}>
      <div className="flex items-center gap-4 pb-5 border-b mb-5">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
          {initials(p.nombre_completo)}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{p.nombre_completo}</h3>
          <p className="text-sm text-gray-500">
            {p.tipo_documento} {p.documento}
            {p.edad != null && ` · ${p.edad} años`}
            {p.genero && ` · ${p.genero}`}
          </p>
          <p className="text-xs text-blue-600 font-mono mt-1">HC: {p.numero_historia}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Email"               value={p.email} />
        <Campo label="Teléfono"            value={p.telefono} />
        <Campo label="Fecha de nacimiento" value={p.fecha_nacimiento} />
        <Campo label="Estado civil"        value={p.estado_civil} />
        <Campo label="Ocupación"           value={p.ocupacion} />
        <Campo label="Dirección"           value={p.direccion} className="col-span-2" />
        <Campo label="Contacto emergencia" value={p.contacto_emergencia} />
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700 font-bold uppercase mb-1 flex items-center gap-1">
            <Heart size={12} /> Tipo de sangre
          </p>
          <p className="font-bold text-red-900 text-lg">{p.tipo_sangre ?? '—'}</p>
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
      // Buscar persona por email (puede existir por trigger de auth)
      let id_persona = null;
      let personaCreada = false;

      if (form.email) {
        const { data: existe } = await supabase
          .from('persona')
          .select('id_persona')
          .eq('email', form.email.trim().toLowerCase())
          .maybeSingle();
        if (existe?.id_persona) {
          id_persona = existe.id_persona;
          await supabase.from('persona').update({
            documento: form.documento.trim(),
            nombres:   form.nombres.trim(),
            apellidos: form.apellidos.trim(),
            fecha_nacimiento: form.fecha_nacimiento || null,
            genero:    form.genero  || null,
            telefono:  form.telefono || null,
            direccion: form.direccion || null,
          }).eq('id_persona', id_persona);
        }
      }

      // Si no existe, crear persona nueva
      if (!id_persona) {
        const r = await supabase.from('persona').insert({
          documento:       form.documento.trim(),
          tipo_documento:  form.tipo_documento,
          nombres:         form.nombres.trim(),
          apellidos:       form.apellidos.trim(),
          fecha_nacimiento: form.fecha_nacimiento || null,
          genero:          form.genero    || null,
          telefono:        form.telefono  || null,
          direccion:       form.direccion || null,
          email:           form.email ? form.email.trim().toLowerCase() : null,
        }).select('id_persona');

        if (r.error) {
          const { code, details } = r.error;
          if (code === '23505') {
            const campo = details?.includes('email') ? 'email' : 'documento';
            throw new Error(`Ya existe una persona con ese ${campo}.`);
          }
          if (code === '42501') throw new Error('Sin permisos. Ejecuta supabase/rls-admin.sql.');
          throw new Error(r.error.message);
        }
        id_persona = r.data?.[0]?.id_persona;
        if (!id_persona) throw new Error('No se obtuvo id_persona.');
        personaCreada = true;
      }

      // Verificar que no tenga ya perfil de paciente
      const { data: pEx } = await supabase.from('paciente')
        .select('id_paciente').eq('id_persona', id_persona).maybeSingle();
      if (pEx) throw new Error('Esta persona ya tiene un perfil de paciente.');

      // Crear paciente
      const historia = form.numero_historia.trim() || `HC-${Date.now()}`;
      const rPac = await supabase.from('paciente').insert({
        id_persona,
        numero_historia:      historia,
        tipo_sangre:          form.tipo_sangre    || null,
        alergias:             form.alergias       || null,
        enfermedades_cronicas: form.enfermedades_cronicas || null,
        contacto_emergencia:  form.contacto_emergencia || null,
        telefono_emergencia:  form.telefono_emergencia || null,
        ocupacion:            form.ocupacion      || null,
        estado_civil:         form.estado_civil   || null,
      });

      if (rPac.error) {
        if (personaCreada) await supabase.from('persona').delete().eq('id_persona', id_persona);
        if (rPac.error.code === '42501') throw new Error('Sin permisos para insertar paciente. Ejecuta rls-admin.sql.');
        throw new Error(rPac.error.message);
      }
      onClose();
    } catch (err) {
      console.error('[ModalCrear Paciente]', err);
      setError(err.message ?? 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal titulo="Registrar nuevo paciente" subtitulo="Ingresa los datos del paciente" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Datos personales */}
        <Seccion titulo="Datos personales" icon={<User size={14} />}>
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
        </Seccion>

        {/* Datos clínicos */}
        <Seccion titulo="Datos clínicos" icon={<Heart size={14} />}>
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
        </Seccion>

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
      // 1. Actualizar persona
      const r1 = await supabase.from('persona').update({
        nombres:          form.nombres.trim(),
        apellidos:        form.apellidos.trim(),
        fecha_nacimiento: form.fecha_nacimiento || null,
        genero:           form.genero    || null,
        telefono:         form.telefono  || null,
        direccion:        form.direccion || null,
      }).eq('id_persona', paciente.id_persona);

      if (r1.error) {
        if (r1.error.code === '42501') throw new Error('Sin permisos. Ejecuta supabase/rls-admin.sql.');
        throw new Error(r1.error.message);
      }

      // 2. Actualizar paciente
      const r2 = await supabase.from('paciente').update({
        tipo_sangre:          form.tipo_sangre          || null,
        alergias:             form.alergias             || null,
        enfermedades_cronicas: form.enfermedades_cronicas || null,
        contacto_emergencia:  form.contacto_emergencia  || null,
        telefono_emergencia:  form.telefono_emergencia  || null,
        ocupacion:            form.ocupacion            || null,
        estado_civil:         form.estado_civil         || null,
      }).eq('id_paciente', paciente.id_paciente);

      if (r2.error) {
        if (r2.error.code === '42501') throw new Error('Sin permisos. Ejecuta supabase/rls-admin.sql.');
        throw new Error(r2.error.message);
      }
      onClose();
    } catch (err) {
      console.error('[ModalEditar Paciente]', err);
      setError(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal titulo="Editar paciente" subtitulo={paciente.nombre_completo} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-6">

        <Seccion titulo="Datos personales" icon={<User size={14} />}>
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
        </Seccion>

        <Seccion titulo="Datos clínicos" icon={<Heart size={14} />}>
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
        </Seccion>

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

function Seccion({ titulo, icon, children }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
        <span className="text-blue-500">{icon}</span> {titulo}
      </p>
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">{children}</div>
    </div>
  );
}

function Campo({ label, value, className = '' }) {
  return (
    <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900 break-words">{value || '—'}</p>
    </div>
  );
}

function CampoReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
        {value || '—'}
      </div>
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

function Textarea({ label, name, value, onChange, className = '' }) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-gray-700 mb-2 block">{label}</label>
      <textarea
        name={name} value={value} onChange={onChange} rows={2}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
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
