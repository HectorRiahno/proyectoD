import React from 'react';

const COLORS = {
  blue:    { border: 'border-blue-200',    bg: 'bg-blue-50',    title: 'text-blue-700' },
  emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', title: 'text-emerald-700' },
  purple:  { border: 'border-purple-200',  bg: 'bg-purple-50',  title: 'text-purple-700' },
  red:     { border: 'border-red-200',     bg: 'bg-red-50',     title: 'text-red-700' },
  orange:  { border: 'border-orange-200',  bg: 'bg-orange-50',  title: 'text-orange-700' },
  amber:   { border: 'border-amber-200',   bg: 'bg-amber-50',   title: 'text-amber-700' },
  gray:    { border: 'border-gray-200',    bg: 'bg-gray-50',    title: 'text-gray-600' },
};

/**
 * Card con título en mayúscula + icono + cuerpo. Usado para agrupar
 * sub-formularios dentro de un modal (ej: "Datos personales", "Signos vitales").
 *
 *   <Section titulo="Datos clínicos" icon={<Heart size={14} />} color="emerald">
 *     <div className="grid grid-cols-2 gap-4">...</div>
 *   </Section>
 *
 * Hay dos estilos heredados:
 *   - 'header': título arriba SIN borde, contenido en card gris (compat Pacientes/Citas).
 *   - 'card':   todo dentro de un panel coloreado (compat AtenderCita).
 *
 * Por defecto usa 'header'. Pasa style="card" para el panel coloreado.
 */
export function Section({ titulo, icon, color = 'gray', style = 'header', children }) {
  const c = COLORS[color] ?? COLORS.gray;

  if (style === 'card') {
    return (
      <div className={`rounded-xl border p-4 ${c.border} ${c.bg}`}>
        <p className={`text-xs font-bold uppercase mb-3 ${c.title}`}>{titulo}</p>
        {children}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
        <span className="text-blue-500">{icon}</span> {titulo}
      </p>
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">{children}</div>
    </div>
  );
}

export default Section;
