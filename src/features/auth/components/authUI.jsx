import React from 'react';
import {
  Activity, ShieldCheck, Calendar, FileText, Package, ReceiptText,
  Eye, EyeOff, AlertCircle, CheckCircle2,
} from 'lucide-react';

/* =====================================================================
   AuthShell — layout split-screen reutilizable por todas las páginas
   de autenticación. Lado izquierdo: brand row + slot del form + footer.
   Lado derecho: panel de marca con tagline + módulos + pulso ECG.
   ===================================================================== */
export function AuthShell({ children, brandPanel, maxFormWidth = 420 }) {
  return (
    <div className="min-h-screen bg-surface text-ink-900 grid lg:grid-cols-[1fr_1.05fr]">
      <section className="flex flex-col px-6 sm:px-10 lg:px-14 xl:px-24 py-8 lg:py-12">
        <header className="flex items-center gap-2.5">
          <BrandMark />
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold tracking-tight text-ink-900">Hospitalis</span>
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-brand-700 bg-brand-50 border border-brand-100 rounded-md px-1.5 py-[3px]">
              Pro
            </span>
          </div>
        </header>

        <div
          className="flex-1 flex flex-col justify-center w-full mx-auto lg:mx-0 motion-safe:[animation:hp-fade-up_0.5s_ease-out]"
          style={{ maxWidth: maxFormWidth }}
        >
          {children}
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-ink-500">
          <span>© {new Date().getFullYear()} Centro Médico Hospitalis</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500/60 motion-safe:animate-ping" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </span>
              Sistemas operativos
            </span>
            <span className="px-1.5 py-0.5 rounded-md border border-line text-[10.5px] tracking-wide text-ink-500 font-mono">
              v1.011
            </span>
          </div>
        </footer>
      </section>

      <aside className="hidden lg:block relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-900" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: [
              'radial-gradient(120% 80% at 85% 12%, rgba(86,133,244,0.55), transparent 60%)',
              'radial-gradient(90% 70% at 12% 92%, rgba(6,182,164,0.28), transparent 55%)',
              'radial-gradient(70% 60% at 50% 50%, rgba(30,79,216,0.30), transparent 70%)',
            ].join(', '),
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.10] mix-blend-overlay"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-brand-400/30 blur-3xl motion-safe:[animation:hp-drift_18s_ease-in-out_infinite]"
        />

        <div className="relative h-full flex flex-col justify-between p-12 xl:p-16 text-white">
          {brandPanel ?? <DefaultBrandPanel />}
        </div>
      </aside>
    </div>
  );
}

/* ──────────────────── Panel de marca por defecto ──────────────────── */
export function DefaultBrandPanel({
  eyebrow = 'Plataforma clínica',
  headline,
  emphasis = 'cuidan.',
  description = 'Citas, inventario, facturación electrónica e historia clínica en un único sistema, diseñado para equipos clínicos modernos.',
}) {
  const title = headline ?? (
    <>Cuidamos a quienes <span className="font-display italic font-normal text-white">{emphasis}</span></>
  );
  return (
    <>
      <div className="max-w-md">
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-white/75 border border-white/15 rounded-full px-2.5 py-1 bg-white/[0.04] backdrop-blur-sm">
          <Activity size={12} strokeWidth={2.25} className="text-accent-300" />
          {eyebrow}
        </div>
        <h2 className="mt-8 text-[44px] xl:text-[52px] leading-[1.05] font-semibold tracking-[-0.025em]">
          {title}
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-white/75 max-w-[440px]">
          {description}
        </p>
      </div>

      <ModulesList />

      <div>
        <PulseLine />
        <div className="mt-5 flex items-center gap-2.5 text-[12px] text-white/65">
          <ShieldCheck size={15} strokeWidth={2} className="text-accent-300" />
          <span>Cifrado de extremo a extremo · Conforme a Resolución DIAN de facturación electrónica</span>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── Brand mark ─────────────────────────── */
export function BrandMark() {
  return (
    <span
      className="relative inline-flex w-8 h-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_4px_14px_-4px_rgba(30,79,216,0.55)] ring-1 ring-inset ring-white/10"
      aria-hidden
    >
      <svg viewBox="0 0 20 20" className="w-[18px] h-[18px] text-white" fill="none">
        <path
          d="M3.5 10h2.7l1.4-3.5L10 14l1.7-7 1.3 3h3.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* ──────────────────────── Lista de módulos ──────────────────────── */
export function ModulesList() {
  const items = [
    { icon: Calendar,    label: 'Agenda y citas',           desc: 'Reservas, confirmaciones y horarios por médico.' },
    { icon: FileText,    label: 'Historia clínica',         desc: 'Evolución, anexos y resultados de laboratorio.' },
    { icon: Package,     label: 'Inventario médico',        desc: 'Stock, vencimientos y alertas automáticas.' },
    { icon: ReceiptText, label: 'Facturación electrónica',  desc: 'Conforme a Resolución DIAN colombiana.' },
  ];
  return (
    <div className="max-w-[460px]">
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-white/45 mb-5">
        Todo en un solo sistema
      </div>
      <ul className="grid grid-cols-2 gap-x-8 gap-y-5">
        {items.map(({ icon: Icon, label, desc }) => (
          <li key={label} className="group flex items-start gap-3">
            <span className="mt-0.5 inline-flex w-7 h-7 items-center justify-center rounded-md bg-white/[0.05] border border-white/10 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
              {Icon && <Icon size={13} strokeWidth={1.75} className="text-accent-300" />}
            </span>
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium text-white tracking-tight leading-tight">{label}</div>
              <div className="text-[12px] text-white/55 leading-snug mt-0.5">{desc}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────── Pulso ECG ─────────────────────────── */
export function PulseLine() {
  return (
    <svg viewBox="0 0 480 40" className="w-full max-w-[460px] h-8 text-accent-300/70" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="hp-pulse-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="currentColor" stopOpacity="0" />
          <stop offset="18%"  stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="82%"  stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 20 L120 20 L140 20 L150 8 L160 32 L170 4 L180 20 L260 20 L275 20 L285 12 L295 28 L305 6 L315 20 L480 20"
        fill="none"
        stroke="url(#hp-pulse-fade)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══════════════════════ Primitives de formulario ═══════════════════════ */

export function PageTitle({ title, subtitle, className = '' }) {
  return (
    <div className={`mb-9 ${className}`}>
      <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.022em] text-ink-900">{title}</h1>
      {subtitle && <p className="text-[14px] text-ink-500 mt-2 leading-relaxed">{subtitle}</p>}
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
            'w-full py-3 text-[14px] bg-white border rounded-xl text-ink-900',
            'placeholder:text-ink-300 transition-all duration-150',
            'focus:outline-none focus:ring-4',
            Icon ? 'pl-11 pr-3.5' : 'px-3.5',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
              : 'border-line focus:border-brand-500 focus:ring-brand-500/10',
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
            'w-full pl-3.5 pr-11 py-3 text-[14px] bg-white border rounded-xl text-ink-900',
            'placeholder:text-ink-300 transition-all duration-150',
            'focus:outline-none focus:ring-4',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
              : 'border-line focus:border-brand-500 focus:ring-brand-500/10',
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
        'bg-ink-900 hover:bg-ink-800 active:scale-[0.99] text-white text-[14px] font-medium py-3 rounded-xl',
        'shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_28px_-14px_rgba(11,18,32,0.45)]',
        'transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed',
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
        'bg-white border border-line text-ink-800 text-[13.5px] font-medium px-4 py-2.5 rounded-xl',
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
