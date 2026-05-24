import React from 'react';

const PERIODOS = [
  { v: 'hoy',       l: 'Hoy' },
  { v: 'semana',    l: 'Últimos 7 días' },
  { v: 'mes',       l: 'Últimos 30 días' },
  { v: 'trimestre', l: 'Últimos 90 días' },
];

/**
 * Selector de período con presets fijos.
 *
 *   <FiltroPeriodo value={periodo} onChange={setPeriodo} />
 */
export function FiltroPeriodo({ value, onChange }) {
  return (
    <div className="inline-flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
      {PERIODOS.map(p => {
        const activo = value === p.v;
        return (
          <button
            key={p.v}
            type="button"
            onClick={() => onChange(p.v)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              activo ? 'bg-blue-600 text-white shadow' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {p.l}
          </button>
        );
      })}
    </div>
  );
}

export default FiltroPeriodo;
