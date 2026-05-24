import React, { useState } from 'react';
import { Stethoscope, Users, Clock, XCircle } from 'lucide-react';
import { useReporteMedicos } from '../../../../hooks';
import {
  KpiCardPro, FiltroFechas, rangoUltimos30, ErrorBanner, LoadingState,
  ExportButton,
} from '../../../../shared/components/ui';
import { BarChartPro, PieChartPro, PALETTE } from '../../../../shared/components/charts';
import {
  exportarReporteMedicosPdf, exportarReporteMedicosExcel,
  reportesService, fmtNumber,
} from '../../../../services';

const rango0 = rangoUltimos30();

export default function ReporteMedicos() {
  const [desde, setDesde] = useState(rango0.desde);
  const [hasta, setHasta] = useState(rango0.hasta);
  const { data, loading, error, reload } = useReporteMedicos(desde, hasta);

  const top10 = (data?.por_medico ?? []).slice(0, 10).map(m => ({
    medico: `Dr(a). ${m.medico?.split(' ').slice(0, 2).join(' ')}`,
    consultas: Number(m.consultas ?? 0),
  }));

  const porEspecialidad = (data?.por_especialidad ?? []).map(e => ({
    name: e.especialidad,
    value: Number(e.consultas ?? 0),
  }));

  const onPdf = async () => {
    if (!data) return;
    exportarReporteMedicosPdf(data);
    await reportesService.registrarDescarga('medicos', 'pdf', desde, hasta);
  };
  const onExcel = async () => {
    if (!data) return;
    await exportarReporteMedicosExcel(data);
    await reportesService.registrarDescarga('medicos', 'excel', desde, hasta);
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
            <KpiCardPro label="Médicos activos" value={data?.totales?.medicos_activos}
              icon={Stethoscope} color="blue" hideComparison />
            <KpiCardPro label="Total consultas" value={data?.totales?.consultas_total}
              icon={Users} color="emerald" hideComparison />
            <KpiCardPro label="Tiempo promedio" value={data?.totales?.tiempo_promedio ?? 0}
              suffix="min" icon={Clock} color="purple" hideComparison />
            <KpiCardPro label="Cancelaciones" value={data?.totales?.cancelaciones}
              icon={XCircle} color="red" hideComparison />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Top 10 médicos del período</h3>
              <p className="text-xs text-gray-500 mb-4">Por número de consultas</p>
              {top10.length === 0
                ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
                : <BarChartPro data={top10} xKey="medico"
                    bars={[{ key: 'consultas', color: PALETTE.purple, label: 'Consultas' }]}
                    layout="vertical" height={320} showLegend={false} formatY={fmtNumber} />}
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Por especialidad</h3>
              <p className="text-xs text-gray-500 mb-4">Distribución de consultas</p>
              {porEspecialidad.length === 0
                ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
                : <PieChartPro data={porEspecialidad} height={300} />}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">Productividad por médico</h3>
            <TablaProductividad items={data?.por_medico ?? []} />
          </div>
        </>
      )}
    </div>
  );
}

function TablaProductividad({ items }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Médico</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Especialidad</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Consultas</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Pacientes únicos</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Canceladas</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Min/cons</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Cons/día</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(m => (
            <tr key={m.id_medico} className="hover:bg-blue-50 transition">
              <td className="px-3 py-2 font-semibold text-gray-900">Dr(a). {m.medico}</td>
              <td className="px-3 py-2 text-xs text-purple-600">{m.especialidad ?? '—'}</td>
              <td className="px-3 py-2 text-right font-mono font-semibold">{fmtNumber(m.consultas)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtNumber(m.pacientes_unicos)}</td>
              <td className="px-3 py-2 text-right text-red-600 font-mono">{fmtNumber(m.canceladas)}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{m.min_promedio ?? '—'}</td>
              <td className="px-3 py-2 text-right font-mono text-xs">{Number(m.consultas_por_dia ?? 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
