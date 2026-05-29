import React from 'react';
import { X } from 'lucide-react';

/* =====================================================================
   Modal — refactor del header gradient saturado a un header limpio con
   eyebrow de color sutil + título grande + close ghost. La identidad
   de la sección se mantiene vía la prop `variant` (mismo set anterior).
   ===================================================================== */

const ACCENTS = {
  blue:        { eyebrow: 'text-brand-700',   tint: 'bg-brand-50',   border: 'border-brand-100',   stripe: 'bg-brand-500' },
  emerald:     { eyebrow: 'text-emerald-700', tint: 'bg-emerald-50', border: 'border-emerald-100', stripe: 'bg-emerald-500' },
  emeraldDark: { eyebrow: 'text-emerald-800', tint: 'bg-emerald-50', border: 'border-emerald-100', stripe: 'bg-emerald-600' },
  green:       { eyebrow: 'text-emerald-700', tint: 'bg-emerald-50', border: 'border-emerald-100', stripe: 'bg-emerald-500' },
  amber:       { eyebrow: 'text-amber-700',   tint: 'bg-amber-50',   border: 'border-amber-100',   stripe: 'bg-amber-500' },
  red:         { eyebrow: 'text-red-700',     tint: 'bg-red-50',     border: 'border-red-100',     stripe: 'bg-red-500' },
  rose:        { eyebrow: 'text-rose-700',    tint: 'bg-rose-50',    border: 'border-rose-100',    stripe: 'bg-rose-500' },
  orange:      { eyebrow: 'text-orange-700',  tint: 'bg-orange-50',  border: 'border-orange-100',  stripe: 'bg-orange-500' },
  slate:       { eyebrow: 'text-ink-700',     tint: 'bg-surface',    border: 'border-line',        stripe: 'bg-ink-700' },
  sky:         { eyebrow: 'text-sky-700',     tint: 'bg-sky-50',     border: 'border-sky-100',     stripe: 'bg-sky-500' },
  violet:      { eyebrow: 'text-violet-700',  tint: 'bg-violet-50',  border: 'border-violet-100',  stripe: 'bg-violet-500' },
  indigo:      { eyebrow: 'text-indigo-700',  tint: 'bg-indigo-50',  border: 'border-indigo-100',  stripe: 'bg-indigo-500' },
  teal:        { eyebrow: 'text-teal-700',    tint: 'bg-teal-50',    border: 'border-teal-100',    stripe: 'bg-teal-500' },
  fuchsia:     { eyebrow: 'text-fuchsia-700', tint: 'bg-fuchsia-50', border: 'border-fuchsia-100', stripe: 'bg-fuchsia-500' },
};

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl',
};

export function Modal({
  titulo, subtitulo, onClose, variant = 'blue', size = 'md',
  icon, headerExtra, children,
}) {
  const a = ACCENTS[variant] ?? ACCENTS.blue;
  const sz = SIZES[size] ?? SIZES.md;

  // Cierre con ESC
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 motion-safe:[animation:hp-fade-up_0.2s_ease-out]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className={`relative bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] border border-line w-full max-h-[90vh] overflow-hidden flex flex-col ${sz}`}>
        {/* Header — sin gradient, con stripe lateral del color de sección */}
        <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex justify-between items-start gap-4 z-10">
          {/* Stripe vertical color sección */}
          <span aria-hidden className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r ${a.stripe}`} />
          <div className="flex items-start gap-3 min-w-0 ml-2">
            {icon && (
              <span className={`flex-shrink-0 inline-flex w-9 h-9 items-center justify-center rounded-lg border ${a.tint} ${a.border} ${a.eyebrow}`}>
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold tracking-tight text-ink-900 truncate">{titulo}</h2>
              {subtitulo && <p className="text-[12.5px] text-ink-500 truncate mt-0.5">{subtitulo}</p>}
            </div>
            {headerExtra && <div className="ml-2">{headerExtra}</div>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 -mt-0.5 -mr-1 text-ink-300 hover:text-ink-900 hover:bg-surface p-1.5 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
