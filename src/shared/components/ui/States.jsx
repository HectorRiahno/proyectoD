import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Fila de spinner para usar dentro de un <tbody> mientras carga.
 *
 *   {loading && <LoadingRow colSpan={7} mensaje="Cargando pacientes..." />}
 */
export function LoadingRow({ colSpan = 1, mensaje = 'Cargando...', color = 'blue' }) {
  const spinColor = {
    blue:    'text-blue-600',
    emerald: 'text-emerald-600',
    amber:   'text-amber-600',
    slate:   'text-slate-600',
  }[color] ?? 'text-blue-600';

  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-12">
        <Loader2 size={32} className={`mx-auto mb-2 animate-spin ${spinColor}`} />
        <p className="text-gray-500">{mensaje}</p>
      </td>
    </tr>
  );
}

/**
 * Estado vacío dentro de un <tbody>.
 *
 *   {!loading && filtered.length === 0 && (
 *     <EmptyRow colSpan={7} icon={Search} mensaje="No se encontraron pacientes" />
 *   )}
 */
export function EmptyRow({ colSpan = 1, icon: Icon, mensaje = 'Sin resultados' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-12">
        {Icon && <Icon size={48} className="mx-auto mb-4 text-gray-300" />}
        <p className="text-gray-500">{mensaje}</p>
      </td>
    </tr>
  );
}

/**
 * Estado vacío como bloque (no dentro de tabla) — para grids y cards.
 *
 *   {filtered.length === 0 && <EmptyState icon={Trash2} titulo="Papelera vacía" />}
 */
export function EmptyState({ icon: Icon, titulo, descripcion }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-16 text-center border border-gray-100">
      {Icon && <Icon size={48} className="mx-auto mb-3 text-gray-300" />}
      <p className="text-gray-500 font-medium">{titulo}</p>
      {descripcion && <p className="text-xs text-gray-400 mt-1">{descripcion}</p>}
    </div>
  );
}

/**
 * Spinner de página completa — para `if (loading) return <LoadingState />`.
 */
export function LoadingState({ mensaje = 'Cargando...', color = 'blue' }) {
  const spinColor = {
    blue:    'text-blue-600',
    emerald: 'text-emerald-600',
    amber:   'text-amber-600',
    slate:   'text-slate-600',
  }[color] ?? 'text-blue-600';

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <Loader2 size={36} className={`animate-spin mb-3 ${spinColor}`} />
      <p className="text-gray-500">{mensaje}</p>
    </div>
  );
}

export default LoadingRow;
