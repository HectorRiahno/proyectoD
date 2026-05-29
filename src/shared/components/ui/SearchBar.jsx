import React from 'react';
import { Search } from 'lucide-react';

/**
 * Buscador inline con icono — mismo estilo que los inputs del sistema.
 * `focusColor` se mantiene para compat pero todos usan brand-500/10 halo.
 *
 *   <SearchBar
 *     value={search}
 *     onChange={setSearch}
 *     placeholder="Buscar por nombre, documento o email..."
 *   />
 */
export function SearchBar({
  value, onChange, placeholder = 'Buscar…', className = '',
}) {
  return (
    <div className={`flex-1 relative ${className}`}>
      <Search
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-ink-300 pointer-events-none"
        strokeWidth={1.75}
      />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 placeholder:text-ink-300 transition-all duration-150 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
      />
    </div>
  );
}

export default SearchBar;
