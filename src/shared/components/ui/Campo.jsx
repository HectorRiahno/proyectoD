import React from 'react';

/* =====================================================================
   Campo / CampoReadOnly — display de datos en modales de "Ver detalles"
   y campos no editables dentro de formularios.
   ===================================================================== */

/**
 *   <Campo label="Email" value={p.email} />
 *   <Campo label="Dirección" value={p.direccion} className="col-span-2" />
 */
export function Campo({ label, value, className = '' }) {
  return (
    <div className={`rounded-lg border border-line bg-surface/60 px-3 py-2 ${className}`}>
      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 text-[13.5px] font-medium text-ink-900 break-words">
        {value || <span className="text-ink-300 font-normal">—</span>}
      </p>
    </div>
  );
}

/**
 *   <CampoReadOnly label="Email" value={paciente.email} />
 */
export function CampoReadOnly({ label, value }) {
  return (
    <div>
      <label className="text-[11.5px] font-medium text-ink-500 block mb-1">{label}</label>
      <div className="px-3 py-2 bg-surface border border-line rounded-xl text-[13px] text-ink-700">
        {value || <span className="text-ink-300">—</span>}
      </div>
    </div>
  );
}

export default Campo;
