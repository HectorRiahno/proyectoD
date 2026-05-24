import React, { useState } from 'react';
import {
  Users, UserPlus, Calendar, XCircle, Clock,
  DollarSign, AlertCircle, Package, UserCheck, Bell, RefreshCw,
  TrendingUp, Loader2, Stethoscope,
} from 'lucide-react';
import { useDashboardReportes } from '../../../../hooks';
import {
  KpiCardPro, FiltroPeriodo, ErrorBanner, LoadingState,
} from '../../../../shared/components/ui';
import {
  LineChartPro, BarChartPro, PieChartPro, AreaChartPro,
  HeatmapHora, PALETTE,
} from '../../../../shared/components/charts';
import { fmtMoney, fmtNumber } from '../../../../services';

const fmtFechaDia = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

export default function DashboardKPIs() {
  const [periodo, setPeriodo] = useState('mes');
  const { dashboard, loading, error, reload, regenerarHoy } = useDashboardReportes(periodo);
  const [refrescando, setRefrescando] = useState(false);

  const handleRefrescar = async () => {
    setRefrescando(true);
    try {
      await regenerarHoy();
    } finally {
      setRefrescando(false);
    }
  };

  const handlePeriodoChange = (p) => {
    setPeriodo(p);
  };

  // Mientras carga la primera vez
  if (loading && !dashboard) return <LoadingState mensaje="Cargando dashboard..." color="blue" />;

  const actual    = dashboard?.actual    ?? {};
  const anterior  = dashboard?.anterior  ?? {};
  const serie     = dashboard?.serie     ?? [];
  const horasPico = dashboard?.horas_pico ?? [];
  const demografia = dashboard?.demografia ?? [];
  const topMedicos = dashboard?.top_medicos ?? [];
  const invCritico = dashboard?.inventario_critico_top ?? [];

  // ── Transformaciones para gráficos ──────────────────────────────────────
  // Serie: añadir fecha legible
  const serieFmt = serie.map(s => ({ ...s, label: fmtFechaDia(s.dia) }));

  // Demografía → torta de género (sumando rangos)
  const demoGenero = Object.values(
    demografia.reduce((acc, d) => {
      const k = d.genero;
      acc[k] = { name: k, value: (acc[k]?.value ?? 0) + Number(d.total) };
      return acc;
    }, {}),
  );

  // Demografía → barras por rango de edad
  const demoEdad = Object.values(
    demografia.reduce((acc, d) => {
      const k = d.rango_edad;
      acc[k] = { rango: k, total: (acc[k]?.total ?? 0) + Number(d.total) };
      return acc;
    }, {}),
  ).sort((a, b) => {
    const orden = ['0-12','13-17','18-29','30-44','45-59','60+','Sin dato'];
    return orden.indexOf(a.rango) - orden.indexOf(b.rango);
  });

  // Top médicos → barras horizontales
  const topMedicosFmt = topMedicos.map(m => ({
    medico: `Dr(a). ${m.medico?.split(' ').slice(0, 2).join(' ')}`,
    consultas: Number(m.mes ?? 0),
    especialidad: m.especialidad,
  }));

  return (
    <div className="space-y-6">
      <ErrorBanner msg={error} onRetry={() => reload()} />

      {/* Filtros */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white rounded-xl shadow-md p-4 border border-gray-100">
        <FiltroPeriodo value={periodo} onChange={handlePeriodoChange} />
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefrescar}
            disabled={refrescando}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
            title="Recalcular KPIs del día actual"
          >
            {refrescando
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />}
            Recalcular hoy
          </button>
        </div>
      </div>

      {/* ─── KPI Cards (10 indicadores) ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KpiCardPro label="Pacientes atendidos"
          value={actual.pacientes_atendidos}     previous={anterior.pacientes_atendidos}
          icon={Users}      color="blue" />
        <KpiCardPro label="Pacientes nuevos"
          value={actual.pacientes_nuevos}        previous={anterior.pacientes_nuevos}
          icon={UserPlus}   color="emerald" />
        <KpiCardPro label="Citas realizadas"
          value={actual.citas_realizadas}        previous={anterior.citas_realizadas}
          icon={Calendar}   color="blue" />
        <KpiCardPro label="Citas canceladas"
          value={actual.citas_canceladas}        previous={anterior.citas_canceladas}
          icon={XCircle}    color="red" />
        <KpiCardPro label="Horarios ocupados"
          value={dashboard?.horarios_ocupados}
          icon={Clock}      color="orange" hideComparison />

        <KpiCardPro label="Ingresos"             format="moneda"
          value={actual.ingresos_total}          previous={anterior.ingresos_total}
          icon={DollarSign} color="emerald" />
        <KpiCardPro label="Por cobrar"           format="moneda"
          value={actual.ingresos_pendientes}
          icon={AlertCircle} color="amber" hideComparison />
        <KpiCardPro label="Inventario crítico"
          value={dashboard?.inventario_criticos}
          icon={Package}    color="red" hideComparison />
        <KpiCardPro label="Usuarios activos"
          value={dashboard?.usuarios_activos}
          icon={UserCheck}  color="blue" hideComparison />
        <KpiCardPro label="Alertas activas"
          value={dashboard?.alertas_activas}
          icon={Bell}       color="red" hideComparison />
      </div>

      {/* ─── Gráficos principales ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Serie diaria de citas e ingresos */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">Actividad diaria</h3>
              <p className="text-xs text-gray-500">Citas, cancelaciones e ingresos por día</p>
            </div>
            <TrendingUp size={18} className="text-blue-600" />
          </div>
          <LineChartPro
            data={serieFmt}
            xKey="label"
            height={300}
            lines={[
              { key: 'citas',            color: PALETTE.blue,    label: 'Citas' },
              { key: 'canceladas',       color: PALETTE.red,     label: 'Canceladas' },
              { key: 'pacientes_nuevos', color: PALETTE.emerald, label: 'Pacientes nuevos' },
            ]}
            formatY={fmtNumber}
          />
        </div>

        {/* Distribución por género */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-1">Pacientes por género</h3>
          <p className="text-xs text-gray-500 mb-4">Total registrados</p>
          {demoGenero.length === 0
            ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
            : <PieChartPro data={demoGenero} height={260} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Ingresos diarios área */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-1">Ingresos por día</h3>
          <p className="text-xs text-gray-500 mb-4">Facturado en el período seleccionado</p>
          <AreaChartPro
            data={serieFmt}
            xKey="label"
            height={260}
            areas={[
              { key: 'ingresos', color: PALETTE.emerald, label: 'Ingresos' },
            ]}
            formatY={fmtMoney}
            formatTooltip={(v) => fmtMoney(v)}
            showLegend={false}
          />
        </div>

        {/* Pacientes por rango de edad */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-1">Pacientes por edad</h3>
          <p className="text-xs text-gray-500 mb-4">Distribución demográfica</p>
          {demoEdad.length === 0
            ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
            : (
              <BarChartPro
                data={demoEdad}
                xKey="rango"
                height={260}
                bars={[{ key: 'total', color: PALETTE.indigo, label: 'Pacientes' }]}
                formatY={fmtNumber}
                showLegend={false}
              />
            )}
        </div>
      </div>

      {/* ─── Horas pico ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">Horas pico</h3>
            <p className="text-xs text-gray-500">Distribución de citas por franja horaria — últimos 30 días</p>
          </div>
          <Clock size={18} className="text-orange-600" />
        </div>
        {horasPico.length === 0
          ? <p className="text-sm text-gray-400 py-8 text-center">Sin citas registradas en el período</p>
          : <HeatmapHora data={horasPico} color={PALETTE.amber} />}
      </div>

      {/* ─── Top médicos + inventario crítico ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">Top médicos del mes</h3>
              <p className="text-xs text-gray-500">Por número de consultas</p>
            </div>
            <Stethoscope size={18} className="text-purple-600" />
          </div>
          {topMedicosFmt.length === 0
            ? <p className="text-sm text-gray-400 py-8 text-center">Sin consultas registradas</p>
            : (
              <BarChartPro
                data={topMedicosFmt}
                xKey="medico"
                bars={[{ key: 'consultas', color: PALETTE.purple, label: 'Consultas' }]}
                layout="vertical"
                height={260}
                showLegend={false}
                formatY={fmtNumber}
              />
            )}
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">Inventario crítico</h3>
              <p className="text-xs text-gray-500">Medicamentos con stock bajo, crítico o agotado</p>
            </div>
            <Package size={18} className="text-red-600" />
          </div>
          {invCritico.length === 0
            ? <p className="text-sm text-emerald-600 py-8 text-center">✓ Sin medicamentos críticos</p>
            : (
              <div className="space-y-2">
                {invCritico.map(m => (
                  <ItemInventario key={m.id_medicamento} item={m} />
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function ItemInventario({ item }) {
  const color = {
    agotado: 'bg-red-100 text-red-800 border-red-300',
    critico: 'bg-orange-100 text-orange-800 border-orange-300',
    bajo:    'bg-amber-100 text-amber-800 border-amber-300',
    ok:      'bg-emerald-100 text-emerald-800 border-emerald-300',
  }[item.estado_stock] ?? 'bg-gray-100 text-gray-700 border-gray-200';

  const label = {
    agotado: 'AGOTADO',
    critico: 'Crítico',
    bajo:    'Bajo',
    ok:      'OK',
  }[item.estado_stock];

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="min-w-0">
        <p className="font-semibold text-gray-900 truncate">{item.nombre}</p>
        <p className="text-xs text-gray-500 truncate">
          {item.categoria ?? '—'}{item.presentacion && ` · ${item.presentacion}`}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <p className="text-2xl font-bold font-mono text-gray-900">{item.stock}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${color}`}>{label}</span>
      </div>
    </div>
  );
}
