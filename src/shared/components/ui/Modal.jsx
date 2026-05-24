import React from 'react';
import { X } from 'lucide-react';

// Paletas pre-aprobadas — agregar nuevas aquí, NO inline en cada modal.
const VARIANTS = {
  blue:    'from-blue-600 to-indigo-600',
  emerald: 'from-emerald-600 to-teal-600',
  emeraldDark: 'from-emerald-700 to-teal-700',
  amber:   'from-amber-600 to-orange-600',
  red:     'from-red-600 to-rose-600',
  green:   'from-green-600 to-emerald-600',
  orange:  'from-orange-600 to-red-600',
  slate:   'from-slate-700 to-slate-900',
};

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl',
};

/**
 * Modal compartido con header gradient + close button.
 *
 *   <Modal titulo="..." subtitulo="..." onClose={...} variant="emerald" size="lg">
 *     <form>...</form>
 *   </Modal>
 *
 * Props:
 *   titulo:     string
 *   subtitulo:  string (opcional)
 *   onClose:    () => void
 *   variant:    'blue' | 'emerald' | 'emeraldDark' | 'amber' | 'red' | 'green' | 'orange' | 'slate'
 *   size:       'sm' | 'md' | 'lg' | 'xl' (default 'md')
 *   icon:       ReactNode opcional (lo pinta antes del título)
 *   headerExtra: ReactNode opcional para chips/badges en el header
 */
export function Modal({
  titulo, subtitulo, onClose, variant = 'blue', size = 'md',
  icon, headerExtra, children,
}) {
  const gradient = VARIANTS[variant] ?? VARIANTS.blue;
  const sz       = SIZES[size] ?? SIZES.md;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${sz}`}>
        <div className={`sticky top-0 bg-gradient-to-r ${gradient} text-white px-6 py-4 flex justify-between items-center rounded-t-2xl z-10`}>
          <div className="flex items-center gap-3 min-w-0">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h2 className="text-2xl font-bold truncate">{titulo}</h2>
              {subtitulo && <p className="text-white/80 text-sm truncate">{subtitulo}</p>}
            </div>
            {headerExtra}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
