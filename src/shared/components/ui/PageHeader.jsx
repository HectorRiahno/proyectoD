import React from 'react';

/* =====================================================================
   PageHeader — hero de página refinado, con identidad de sección por color.
   Mantiene la API anterior (titulo / descripcion / icon / variant / children KPIs)
   pero abandona el banner gradient saturado por un hero limpio con:
     • Eyebrow uppercase tono de sección
     • Título grande tracking ceñido
     • Mancha de color sutil arriba a la derecha (per accent)
     • Icono dentro de un mini badge tinted
     • KPIs en pills monocromas a la derecha
   ===================================================================== */

const ACCENTS = {
  // azul de marca (citas / generales)
  blue:        { tint: 'bg-brand-50',    border: 'border-brand-100',    text: 'text-brand-700',    glow: 'rgba(46,95,230,0.16)' },
  blueDeep:    { tint: 'bg-brand-50',    border: 'border-brand-100',    text: 'text-brand-800',    glow: 'rgba(30,79,216,0.18)' },
  // verde vida (pacientes / salud)
  emerald:     { tint: 'bg-emerald-50',  border: 'border-emerald-100',  text: 'text-emerald-700',  glow: 'rgba(16,185,129,0.16)' },
  emeraldDark: { tint: 'bg-emerald-50',  border: 'border-emerald-100',  text: 'text-emerald-800',  glow: 'rgba(5,150,105,0.18)' },
  green:       { tint: 'bg-emerald-50',  border: 'border-emerald-100',  text: 'text-emerald-700',  glow: 'rgba(16,185,129,0.16)' },
  // ámbar (inventario / alertas)
  amber:       { tint: 'bg-amber-50',    border: 'border-amber-100',    text: 'text-amber-700',    glow: 'rgba(245,158,11,0.18)' },
  // sky (facturación / financiero)
  sky:         { tint: 'bg-sky-50',      border: 'border-sky-100',      text: 'text-sky-700',      glow: 'rgba(14,165,233,0.16)' },
  // violeta (médicos)
  violet:      { tint: 'bg-violet-50',   border: 'border-violet-100',   text: 'text-violet-700',   glow: 'rgba(139,92,246,0.16)' },
  purple:      { tint: 'bg-violet-50',   border: 'border-violet-100',   text: 'text-violet-700',   glow: 'rgba(139,92,246,0.16)' },
  // indigo (reportes / analíticas)
  indigo:      { tint: 'bg-indigo-50',   border: 'border-indigo-100',   text: 'text-indigo-700',   glow: 'rgba(99,102,241,0.16)' },
  // teal (horarios / agenda)
  teal:        { tint: 'bg-teal-50',     border: 'border-teal-100',     text: 'text-teal-700',     glow: 'rgba(20,184,166,0.16)' },
  // fuchsia (usuarios / acceso)
  fuchsia:     { tint: 'bg-fuchsia-50',  border: 'border-fuchsia-100',  text: 'text-fuchsia-700',  glow: 'rgba(217,70,239,0.16)' },
  // rose (papelera / destructivo)
  rose:        { tint: 'bg-rose-50',     border: 'border-rose-100',     text: 'text-rose-700',     glow: 'rgba(244,63,94,0.16)' },
  red:         { tint: 'bg-red-50',      border: 'border-red-100',      text: 'text-red-700',      glow: 'rgba(239,68,68,0.16)' },
  // slate (configuración / neutro)
  slate:       { tint: 'bg-surface',     border: 'border-line',         text: 'text-ink-700',      glow: 'rgba(100,116,139,0.14)' },
  orange:      { tint: 'bg-orange-50',   border: 'border-orange-100',   text: 'text-orange-700',   glow: 'rgba(249,115,22,0.16)' },
};

/**
 * Hero de página.
 *
 *   <PageHeader
 *     titulo="Gestión de Pacientes"
 *     descripcion="Información completa..."
 *     icon={<Users size={16} />}
 *     variant="emerald"
 *   >
 *     <KPI label="Total"   value={42} />
 *     <KPI label="Activos" value={30} />
 *   </PageHeader>
 */
export function PageHeader({
  titulo, descripcion, icon, variant = 'blue', eyebrow, children,
}) {
  const a = ACCENTS[variant] ?? ACCENTS.blue;
  return (
    <header className="relative overflow-hidden rounded-2xl border border-line bg-white px-7 py-7 shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
      {/* Mancha de color sutil, no banner */}
      <div
        aria-hidden
        className="absolute -top-24 -right-20 w-[320px] h-[320px] rounded-full blur-3xl opacity-70"
        style={{ background: `radial-gradient(circle, ${a.glow}, transparent 65%)` }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          {(eyebrow || icon) && (
            <div className={`inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] font-medium rounded-full ${a.tint} ${a.border} ${a.text} border px-2 py-0.5`}>
              {icon}
              {eyebrow ?? 'Panel'}
            </div>
          )}
          <h1 className="mt-2.5 text-[28px] leading-[1.15] font-semibold tracking-[-0.022em] text-ink-900">
            {titulo}
          </h1>
          {descripcion && (
            <p className="mt-1.5 text-[13.5px] text-ink-500">{descripcion}</p>
          )}
        </div>
        {children && (
          <div className="flex items-stretch gap-3">{children}</div>
        )}
      </div>
    </header>
  );
}

/**
 * KPI usado dentro de PageHeader. Refactor: pasa de números blancos sobre
 * gradient a píldora monocroma con label + value, separadas por divisor.
 *
 *   <KPI label="Total" value={42} />
 *   <KPI label="Por cobrar" value={fmtMoney(1500000)} mono color="text-emerald-600" />
 */
export function KPI({ label, value, color = 'text-ink-900', mono = false }) {
  return (
    <div className="flex flex-col justify-center min-w-[88px] px-3.5 py-1 border-l border-line first:border-l-0 first:pl-0">
      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{label}</p>
      <p className={`mt-0.5 text-[20px] font-semibold tracking-tight tabular-nums leading-none ${color} ${mono ? 'font-mono text-[18px]' : ''}`}>
        {value}
      </p>
    </div>
  );
}

export default PageHeader;
