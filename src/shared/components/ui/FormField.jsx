import React from 'react';

const BASE = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Input estándar con label arriba. Centraliza el estilo Tailwind repetido.
 *
 *   <Input label="Nombres *" name="nombres" value={form.nombres}
 *          onChange={handleChange} required />
 */
export function Input({
  label, name, type = 'text', value, onChange, required = false,
  placeholder = '', className = '', icon, ...rest
}) {
  return (
    <div className={className}>
      {label && (
        <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          {icon} {label}
        </label>
      )}
      <input
        name={name} type={type} value={value} onChange={onChange}
        required={required} placeholder={placeholder}
        className={BASE}
        {...rest}
      />
    </div>
  );
}

/**
 * Textarea estándar con label arriba.
 */
export function Textarea({
  label, name, value, onChange, rows = 2, required = false,
  placeholder = '', className = '', highlight = false,
}) {
  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-gray-700 mb-2 block">{label}</label>}
      <textarea
        name={name} value={value} onChange={onChange} rows={rows}
        required={required} placeholder={placeholder}
        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 resize-none ${
          highlight ? 'border-emerald-400 focus:ring-emerald-500 bg-emerald-50'
                    : 'border-gray-300 focus:ring-blue-500'
        }`}
      />
    </div>
  );
}

/**
 * Select estándar con label arriba.
 *
 *   <Select label="Género" name="genero" value={form.genero} onChange={handleChange}>
 *     <option value="">Sin especificar</option>
 *     {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
 *   </Select>
 */
export function Select({
  label, name, value, onChange, required = false, disabled = false,
  className = '', children,
}) {
  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-gray-700 mb-2 block">{label}</label>}
      <select
        name={name} value={value} onChange={onChange}
        required={required} disabled={disabled}
        className={`${BASE} bg-white disabled:bg-gray-100 disabled:cursor-not-allowed`}
      >
        {children}
      </select>
    </div>
  );
}

/**
 * Checkbox con label inline a la derecha — para formularios de "activo / inactivo".
 */
export function Checkbox({ label, name, checked, onChange, disabled = false, id }) {
  const inputId = id || `chk-${name}`;
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <input
        type="checkbox" id={inputId} name={name} checked={checked} onChange={onChange}
        disabled={disabled}
        className="w-5 h-5 rounded text-blue-600 disabled:opacity-50"
      />
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        {label}
      </label>
    </div>
  );
}

export default Input;
