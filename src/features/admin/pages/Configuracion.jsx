import React, { useState, useEffect } from 'react';
import {
  Settings, User, Lock, Database,
  Save, Eye, EyeOff, AlertCircle, CheckCircle,
  Loader2, Shield, Mail, Phone, IdCard, Calendar
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { dashboardService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (n) =>
  (n ?? '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();

// ─── Componente principal ──────────────────────────────────────────────────────
export default function Configuracion() {
  const { usuarioLogueado } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');

  const tabs = [
    { id: 'perfil',          name: 'Mi perfil',       icon: User },
    { id: 'seguridad',       name: 'Seguridad',        icon: Lock },
    { id: 'sistema',         name: 'Sistema',          icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Configuración</h1>
            <p className="text-gray-300">
              Cuenta: <span className="text-white font-semibold">{usuarioLogueado?.email}</span>
            </p>
          </div>
          <Settings size={64} className="opacity-20" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Contenido */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            {activeTab === 'perfil'         && <TabPerfil />}
            {activeTab === 'seguridad'      && <TabSeguridad />}
            {activeTab === 'sistema'        && <TabSistema />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Mi perfil ────────────────────────────────────────────────────────────
function TabPerfil() {
  const { usuarioLogueado } = useAuth();
  const [perfil, setPerfil]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState({ tipo: '', texto: '' });
  const [form, setForm]       = useState({
    nombres: '', apellidos: '', telefono: '', documento: '',
  });

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('vw_admin_usuarios')
        .select('*')
        .eq('auth_user_id', usuarioLogueado?.auth_user_id ?? '')
        .maybeSingle();

      if (data) {
        setPerfil(data);
        setForm({
          nombres:   data.nombres   ?? '',
          apellidos: data.apellidos ?? '',
          telefono:  data.telefono  ?? '',
          documento: data.documento ?? '',
        });
      }
      setLoading(false);
    };
    if (usuarioLogueado?.auth_user_id) cargar();
    else setLoading(false);
  }, [usuarioLogueado]);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!perfil?.id_persona) return;
    setSaving(true);
    setMsg({ tipo: '', texto: '' });

    const { error } = await supabase
      .from('persona')
      .update({
        nombres:   form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        telefono:  form.telefono || null,
      })
      .eq('id_persona', perfil.id_persona);

    if (error) {
      setMsg({ tipo: 'error', texto: error.message });
    } else {
      setMsg({ tipo: 'ok', texto: 'Perfil actualizado correctamente.' });
      setPerfil(p => ({ ...p, nombre_completo: `${form.nombres} ${form.apellidos}`, ...form }));
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 size={32} className="mx-auto mb-2 animate-spin text-blue-600" />
        <p className="text-gray-500">Cargando perfil...</p>
      </div>
    );
  }

  const nombre = `${form.nombres} ${form.apellidos}`.trim() || 'Administrador';

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Mi perfil</h2>

      {/* Avatar + resumen */}
      <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
          {initials(nombre)}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{nombre}</h3>
          <p className="text-blue-600 font-medium capitalize">{perfil?.rol_nombre ?? 'Administrador'}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Mail size={13} /> {perfil?.email ?? usuarioLogueado?.email}
            </span>
            {perfil?.created_at && (
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                Desde {new Date(perfil.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <Campo label="Nombres" name="nombres" value={form.nombres} onChange={handleChange}
            icon={<User size={16} />} required placeholder="Ej: Juan Carlos" />
          <Campo label="Apellidos" name="apellidos" value={form.apellidos} onChange={handleChange}
            icon={<User size={16} />} placeholder="Ej: García Ruiz" />
          <Campo label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange}
            icon={<Phone size={16} />} placeholder="+57 300 123 4567" />

          {/* Campos solo lectura */}
          <CampoReadOnly label="Email (cuenta)" value={perfil?.email ?? usuarioLogueado?.email} icon={<Mail size={16} />} />
          <CampoReadOnly label="Documento"       value={perfil?.documento} icon={<IdCard size={16} />} />
          <CampoReadOnly label="Rol del sistema" value={perfil?.rol_nombre} icon={<Shield size={16} />} />
        </div>

        <p className="text-xs text-gray-500">
          * El email y el documento solo pueden ser modificados por el super-administrador desde la base de datos.
        </p>

        {msg.texto && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
            msg.tipo === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {msg.tipo === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {msg.texto}
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}

// ─── Tab: Seguridad ────────────────────────────────────────────────────────────
function TabSeguridad() {
  const [form, setForm] = useState({ nueva: '', confirmar: '' });
  const [show, setShow] = useState({ nueva: false, confirmar: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState({ tipo: '', texto: '' });

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const validar = () => {
    if (form.nueva.length < 8)         return 'La contraseña debe tener al menos 8 caracteres.';
    if (!/[A-Za-z]/.test(form.nueva))  return 'Debe contener al menos una letra.';
    if (!/\d/.test(form.nueva))        return 'Debe contener al menos un número.';
    if (form.nueva !== form.confirmar) return 'Las contraseñas no coinciden.';
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const err = validar();
    if (err) { setMsg({ tipo: 'error', texto: err }); return; }

    setSaving(true);
    setMsg({ tipo: '', texto: '' });

    const { error } = await supabase.auth.updateUser({ password: form.nueva });
    if (error) {
      setMsg({ tipo: 'error', texto: error.message });
    } else {
      setMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.' });
      setForm({ nueva: '', confirmar: '' });
    }
    setSaving(false);
  };

  const fuerza = (() => {
    const p = form.nueva;
    if (!p) return { nivel: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 8)           score++;
    if (/[A-Z]/.test(p))         score++;
    if (/[a-z]/.test(p))         score++;
    if (/\d/.test(p))             score++;
    if (/[^A-Za-z0-9]/.test(p))  score++;
    const map = [
      { nivel: 1, label: 'Muy débil',  color: 'bg-red-500' },
      { nivel: 2, label: 'Débil',      color: 'bg-orange-400' },
      { nivel: 3, label: 'Regular',    color: 'bg-yellow-400' },
      { nivel: 4, label: 'Fuerte',     color: 'bg-blue-500' },
      { nivel: 5, label: 'Muy fuerte', color: 'bg-green-500' },
    ];
    return map[Math.min(score - 1, 4)] ?? { nivel: 0, label: '', color: '' };
  })();

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Seguridad de la cuenta</h2>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
        {/* Nueva contraseña */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Nueva contraseña</label>
          <div className="relative">
            <input
              name="nueva" type={show.nueva ? 'text' : 'password'} value={form.nueva}
              onChange={handleChange} required
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 8 caracteres"
            />
            <button type="button" onClick={() => setShow(p => ({ ...p, nueva: !p.nueva }))}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
              {show.nueva ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {form.nueva && (
            <div className="mt-2">
              <div className="flex gap-1 h-1.5">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className={`flex-1 rounded-full transition-all ${n <= fuerza.nivel ? fuerza.color : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Fortaleza: <span className="font-medium">{fuerza.label}</span></p>
            </div>
          )}
        </div>

        {/* Confirmar */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar contraseña</label>
          <div className="relative">
            <input
              name="confirmar" type={show.confirmar ? 'text' : 'password'} value={form.confirmar}
              onChange={handleChange} required
              className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                form.confirmar && form.nueva !== form.confirmar ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Repite la contraseña"
            />
            <button type="button" onClick={() => setShow(p => ({ ...p, confirmar: !p.confirmar }))}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
              {show.confirmar ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {form.confirmar && form.nueva !== form.confirmar && (
            <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
          )}
        </div>

        {/* Reglas */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-600 mb-2">La contraseña debe:</p>
          {[
            ['Tener al menos 8 caracteres',    form.nueva.length >= 8],
            ['Contener al menos una letra',    /[A-Za-z]/.test(form.nueva)],
            ['Contener al menos un número',    /\d/.test(form.nueva)],
            ['Las contraseñas deben coincidir', form.nueva === form.confirmar && form.confirmar !== ''],
          ].map(([label, ok]) => (
            <p key={label} className={`text-xs flex items-center gap-2 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
              {ok ? <CheckCircle size={13} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />}
              {label}
            </p>
          ))}
        </div>

        {msg.texto && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
            msg.tipo === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {msg.tipo === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {msg.texto}
          </div>
        )}

        <button type="submit" disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Lock size={20} />}
          {saving ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  );
}

// ─── Tab: Sistema ──────────────────────────────────────────────────────────────
function TabSistema() {
  const [dbStatus, setDbStatus] = useState('verificando...');
  const [counts, setCounts]     = useState(null);

  useEffect(() => {
    dashboardService.getCountsCore()
      .then(c => { setDbStatus('Conectado ✓'); setCounts(c); })
      .catch(() => setDbStatus('Error de conexión ✗'));
  }, []);

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Sistema</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Estado BD */}
        <div className="col-span-2 p-5 border border-gray-200 rounded-xl bg-gray-50">
          <div className="flex items-center gap-3 mb-3">
            <Database size={24} className="text-blue-600" />
            <h3 className="font-bold text-gray-900">Base de datos Supabase</h3>
          </div>
          <p className="text-sm text-gray-600">Estado: <span className="text-green-600 font-semibold">{dbStatus}</span></p>
          {counts && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                ['Pacientes',  counts.pacientes],
                ['Médicos',    counts.medicos],
                ['Citas',      counts.citas],
              ].map(([label, val]) => (
                <div key={label} className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                  <p className="text-2xl font-bold text-gray-900">{val}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info del sistema */}
        <div className="p-5 border border-gray-200 rounded-xl">
          <h3 className="font-bold text-gray-900 mb-3">Versión del sistema</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <Row label="Aplicación"  value="HospitalIS Pro v1.0" />
            <Row label="Frontend"    value="React 19 + Vite 7" />
            <Row label="Backend"     value="Supabase (PostgreSQL)" />
            <Row label="Auth"        value="Supabase Auth" />
          </div>
        </div>

        <div className="p-5 border border-gray-200 rounded-xl">
          <h3 className="font-bold text-gray-900 mb-3">Acceso</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <Row label="Roles" value="admin · médico · asistente · cliente" />
            <Row label="Autenticación" value="Email + contraseña" />
            <Row label="Seguridad" value="RLS habilitado en todas las tablas" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────
function Campo({ label, name, value, onChange, icon, required, placeholder, className = '' }) {
  return (
    <div className={className}>
      <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
        <span className="text-blue-500">{icon}</span> {label}
      </label>
      <input
        name={name} value={value} onChange={onChange} required={required}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function CampoReadOnly({ label, value, icon }) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
        <span className="text-gray-400">{icon}</span> {label}
      </label>
      <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-700 text-sm">
        {value || <span className="text-gray-400">—</span>}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
