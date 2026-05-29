import React from 'react';

const TONES = {
  blue:    { tint: 'bg-brand-50',   border: 'border-brand-100',   text: 'text-brand-700' },
  red:     { tint: 'bg-red-50',     border: 'border-red-100',     text: 'text-red-700' },
  green:   { tint: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
  purple:  { tint: 'bg-violet-50',  border: 'border-violet-100',  text: 'text-violet-700' },
  emerald: { tint: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
};

export default function ClientStatsCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const t = TONES[color] ?? TONES.blue;
  return (
    <div className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:border-ink-100 hover:shadow-[0_8px_24px_-14px_rgba(11,18,32,0.16)] transition-all duration-200 px-5 py-4">
      <span className={`inline-flex w-9 h-9 items-center justify-center rounded-lg border ${t.tint} ${t.border} ${t.text} mb-3`}>
        {Icon && <Icon size={16} strokeWidth={1.75} />}
      </span>
      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{title}</p>
      <p className="mt-1 text-[24px] font-semibold tracking-tight tabular-nums text-ink-900 leading-none">{value}</p>
      {subtitle && <p className="mt-1.5 text-[11.5px] text-ink-500">{subtitle}</p>}
    </div>
  );
}
