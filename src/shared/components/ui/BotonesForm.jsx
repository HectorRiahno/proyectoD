import React from 'react';

/* =====================================================================
   BotonesForm — par cancelar/guardar al pie de los formularios en modal.
   El submit usa el ink-900 primary del sistema. La prop `variant` se
   mantiene para compatibilidad: 'red' aplica color destructivo,
   el resto comparte el mismo primary (consistente con el resto del sistema).
   ===================================================================== */

const VARIANTS = {
  blue:    'bg-ink-900 hover:bg-ink-800 text-white',
  emerald: 'bg-emerald-700 hover:bg-emerald-800 text-white',
  green:   'bg-emerald-700 hover:bg-emerald-800 text-white',
  amber:   'bg-amber-600 hover:bg-amber-700 text-white',
  red:     'bg-red-600 hover:bg-red-700 text-white',
};

export function BotonesForm({
  onCancel, saving = false, labelSave = 'Guardar',
  labelCancel = 'Cancelar', variant = 'blue', disabled = false,
}) {
  const primary = VARIANTS[variant] ?? VARIANTS.blue;
  return (
    <div className="flex gap-3 pt-5 mt-1 border-t border-line">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="flex-1 px-5 py-2.5 bg-white border border-line text-ink-800 rounded-xl hover:bg-surface hover:border-ink-100 active:scale-[0.99] transition-all duration-150 text-[13.5px] font-medium disabled:opacity-60"
      >
        {labelCancel}
      </button>
      <button
        type="submit"
        disabled={saving || disabled}
        className={`group flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13.5px] font-medium shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_24px_-14px_rgba(11,18,32,0.40)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${primary}`}
      >
        {saving ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Guardando…
          </>
        ) : labelSave}
      </button>
    </div>
  );
}

export default BotonesForm;
