import React from 'react';
import {
  LineChart as RLine, Line,
  BarChart as RBar, Bar,
  PieChart as RPie, Pie, Cell,
  AreaChart as RArea, Area,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

// Paleta consistente con Tailwind (azul, esmeralda, índigo, etc.)
export const PALETTE = {
  blue:    '#2563eb',
  emerald: '#059669',
  indigo:  '#4f46e5',
  amber:   '#d97706',
  red:     '#dc2626',
  rose:    '#e11d48',
  purple:  '#9333ea',
  cyan:    '#0891b2',
  pink:    '#db2777',
  slate:   '#475569',
};

export const PIE_COLORS = [
  PALETTE.blue, PALETTE.emerald, PALETTE.indigo, PALETTE.amber,
  PALETTE.purple, PALETTE.cyan, PALETTE.pink, PALETTE.rose,
];

// ─── LineChart ────────────────────────────────────────────────────────────────
/**
 *   <LineChartPro
 *     data={[{dia:'2024-10-01', citas:12, ingresos:50000}, ...]}
 *     xKey="dia"
 *     lines={[
 *       { key: 'citas',    color: PALETTE.blue,    label: 'Citas' },
 *       { key: 'ingresos', color: PALETTE.emerald, label: 'Ingresos' },
 *     ]}
 *     height={280}
 *   />
 */
export function LineChartPro({
  data, xKey, lines, height = 280,
  formatY, formatTooltip, showLegend = true,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLine data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xKey} fontSize={11} tickMargin={6} />
        <YAxis fontSize={11} tickFormatter={formatY} />
        <Tooltip formatter={formatTooltip || formatY} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {lines.map(l => (
          <Line key={l.key} type="monotone"
            dataKey={l.key} stroke={l.color} strokeWidth={2}
            dot={false} name={l.label} />
        ))}
      </RLine>
    </ResponsiveContainer>
  );
}

// ─── BarChart ─────────────────────────────────────────────────────────────────
export function BarChartPro({
  data, xKey, bars, height = 280,
  formatY, formatTooltip, showLegend = true, layout = 'horizontal',
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBar data={data} layout={layout}
        margin={{ top: 8, right: 16, left: layout === 'vertical' ? 60 : 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {layout === 'horizontal' ? (
          <>
            <XAxis dataKey={xKey} fontSize={11} tickMargin={6} />
            <YAxis fontSize={11} tickFormatter={formatY} />
          </>
        ) : (
          <>
            <XAxis type="number" fontSize={11} tickFormatter={formatY} />
            <YAxis type="category" dataKey={xKey} fontSize={11} width={120} />
          </>
        )}
        <Tooltip formatter={formatTooltip || formatY} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map(b => (
          <Bar key={b.key} dataKey={b.key} fill={b.color} name={b.label}
            radius={[6, 6, 0, 0]} />
        ))}
      </RBar>
    </ResponsiveContainer>
  );
}

// ─── PieChart ─────────────────────────────────────────────────────────────────
/**
 *   <PieChartPro data={[{name:'Masculino', value:120}, ...]} height={260} />
 */
export function PieChartPro({
  data, height = 260, dataKey = 'value', nameKey = 'name',
  formatTooltip, innerRadius = 50, outerRadius = 90,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RPie>
        <Pie data={data} dataKey={dataKey} nameKey={nameKey}
          cx="50%" cy="50%"
          innerRadius={innerRadius} outerRadius={outerRadius}
          paddingAngle={2}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data?.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={formatTooltip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RPie>
    </ResponsiveContainer>
  );
}

// ─── AreaChart ────────────────────────────────────────────────────────────────
export function AreaChartPro({
  data, xKey, areas, height = 280,
  formatY, formatTooltip, showLegend = true, stacked = false,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RArea data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey={xKey} fontSize={11} tickMargin={6} />
        <YAxis fontSize={11} tickFormatter={formatY} />
        <Tooltip formatter={formatTooltip || formatY} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {areas.map(a => (
          <Area key={a.key} type="monotone"
            dataKey={a.key} stroke={a.color} fill={a.color}
            fillOpacity={0.25}
            stackId={stacked ? '1' : undefined}
            name={a.label} />
        ))}
      </RArea>
    </ResponsiveContainer>
  );
}

// ─── KpiSpark: sparkline minimalista para tarjetas KPI ───────────────────────
export function KpiSpark({ data, dataKey = 'value', color = PALETTE.blue, height = 40 }) {
  if (!data || data.length === 0) return <div style={{ height }} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLine data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <Line type="monotone" dataKey={dataKey}
          stroke={color} strokeWidth={2} dot={false} />
      </RLine>
    </ResponsiveContainer>
  );
}

// ─── HeatmapHora: heatmap simple por hora del día (no de recharts) ──────────
/**
 * Pinta 24 celdas (0-23) coloreadas según intensidad. No usa recharts porque
 * recharts no tiene heatmap nativo; usamos CSS grid + opacidad.
 *
 *   <HeatmapHora data={[{hora:0, citas:0}, {hora:1, citas:2}, ...]} />
 */
export function HeatmapHora({ data, max, color = PALETTE.blue }) {
  // Normalizar: array de 24 con `citas` (0 si no hay)
  const por_hora = Array.from({ length: 24 }, (_, h) => {
    const found = data?.find(d => Number(d.hora) === h);
    return { hora: h, citas: Number(found?.citas ?? 0) };
  });
  const maxV = max ?? Math.max(1, ...por_hora.map(d => d.citas));

  return (
    <div className="grid grid-cols-12 gap-1.5">
      {por_hora.map(d => {
        const opacidad = 0.12 + (d.citas / maxV) * 0.88;
        return (
          <div key={d.hora}
            className="rounded-md p-2 text-center text-xs font-semibold border border-gray-100"
            style={{ backgroundColor: color, opacity: d.citas === 0 ? 0.08 : opacidad, color: opacidad > 0.5 ? 'white' : '#374151' }}
            title={`${d.hora}:00 — ${d.citas} citas`}
          >
            <div className="text-[10px] opacity-80">{String(d.hora).padStart(2, '0')}h</div>
            <div className="font-bold">{d.citas}</div>
          </div>
        );
      })}
    </div>
  );
}
