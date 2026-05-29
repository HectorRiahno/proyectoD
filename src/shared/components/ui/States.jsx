import React from 'react';
import { Loader2 } from 'lucide-react';

/* =====================================================================
   States — Loading/Empty para tabs, tablas, listas y secciones.
   ===================================================================== */

const SPIN = {
  blue:    'text-brand-600',
  emerald: 'text-emerald-600',
  amber:   'text-amber-600',
  slate:   'text-ink-500',
};

/** Fila de spinner dentro de <tbody>. */
export function LoadingRow({ colSpan = 1, mensaje = 'Cargando…', color = 'blue' }) {
  const spin = SPIN[color] ?? SPIN.blue;
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-12">
        <Loader2 size={24} className={`mx-auto mb-2 animate-spin ${spin}`} strokeWidth={1.75} />
        <p className="text-[13px] text-ink-500">{mensaje}</p>
      </td>
    </tr>
  );
}

/** Estado vacío dentro de <tbody>. */
export function EmptyRow({ colSpan = 1, icon: Icon, mensaje = 'Sin resultados' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-14">
        {Icon && (
          <span className="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-surface border border-line mb-3">
            {Icon ? <Icon size={18} strokeWidth={1.75} className="text-ink-300" /> : null}
          </span>
        )}
        <p className="text-[13.5px] font-medium text-ink-700">{mensaje}</p>
      </td>
    </tr>
  );
}

/** Estado vacío como bloque (no en tabla). */
export function EmptyState({ icon: Icon, titulo, descripcion }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
      {Icon && (
        <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-surface border border-line mb-3">
          {Icon ? <Icon size={20} strokeWidth={1.75} className="text-ink-300" /> : null}
        </span>
      )}
      <p className="text-[14px] font-medium text-ink-800">{titulo}</p>
      {descripcion && <p className="mt-1 text-[12.5px] text-ink-500">{descripcion}</p>}
    </div>
  );
}

/** Spinner de página completa. */
export function LoadingState({ mensaje = 'Cargando…', color = 'blue' }) {
  const spin = SPIN[color] ?? SPIN.blue;
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 size={28} className={`animate-spin mb-3 ${spin}`} strokeWidth={1.75} />
      <p className="text-[13px] text-ink-500">{mensaje}</p>
    </div>
  );
}

export default LoadingRow;
