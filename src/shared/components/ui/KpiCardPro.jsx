import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { compararValores, fmtMoney, fmtNumber, fmtPercent } from '../../../services/reportesService';
import { KpiSpark, PALETTE } from '../charts';

/* =====================================================================
   KpiCardPro — KPI con comparativa y sparkline para los reportes.
   Refactor: superficie blanca + icono en badge de color, no fondo tinted
   completo. Mantiene la API original (label, value, previous, icon, color,
   spark, format, hideComparison, suffix).
   ===================================================================== */

const COLORS = {
  blue:    { tint: 'bg-brand-50',    border: 'border-brand-100',    icon: 'text-brand-700',    line: PALETTE.blue },
  emerald: { tint: 'bg-emerald-50',  border: 'border-emerald-100',  icon: 'text-emerald-700',  line: PALETTE.emerald },
  amber:   { tint: 'bg-amber-50',    border: 'border-amber-100',    icon: 'text-amber-700',    line: PALETTE.amber },
  red:     { tint: 'bg-red-50',      border: 'border-red-100',      icon: 'text-red-700',      line: PALETTE.red },
  purple:  { tint: 'bg-violet-50',   border: 'border-violet-100',   icon: 'text-violet-700',   line: PALETTE.purple },
  slate:   { tint: 'bg-surface',     border: 'border-line',         icon: 'text-ink-700',      line: PALETTE.slate },
  orange:  { tint: 'bg-orange-50',   border: 'border-orange-100',   icon: 'text-orange-700',   line: PALETTE.amber },
  sky:     { tint: 'bg-sky-50',      border: 'border-sky-100',      icon: 'text-sky-700',      line: PALETTE.blue },
  indigo:  { tint: 'bg-indigo-50',   border: 'border-indigo-100',   icon: 'text-indigo-700',   line: PALETTE.purple },
};

const FORMATS = {
  numero:     fmtNumber,
  moneda:     fmtMoney,
  porcentaje: (n) => fmtPercent(n, 1),
};

export function KpiCardPro({
  label, value, previous, format = 'numero', icon: Icon, color = 'blue',
  spark, hideComparison = false, suffix,
}) {
  const c = COLORS[color] ?? COLORS.blue;
  const fmt = FORMATS[format] ?? FORMATS.numero;

  const cmp = !hideComparison && previous !== undefined && previous !== null
    ? compararValores(Number(value ?? 0), Number(previous ?? 0))
    : null;

  const TrendIcon = cmp
    ? (cmp.tendencia === 'sube' ? TrendingUp : cmp.tendencia === 'baja' ? TrendingDown : Minus)
    : null;

  return (
    <div className="group rounded-2xl border border-line bg-white px-5 py-4 shadow-[0_1px_2px_rgba(11,18,32,0.04)] flex flex-col gap-3 hover:border-ink-100 hover:shadow-[0_8px_28px_-14px_rgba(11,18,32,0.16)] transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-medium text-ink-500 uppercase tracking-[0.10em] truncate">
            {label}
          </p>
          <p className="mt-1 text-[24px] font-semibold tracking-tight tabular-nums text-ink-900 leading-none">
            {fmt(value)}
            {suffix && <span className="text-[14px] font-medium ml-1 text-ink-500">{suffix}</span>}
          </p>
        </div>
        {Icon && (
          <span className={`flex-shrink-0 inline-flex w-9 h-9 items-center justify-center rounded-lg border ${c.tint} ${c.border} ${c.icon}`}>
            <Icon size={16} strokeWidth={1.75} />
          </span>
        )}
      </div>

      {cmp && (
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
            cmp.tendencia === 'sube' ? 'bg-emerald-50 text-emerald-700'
            : cmp.tendencia === 'baja' ? 'bg-red-50 text-red-700'
            : 'bg-surface text-ink-700'
          }`}>
            <TrendIcon size={11} strokeWidth={2} />
            {Math.abs(cmp.pct).toFixed(1)}%
          </span>
          <span className="text-[10.5px] text-ink-500">vs {fmt(previous)} antes</span>
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
