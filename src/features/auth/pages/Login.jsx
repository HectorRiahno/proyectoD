import React, { useState } from 'react';
import { IdCard, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import {
  AuthShell, PageTitle, Field, PasswordField,
  PrimaryButton, ErrorBanner,
} from '../components/authUI';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Pestaña: la que pide la página de inicio (?modo=paciente|clave) o, si no,
// la última usada en este navegador (recepción vs. casa del paciente).
const MODO_KEY = 'hp-login-modo';
const leerModo = () => {
  const pedido = new URLSearchParams(window.location.search).get('modo');
  if (pedido === 'paciente' || pedido === 'clave') return pedido;
  try { return localStorage.getItem(MODO_KEY) === 'clave' ? 'clave' : 'paciente'; }
  catch { return 'paciente'; }
};

export default function Login() {
  const navigate = useNavigate();
  const { login, loginPaciente, loading } = useAuth();
  const [modo, setModo]   = useState(leerModo);
  const [error, setError] = useState('');

  const cambiarModo = (m) => {
    setModo(m);
    setError('');
    try { localStorage.setItem(MODO_KEY, m); } catch { /* sin almacenamiento */ }
  };

  return (
    <AuthShell>
      <PageTitle
        title="Bienvenido."
        subtitle={modo === 'paciente'
          ? 'Ingresa con tu número de documento y tu fecha de nacimiento.'
          : 'Ingresa con tu documento o correo y tu contraseña.'}
      />

      <div role="tablist" aria-label="Forma de ingreso" className="grid grid-cols-2 gap-1 p-1 mb-7 bg-surface border border-line rounded-lg">
        {[['paciente', 'Soy paciente'], ['clave', 'Con contraseña']].map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => cambiarModo(m)}
            className={[
              'py-2.5 rounded-md text-[14px] font-medium transition-colors',
              modo === m ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {modo === 'paciente'
        ? <FormPaciente loginPaciente={loginPaciente} loading={loading} error={error} setError={setError} onOk={() => navigate('/')} />
        : <FormClave login={login} loading={loading} error={error} setError={setError} onOk={() => navigate('/')} />}

      <p className="mt-8 text-[12.5px] text-ink-500 leading-relaxed">
        {modo === 'paciente' ? (
          <>
            <span className="font-medium text-ink-700">¿No puedes ingresar?</span>{' '}
            Verifica en recepción que tu documento y tu fecha de nacimiento estén registrados.
          </>
        ) : (
          <>
            <span className="font-medium text-ink-700">¿Aún no tienes cuenta?</span>{' '}
            El centro médico la crea por ti: solicítala en recepción.
          </>
        )}
      </p>
    </AuthShell>
  );
}

// ─── Paciente: documento + fecha de nacimiento ───────────────────────────────
function FormPaciente({ loginPaciente, loading, error, setError, onOk }) {
  const [documento, setDocumento] = useState('');
  const [dia, setDia]   = useState('');
  const [mes, setMes]   = useState('');
  const [anio, setAnio] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const d = Number(dia), m = Number(mes), a = Number(anio);
    const actual = new Date().getFullYear();
    if (!documento.trim() || !d || !m || !a) {
      setError('Escribe tu documento y tu fecha de nacimiento completa.');
      return;
    }
    const fecha = new Date(Date.UTC(a, m - 1, d));
    if (a < 1900 || a > actual || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) {
      setError('La fecha de nacimiento no es válida. Revisa el día, el mes y el año.');
      return;
    }

    try {
      await loginPaciente(documento.trim(), fecha.toISOString().slice(0, 10));
      onOk();
    } catch (err) {
      setError(err.message || 'No pudimos iniciar tu sesión. Intenta de nuevo.');
    }
  };

  const CLS = 'w-full py-3 px-3.5 text-[16px] bg-white border border-ink-100 rounded-lg text-ink-900 '
    + 'hover:border-ink-300 focus:outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15';

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Field
        id="documento"
        label="Número de documento"
        type="text"
        inputMode="numeric"
        icon={IdCard}
        value={documento}
        onChange={(e) => setDocumento(e.target.value)}
        placeholder="Ej: 1091655499"
        autoComplete="username"
        autoFocus
      />

      <fieldset>
        <legend className="text-[13px] font-medium text-ink-700 mb-1.5">Fecha de nacimiento</legend>
        <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
          <div>
            <input
              id="nac-dia" aria-label="Día" inputMode="numeric" maxLength={2} placeholder="Día"
              value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, ''))}
              className={CLS}
            />
          </div>
          <select id="nac-mes" aria-label="Mes" value={mes} onChange={(e) => setMes(e.target.value)} className={CLS}>
            <option value="">Mes</option>
            {MESES.map((nombre, i) => <option key={nombre} value={i + 1}>{nombre}</option>)}
          </select>
          <input
            id="nac-anio" aria-label="Año" inputMode="numeric" maxLength={4} placeholder="Año"
            value={anio} onChange={(e) => setAnio(e.target.value.replace(/\D/g, ''))}
            className={CLS}
          />
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-500">Ejemplo: 18 · Abril · 1955</p>
      </fieldset>

      <ErrorBanner message={error} />

      <PrimaryButton loading={loading} loadingText="Verificando…" icon={ArrowRight}>
        Ingresar
      </PrimaryButton>
    </form>
  );
}

// ─── Personal y pacientes con contraseña ─────────────────────────────────────
function FormClave({ login, loading, error, setError, onOk }) {
  const [email, setEmail]           = useState('');
  const [contrasena, setContrasena] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !contrasena) {
      setError('Por favor completa todos los campos.');
      return;
    }

    try {
      await login(email, contrasena);
      onOk();
    } catch (err) {
      const msg = err.message ?? '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Documento/correo o contraseña incorrectos. Si aún no activaste tu cuenta, usa el enlace del correo de invitación.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Tu correo no está confirmado. Pide al administrador que lo active.');
      } else {
        setError(msg || 'No pudimos iniciar sesión. Intenta de nuevo.');
      }
      console.error('Error de login:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <Field
        id="usuario"
        label="Número de documento o correo"
        type="text"
        icon={IdCard}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Ej: 1091655499"
        autoComplete="username"
        autoFocus
      />

      <PasswordField
        id="password"
        label="Contraseña"
        value={contrasena}
        onChange={(e) => setContrasena(e.target.value)}
        rightSlot={
          <Link
            to="/forgot-password"
            className="text-[12.5px] text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        }
      />

      <ErrorBanner message={error} />

      <PrimaryButton loading={loading} loadingText="Verificando…" icon={ArrowRight}>
        Iniciar sesión
      </PrimaryButton>
    </form>
  );
}
