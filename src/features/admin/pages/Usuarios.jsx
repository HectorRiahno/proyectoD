import { useState } from 'react';
import {
  UserPlus, ShieldCheck, Mail, User, Users, Search,
  AlertCircle, CheckCircle, Edit, Trash2,
  ToggleLeft, ToggleRight, Info, Send,
} from 'lucide-react';
import { useAuth, useUsuarios } from '../../../hooks';
import { inviteUser, usuarioService } from '../../../services';
import { normalizeRoleName } from '../../../config/roles';
import {
  Modal, PageHeader, KPI, Input, ErrorBox, ErrorBanner,
  BotonesForm, SearchBar, LoadingRow, EmptyRow,
} from '../../../shared/components/ui';

// Documento sintético generado por el trigger provision_user_from_auth.
// Se muestra vacío en el formulario para que el admin tipee uno real.
const esDocumentoSintetico = (doc) =>
  typeof doc === 'string' && /^AUTH-[0-9a-f]{1,12}$/i.test(doc);

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
  const {
    usuarios, loading, error, setError,
    reload: cargar, toggleActivo: toggleActivoHook, eliminar: eliminarHook,
  } = useUsuarios();
  const [search, setSearch]       = useState('');
  const [filterRol, setFilterRol] = useState('todos');
  const [creando, setCreando]     = useState(false);
  const [editando, setEditando]   = useState(null);

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
    try { await toggleActivoHook(u); }
    catch (err) { setError(err.message); }
  };

  const eliminar = async (u) => {
    if (!window.confirm(
      `¿Eliminar el perfil de "${u.nombre_completo}"?\n\n` +
      `Se eliminará su registro del sistema.\n` +
      `Para eliminar el acceso de login, ve a Supabase Dashboard → Auth → Users.`
    )) return;

    setError('');
    try { await eliminarHook(u.id_usuario); }
    catch (err) { setError(err.message ?? 'Error al eliminar usuario'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Gestión de Usuarios"
        descripcion="Cuentas de acceso al sistema"
        variant="slate"
      >
        <KPI label="Total"      value={loading ? '···' : usuarios.length} />
        <KPI label="Activos"    value={loading ? '···' : usuarios.filter(u => u.activo).length} />
        <KPI label="Inactivos"  value={loading ? '···' : usuarios.filter(u => !u.activo).length} />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />

      {/* Resumen por rol */}
      <div className="grid grid-cols-5 gap-3">
        {[{ value: 'todos', label: 'Todos' }, ...ROLES].map(r => (
          <button
            key={r.value}
            onClick={() => setFilterRol(r.value)}
            className={`p-4 rounded-xl border transition text-left ${
              filterRol === r.value
                ? 'bg-slate-700 text-white border-slate-700 shadow-lg'
                : 'bg-white border-gray-100 text-gray-700 hover:border-slate-300'
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
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, email, usuario o documento..."
          />
          <button
            onClick={() => setCreando(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-900 transition font-semibold shadow-lg"
          >
            <UserPlus size={20} /> Invitar usuario
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
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
                <LoadingRow colSpan={7} mensaje="Cargando usuarios..." />
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={7} icon={Users} mensaje="No se encontraron usuarios" />
              ) : filtered.map((u, idx) => (
                <tr key={u.id_usuario} className={`hover:bg-slate-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  {/* Usuario */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm ${u.activo ? 'bg-gradient-to-br from-slate-600 to-slate-800' : 'bg-gray-400'}`}>
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
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2 text-sm text-slate-800">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <p>
            Se enviará un correo de invitación al usuario con un enlace para que
            <strong> defina su propia contraseña</strong>. El admin nunca conoce la clave.
          </p>
        </div>

        <Input label="Nombre completo *" name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Ej: María Gómez Pérez" icon={<User size={16} />} />
        <Input label="Correo electrónico *" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="usuario@correo.com" icon={<Mail size={16} />} />

        {/* Rol */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <ShieldCheck size={16} /> Rol *
          </label>
          <select name="rol" value={form.rol} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {form.rol === 'medico' && (
          <>
            <Input label="Especialidad *"  name="especialidad"    value={form.especialidad}    onChange={handleChange} required placeholder="Ej: Cardiología" />
            <Input label="N° de licencia"   name="numero_licencia" value={form.numero_licencia} onChange={handleChange} placeholder="Opcional — se autogenera si lo dejas vacío" />
            <Input label="Consultorio"      name="consultorio"     value={form.consultorio}     onChange={handleChange} placeholder="Ej: Consultorio 301" />
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
            className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl hover:from-slate-800 hover:to-slate-900 transition font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
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
  const { usuarioLogueado } = useAuth();
  // Si el documento es el placeholder sintético, no lo mostramos en el form.
  const docInicial = esDocumentoSintetico(u.documento) ? '' : (u.documento ?? '');
  const rolInicial = normalizeRoleName(u.rol_nombre) ?? 'cliente';
  const editandoMiCuenta = usuarioLogueado?.id_usuario === u.id_usuario
                        || usuarioLogueado?.id === u.auth_user_id;

  const [form, setForm] = useState({
    nombres:   u.nombres   ?? '',
    apellidos: u.apellidos ?? '',
    telefono:  u.telefono  ?? '',
    documento: docInicial,
    activo:    u.activo    ?? true,
    rol:       rolInicial,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    // Seguridad: el admin no debe degradar su propia cuenta y dejarse fuera.
    if (editandoMiCuenta && rolInicial === 'admin' && form.rol !== 'admin') {
      setError('No puedes cambiar tu propio rol de admin. Pide a otro admin que lo haga.');
      return;
    }
    if (editandoMiCuenta && !form.activo) {
      setError('No puedes desactivar tu propia cuenta.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await usuarioService.editarCompleto(u, form);
      onClose();
    } catch (err) {
      console.error('[ModalEditar Usuario]', err);
      setError(err.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // El username generado por el trigger es el email; mostrarlo así evita
  // el visual "@email@dominio" que confunde.
  const usernameDisplay = u.username && u.username !== u.email ? u.username : null;

  return (
    <Modal titulo="Editar usuario" subtitulo={u.nombre_completo ?? u.email} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info sólo lectura */}
        <div className={`grid ${usernameDisplay ? 'grid-cols-2' : 'grid-cols-1'} gap-3 p-4 bg-gray-50 rounded-xl text-sm`}>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="font-semibold text-gray-900 truncate">{u.email || '—'}</p>
          </div>
          {usernameDisplay && (
            <div>
              <p className="text-xs text-gray-500">Username</p>
              <p className="font-semibold text-gray-900">@{usernameDisplay}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400">* El email no se puede modificar desde aquí (se gestiona en Supabase Auth).</p>

        {/* Datos personales */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombres *"   name="nombres"   value={form.nombres}   onChange={handleChange} required />
          <Input label="Apellidos *" name="apellidos" value={form.apellidos} onChange={handleChange} required />
          <Input
            label="Documento *"
            name="documento"
            value={form.documento}
            onChange={handleChange}
            placeholder="Cédula o ID — completa este dato si está vacío"
            required
          />
          <Input label="Teléfono"    name="telefono"  value={form.telefono}  onChange={handleChange} />
        </div>
        {esDocumentoSintetico(u.documento) && (
          <p className="text-xs text-amber-600 -mt-2 flex items-start gap-1">
            <Info size={12} className="flex-shrink-0 mt-0.5" />
            Este usuario aún no tiene un documento real ({u.documento}). Por favor ingrésalo.
          </p>
        )}

        {/* Rol */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <ShieldCheck size={16} /> Rol
          </label>
          <select name="rol" value={form.rol} onChange={handleChange}
            disabled={editandoMiCuenta && rolInicial === 'admin'}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {editandoMiCuenta && rolInicial === 'admin' && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Info size={12} /> No puedes cambiar tu propio rol de admin (te quedarías sin acceso).
            </p>
          )}
          {form.rol !== rolInicial && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Info size={12} /> Cambio de rol: <strong>{rolInicial}</strong> → <strong>{form.rol}</strong>
            </p>
          )}
        </div>

        {/* Activo */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input type="checkbox" name="activo" id="chk-activo-edit" checked={form.activo} onChange={handleChange}
            disabled={editandoMiCuenta}
            className="w-5 h-5 rounded text-slate-700 disabled:opacity-50" />
          <label htmlFor="chk-activo-edit" className="text-sm font-medium text-gray-700">
            Cuenta activa (el usuario puede iniciar sesión)
            {editandoMiCuenta && <span className="text-xs text-gray-500 ml-2">— no puedes desactivar tu propia cuenta</span>}
          </label>
        </div>

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Guardar cambios" />
      </form>
    </Modal>
  );
}

