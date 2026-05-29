import React from 'react';

/* =====================================================================
   Avatar — círculo con iniciales. Color sutil según `tone`.
   ===================================================================== */

const initials = (n) =>
  (n ?? '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();

const TONES = {
  brand:   'bg-gradient-to-br from-brand-500 to-brand-700',
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
  violet:  'bg-gradient-to-br from-violet-500 to-violet-700',
  amber:   'bg-gradient-to-br from-amber-500 to-amber-700',
  sky:     'bg-gradient-to-br from-sky-500 to-sky-700',
  indigo:  'bg-gradient-to-br from-indigo-500 to-indigo-700',
  fuchsia: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-700',
  rose:    'bg-gradient-to-br from-rose-500 to-rose-700',
  teal:    'bg-gradient-to-br from-teal-500 to-teal-700',
  ink:     'bg-ink-700',
  muted:   'bg-ink-300',
};

const SIZES = {
  sm: { box: 'w-8 h-8',  text: 'text-[11px]' },
  md: { box: 'w-10 h-10', text: 'text-[13px]' },
  lg: { box: 'w-14 h-14', text: 'text-[16px]' },
  xl: { box: 'w-20 h-20', text: 'text-[22px]' },
};

export function Avatar({ name, tone = 'brand', size = 'md', className = '' }) {
  const t = TONES[tone] ?? TONES.brand;
  const s = SIZES[size] ?? SIZES.md;
  return (
    <div className={`${s.box} ${t} rounded-full flex items-center justify-center text-white font-semibold ${s.text} shadow-[0_4px_14px_-6px_rgba(11,18,32,0.45)] ring-1 ring-inset ring-white/10 flex-shrink-0 ${className}`}>
      {initials(name)}
    </div>
  );
}

export default Avatar;
