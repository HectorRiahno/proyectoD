import React from 'react';

/* =====================================================================
   Inputs unificados — usan el mismo focus-ring del sistema (brand/10 halo).
   Mantienen API: label, name, value, onChange, required, placeholder, icon.
   ===================================================================== */

const BASE_INPUT =
  'w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 ' +
  'placeholder:text-ink-300 transition-all duration-150 ' +
  'focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 ' +
  'disabled:bg-surface disabled:cursor-not-allowed disabled:text-ink-500';

const LABEL = 'text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5';

export function Input({
  label, name, type = 'text', value, onChange, required = false,
  placeholder = '', className = '', icon, ...rest
}) {
  return (
    <div className={className}>
      {label && (
        <label className={LABEL}>
          {icon && <span className="text-ink-500">{icon}</span>} {label}
        </label>
      )}
      <input
        name={name} type={type} value={value} onChange={onChange}
        required={required} placeholder={placeholder}
        className={BASE_INPUT}
        {...rest}
      />
    </div>
  );
}

export function Textarea({
  label, name, value, onChange, rows = 2, required = false,
  placeholder = '', className = '', highlight = false,
}) {
  return (
    <div className={className}>
      {label && <label className={LABEL.replace('flex items-center gap-1.5', 'block')}>{label}</label>}
      <textarea
        name={name} value={value} onChange={onChange} rows={rows}
        required={required} placeholder={placeholder}
        className={[
          'w-full px-3.5 py-2.5 text-[13.5px] rounded-xl resize-none transition-all duration-150',
          'placeholder:text-ink-300 text-ink-900',
          'focus:outline-none focus:ring-4',
          highlight
            ? 'bg-emerald-50/50 border border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/10'
            : 'bg-white border border-line focus:border-brand-500 focus:ring-brand-500/10',
        ].join(' ')}
      />
    </div>
  );
}

export function Select({
  label, name, value, onChange, required = false, disabled = false,
  className = '', children,
}) {
  return (
    <div className={className}>
      {label && <label className={LABEL.replace('flex items-center gap-1.5', 'block')}>{label}</label>}
      <select
        name={name} value={value} onChange={onChange}
        required={required} disabled={disabled}
        className={BASE_INPUT}
      >
        {children}
      </select>
    </div>
  );
}

export function Checkbox({ label, name, checked, onChange, disabled = false, id }) {
  const inputId = id || `chk-${name}`;
  return (
    <label
      htmlFor={inputId}
      className="flex items-center gap-3 p-3 bg-surface border border-line rounded-xl cursor-pointer hover:border-ink-100 transition-colors"
    >
      <input
        type="checkbox" id={inputId} name={name} checked={checked} onChange={onChange}
        disabled={disabled}
        className="w-4 h-4 rounded text-brand-600 accent-brand-600 disabled:opacity-50"
      />
      <span className="text-[13.5px] font-medium text-ink-800">{label}</span>
    </label>
  );
}

export default Input;
