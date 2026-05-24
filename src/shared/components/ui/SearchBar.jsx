import React from 'react';
import { Search } from 'lucide-react';

/**
 * Buscador inline con icono — el patrón estándar de las páginas de listado.
 *
 *   <SearchBar
 *     value={search}
 *     onChange={setSearch}
 *     placeholder="Buscar por nombre, documento o email..."
 *   />
 *
 * Para que el padre controle el layout, se renderiza como un wrapper relative
 * que puedes anidar dentro de cualquier flex/grid.
 */
export function SearchBar({
  value, onChange, placeholder = 'Buscar...', className = '', focusColor = 'blue',
}) {
  const ring = {
    blue:    'focus:ring-blue-500',
    emerald: 'focus:ring-emerald-500',
    amber:   'focus:ring-amber-500',
    slate:   'focus:ring-slate-500',
  }[focusColor] ?? 'focus:ring-blue-500';

  return (
    <div className={`flex-1 relative ${className}`}>
      <Search className="absolute left-3 top-3 text-gray-400" size={20} />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${ring}`}
      />
    </div>
  );
}

export default SearchBar;
