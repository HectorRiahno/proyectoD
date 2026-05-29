import React from 'react';
import { Plus } from 'lucide-react';

/* =====================================================================
   Toolbar — contenedor de filtros / búsqueda / CTA superior de las páginas
   de listado. Reemplaza el patrón inline:
     <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
   ===================================================================== */
export function Toolbar({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] ${className}`}>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/**
 * Botón principal "Nuevo X" que vive en el Toolbar.
 * Variantes de color para identificar la sección, pero todas comparten
 * la misma estructura premium (no gradientes saturados).
 *
 *   <AccentButton variant="emerald" icon={UserPlus} onClick={...}>
 *     Nuevo paciente
 *   </AccentButton>
 */
const ACCENT_BTN = {
  blue:    'bg-brand-600 hover:bg-brand-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  amber:   'bg-amber-600 hover:bg-amber-700',
  sky:     'bg-sky-600 hover:bg-sky-700',
  violet:  'bg-violet-600 hover:bg-violet-700',
  indigo:  'bg-indigo-600 hover:bg-indigo-700',
  teal:    'bg-teal-600 hover:bg-teal-700',
  fuchsia: 'bg-fuchsia-600 hover:bg-fuchsia-700',
  rose:    'bg-rose-600 hover:bg-rose-700',
  red:     'bg-red-600 hover:bg-red-700',
  ink:     'bg-ink-900 hover:bg-ink-800',
};

export function AccentButton({
  children, variant = 'ink', icon: Icon = Plus, onClick, type = 'button',
  className = '', disabled = false,
}) {
  const c = ACCENT_BTN[variant] ?? ACCENT_BTN.ink;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group inline-flex items-center gap-2 px-4 py-2.5 ${c} text-white text-[13.5px] font-medium rounded-xl shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_24px_-14px_rgba(11,18,32,0.40)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {Icon && <Icon size={15} strokeWidth={2} />}
      {children}
    </button>
  );
}

/**
 * Pestañas tipo segmented-control. Renderiza un grupo de tabs con conteos.
 *
 *   <TabPills
 *     value={filtroEstado}
 *     onChange={setFiltroEstado}
 *     options={[
 *       { value: 'todos',      label: 'Todos',     count: 12 },
 *       { value: 'programada', label: 'Programadas', count: 4 },
 *     ]}
 *   />
 */
export function TabPills({ value, onChange, options, accent = 'blue' }) {
  const activeBg = {
    blue:    'bg-brand-600',
    emerald: 'bg-emerald-600',
    amber:   'bg-amber-600',
    sky:     'bg-sky-600',
    violet:  'bg-violet-600',
    indigo:  'bg-indigo-600',
    teal:    'bg-teal-600',
    fuchsia: 'bg-fuchsia-600',
    rose:    'bg-rose-600',
    ink:     'bg-ink-900',
  }[accent] ?? 'bg-brand-600';

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150',
              active
                ? `${activeBg} text-white shadow-[0_4px_14px_-6px_rgba(11,18,32,0.45)]`
                : 'bg-surface text-ink-700 hover:bg-ink-100/40 border border-line',
            ].join(' ')}
          >
            {opt.label}
            {opt.count != null && (
              <span className={active ? 'text-white/70' : 'text-ink-500'}>({opt.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Toolbar;
