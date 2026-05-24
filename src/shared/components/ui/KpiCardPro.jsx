import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { compararValores, fmtMoney, fmtNumber, fmtPercent } from '../../../services/reportesService';
import { KpiSpark, PALETTE } from '../charts';

const COLORS = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: 'text-blue-600',    line: PALETTE.blue },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', line: PALETTE.emerald },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-600',   line: PALETTE.amber },
  red:     { bg: 'bg-red-50',     border: 'border-red-200',     icon: 'text-red-600',     line: PALETTE.red },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  icon: 'text-purple-600',  line: PALETTE.purple },
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   icon: 'text-slate-600',   line: PALETTE.slate },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  icon: 'text-orange-600',  line: PALETTE.amber },
};

const FORMATS = {
  numero:     fmtNumber,
  moneda:     fmtMoney,
  porcentaje: (n) => fmtPercent(n, 1),
};

/**
 * Tarjeta KPI con comparativa vs período anterior y sparkline.
 *
 *   <KpiCardPro
 *     label="Pacientes atendidos"
 *     value={data.actual.pacientes_atendidos}
 *     previous={data.anterior.pacientes_atendidos}
 *     icon={Users}
 *     color="blue"
 *     spark={data.serie.map(s => ({ value: s.pacientes_nuevos }))}
 *   />
 */
export function KpiCardPro({
  label, value, previous, format = 'numero', icon: Icon, color = 'blue',
  spark, hideComparison = false, suffix,
}) {
  const c = COLORS[color] ?? COLORS.blue;
  const fmt = FORMATS[format] ?? FORMATS.numero;

  const cmp = !hideComparison && previous !== undefined && previous !== null
    ? compararValores(Number(value ?? 0), Number(previous ?? 0))
    : null;

  // Para KPIs donde "menos es mejor" (canceladas, pendientes, críticos):
  // se puede pasar `goodWhenDown` (no implementado aquí, lo asumimos neutral).
  const TrendIcon = cmp
    ? (cmp.tendencia === 'sube' ? TrendingUp : cmp.tendencia === 'baja' ? TrendingDown : Minus)
    : null;

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 shadow-sm flex flex-col gap-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">
            {fmt(value)}{suffix && <span className="text-base font-medium ml-1 text-gray-600">{suffix}</span>}
          </p>
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg bg-white ${c.icon}`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      {cmp && (
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            cmp.tendencia === 'sube' ? 'bg-emerald-100 text-emerald-700'
            : cmp.tendencia === 'baja' ? 'bg-red-100 text-red-700'
            : 'bg-gray-100 text-gray-600'
          }`}>
            <TrendIcon size={11} />
            {Math.abs(cmp.pct).toFixed(1)}%
          </span>
          <span className="text-[11px] text-gray-500">
            vs {fmt(previous)} antes
          </span>
        </div>
      )}

      {spark && spark.length > 1 && (
        <div className="-mx-1 -mb-1">
          <KpiSpark data={spark} color={c.line} height={32} />
        </div>
      )}
    </div>
  );
}

export default KpiCardPro;
