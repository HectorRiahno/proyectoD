import React from 'react';

/* =====================================================================
   TableShell — wrapper de tabla con borde + scroll horizontal + thead
   limpio. Reemplaza el patrón inline:
     <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
       <div className="overflow-x-auto">
         <table className="w-full">
           <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
             <tr><th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase">...
   ===================================================================== */

export function TableShell({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );
}

/** <Thead columnas={['Paciente','Documento','Estado','Acciones']} /> */
export function Thead({ columnas }) {
  return (
    <thead className="bg-surface border-b border-line">
      <tr>
        {columnas.map((col, i) => {
          const isObj = typeof col === 'object' && col !== null;
          const label = isObj ? col.label : col;
          const align = isObj && col.align ? col.align : 'left';
          return (
            <th
              key={i}
              className={`px-5 py-3 text-[10.5px] font-semibold text-ink-500 uppercase tracking-[0.10em] text-${align}`}
            >
              {label}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

/** Tbody con divisores hairline y hover sutil — para usar dentro de TableShell. */
export function Tbody({ children, className = '' }) {
  return <tbody className={`divide-y divide-line/70 ${className}`}>{children}</tbody>;
}

/** Fila con hover surface — preferible a `hover:bg-blue-50`. */
export function Tr({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`${onClick ? 'cursor-pointer' : ''} hover:bg-surface/70 transition-colors ${className}`}
    >
      {children}
    </tr>
  );
}

export default TableShell;
