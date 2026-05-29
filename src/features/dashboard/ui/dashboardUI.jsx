import React from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';

/* =====================================================================
   Primitives compartidos por los dashboards (Admin · Médico · Cliente)
   No gradientes saturados. No tarjetas todas iguales. Tipografía Inter,
   tokens brand/ink/accent. Pensado para sentirse "producto", no plantilla.
   ===================================================================== */

/* ─────────────────────────── PageHero ─────────────────────────── */
/** Header de página con saludo + fecha + reloj/status, sin gradientes. */
export function PageHero({ eyebrow, title, subtitle, side, accent = 'brand' }) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-line bg-white px-5 sm:px-7 py-5 sm:py-7 shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
      {/* Mancha de color sutil, no banner */}
      <div
        aria-hidden
        className="absolute -top-24 -right-20 w-[320px] h-[320px] rounded-full blur-3xl opacity-60"
        style={{ background: accent === 'accent'
          ? 'radial-gradient(circle, rgba(110,231,215,0.30), transparent 65%)'
          : 'radial-gradient(circle, rgba(46,95,230,0.18), transparent 65%)' }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4 sm:gap-6">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10.5px] uppercase tracking-[0.16em] font-medium text-ink-500">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1.5 text-[22px] sm:text-[28px] leading-[1.15] font-semibold tracking-[-0.022em] text-ink-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-[12.5px] sm:text-[13.5px] text-ink-500 capitalize">{subtitle}</p>
          )}
        </div>
        {side}
      </div>
    </header>
  );
}

/* ──────────────────────── Live time + status ──────────────────────── */
export function LiveTimeBadge({ status = 'Sistema activo' }) {
  const [time, setTime] = React.useState(() =>
    new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  );
  React.useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-500">
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-500/60 motion-safe:animate-ping" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </span>
        {status}
      </span>
      <span className="h-3.5 w-px bg-line" />
      <span className="text-[13.5px] font-medium text-ink-900 tabular-nums">{time}</span>
    </div>
  );
}

/* ─────────────────────────── StatCard ─────────────────────────── */
/**
 * Tarjeta de KPI monocroma. Icono pequeño en badge sutil + número grande.
 * Sin gradientes saturados. Variante clickable con chevron.
 */
