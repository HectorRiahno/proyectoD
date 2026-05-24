import React, { useState } from 'react';
import { Users, UserPlus, UserCheck, UserX } from 'lucide-react';
import { useReportePacientes } from '../../../../hooks';
import {
  KpiCardPro, FiltroFechas, rangoUltimos30, ErrorBanner, LoadingState,
  ExportButton,
} from '../../../../shared/components/ui';
import {
  PieChartPro, BarChartPro, LineChartPro, PALETTE,
} from '../../../../shared/components/charts';
import {
  exportarReportePacientesPdf, exportarReportePacientesExcel,
  reportesService, fmtNumber,
} from '../../../../services';

const rango0 = rangoUltimos30();
const fmtFechaCorta = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

export default function ReportePacientes() {
  const [desde, setDesde] = useState(rango0.desde);
  const [hasta, setHasta] = useState(rango0.hasta);
  const { data, loading, error, reload } = useReportePacientes(desde, hasta);

  // Demografía → torta de género (sumando rangos por género)
  const demoGenero = data ? Object.values(
    (data.demografia ?? []).reduce((acc, d) => {
      acc[d.genero] = { name: d.genero, value: (acc[d.genero]?.value ?? 0) + Number(d.total) };
      return acc;
    }, {})
  ) : [];

  const demoEdad = data ? Object.values(
    (data.demografia ?? []).reduce((acc, d) => {
      acc[d.rango_edad] = { rango: d.rango_edad, total: (acc[d.rango_edad]?.total ?? 0) + Number(d.total) };
      return acc;
    }, {})
  ).sort((a, b) => {
    const orden = ['0-12','13-17','18-29','30-44','45-59','60+','Sin dato'];
    return orden.indexOf(a.rango) - orden.indexOf(b.rango);
  }) : [];

  const nuevosPorDia = (data?.nuevos_por_dia ?? []).map(d => ({
    label: fmtFechaCorta(d.dia), nuevos: d.nuevos,
  }));

  const onPdf = async () => {
    if (!data) return;
    exportarReportePacientesPdf(data);
    await reportesService.registrarDescarga('pacientes', 'pdf', desde, hasta);
  };
  const onExcel = async () => {
    if (!data) return;
    await exportarReportePacientesExcel(data);
    await reportesService.registrarDescarga('pacientes', 'excel', desde, hasta);
  };

  return (
    <div className="space-y-6">
      <ErrorBanner msg={error} onRetry={() => reload()} />

      {/* Filtros + exportar */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex items-end justify-between flex-wrap gap-3">
        <FiltroFechas desde={desde} hasta={hasta}
          onChange={(d, h) => { setDesde(d); setHasta(h); }} />
        <ExportButton onPdf={onPdf} onExcel={onExcel} disabled={!data || loading} />
      </div>

      {loading && !data ? <LoadingState mensaje="Cargando reporte..." /> : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCardPro label="Total registrados" value={data?.totales?.registrados}
              icon={Users} color="blue" hideComparison />
            <KpiCardPro label="Nuevos en período" value={data?.totales?.nuevos}
              icon={UserPlus} color="emerald" hideComparison />
            <KpiCardPro label="Atendidos" value={data?.totales?.atendidos}
              icon={UserCheck} color="purple" hideComparison />
            <KpiCardPro label="Inactivos (>12m)" value={data?.totales?.inactivos_12m}
              icon={UserX} color="red" hideComparison />
          </div>

          {/* Gráficos demografía */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Pacientes por género</h3>
              <p className="text-xs text-gray-500 mb-4">Distribución total registrados</p>
              {demoGenero.length === 0
                ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
                : <PieChartPro data={demoGenero} height={260} />}
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Pacientes por rango de edad</h3>
              <p className="text-xs text-gray-500 mb-4">Distribución demográfica</p>
              {demoEdad.length === 0
                ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
                : <BarChartPro data={demoEdad} xKey="rango"
                    bars={[{ key: 'total', color: PALETTE.indigo, label: 'Pacientes' }]}
                    height={260} showLegend={false} formatY={fmtNumber} />}
            </div>
          </div>

          {/* Pacientes nuevos en el tiempo */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-1">Pacientes nuevos por día</h3>
            <p className="text-xs text-gray-500 mb-4">Evolución del registro en el período</p>
            {nuevosPorDia.length === 0
              ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
              : <LineChartPro data={nuevosPorDia} xKey="label" height={240}
                  lines={[{ key: 'nuevos', color: PALETTE.emerald, label: 'Pacientes nuevos' }]}
                  formatY={fmtNumber} showLegend={false} />}
          </div>

          {/* Diagnósticos frecuentes */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900">Diagnósticos más frecuentes</h3>
                <p className="text-xs text-gray-500">Top 10 — últimos 6 meses</p>
              </div>
            </div>
            <TablaDiagnosticos items={data?.diagnosticos_top ?? []} />
          </div>

          {/* Pacientes frecuentes */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">Pacientes más frecuentes</h3>
            <TablaFrecuentes items={data?.frecuentes_top ?? []} />
          </div>

          {/* Inactivos */}
          {(data?.inactivos?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Pacientes sin visita (&gt;12 meses)</h3>
              <p className="text-xs text-gray-500 mb-3">
                Considera enviar recordatorio. Mostrando {data.inactivos.length} pacientes.
              </p>
              <TablaInactivos items={data.inactivos} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TablaDiagnosticos({ items }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">CIE-10</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Diagnóstico</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Frecuencia</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Pacientes únicos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((d, i) => (
            <tr key={i} className="hover:bg-blue-50 transition">
              <td className="px-3 py-2 font-mono text-xs text-blue-700">{d.codigo_cie10 ?? '—'}</td>
              <td className="px-3 py-2 capitalize">{d.diagnostico}</td>
              <td className="px-3 py-2 text-right font-mono font-semibold">{fmtNumber(d.frecuencia)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtNumber(d.pacientes_unicos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaFrecuentes({ items }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Paciente</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Documento</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Visitas</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Última visita</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(p => (
            <tr key={p.id_paciente} className="hover:bg-blue-50 transition">
              <td className="px-3 py-2 font-semibold text-gray-900">{p.paciente}</td>
              <td className="px-3 py-2 text-xs font-mono text-gray-500">{p.documento ?? '—'}</td>
              <td className="px-3 py-2 text-right">
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                  {p.visitas}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-gray-600">{p.ultima_visita?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaInactivos({ items }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Paciente</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Documento</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Email</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Teléfono</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Días sin visita</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(p => (
            <tr key={p.id_paciente} className="hover:bg-amber-50 transition">
              <td className="px-3 py-2 font-semibold text-gray-900">{p.nombre_completo}</td>
              <td className="px-3 py-2 text-xs font-mono text-gray-500">{p.documento ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-[200px]">{p.email ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-gray-600">{p.telefono ?? '—'}</td>
              <td className="px-3 py-2 text-right">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                  p.dias_sin_visita > 730 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {fmtNumber(p.dias_sin_visita)} días
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
