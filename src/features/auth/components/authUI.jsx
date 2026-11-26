import React from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { centroMedico } from '../../../config/centroMedico';

// 'Centro Médico Hospitalis S.A.S.' → 'Centro Médico Hospitalis'
const CENTRO = centroMedico.razon_social.replace(/\s+S\.A\.S\.?$/i, '');

/* =====================================================================
   AuthShell — layout de las páginas de autenticación.
   Izquierda: marca + formulario + pie. Derecha (≥ lg): panel clínico
   sobre papel milimetrado de ECG.
   ===================================================================== */
export function AuthShell({ children, brandPanel, maxFormWidth = 400 }) {
  return (
    <div className="min-h-screen bg-white text-ink-900 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col px-6 sm:px-10 lg:px-14 xl:px-20 py-7 lg:py-10">
        <header>
          <a href="/" className="inline-flex items-center gap-3" title="Volver al inicio">
            <BrandMark />
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight text-ink-900">Hospitalis</p>
              <p className="text-[11.5px] text-ink-500">Sistema de información clínica</p>
            </div>
          </a>
        </header>

        <div
          className="flex-1 flex flex-col justify-center w-full mx-auto lg:mx-0 py-10 motion-safe:[animation:hp-fade-up_0.4s_ease-out]"
          style={{ maxWidth: maxFormWidth }}
        >
          {children}
        </div>

        <footer className="pt-5 border-t border-line flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[11.5px] text-ink-500">
          <span>© {new Date().getFullYear()} {CENTRO} · {centroMedico.ciudad}</span>
          <span className="inline-flex items-center gap-1.5">
            <Lock size={12} strokeWidth={2} /> Conexión cifrada
          </span>
        </footer>
      </section>

      <aside className="hidden lg:flex relative overflow-hidden bg-brand-900 text-white">
        {/* Papel milimetrado: cuadro menor de 8 px, mayor cada 5 (como el papel de ECG) */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '8px 8px, 8px 8px, 40px 40px, 40px 40px',
          }}
        />
        {/* La cuadrícula se apaga arriba y abajo para que el texto respire */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-brand-900 via-brand-900/30 to-brand-900" />

        <div className="relative flex-1 flex flex-col p-12 xl:p-16">
          {brandPanel ?? <DefaultBrandPanel />}
        </div>
      </aside>
    </div>
  );
}

/* ──────────────────── Panel de marca por defecto ──────────────────── */
const ACCESOS = [
  { quien: 'Pacientes',      que: 'Aparta tu cita, revisa tus resultados y descarga tus facturas.' },
  { quien: 'Médicos',        que: 'Agenda del día e historia clínica de tus pacientes.' },
  { quien: 'Administración', que: 'Citas, inventario, facturación y reportes.' },
];

