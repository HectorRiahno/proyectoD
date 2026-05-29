import React from 'react';

/* =====================================================================
   Section — agrupador de sub-formularios dentro de modales.
   Dos estilos:
     • 'header' (default): título uppercase + contenido en panel sutil.
     • 'card':              todo dentro de un panel tinted del color de sección.
   ===================================================================== */

const COLORS = {
  blue:    { border: 'border-brand-100',   bg: 'bg-brand-50/60',   title: 'text-brand-700',   iconTint: 'text-brand-600' },
  emerald: { border: 'border-emerald-100', bg: 'bg-emerald-50/60', title: 'text-emerald-700', iconTint: 'text-emerald-600' },
  purple:  { border: 'border-violet-100',  bg: 'bg-violet-50/60',  title: 'text-violet-700',  iconTint: 'text-violet-600' },
  violet:  { border: 'border-violet-100',  bg: 'bg-violet-50/60',  title: 'text-violet-700',  iconTint: 'text-violet-600' },
  red:     { border: 'border-red-100',     bg: 'bg-red-50/60',     title: 'text-red-700',     iconTint: 'text-red-600' },
  rose:    { border: 'border-rose-100',    bg: 'bg-rose-50/60',    title: 'text-rose-700',    iconTint: 'text-rose-600' },
  orange:  { border: 'border-orange-100',  bg: 'bg-orange-50/60',  title: 'text-orange-700',  iconTint: 'text-orange-600' },
  amber:   { border: 'border-amber-100',   bg: 'bg-amber-50/60',   title: 'text-amber-700',   iconTint: 'text-amber-600' },
  sky:     { border: 'border-sky-100',     bg: 'bg-sky-50/60',     title: 'text-sky-700',     iconTint: 'text-sky-600' },
  indigo:  { border: 'border-indigo-100',  bg: 'bg-indigo-50/60',  title: 'text-indigo-700',  iconTint: 'text-indigo-600' },
  teal:    { border: 'border-teal-100',    bg: 'bg-teal-50/60',    title: 'text-teal-700',    iconTint: 'text-teal-600' },
  gray:    { border: 'border-line',        bg: 'bg-surface',       title: 'text-ink-700',     iconTint: 'text-ink-500' },
};

export function Section({ titulo, icon, color = 'gray', style = 'header', children }) {
  const c = COLORS[color] ?? COLORS.gray;

  if (style === 'card') {
    return (
      <div className={`rounded-xl border p-4 ${c.border} ${c.bg}`}>
        <p className={`text-[10.5px] font-medium uppercase tracking-[0.12em] mb-3 ${c.title}`}>{titulo}</p>
        {children}
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500 mb-3 flex items-center gap-1.5">
        <span className={c.iconTint}>{icon}</span> {titulo}
      </p>
      <div className="bg-surface/60 rounded-xl p-4 border border-line">{children}</div>
    </div>
  );
}

export default Section;
