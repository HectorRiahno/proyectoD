import { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, Mail, Lock, User, Users, Search, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import usuarioService from '../../../services/usuarioService';
import { createUserAccount } from '../../../services/adminService';

const ROLES = [
  { value: 'admin',     label: 'Administrador' },
  { value: 'medico',    label: 'Médico' },
  { value: 'asistente', label: 'Asistente' },
  { value: 'cliente',   label: 'Cliente / Paciente' },
];

const rolColor = (rol) => {
  const map = {
    admin:     'bg-red-100 text-red-700',
    medico:    'bg-blue-100 text-blue-700',
    asistente: 'bg-purple-100 text-purple-700',
    cliente:   'bg-green-100 text-green-700',
  };
  return map[rol] ?? 'bg-gray-100 text-gray-700';
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState('todos');
  const [showCreate, setShowCreate] = useState(false);

  const reload = () => {
    setLoading(true);
    setError('');
    usuarioService.getAll()
      .then(setUsuarios)
      .catch((err) => setError(err.message ?? 'Error cargando usuarios'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = usuarios.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (u.nombre_completo ?? '').toLowerCase().includes(term) ||
      (u.email ?? '').toLowerCase().includes(term) ||
      (u.username ?? '').toLowerCase().includes(term) ||
      (u.documento ?? '').includes(searchTerm);
    const matchRol = filterRol === 'todos' || u.rol_nombre === filterRol;
    return matchSearch && matchRol;
  });

  const totalPorRol = ROLES.reduce((acc, r) => {
    acc[r.value] = usuarios.filter((u) => u.rol_nombre === r.value).length;
    return acc;
  }, { todos: usuarios.length });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Usuarios</h1>
            <p className="text-blue-100">Administrar cuentas del sistema (admin, médico, asistente, cliente)</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100 mb-1">Total Usuarios</p>
            <p className="text-4xl font-bold">{loading ? '···' : usuarios.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Resumen por rol */}
      <div className="grid grid-cols-4 gap-4">
        {ROLES.map((r) => (
          <div key={r.value} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{r.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalPorRol[r.value] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filtros + acción */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, email, usuario o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg"
          >
            <UserPlus size={20} />
            Crear usuario
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterRol('todos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterRol === 'todos' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos ({totalPorRol.todos})
          </button>
          {ROLES.map((r) => (
            <button
              key={r.value}
              onClick={() => setFilterRol(r.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filterRol === r.value ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {r.label} ({totalPorRol[r.value] ?? 0})
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
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Usuario</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Documento</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Rol</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Último acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Loader2 size={32} className="mx-auto mb-2 animate-spin" />
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                filtered.map((u, idx) => (
                  <tr key={u.id_usuario} className={`hover:bg-blue-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                          {(u.nombre_completo ?? '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{u.nombre_completo ?? '—'}</p>
                          <p className="text-xs text-gray-500">@{u.username ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{u.email ?? '—'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-700">{u.documento ?? '—'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${rolColor(u.rol_nombre)}`}>
                        {u.rol_nombre ?? 'sin rol'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {u.activo ? (
                        <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-700">
                          <CheckCircle size={12} /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-ES') : 'Nunca'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CrearUsuarioModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reload(); }}
        />
      )}
    </div>
  );
}

function CrearUsuarioModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    nombre: '',
    rol: 'cliente',
    especialidad: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createUserAccount({
        email: form.email,
        password: form.password,
        nombre: form.nombre,
        rol: form.rol,
        especialidad: form.rol === 'medico' ? form.especialidad : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.message ?? 'No se pudo crear la cuenta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Crear nuevo usuario</h2>
            <p className="text-blue-100 text-sm">Esta cuenta podrá iniciar sesión con email y contraseña</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Input label="Nombre completo" name="nombre" value={form.nombre} onChange={handleChange} icon={<User size={16} />} required placeholder="Ej: María Gómez Pérez" />
          <Input label="Correo electrónico" name="email" type="email" value={form.email} onChange={handleChange} icon={<Mail size={16} />} required placeholder="usuario@correo.com" />
          <Input label="Contraseña" name="password" type="password" value={form.password} onChange={handleChange} icon={<Lock size={16} />} required placeholder="Mínimo 8 caracteres, letras + números" />

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <ShieldCheck size={16} /> Rol
            </label>
            <select
              name="rol"
              value={form.rol}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {form.rol === 'medico' && (
            <Input
              label="Especialidad"
              name="especialidad"
              value={form.especialidad}
              onChange={handleChange}
              required
              placeholder="Cardiología, Pediatría, etc."
            />
          )}

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg disabled:opacity-60"
            >
              {submitting ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, icon, ...props }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
        {icon} {label}
      </label>
      <input
        {...props}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />
    </div>
  );
}
