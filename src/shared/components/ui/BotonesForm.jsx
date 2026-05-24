import React from 'react';

const VARIANTS = {
  blue:    'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
  emerald: 'from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700',
  green:   'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
  red:     'from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700',
  amber:   'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700',
};

/**
 * Par de botones cancelar/guardar al fondo de un formulario en modal.
 *
 *   <BotonesForm onCancel={onClose} saving={saving} labelSave="Registrar paciente" />
 *   <BotonesForm onCancel={onClose} saving={saving} labelSave="Anular" variant="red" />
 */
export function BotonesForm({
  onCancel, saving = false, labelSave = 'Guardar',
  labelCancel = 'Cancelar', variant = 'blue', disabled = false,
}) {
  const grad = VARIANTS[variant] ?? VARIANTS.blue;
  return (
    <div className="flex gap-3 pt-4 border-t border-gray-200">
      <button
        type="button" onClick={onCancel} disabled={saving}
        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold disabled:opacity-60"
      >
        {labelCancel}
      </button>
      <button
        type="submit" disabled={saving || disabled}
        className={`flex-1 px-6 py-3 bg-gradient-to-r ${grad} text-white rounded-xl transition font-semibold shadow-lg disabled:opacity-60`}
      >
        {saving ? 'Guardando...' : labelSave}
      </button>
    </div>
  );
}

export default BotonesForm;
