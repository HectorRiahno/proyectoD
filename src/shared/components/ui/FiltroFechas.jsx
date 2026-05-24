import React from 'react';
import { Calendar } from 'lucide-react';

const PRESETS = [
  { id: '7d',  label: '7 días',   dias: 7 },
  { id: '30d', label: '30 días',  dias: 30 },
  { id: '90d', label: '90 días',  dias: 90 },
  { id: '1y',  label: '1 año',    dias: 365 },
];

const isoToday = () => new Date().toISOString().slice(0, 10);
const isoMinusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/**
 * Selector de rango de fechas con presets rápidos.
 *
 *   <FiltroFechas
 *     desde={desde} hasta={hasta}
 *     onChange={(d, h) => { setDesde(d); setHasta(h); }}
 *   />
 *
 * El admin puede:
 *   - Pulsar un preset (7/30/90 días, 1 año)
 *   - Editar manualmente desde/hasta con inputs date
 */
export function FiltroFechas({ desde, hasta, onChange }) {
  const aplicarPreset = (dias) => {
    onChange(isoMinusDays(dias - 1), isoToday());
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
          <Calendar size={12} /> Desde
        </label>
        <input
          type="date"
          value={desde}
          max={hasta}
          onChange={(e) => onChange(e.target.value, hasta)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
          <Calendar size={12} /> Hasta
        </label>
        <input
          type="date"
          value={hasta}
          min={desde}
          max={isoToday()}
          onChange={(e) => onChange(desde, e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
      <div className="flex gap-1 border border-gray-200 rounded-lg p-0.5">
        {PRESETS.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => aplicarPreset(p.dias)}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 rounded hover:bg-gray-100 transition"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Helpers para inicializar rangos desde fuera. */
export const rangoUltimos30 = () => ({ desde: isoMinusDays(29), hasta: isoToday() });
export const rangoUltimos7  = () => ({ desde: isoMinusDays(6),  hasta: isoToday() });
export const rangoUltimos90 = () => ({ desde: isoMinusDays(89), hasta: isoToday() });

export default FiltroFechas;
