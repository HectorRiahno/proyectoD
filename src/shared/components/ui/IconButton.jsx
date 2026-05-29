import React from 'react';

/* =====================================================================
   IconButton — botón fantasma para columnas de acciones (Eye/Edit/Trash).
   Reemplaza el patrón:
     <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg ...">
   ===================================================================== */

const TONES = {
  brand:   'text-brand-700 hover:bg-brand-50',
  ink:     'text-ink-700   hover:bg-surface',
  emerald: 'text-emerald-700 hover:bg-emerald-50',
  amber:   'text-amber-700   hover:bg-amber-50',
  violet:  'text-violet-700  hover:bg-violet-50',
  indigo:  'text-indigo-700  hover:bg-indigo-50',
  rose:    'text-rose-700    hover:bg-rose-50',
  red:     'text-red-700     hover:bg-red-50',
  sky:     'text-sky-700     hover:bg-sky-50',
  teal:    'text-teal-700    hover:bg-teal-50',
};

export function IconButton({
  icon: Icon, onClick, title, tone = 'ink', size = 16, disabled = false, className = '',
}) {
  const t = TONES[tone] ?? TONES.ink;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-label={title}
      className={`inline-flex w-8 h-8 items-center justify-center rounded-lg ${t} transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {Icon ? <Icon size={size} strokeWidth={1.75} /> : null}
    </button>
  );
}

/** Grupo de IconButtons separados por divisor sutil — para celda "Acciones". */
export function ActionGroup({ children }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {children}
    </div>
  );
}

export default IconButton;
