import React from 'react';

const TONES = {
  blue:   { tint: 'bg-brand-50',   border: 'border-brand-100',   icon: 'text-brand-700' },
  red:    { tint: 'bg-red-50',     border: 'border-red-100',     icon: 'text-red-700' },
  green:  { tint: 'bg-emerald-50', border: 'border-emerald-100', icon: 'text-emerald-700' },
  purple: { tint: 'bg-violet-50',  border: 'border-violet-100',  icon: 'text-violet-700' },
  amber:  { tint: 'bg-amber-50',   border: 'border-amber-100',   icon: 'text-amber-700' },
};

export default function StatsCard({ title, value, icon: Icon, color = 'blue', highlight }) {
  const t = TONES[color] ?? TONES.blue;
  return (
    <div
      className={[
        'rounded-2xl border bg-white px-5 py-4 transition-all duration-200',
        'shadow-[0_1px_2px_rgba(11,18,32,0.04)]',
        highlight
          ? 'border-red-300 ring-4 ring-red-500/10'
          : 'border-line hover:border-ink-100 hover:shadow-[0_8px_24px_-14px_rgba(11,18,32,0.16)]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{title}</p>
          <p className="mt-1 text-[24px] font-semibold tracking-tight tabular-nums text-ink-900 leading-none">
            {value}
          </p>
        </div>
        <span className={`flex-shrink-0 inline-flex w-9 h-9 items-center justify-center rounded-lg border ${t.tint} ${t.border} ${t.icon}`}>
          {Icon ? <Icon size={16} strokeWidth={1.75} /> : null}
        </span>
      </div>
    </div>
  );
}
