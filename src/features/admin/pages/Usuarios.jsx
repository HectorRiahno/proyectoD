import { useState, useEffect } from 'react';
import {
  UserPlus, ShieldCheck, Mail, User, Users, Search,
  Loader2, AlertCircle, CheckCircle, X, Edit, Trash2,
  ToggleLeft, ToggleRight, Info, Send
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { inviteUser } from '../../../services/adminService';
import { normalizeRoleName } from '../../../config/roles';

// ─── Roles disponibles ─────────────────────────────────────────────────────────
const ROLES = [
  { value: 'admin',     label: 'Administrador' },
  { value: 'medico',    label: 'Médico' },
  { value: 'asistente', label: 'Asistente' },
  { value: 'cliente',   label: 'Cliente / Paciente' },
];

const rolColor = (rol) => ({
  admin:     'bg-red-100 text-red-700',
  medico:    'bg-blue-100 text-blue-700',
  asistente: 'bg-purple-100 text-purple-700',
  cliente:   'bg-green-100 text-green-700',
}[rol] ?? 'bg-gray-100 text-gray-700');

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Usuarios() {
  const [usuarios, setUsuarios]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [filterRol, setFilterRol] = useState('todos');
  const [creando, setCreando]     = useState(false);
  const [editando, setEditando]   = useState(null);

  const cargar = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('vw_admin_usuarios')
      .select('*')
      .order('nombre_completo', { ascending: true });
    if (error) setError(error.message);
    else setUsuarios(data ?? []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const filtered = usuarios.filter(u => {
    const term = search.toLowerCase();
    const matchSearch =
      (u.nombre_completo ?? '').toLowerCase().includes(term) ||
      (u.email           ?? '').toLowerCase().includes(term) ||
      (u.username        ?? '').toLowerCase().includes(term) ||
      (u.documento       ?? '').includes(search);
    // Normalizar: la BD podría aún tener 'paciente' del seed original;
    // normalizeRoleName lo traduce a 'cliente' para que el filtro matchee.
    const rolNormalizado = normalizeRoleName(u.rol_nombre);
    const matchRol = filterRol === 'todos' || rolNormalizado === filterRol;
    return matchSearch && matchRol;
  });

  const totalPorRol = ROLES.reduce((acc, r) => {
    acc[r.value] = usuarios.filter(u => normalizeRoleName(u.rol_nombre) === r.value).length;
    return acc;
  }, { todos: usuarios.length });

  const toggleActivo = async (u) => {
    setError('');
    const { error } = await supabase
      .from('usuario')
      .update({ activo: !u.activo })
      .eq('id_usuario', u.id_usuario);
    if (error) {
      setError(error.code === '42501'
        ? 'Sin permisos. Ejecuta supabase/rls-admin.sql primero.'
        : error.message);
      return;
    }
    cargar();
  };

  const eliminar = async (u) => {
    if (!window.confirm(
      `¿Eliminar el perfil de "${u.nombre_completo}"?\n\n` +
      `Se eliminará su registro del sistema.\n` +
      `Para eliminar el acceso de login, ve a Supabase Dashboard → Auth → Users.`
    )) return;

    setError('');
    try {
      // 1. Eliminar asignaciones de rol
      await supabase.from('asignacion_rol').delete().eq('id_usuario', u.id_usuario);
      // 2. Eliminar usuario (persona queda como registro histórico)
      const { error: e2 } = await supabase.from('usuario').delete().eq('id_usuario', u.id_usuario);
      if (e2) {
        if (e2.code === '42501') throw new Error('Sin permisos. Ejecuta supabase/rls-admin.sql primero.');
        throw new Error(e2.message);
      }
      cargar();
    } catch (err) {
      setError(err.message ?? 'Error al eliminar usuario');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Usuarios</h1>
            <p className="text-blue-100">Cuentas de acceso al sistema</p>
          </div>
          <div className="flex gap-6 text-center">
            <KPI label="Total"      value={loading ? '···' : usuarios.length} />
            <KPI label="Activos"    value={loading ? '···' : usuarios.filter(u => u.activo).length} />
            <KPI label="Inactivos"  value={loading ? '···' : usuarios.filter(u => !u.activo).length} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      {/* Resumen por rol */}
      <div className="grid grid-cols-5 gap-3">
        {[{ value: 'todos', label: 'Todos' }, ...ROLES].map(r => (
          <button
            key={r.value}
            onClick={() => setFilterRol(r.value)}
            className={`p-4 rounded-xl border transition text-left ${
              filterRol === r.value
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                : 'bg-white border-gray-100 text-gray-700 hover:border-blue-300'
            }`}
          >
            <p className="text-xs opacity-80 mb-1">{r.label}</p>
            <p className="text-2xl font-bold">{totalPorRol[r.value] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* Filtros + acción */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, email, usuario o documento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setCreando(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg"
          >
            <UserPlus size={20} /> Invitar usuario
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Usuario</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Documento</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Rol</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Último acceso</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Loader2 size={32} className="mx-auto mb-2 animate-spin text-blue-600" />
                  <p className="text-gray-500">Cargando usuarios...</p>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <Users size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No se encontraron usuarios</p>
                </td></tr>
              ) : filtered.map((u, idx) => (
                <tr key={u.id_usuario} className={`hover:bg-blue-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  {/* Usuario */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm ${u.activo ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gray-400'}`}>
                        {(u.nombre_completo ?? '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{u.nombre_completo || '—'}</p>
                        <p className="text-xs text-gray-500">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{u.email || '—'}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-700">{u.documento || '—'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${rolColor(normalizeRoleName(u.rol_nombre))}`}>
                      {normalizeRoleName(u.rol_nombre) || 'sin rol'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleActivo(u)} title={u.activo ? 'Desactivar' : 'Activar'}>
                      {u.activo
                        ? <ToggleRight size={28} className="text-green-500 mx-auto" />
                        : <ToggleLeft  size={28} className="text-gray-400 mx-auto" />}
                    </button>
                    <p className="text-xs text-gray-500 mt-0.5">{u.activo ? 'Activo' : 'Inactivo'}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {u.ultimo_acceso
                      ? new Date(u.ultimo_acceso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                      : 'Nunca'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditando(u)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit size={17} />
                      </button>
                      <button
                        onClick={() => eliminar(u)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {creando  && <ModalCrear    onClose={() => { setCreando(false);  cargar(); }} />}
      {editando && <ModalEditar   usuario={editando} onClose={() => { setEditando(null); cargar(); }} />}
    </div>
  );
}

// ─── Modal: Invitar usuario ───────────────────────────────────────────────────
function ModalCrear({ onClose }) {
  const [form, setForm] = useState({
    email: '', nombre: '', rol: 'cliente',
    especialidad: '', numero_licencia: '', consultorio: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [ok, setOk]                 = useState('');

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setOk('');
    setSubmitting(true);
    try {
      const res = await inviteUser({
        email:           form.email,
        nombre:          form.nombre,
        rol:             form.rol,
        especialidad:    form.rol === 'medico' ? form.especialidad    : undefined,
        numero_licencia: form.rol === 'medico' ? form.numero_licencia : undefined,
        consultorio:     form.rol === 'medico' ? form.consultorio     : undefined,
      });
      setOk(res.message ?? `Invitación enviada a ${form.email}.`);
      // Cierra automáticamente tras 1.5s para que el admin alcance a leer el mensaje
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message ?? 'No se pudo enviar la invitación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal titulo="Invitar nuevo usuario" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Aviso */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-sm text-blue-800">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <p>
            Se enviará un correo de invitación al usuario con un enlace para que
            <strong> defina su propia contraseña</strong>. El admin nunca conoce la clave.
          </p>
        </div>

        <FieldInput label="Nombre completo *" name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Ej: María Gómez Pérez" icon={<User size={16} />} />
        <FieldInput label="Correo electrónico *" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="usuario@correo.com" icon={<Mail size={16} />} />

        {/* Rol */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <ShieldCheck size={16} /> Rol *
          </label>
          <select name="rol" value={form.rol} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {form.rol === 'medico' && (
          <>
            <FieldInput label="Especialidad *"  name="especialidad"    value={form.especialidad}    onChange={handleChange} required placeholder="Ej: Cardiología" />
            <FieldInput label="N° de licencia"   name="numero_licencia" value={form.numero_licencia} onChange={handleChange} placeholder="Opcional — se autogenera si lo dejas vacío" />
            <FieldInput label="Consultorio"      name="consultorio"     value={form.consultorio}     onChange={handleChange} placeholder="Ej: Consultorio 301" />
          </>
        )}

        {error && <ErrorBox msg={error} />}
        {ok && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl text-sm flex items-start gap-2">
            <CheckCircle size={16} className="flex-shrink-0 mt-0.5" /> {ok}
          </div>
        )}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold">
            Cancelar
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
            <Send size={16} />
            {submitting ? 'Enviando...' : 'Enviar invitación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Modal: Editar usuario ─────────────────────────────────────────────────────
function ModalEditar({ usuario: u, onClose }) {
  const [form, setForm] = useState({
    nombres:   u.nombres   ?? '',
    apellidos: u.apellidos ?? '',
    telefono:  u.telefono  ?? '',
    documento: u.documento ?? '',
    activo:    u.activo    ?? true,
    rol:       u.rol_nombre ?? 'cliente',
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
      // 1. Actualizar datos de persona
      if (u.id_persona) {
        const { error: e1 } = await supabase.from('persona').update({
          nombres:   form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          telefono:  form.telefono || null,
          documento: form.documento.trim() || null,
        }).eq('id_persona', u.id_persona);
        if (e1) {
          if (e1.code === '42501') throw new Error('Sin permisos sobre persona. Ejecuta supabase/rls-admin.sql.');
          if (e1.code === '23505') throw new Error('Ya existe una persona con ese documento.');
          throw new Error(e1.message);
        }
      }

      // 2. Actualizar campo activo en usuario
      const { error: e2 } = await supabase.from('usuario').update({ activo: form.activo }).eq('id_usuario', u.id_usuario);
      if (e2) {
        if (e2.code === '42501') throw new Error('Sin permisos sobre usuario. Ejecuta supabase/rls-admin.sql.');
        throw new Error(e2.message);
      }

      // 3. Actualizar rol si cambió
      if (form.rol !== u.rol_nombre) {
        // Obtener id del rol. Si pide 'cliente' y la BD aún tiene 'paciente'
        // del seed original (mismatch histórico), aceptamos 'paciente' como
        // sinónimo — solución definitiva: ejecutar supabase/migration-rol-cliente.sql.
        const candidatos = form.rol === 'cliente'
          ? ['cliente', 'paciente']
          : [form.rol];
        const { data: rolData } = await supabase
          .from('rol').select('id_rol, nombre').in('nombre', candidatos).maybeSingle();
        if (!rolData?.id_rol) {
          throw new Error(`Rol "${form.rol}" no existe en la BD. Ejecuta supabase/migration-rol-cliente.sql.`);
        }

        // Eliminar asignación anterior
        await supabase.from('asignacion_rol').delete().eq('id_usuario', u.id_usuario);

        // Insertar nueva asignación
        const { error: e3 } = await supabase.from('asignacion_rol').insert({
          id_usuario: u.id_usuario,
          id_rol:     rolData.id_rol,
        });
        if (e3) {
          if (e3.code === '42501') throw new Error('Sin permisos sobre asignacion_rol. Ejecuta supabase/rls-admin.sql.');
          throw new Error(e3.message);
        }

        // 3.b Provisionar la fila específica del rol si no existe.
        //     Sin esto el usuario no aparece en "Pacientes" / "Médicos"
        //     (esas vistas leen de paciente/medico, no de asignacion_rol).
        if (form.rol === 'cliente' && u.id_persona) {
          const { data: existePac } = await supabase
            .from('paciente').select('id_paciente').eq('id_persona', u.id_persona).maybeSingle();
          if (!existePac) {
            const { error: ePac } = await supabase.from('paciente').insert({
              id_persona:      u.id_persona,
              numero_historia: `HC-${u.id_persona}-${Date.now().toString(36)}`,
            });
            if (ePac && ePac.code !== '23505') {
              throw new Error(`Rol asignado, pero falló crear el paciente: ${ePac.message}`);
            }
          }
        }

        if (form.rol === 'medico' && u.id_persona) {
          const { data: existeMed } = await supabase
            .from('medico').select('id_medico').eq('id_persona', u.id_persona).maybeSingle();
          if (!existeMed) {
            const { error: eMed } = await supabase.from('medico').insert({
              id_persona:      u.id_persona,
              numero_licencia: `LIC-${Date.now().toString(36)}`,
              activo:          true,
            });
            if (eMed && eMed.code !== '23505') {
              throw new Error(`Rol asignado, pero falló crear el médico: ${eMed.message}. ` +
                              `Después complétalo desde "Médicos".`);
            }
          }
        }
      }

      onClose();
    } catch (err) {
      console.error('[ModalEditar Usuario]', err);
      setError(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal titulo="Editar usuario" subtitulo={u.nombre_completo ?? u.username} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info sólo lectura */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl text-sm">
          <div>
            <p className="text-xs text-gray-500">Username</p>
            <p className="font-semibold text-gray-900">@{u.username}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="font-semibold text-gray-900 truncate">{u.email}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400">* El email y el username no se pueden modificar desde aquí.</p>

        {/* Datos personales */}
        <div className="grid grid-cols-2 gap-4">
          <FieldInput label="Nombres *"   name="nombres"   value={form.nombres}   onChange={handleChange} required />
          <FieldInput label="Apellidos *" name="apellidos" value={form.apellidos} onChange={handleChange} required />
          <FieldInput label="Documento"   name="documento" value={form.documento} onChange={handleChange} placeholder="Cédula o ID" />
          <FieldInput label="Teléfono"    name="telefono"  value={form.telefono}  onChange={handleChange} />
        </div>

        {/* Rol */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <ShieldCheck size={16} /> Rol
          </label>
          <select name="rol" value={form.rol} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {form.rol !== u.rol_nombre && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Info size={12} /> Cambio de rol: <strong>{u.rol_nombre}</strong> → <strong>{form.rol}</strong>
            </p>
          )}
        </div>

        {/* Activo */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input type="checkbox" name="activo" id="chk-activo-edit" checked={form.activo} onChange={handleChange} className="w-5 h-5 rounded text-blue-600" />
          <label htmlFor="chk-activo-edit" className="text-sm font-medium text-gray-700">
            Cuenta activa (el usuario puede iniciar sesión)
          </label>
        </div>

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Guardar cambios" />
      </form>
    </Modal>
  );
}

// ─── Sub-componentes UI ────────────────────────────────────────────────────────
function Modal({ titulo, subtitulo, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
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

function FieldInput({ label, icon, ...props }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
        {icon} {label}
      </label>
      <input
        {...props}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
