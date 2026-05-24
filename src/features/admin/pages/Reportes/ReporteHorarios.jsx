import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle, UserX } from 'lucide-react';
import { useReporteHorarios } from '../../../../hooks';
import {
  KpiCardPro, FiltroFechas, rangoUltimos30, ErrorBanner, LoadingState,
  ExportButton,
} from '../../../../shared/components/ui';
import { BarChartPro, LineChartPro, HeatmapHora, PALETTE } from '../../../../shared/components/charts';
import {
  exportarReporteHorariosPdf, exportarReporteHorariosExcel,
  reportesService, fmtNumber,
} from '../../../../services';

const rango0 = rangoUltimos30();
const fmtFechaCorta = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

export default function ReporteHorarios() {
  const [desde, setDesde] = useState(rango0.desde);
  const [hasta, setHasta] = useState(rango0.hasta);
  const { data, loading, error, reload } = useReporteHorarios(desde, hasta);

  const ocupacion = (data?.ocupacion_por_dia ?? []).map(d => ({
    ...d, label: fmtFechaCorta(d.dia),
  }));

  const onPdf = async () => {
    if (!data) return;
    exportarReporteHorariosPdf(data);
    await reportesService.registrarDescarga('horarios', 'pdf', desde, hasta);
  };
  const onExcel = async () => {
    if (!data) return;
    await exportarReporteHorariosExcel(data);
    await reportesService.registrarDescarga('horarios', 'excel', desde, hasta);
  };

  return (
    <div className="space-y-6">
      <ErrorBanner msg={error} onRetry={() => reload()} />

      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex items-end justify-between flex-wrap gap-3">
        <FiltroFechas desde={desde} hasta={hasta}
          onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        <ExportButton onPdf={onPdf} onExcel={onExcel} disabled={!data || loading} />
      </div>

      {loading && !data ? <LoadingState mensaje="Cargando reporte..." /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCardPro label="Horarios ocupados" value={data?.totales?.ocupados}
              icon={Clock} color="blue" hideComparison />
            <KpiCardPro label="Completadas" value={data?.totales?.completadas}
              icon={CheckCircle} color="emerald" hideComparison />
            <KpiCardPro label="Canceladas" value={data?.totales?.canceladas}
              icon={XCircle} color="red" hideComparison />
            <KpiCardPro label="No asistió" value={data?.totales?.no_asistio}
              icon={UserX} color="orange" hideComparison />
          </div>

          {/* Heatmap de horas pico */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">Horas pico</h3>
                <p className="text-xs text-gray-500">Distribución de citas por hora — últimos 30 días</p>
              </div>
            </div>
            {(data?.horas_pico?.length ?? 0) === 0
              ? <p className="text-sm text-gray-400 py-8 text-center">Sin citas registradas</p>
              : <HeatmapHora data={data.horas_pico} color={PALETTE.amber} />}
          </div>

          {/* Por día de semana */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-1">Citas por día de la semana</h3>
            <p className="text-xs text-gray-500 mb-4">Suma del período</p>
            {(data?.por_dia_semana?.length ?? 0) === 0
              ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
              : <BarChartPro data={data.por_dia_semana} xKey="dia"
                  bars={[
                    { key: 'citas',      color: PALETTE.blue, label: 'Citas' },
                    { key: 'canceladas', color: PALETTE.red,  label: 'Canceladas' },
                  ]}
                  height={260} formatY={fmtNumber} />}
          </div>

          {/* Ocupación diaria */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-1">Ocupación diaria</h3>
            <p className="text-xs text-gray-500 mb-4">Citas vs cancelaciones por día</p>
            {ocupacion.length === 0
              ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
              : <LineChartPro data={ocupacion} xKey="label" height={260}
                  lines={[
                    { key: 'citas',      color: PALETTE.blue, label: 'Citas' },
                    { key: 'canceladas', color: PALETTE.red,  label: 'Canceladas' },
                  ]}
                  formatY={fmtNumber} />}
          </div>
        </>
      )}
    </div>
  );
}
