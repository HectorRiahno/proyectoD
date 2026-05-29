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
  Modal, PageHeader, KPI, Input, ErrorBox, ErrorBanner, SuccessBanner,
  BotonesForm, SearchBar, LoadingRow, EmptyRow,
  Toolbar, AccentButton, TableShell, Thead, Tbody, Tr,
  IconButton, ActionGroup, Avatar,
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

const rolBadge = (rol) => ({
  admin:     { cls: 'bg-red-50 text-red-700 border-red-100',         dot: 'bg-red-500' },
  medico:    { cls: 'bg-violet-50 text-violet-700 border-violet-100', dot: 'bg-violet-500' },
  asistente: { cls: 'bg-indigo-50 text-indigo-700 border-indigo-100', dot: 'bg-indigo-500' },
  cliente:   { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
}[rol] ?? { cls: 'bg-surface text-ink-700 border-line', dot: 'bg-ink-300' });

const rolAvatarTone = (rol) => ({
  admin:     'rose',
  medico:    'violet',
  asistente: 'indigo',
  cliente:   'emerald',
}[rol] ?? 'ink');

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
        eyebrow="Usuarios"
        icon={<ShieldCheck size={11} strokeWidth={2.25} />}
        variant="fuchsia"
      >
        <KPI label="Total"      value={loading ? '···' : usuarios.length} />
        <KPI label="Activos"    value={loading ? '···' : usuarios.filter(u => u.activo).length} color="text-emerald-700" />
        <KPI label="Inactivos"  value={loading ? '···' : usuarios.filter(u => !u.activo).length} color="text-ink-500" />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />

      {/* Resumen por rol — segmented colorido */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[{ value: 'todos', label: 'Todos', tone: 'ink' }, ...ROLES.map(r => ({ ...r, tone: rolAvatarTone(r.value) }))].map(r => {
          const active = filterRol === r.value;
          const toneAccent = {
            ink:     active ? 'bg-ink-900 text-white border-ink-900'                 : 'border-line hover:border-ink-300',
            rose:    active ? 'bg-rose-600 text-white border-rose-600'               : 'border-line hover:border-rose-300',
            violet:  active ? 'bg-violet-600 text-white border-violet-600'           : 'border-line hover:border-violet-300',
            indigo:  active ? 'bg-indigo-600 text-white border-indigo-600'           : 'border-line hover:border-indigo-300',
            emerald: active ? 'bg-emerald-600 text-white border-emerald-600'         : 'border-line hover:border-emerald-300',
          }[r.tone] ?? 'border-line';

          return (
            <button
              key={r.value}
              onClick={() => setFilterRol(r.value)}
              className={`group relative overflow-hidden p-4 rounded-2xl border bg-white text-left transition-all duration-150 shadow-[0_1px_2px_rgba(11,18,32,0.04)] ${toneAccent} ${active ? 'shadow-[0_8px_24px_-12px_rgba(11,18,32,0.30)]' : ''}`}
            >
              <p className={`text-[10.5px] uppercase tracking-[0.10em] font-medium ${active ? 'text-white/75' : 'text-ink-500'}`}>
                {r.label}
              </p>
              <p className={`mt-1 text-[24px] font-semibold tracking-tight tabular-nums leading-none ${active ? 'text-white' : 'text-ink-900'}`}>
                {totalPorRol[r.value] ?? 0}
              </p>
            </button>
          );
        })}
      </div>

      <Toolbar>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, email, usuario o documento…"
        />
        <AccentButton variant="fuchsia" icon={UserPlus} onClick={() => setCreando(true)}>
          Invitar usuario
        </AccentButton>
      </Toolbar>

      <TableShell>
        <Thead columnas={[
          'Usuario', 'Email', 'Documento',
          { label: 'Rol',           align: 'center' },
          { label: 'Estado',        align: 'center' },
          'Último acceso',
          { label: 'Acciones',      align: 'center' },
        ]} />
        <Tbody>
          {loading ? (
            <LoadingRow colSpan={7} mensaje="Cargando usuarios…" />
          ) : filtered.length === 0 ? (
            <EmptyRow colSpan={7} icon={Users} mensaje="No se encontraron usuarios" />
          ) : filtered.map((u) => {
            const rol = normalizeRoleName(u.rol_nombre);
            const badge = rolBadge(rol);
            return (
              <Tr key={u.id_usuario}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.nombre_completo} tone={u.activo ? rolAvatarTone(rol) : 'muted'} />
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-ink-900">{u.nombre_completo || '—'}</p>
                      <p className="text-[11.5px] text-ink-500">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[13px] text-ink-700">{u.email || '—'}</td>
                <td className="px-5 py-3.5 text-[13px] font-mono text-ink-700">{u.documento || '—'}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md font-medium border ${badge.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {rol || 'sin rol'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button onClick={() => toggleActivo(u)} title={u.activo ? 'Desactivar' : 'Activar'} className="mx-auto block">
                    {u.activo
                      ? <ToggleRight size={24} className="text-emerald-500" strokeWidth={1.75} />
                      : <ToggleLeft  size={24} className="text-ink-300" strokeWidth={1.75} />}
                  </button>
                  <p className="text-[11px] text-ink-500 mt-0.5">{u.activo ? 'Activo' : 'Inactivo'}</p>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-ink-500">
                  {u.ultimo_acceso
                    ? new Date(u.ultimo_acceso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
                    : 'Nunca'}
                </td>
                <td className="px-5 py-3.5">
                  <ActionGroup>
                    <IconButton icon={Edit}   tone="indigo" title="Editar"   onClick={() => setEditando(u)} />
                    <IconButton icon={Trash2} tone="red"    title="Eliminar" onClick={() => eliminar(u)}    />
                  </ActionGroup>
                </td>
              </Tr>
            );
          })}
        </Tbody>
      </TableShell>

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
    <Modal titulo="Invitar nuevo usuario" variant="fuchsia" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Aviso */}
        <div className="flex items-start gap-2.5 text-[13px] text-fuchsia-800 bg-fuchsia-50/70 border-l-2 border-fuchsia-500 pl-3 pr-3 py-2.5 rounded-r-md">
          <Info size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
          <p>
            Se enviará un correo al usuario con un enlace para que
            <strong className="font-medium"> defina su propia contraseña</strong>. El admin nunca conoce la clave.
          </p>
        </div>

        <Input label="Nombre completo *" name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Ej: María Gómez Pérez" icon={<User size={14} />} />
        <Input label="Correo electrónico *" name="email" type="email" value={form.email} onChange={handleChange} required placeholder="usuario@correo.com" icon={<Mail size={14} />} />

        {/* Rol */}
        <div>
          <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-ink-500" /> Rol *
          </label>
          <select name="rol" value={form.rol} onChange={handleChange}
            className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all">
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
        {ok && <SuccessBanner msg={ok} />}

        <div className="flex gap-3 pt-5 border-t border-line">
          <button type="button" onClick={onClose}
            className="flex-1 px-5 py-2.5 bg-white border border-line text-ink-800 rounded-xl hover:bg-surface hover:border-ink-100 active:scale-[0.99] transition-all duration-150 text-[13.5px] font-medium">
            Cancelar
          </button>
          <button type="submit" disabled={submitting}
            className="group flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl text-[13.5px] font-medium shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_24px_-14px_rgba(11,18,32,0.40)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando…</>
              : <><Send size={14} strokeWidth={2} /> Enviar invitación</>}
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
    <Modal titulo="Editar usuario" subtitulo={u.nombre_completo ?? u.email} variant="fuchsia" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info sólo lectura */}
        <div className={`grid ${usernameDisplay ? 'grid-cols-2' : 'grid-cols-1'} gap-2.5`}>
          <div className="rounded-lg border border-line bg-surface/60 px-3 py-2">
            <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">Email</p>
            <p className="mt-0.5 text-[13.5px] font-medium text-ink-900 truncate">{u.email || '—'}</p>
          </div>
          {usernameDisplay && (
            <div className="rounded-lg border border-line bg-surface/60 px-3 py-2">
              <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">Username</p>
              <p className="mt-0.5 text-[13.5px] font-medium text-ink-900">@{usernameDisplay}</p>
            </div>
          )}
        </div>
        <p className="text-[11.5px] text-ink-500">* El email no se puede modificar desde aquí (se gestiona en Supabase Auth).</p>

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
          <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-ink-500" /> Rol
          </label>
          <select name="rol" value={form.rol} onChange={handleChange}
            disabled={editandoMiCuenta && rolInicial === 'admin'}
            className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all disabled:bg-surface disabled:cursor-not-allowed disabled:text-ink-500">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {editandoMiCuenta && rolInicial === 'admin' && (
            <p className="text-[11.5px] text-ink-500 mt-1.5 flex items-center gap-1">
              <Info size={11} /> No puedes cambiar tu propio rol de admin (te quedarías sin acceso).
            </p>
          )}
          {form.rol !== rolInicial && (
            <p className="text-[11.5px] text-amber-700 mt-1.5 flex items-center gap-1">
              <Info size={11} /> Cambio de rol: <strong className="font-medium">{rolInicial}</strong> → <strong className="font-medium">{form.rol}</strong>
            </p>
          )}
        </div>

        {/* Activo */}
        <label htmlFor="chk-activo-edit" className={`flex items-center gap-3 p-3 bg-surface border border-line rounded-xl ${editandoMiCuenta ? 'opacity-70' : 'cursor-pointer hover:border-ink-100'} transition-colors`}>
          <input type="checkbox" name="activo" id="chk-activo-edit" checked={form.activo} onChange={handleChange}
            disabled={editandoMiCuenta}
            className="w-4 h-4 rounded text-brand-600 accent-brand-600 disabled:opacity-50" />
          <span className="text-[13.5px] font-medium text-ink-800">
            Cuenta activa (el usuario puede iniciar sesión)
            {editandoMiCuenta && <span className="text-[11.5px] text-ink-500 ml-2">— no puedes desactivar tu propia cuenta</span>}
          </span>
        </label>

        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Guardar cambios" />
      </form>
    </Modal>
  );
}

