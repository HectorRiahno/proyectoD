import React, { useState, lazy, Suspense } from 'react';
import {
  BarChart3, Users, Stethoscope, Clock, Receipt,
  Package, ShieldCheck, UserCheck, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../../../hooks';
import { PageHeader, LoadingState } from '../../../../shared/components/ui';

// Lazy loading de cada sub-reporte — solo se carga el código del tab activo.
// Esto ayuda a que el bundle inicial no cargue Recharts/exceljs si no se entra.
const DashboardKPIs       = lazy(() => import('./DashboardKPIs'));
const ReportePacientes    = lazy(() => import('./ReportePacientes'));
const ReporteMedicos      = lazy(() => import('./ReporteMedicos'));
const ReporteHorarios     = lazy(() => import('./ReporteHorarios'));
const ReporteFinanciero   = lazy(() => import('./ReporteFinanciero'));
const ReporteInventario   = lazy(() => import('./ReporteInventario'));
const ReporteAuditoria    = lazy(() => import('./ReporteAuditoria'));
const ReporteUsuarios     = lazy(() => import('./ReporteUsuarios'));

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: BarChart3,   Component: DashboardKPIs,     desc: 'KPIs y comparativas' },
  { id: 'pacientes',  label: 'Pacientes',  icon: Users,       Component: ReportePacientes,  desc: 'Demografía, frecuentes, inactivos' },
  { id: 'medicos',    label: 'Médicos',    icon: Stethoscope, Component: ReporteMedicos,    desc: 'Productividad y rendimiento' },
  { id: 'horarios',   label: 'Horarios',   icon: Clock,       Component: ReporteHorarios,   desc: 'Ocupación y horas pico' },
  { id: 'financiero', label: 'Financiero', icon: Receipt,     Component: ReporteFinanciero, desc: 'Ingresos, cartera y métodos de pago' },
  { id: 'inventario', label: 'Inventario', icon: Package,     Component: ReporteInventario, desc: 'Stock crítico y más usados' },
  { id: 'auditoria',  label: 'Auditoría',  icon: ShieldCheck, Component: ReporteAuditoria,  desc: 'Eventos del sistema' },
  { id: 'usuarios',   label: 'Usuarios',   icon: UserCheck,   Component: ReporteUsuarios,   desc: 'Cuentas activas e inactivas' },
];

export default function ReportesLayout() {
  const { esAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!esAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Acceso restringido</h2>
        <p className="text-sm text-gray-500">
          El módulo de Reportes y Seguimiento es solo para administradores.
        </p>
      </div>
    );
  }

  const tab = TABS.find(t => t.id === activeTab) ?? TABS[0];
  const Component = tab.Component;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Reportes y Seguimiento"
        descripcion={tab.desc}
        icon={<BarChart3 size={32} />}
        variant="slate"
      />

      {/* Tabs horizontales con scroll en pantallas chicas */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <nav className="flex" role="tablist">
            {TABS.map(t => {
              const Icon = t.icon;
              const activo = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 text-sm font-semibold transition border-b-2 whitespace-nowrap ${
                    activo
                      ? 'text-slate-900 border-slate-700 bg-slate-50'
                      : 'text-gray-600 border-transparent hover:text-slate-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenido del tab activo */}
      <Suspense fallback={<LoadingState mensaje={`Cargando ${tab.label.toLowerCase()}...`} />}>
        <Component />
      </Suspense>
    </div>
  );
}
