import React, { useState, useEffect } from 'react';
import {
  Settings, User, Lock, Database,
  Save, Eye, EyeOff, AlertCircle, CheckCircle2,
  Loader2, Shield, Mail, Phone, IdCard, Calendar,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { dashboardService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { PageHeader, KPI, Avatar } from '../../../shared/components/ui';

// ─── Componente principal ──────────────────────────────────────────────────────
export default function Configuracion() {
  const { usuarioLogueado } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');

  const tabs = [
    { id: 'perfil',    name: 'Mi perfil', icon: User,     desc: 'Datos personales y contacto' },
    { id: 'seguridad', name: 'Seguridad', icon: Lock,     desc: 'Contraseña y acceso' },
    { id: 'sistema',   name: 'Sistema',   icon: Database, desc: 'Estado e información técnica' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Configuración"
        descripcion="Tu cuenta y los ajustes del sistema"
        eyebrow="Ajustes"
        icon={<Settings size={11} strokeWidth={2.25} />}
        variant="slate"
      >
        <KPI label="Cuenta" value={usuarioLogueado?.email ?? '—'} mono />
      </PageHeader>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Tabs verticales */}
        <nav className="space-y-1.5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'group w-full flex items-start gap-3 px-3.5 py-3 rounded-xl border transition-all duration-150 text-left',
                  active
                    ? 'bg-ink-900 border-ink-900 text-white shadow-[0_8px_24px_-12px_rgba(11,18,32,0.30)]'
                    : 'bg-white border-line text-ink-800 hover:border-ink-100 hover:bg-surface',
                ].join(' ')}
              >
                <span className={[
                  'inline-flex w-8 h-8 items-center justify-center rounded-lg border flex-shrink-0',
                  active
                    ? 'bg-white/10 border-white/15 text-white'
                    : 'bg-surface border-line text-ink-700',
                ].join(' ')}>
                  <Icon size={15} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className={`text-[13.5px] font-medium ${active ? 'text-white' : 'text-ink-900'}`}>{tab.name}</p>
                  <p className={`text-[11.5px] ${active ? 'text-white/65' : 'text-ink-500'}`}>{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden">
          {activeTab === 'perfil'    && <TabPerfil />}
          {activeTab === 'seguridad' && <TabSeguridad />}
          {activeTab === 'sistema'   && <TabSistema />}
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
        <Loader2 size={24} className="mx-auto mb-2 animate-spin text-brand-600" strokeWidth={1.75} />
        <p className="text-[13px] text-ink-500">Cargando perfil…</p>
      </div>
    );
  }

  const nombre = `${form.nombres} ${form.apellidos}`.trim() || 'Administrador';

  return (
    <div className="p-8 space-y-7">
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight text-ink-900">Mi perfil</h2>
        <p className="text-[13px] text-ink-500 mt-0.5">Datos personales asociados a tu cuenta</p>
      </div>

      {/* Avatar + resumen */}
      <div className="flex items-center gap-5 p-5 bg-surface/60 rounded-2xl border border-line">
        <Avatar name={nombre} tone="brand" size="xl" />
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight text-ink-900">{nombre}</h3>
          <p className="text-[12.5px] text-brand-700 font-medium capitalize mt-0.5">
            {perfil?.rol_nombre ?? 'Administrador'}
          </p>
          <div className="flex items-center gap-4 mt-1.5 text-[12px] text-ink-500">
            <span className="flex items-center gap-1.5">
              <Mail size={11} strokeWidth={1.75} /> {perfil?.email ?? usuarioLogueado?.email}
            </span>
            {perfil?.created_at && (
              <span className="flex items-center gap-1.5">
                <Calendar size={11} strokeWidth={1.75} />
                Desde {new Date(perfil.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CampoConf label="Nombres"   name="nombres"   value={form.nombres}   onChange={handleChange} icon={<User size={13} />}   required placeholder="Ej: Juan Carlos" />
          <CampoConf label="Apellidos" name="apellidos" value={form.apellidos} onChange={handleChange} icon={<User size={13} />}            placeholder="Ej: García Ruiz" />
          <CampoConf label="Teléfono"  name="telefono"  value={form.telefono}  onChange={handleChange} icon={<Phone size={13} />}           placeholder="+57 300 123 4567" />

          <CampoConfRO label="Email (cuenta)" value={perfil?.email ?? usuarioLogueado?.email} icon={<Mail size={13} />} />
          <CampoConfRO label="Documento"       value={perfil?.documento}  icon={<IdCard size={13} />} />
          <CampoConfRO label="Rol del sistema" value={perfil?.rol_nombre} icon={<Shield size={13} />} />
        </div>

        <p className="text-[11.5px] text-ink-500">
          * El email y el documento solo pueden ser modificados por el super-administrador desde la base de datos.
        </p>

        {msg.texto && <MsgBanner tipo={msg.tipo} texto={msg.texto} />}

        <button type="submit" disabled={saving}
          className="group w-full inline-flex items-center justify-center gap-2 bg-ink-900 hover:bg-ink-800 active:scale-[0.99] text-white text-[14px] font-medium py-3 rounded-xl shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_28px_-14px_rgba(11,18,32,0.45)] transition-all duration-150 disabled:opacity-60">
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
            : <><Save size={15} strokeWidth={1.75} /> Guardar cambios</>}
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
      { nivel: 2, label: 'Débil',      color: 'bg-amber-400' },
      { nivel: 3, label: 'Regular',    color: 'bg-amber-500' },
      { nivel: 4, label: 'Fuerte',     color: 'bg-emerald-500' },
      { nivel: 5, label: 'Muy fuerte', color: 'bg-emerald-600' },
    ];
    return map[Math.min(score - 1, 4)] ?? { nivel: 0, label: '', color: '' };
  })();

  return (
    <div className="p-8 space-y-7">
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight text-ink-900">Seguridad de la cuenta</h2>
        <p className="text-[13px] text-ink-500 mt-0.5">Define una contraseña fuerte para proteger tu acceso</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
        {/* Nueva contraseña */}
        <div>
          <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Nueva contraseña</label>
          <div className="relative">
            <input
              name="nueva" type={show.nueva ? 'text' : 'password'} value={form.nueva}
              onChange={handleChange} required
              className="w-full pl-3.5 pr-11 py-3 text-[14px] bg-white border border-line rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
              placeholder="Mínimo 8 caracteres"
            />
            <button type="button" onClick={() => setShow(p => ({ ...p, nueva: !p.nueva }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-700 transition-colors p-1.5 rounded-md hover:bg-surface" tabIndex={-1}>
              {show.nueva ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
            </button>
          </div>
          {form.nueva && (
            <div className="mt-2">
              <div className="flex gap-1 h-1">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className={`flex-1 rounded-full transition-colors ${n <= fuerza.nivel ? fuerza.color : 'bg-line'}`} />
                ))}
              </div>
              <p className="text-[11.5px] text-ink-500 mt-1.5">
                Fortaleza: <span className="font-medium text-ink-700">{fuerza.label}</span>
              </p>
            </div>
          )}
        </div>

        {/* Confirmar */}
        <div>
          <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Confirmar contraseña</label>
          <div className="relative">
            <input
              name="confirmar" type={show.confirmar ? 'text' : 'password'} value={form.confirmar}
              onChange={handleChange} required
              className={[
                'w-full pl-3.5 pr-11 py-3 text-[14px] bg-white border rounded-xl text-ink-900 placeholder:text-ink-300 transition-all',
                'focus:outline-none focus:ring-4',
                form.confirmar && form.nueva !== form.confirmar
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                  : 'border-line focus:border-brand-500 focus:ring-brand-500/10',
              ].join(' ')}
              placeholder="Repite la contraseña"
            />
            <button type="button" onClick={() => setShow(p => ({ ...p, confirmar: !p.confirmar }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-700 transition-colors p-1.5 rounded-md hover:bg-surface" tabIndex={-1}>
              {show.confirmar ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
            </button>
          </div>
          {form.confirmar && form.nueva !== form.confirmar && (
            <p className="text-[11.5px] text-red-600 mt-1.5">Las contraseñas no coinciden.</p>
          )}
        </div>

        {/* Reglas */}
        <div className="rounded-xl border border-line bg-surface/60 p-3.5 space-y-1.5">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.10em] text-ink-500">La contraseña debe:</p>
          {[
            ['Tener al menos 8 caracteres',    form.nueva.length >= 8],
            ['Contener al menos una letra',    /[A-Za-z]/.test(form.nueva)],
            ['Contener al menos un número',    /\d/.test(form.nueva)],
            ['Las contraseñas deben coincidir', form.nueva === form.confirmar && form.confirmar !== ''],
          ].map(([label, ok]) => (
            <p key={label} className={`text-[12px] flex items-center gap-2 ${ok ? 'text-emerald-700' : 'text-ink-500'}`}>
              {ok
                ? <CheckCircle2 size={12} strokeWidth={2.25} className="text-emerald-500" />
                : <div className="w-3 h-3 rounded-full border border-ink-300" />}
              {label}
            </p>
          ))}
        </div>

        {msg.texto && <MsgBanner tipo={msg.tipo} texto={msg.texto} />}

        <button type="submit" disabled={saving}
          className="group w-full inline-flex items-center justify-center gap-2 bg-ink-900 hover:bg-ink-800 active:scale-[0.99] text-white text-[14px] font-medium py-3 rounded-xl shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_28px_-14px_rgba(11,18,32,0.45)] transition-all duration-150 disabled:opacity-60">
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Actualizando…</>
            : <><Lock size={15} strokeWidth={1.75} /> Cambiar contraseña</>}
        </button>
      </form>
    </div>
  );
}

// ─── Tab: Sistema ──────────────────────────────────────────────────────────────
function TabSistema() {
  const [dbStatus, setDbStatus] = useState('verificando…');
  const [counts, setCounts]     = useState(null);

  useEffect(() => {
    dashboardService.getCountsCore()
      .then(c => { setDbStatus('Conectado'); setCounts(c); })
      .catch(() => setDbStatus('Error de conexión'));
  }, []);

  const conectado = dbStatus === 'Conectado';

  return (
    <div className="p-8 space-y-7">
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight text-ink-900">Sistema</h2>
        <p className="text-[13px] text-ink-500 mt-0.5">Estado de la infraestructura e información técnica</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Estado BD */}
        <div className="lg:col-span-2 rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
                <Database size={17} strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight text-ink-900">Base de datos Supabase</h3>
                <p className="text-[12px] text-ink-500">PostgreSQL gestionada</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-md font-medium border ${
              conectado
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${conectado ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {dbStatus}
            </span>
          </div>
          {counts && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                ['Pacientes', counts.pacientes],
                ['Médicos',   counts.medicos],
                ['Citas',     counts.citas],
              ].map(([label, val]) => (
                <div key={label} className="rounded-xl border border-line bg-surface/60 px-4 py-3">
                  <p className="text-[20px] font-semibold tracking-tight tabular-nums text-ink-900 leading-none">{val}</p>
                  <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info del sistema */}
        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500 mb-3">Versión del sistema</h3>
          <div className="space-y-2 text-[13px] text-ink-700 divide-y divide-line/70">
            <Row label="Aplicación"  value="HospitalIS Pro v1.0" />
            <Row label="Frontend"    value="React 19 + Vite 7" />
            <Row label="Backend"     value="Supabase (PostgreSQL)" />
            <Row label="Auth"        value="Supabase Auth" />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500 mb-3">Acceso</h3>
          <div className="space-y-2 text-[13px] text-ink-700 divide-y divide-line/70">
            <Row label="Roles"          value="admin · médico · asistente · cliente" />
            <Row label="Autenticación"  value="Email + contraseña" />
            <Row label="Seguridad"      value="RLS habilitado en todas las tablas" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────
function CampoConf({ label, name, value, onChange, icon, required, placeholder, className = '' }) {
  return (
    <div className={className}>
      <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
        <span className="text-ink-500">{icon}</span> {label}
      </label>
      <input
        name={name} value={value} onChange={onChange} required={required}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 placeholder:text-ink-300 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
      />
    </div>
  );
}

function CampoConfRO({ label, value, icon }) {
  return (
    <div>
      <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
        <span className="text-ink-300">{icon}</span> {label}
      </label>
      <div className="px-3.5 py-2.5 bg-surface border border-line rounded-xl text-[13px] text-ink-700">
        {value || <span className="text-ink-300">—</span>}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 first:pt-0">
      <span className="text-ink-500 text-[12.5px]">{label}</span>
      <span className="font-medium text-ink-900 text-[12.5px] text-right">{value}</span>
    </div>
  );
}

function MsgBanner({ tipo, texto }) {
  const isOk = tipo === 'ok';
  return (
    <div className={[
      'flex items-start gap-2.5 text-[13px] pl-3 pr-3 py-2.5 rounded-r-md border-l-2',
      isOk
        ? 'text-emerald-800 bg-emerald-50/70 border-emerald-500'
        : 'text-red-700 bg-red-50/70 border-red-500',
    ].join(' ')}>
      {isOk
        ? <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5 text-emerald-600" strokeWidth={2} />
        : <AlertCircle  size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />}
      <span>{texto}</span>
    </div>
  );
}