export function StatCard({ label, value, sub, icon: Icon, onClick, loading, accent = 'brand' }) {
  const Wrapper = onClick ? 'button' : 'div';
  const accentRing = accent === 'accent'
    ? 'group-hover:ring-accent-500/20'
    : 'group-hover:ring-brand-500/15';

  return (
    <Wrapper
      onClick={onClick}
      className={[
        'group text-left w-full rounded-2xl border border-line bg-white px-5 py-5',
        'shadow-[0_1px_2px_rgba(11,18,32,0.04)]',
        'ring-1 ring-transparent transition-all duration-200',
        'hover:border-ink-100 hover:shadow-[0_8px_28px_-12px_rgba(11,18,32,0.18)]',
        onClick ? `cursor-pointer ${accentRing}` : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <span className={[
          'inline-flex w-9 h-9 items-center justify-center rounded-lg border',
          accent === 'accent'
            ? 'bg-accent-500/8 border-accent-500/20 text-accent-500'
            : 'bg-brand-50 border-brand-100 text-brand-700',
        ].join(' ')}>
          {Icon && <Icon size={17} strokeWidth={1.75} />}
        </span>
        {onClick && (
          <ArrowRight
            size={15}
            strokeWidth={1.75}
            className="text-ink-300 group-hover:text-ink-700 group-hover:translate-x-0.5 transition-all"
          />
        )}
      </div>
      <div className="mt-5">
        <p className="text-[11.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{label}</p>
        <p className="mt-1 text-[28px] font-semibold tracking-tight tabular-nums text-ink-900 leading-none">
          {loading ? <span className="inline-block w-12 h-7 rounded bg-line/60 motion-safe:animate-pulse align-middle" /> : value}
        </p>
        {sub && <p className="mt-1.5 text-[12px] text-ink-500">{sub}</p>}
      </div>
    </Wrapper>
  );
}

/* ─────────────────────────── Panel ─────────────────────────── */
export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line/70">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h2>}
            {subtitle && <p className="text-[12.5px] text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}

export function PanelLink({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-600 hover:text-brand-700 transition-colors"
    >
      {children}
      <ArrowRight size={13} strokeWidth={2} />
    </button>
  );
}

/* ─────────────────────────── StatusPill ─────────────────────────── */
const STATUS_STYLES = {
  programada:  { bg: 'bg-brand-50',    text: 'text-brand-700',    dot: 'bg-brand-500',    label: 'Programada'  },
  confirmada:  { bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-500',  label: 'Confirmada'  },
  en_curso:    { bg: 'bg-amber-50',    text: 'text-amber-700',    dot: 'bg-amber-500',    label: 'En curso'    },
  completada:  { bg: 'bg-surface',     text: 'text-ink-700',      dot: 'bg-ink-300',      label: 'Completada'  },
  cancelada:   { bg: 'bg-red-50',      text: 'text-red-700',      dot: 'bg-red-500',      label: 'Cancelada'   },
  no_asistio:  { bg: 'bg-red-50',      text: 'text-red-700',      dot: 'bg-red-500',      label: 'No asistió'  },
};

export function StatusPill({ estado }) {
  const s = STATUS_STYLES[estado] ?? STATUS_STYLES.completada;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/* ─────────────────────────── EmptyState ─────────────────────────── */
export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="text-center py-10 px-4">
      {Icon && (
        <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-surface border border-line">
          <Icon size={18} strokeWidth={1.75} className="text-ink-300" />
        </span>
      )}
      <p className="mt-3 text-[13.5px] font-medium text-ink-700">{title}</p>
      {hint && <p className="mt-1 text-[12px] text-ink-500">{hint}</p>}
    </div>
  );
}

/* ─────────────────────────── ListRow ─────────────────────────── */
/** Fila clicable para listas dentro de Panel. Sin tarjeta dentro de tarjeta. */
export function ListRow({ leading, title, subtitle, trailing, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={[
        'group w-full flex items-center gap-4 px-3 py-3 rounded-lg',
        'transition-colors',
        onClick ? 'hover:bg-surface text-left cursor-pointer' : '',
      ].join(' ')}
    >
      {leading}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium text-ink-900 truncate">{title}</p>
        {subtitle && <p className="text-[12px] text-ink-500 truncate mt-0.5">{subtitle}</p>}
      </div>
      {trailing}
    </Wrapper>
  );
}

/* ─────────────────────────── ActionList ─────────────────────────── */
/** "Acciones rápidas": lista limpia, no 4 botones de colores diferentes. */
export function ActionList({ items }) {
  return (
    <ul className="divide-y divide-line/70">
      {items.map(({ icon: Icon, label, desc, onClick, primary }, i) => (
        <li key={i}>
          <button
            onClick={onClick}
            className="group w-full flex items-center gap-4 py-3 text-left first:pt-0 last:pb-0"
          >
            <span className={[
              'inline-flex w-9 h-9 items-center justify-center rounded-lg border transition-colors',
              primary
                ? 'bg-ink-900 border-ink-900 text-white shadow-[0_4px_14px_-6px_rgba(11,18,32,0.45)]'
                : 'bg-white border-line text-ink-700 group-hover:border-ink-100 group-hover:bg-surface',
            ].join(' ')}>
              {Icon && <Icon size={16} strokeWidth={1.75} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-medium text-ink-900">{label}</p>
              {desc && <p className="text-[12px] text-ink-500 mt-0.5">{desc}</p>}
            </div>
            <ArrowRight size={14} strokeWidth={1.75} className="text-ink-300 group-hover:text-ink-700 group-hover:translate-x-0.5 transition-all" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────── ErrorBlock ─────────────────────────── */
export function ErrorBlock({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 text-[13px] text-red-700 bg-red-50/70 border-l-2 border-red-500 pl-3 pr-3 py-2.5 rounded-r-md">
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
      <span>{message}</span>
    </div>
  );
}