export function DefaultBrandPanel({
  eyebrow = CENTRO,
  headline,
  emphasis = 'bien llevada.',
  description = 'Agenda, historia clínica, resultados y facturación del centro, en un solo lugar.',
}) {
  const title = headline ?? (
    <>Cada paciente,<br />una historia <em className="italic text-accent-300">{emphasis}</em></>
  );
  return (
    <>
      <div className="flex items-baseline justify-between gap-6 text-[11px] font-medium uppercase tracking-[0.16em] text-white/65">
        <span>{eyebrow}</span>
        <span className="text-white/40">{centroMedico.ciudad}</span>
      </div>

      <div className="flex-1 flex flex-col justify-center py-10">
        <h2 className="font-display text-[52px] xl:text-[64px] leading-[1.03] tracking-[-0.01em] max-w-[580px]">
          {title}
        </h2>
        <p className="mt-6 text-[15px] leading-relaxed text-white/70 max-w-[420px]">
          {description}
        </p>
        <EcgStrip className="mt-12 -mx-12 xl:-mx-16" />
      </div>

      <dl className="grid grid-cols-3 gap-8 border-t border-white/15 pt-6">
        {ACCESOS.map(({ quien, que }) => (
          <div key={quien}>
            <dt className="text-[13px] font-medium text-white">{quien}</dt>
            <dd className="mt-1.5 text-[12.5px] leading-snug text-white/60">{que}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-8 flex items-start gap-2 text-[12px] leading-relaxed text-white/50 max-w-[540px]">
        <Lock size={13} strokeWidth={2} className="flex-shrink-0 mt-[3px]" />
        Acceso exclusivo para pacientes y personal del centro. Cada consulta a una historia clínica queda registrada.
      </p>
    </>
  );
}

/* ─────────────────────────── Brand mark ─────────────────────────── */
export function BrandMark() {
  return (
    <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-brand-700" aria-hidden>
      <svg viewBox="0 0 20 20" className="w-5 h-5 text-white" fill="none">
        <path
          d="M2.5 10.5h3l1.5-3.5 2.5 8 2-10 1.5 5.5h4.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* ─────────────────────────── Tira de ECG ───────────────────────────
   Un complejo P-QRS-T (160 px de ancho) repetido. La copia tenue queda
   fija; la brillante se dibuja de izquierda a derecha como el barrido
   de un monitor (animación hp-ecg en index.css, se detiene con
   prefers-reduced-motion). */
const COMPLEJO = 'h18 q8 -8 16 0 h10 l4 5 l6 -42 l6 50 l5 -13 h14 q12 -16 24 0 h57';
const TRAZO = `M0 50 ${Array(8).fill(COMPLEJO).join(' ')}`;

export function EcgStrip({ className = '' }) {
  return (
    <div className={className} aria-hidden>
      <div className="flex items-center justify-between px-12 xl:px-16 mb-1.5 font-mono text-[10.5px] text-white/40">
        <span>II</span>
        <span>25 mm/s · 10 mm/mV</span>
      </div>
      <svg viewBox="0 0 1280 80" preserveAspectRatio="xMinYMid slice" className="block w-full h-20 text-accent-300">
        <path d={TRAZO} fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={TRAZO} pathLength="1" fill="none" stroke="currentColor" strokeWidth="1.75"
          strokeLinejoin="round" strokeLinecap="round" className="hp-ecg-trace" />
      </svg>
    </div>
  );
}

/* ═══════════════════════ Primitives de formulario ═══════════════════════ */

export function PageTitle({ title, subtitle, className = '' }) {
  return (
    <div className={`mb-9 ${className}`}>
      <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.01em] text-ink-900">{title}</h1>
      {subtitle && <p className="text-[14.5px] text-ink-500 mt-3 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function Field({ id, label, icon: Icon, rightSlot, hint, error, ...rest }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-700">{label}</label>
        {rightSlot}
      </div>
      <div className="relative">
        {Icon && (
          <Icon
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-300 pointer-events-none"
            strokeWidth={1.75}
          />
        )}
        <input
          id={id}
          className={[
            'w-full py-3 text-[14px] bg-white border rounded-lg text-ink-900',
            'placeholder:text-ink-300 transition-all duration-150',
            'focus:outline-none focus:ring-4',
            Icon ? 'pl-11 pr-3.5' : 'px-3.5',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
              : 'border-ink-100 hover:border-ink-300 focus:border-brand-600 focus:ring-brand-600/15',
          ].join(' ')}
          {...rest}
        />
      </div>
      {hint && !error && <p className="mt-1.5 text-[11.5px] text-ink-500">{hint}</p>}
      {error && <p className="mt-1.5 text-[11.5px] text-red-600">{error}</p>}
    </div>
  );
}

export function PasswordField({
  id, label, value, onChange, rightSlot, placeholder = '••••••••',
  autoComplete = 'current-password', error, hint, required = true,
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-700">{label}</label>
        {rightSlot}
      </div>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={[
            'w-full pl-3.5 pr-11 py-3 text-[14px] bg-white border rounded-lg text-ink-900',
            'placeholder:text-ink-300 transition-all duration-150',
            'focus:outline-none focus:ring-4',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
              : 'border-ink-100 hover:border-ink-300 focus:border-brand-600 focus:ring-brand-600/15',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-700 transition-colors p-1.5 rounded-md hover:bg-surface"
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          tabIndex={-1}
        >
          {show ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
        </button>
      </div>
      {hint && !error && <p className="mt-1.5 text-[11.5px] text-ink-500">{hint}</p>}
      {error && <p className="mt-1.5 text-[11.5px] text-red-600">{error}</p>}
    </div>
  );
}

export function PrimaryButton({ children, loading, loadingText = 'Cargando…', icon: Icon, className = '', ...rest }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={[
        'group w-full inline-flex items-center justify-center gap-2',
        'bg-brand-700 hover:bg-brand-800 active:bg-brand-900 text-white text-[14px] font-medium py-3 rounded-lg',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/25',
        'transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {loadingText}
        </>
      ) : (
        <>
          {children}
          {Icon && <Icon size={16} strokeWidth={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />}
        </>
      )}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...rest }) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2',
        'bg-white border border-ink-100 text-ink-800 text-[13.5px] font-medium px-4 py-2.5 rounded-lg',
        'hover:bg-surface hover:border-ink-100 active:scale-[0.99] transition-all duration-150',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 text-[13px] text-red-700 bg-red-50/70 border-l-2 border-red-500 pl-3 pr-3 py-2.5 rounded-r-md motion-safe:[animation:hp-fade-up_0.25s_ease-out]"
    >
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
      <span>{message}</span>
    </div>
  );
}

export function SuccessBanner({ title, children }) {
  return (
    <div className="flex items-start gap-3 text-[13px] text-emerald-800 bg-emerald-50/70 border-l-2 border-emerald-500 pl-3 pr-3 py-3 rounded-r-md motion-safe:[animation:hp-fade-up_0.25s_ease-out]">
      <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-emerald-600" strokeWidth={2} />
      <div className="space-y-1">
        {title && <p className="font-medium text-emerald-900">{title}</p>}
        <div className="text-emerald-800/90 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/* ─────────── Indicador de fortaleza de contraseña ─────────── */
export function PasswordStrength({ value }) {
  const score = computeStrength(value);
  if (!value) return null;
  const label = ['', 'Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'][score];
  const tone =
    score <= 2 ? 'bg-red-400' :
    score <= 3 ? 'bg-amber-400' :
                 'bg-emerald-500';

  return (
    <div className="mt-2">
      <div className="flex gap-1 h-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`flex-1 rounded-full transition-colors ${n <= score ? tone : 'bg-line'}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11.5px] text-ink-500">
        Fortaleza: <span className="font-medium text-ink-700">{label}</span>
      </p>
    </div>
  );
}

function computeStrength(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
