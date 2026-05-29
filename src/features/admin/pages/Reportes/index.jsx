import React, { useState, lazy, Suspense } from 'react';
import {
  BarChart3, Users, Stethoscope, Clock, Receipt,
  Package, ShieldCheck, UserCheck,
} from 'lucide-react';
import { useAuth } from '../../../../hooks';
import { PageHeader, LoadingState, EmptyState } from '../../../../shared/components/ui';

// Lazy loading de cada sub-reporte — solo se carga el código del tab activo.
const DashboardKPIs       = lazy(() => import('./DashboardKPIs'));
const ReportePacientes    = lazy(() => import('./ReportePacientes'));
const ReporteMedicos      = lazy(() => import('./ReporteMedicos'));
const ReporteHorarios     = lazy(() => import('./ReporteHorarios'));
const ReporteFinanciero   = lazy(() => import('./ReporteFinanciero'));
const ReporteInventario   = lazy(() => import('./ReporteInventario'));
const ReporteAuditoria    = lazy(() => import('./ReporteAuditoria'));
const ReporteUsuarios     = lazy(() => import('./ReporteUsuarios'));

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: BarChart3,   accent: 'indigo',  Component: DashboardKPIs,     desc: 'KPIs y comparativas' },
  { id: 'pacientes',  label: 'Pacientes',  icon: Users,       accent: 'emerald', Component: ReportePacientes,  desc: 'Demografía, frecuentes, inactivos' },
  { id: 'medicos',    label: 'Médicos',    icon: Stethoscope, accent: 'violet',  Component: ReporteMedicos,    desc: 'Productividad y rendimiento' },
  { id: 'horarios',   label: 'Horarios',   icon: Clock,       accent: 'teal',    Component: ReporteHorarios,   desc: 'Ocupación y horas pico' },
  { id: 'financiero', label: 'Financiero', icon: Receipt,     accent: 'sky',     Component: ReporteFinanciero, desc: 'Ingresos, cartera y métodos de pago' },
  { id: 'inventario', label: 'Inventario', icon: Package,     accent: 'amber',   Component: ReporteInventario, desc: 'Stock crítico y más usados' },
  { id: 'auditoria',  label: 'Auditoría',  icon: ShieldCheck, accent: 'slate',   Component: ReporteAuditoria,  desc: 'Eventos del sistema' },
  { id: 'usuarios',   label: 'Usuarios',   icon: UserCheck,   accent: 'fuchsia', Component: ReporteUsuarios,   desc: 'Cuentas activas e inactivas' },
];

const ACCENT_TAB = {
  indigo:  'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  violet:  'bg-violet-50 text-violet-700 border-violet-100',
  teal:    'bg-teal-50 text-teal-700 border-teal-100',
  sky:     'bg-sky-50 text-sky-700 border-sky-100',
  amber:   'bg-amber-50 text-amber-700 border-amber-100',
  slate:   'bg-surface text-ink-700 border-line',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
};

export default function ReportesLayout() {
  const { esAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!esAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        titulo="Acceso restringido"
        descripcion="El módulo de Reportes y Seguimiento es solo para administradores."
      />
    );
  }

  const tab = TABS.find(t => t.id === activeTab) ?? TABS[0];
  const Component = tab.Component;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Reportes y seguimiento"
        descripcion={tab.desc}
        eyebrow="Reportes"
        icon={<BarChart3 size={11} strokeWidth={2.25} />}
        variant="indigo"
      />

      {/* Tabs horizontales con scroll en pantallas chicas */}
      <div className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <nav className="flex p-1.5 gap-1" role="tablist">
            {TABS.map(t => {
              const Icon = t.icon;
              const activo = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setActiveTab(t.id)}
                  className={[
                    'inline-flex flex-shrink-0 items-center gap-2 px-3.5 py-2 text-[13px] font-medium rounded-lg whitespace-nowrap transition-all duration-150 border',
                    activo
                      ? `${ACCENT_TAB[t.accent] ?? ACCENT_TAB.slate}`
                      : 'text-ink-700 border-transparent hover:bg-surface',
                  ].join(' ')}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenido del tab activo */}
      <Suspense fallback={<LoadingState mensaje={`Cargando ${tab.label.toLowerCase()}…`} />}>
        <Component />
      </Suspense>
    </div>
  );
}
