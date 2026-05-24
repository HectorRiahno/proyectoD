import React from 'react';

// Mismas paletas que Modal, pero centradas en el banner superior de las páginas.
const VARIANTS = {
  blue:        'from-blue-600 to-indigo-600',
  blueDeep:    'from-blue-600 to-indigo-700',
  emerald:     'from-emerald-600 to-teal-700',
  emeraldDark: 'from-emerald-700 to-teal-800',
  amber:       'from-amber-600 to-orange-700',
  slate:       'from-slate-700 to-slate-900',
  sky:         'from-sky-600 to-cyan-700',
};

/**
 * Header gradient con título + descripción + slot de KPIs a la derecha.
 *
 *   <PageHeader
 *     titulo="Gestión de Pacientes"
 *     descripcion="Información completa..."
 *     icon={<Users size={32} />}
 *     variant="blue"
 *   >
 *     <KPI label="Total"   value={42} />
 *     <KPI label="Activos" value={30} />
 *   </PageHeader>
 */
export function PageHeader({ titulo, descripcion, icon, variant = 'blue', children }) {
  const gradient = VARIANTS[variant] ?? VARIANTS.blue;
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-xl shadow-lg p-8 text-white`}>
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            {icon} {titulo}
          </h1>
          {descripcion && <p className="text-white/80">{descripcion}</p>}
        </div>
        {children && <div className="flex gap-6 text-center">{children}</div>}
      </div>
    </div>
  );
}

/**
 * KPI individual usado dentro de PageHeader.
 *
 *   <KPI label="Total" value={42} />
 *   <KPI label="Por cobrar" value={fmtMoney(1500000)} mono color="text-green-300" />
 */
export function KPI({ label, value, color = 'text-white', mono = false }) {
  return (
    <div>
      <p className="text-sm text-white/80">{label}</p>
      <p className={`text-3xl font-bold ${color} ${mono ? 'font-mono text-2xl' : ''}`}>{value}</p>
    </div>
  );
}

export default PageHeader;
