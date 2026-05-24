import React from 'react';

/**
 * Card de display (label arriba + value abajo) — usado en los modales de
 * "Ver detalles" donde NO se puede editar.
 *
 *   <Campo label="Email" value={p.email} />
 *   <Campo label="Dirección" value={p.direccion} className="col-span-2" />
 */
export function Campo({ label, value, className = '' }) {
  return (
    <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900 break-words">{value || '—'}</p>
    </div>
  );
}

/**
 * Campo read-only en gris para mostrar dentro de formularios datos que
 * el usuario NO puede editar (email, documento, número de historia...).
 *
 *   <CampoReadOnly label="Email" value={paciente.email} />
 */
export function CampoReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
        {value || '—'}
      </div>
    </div>
  );
}

export default Campo;
