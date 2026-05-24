import React, { useState } from 'react';
import { Receipt, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { useReporteFinanciero } from '../../../../hooks';
import {
  KpiCardPro, FiltroFechas, rangoUltimos30, ErrorBanner, LoadingState,
  ExportButton,
} from '../../../../shared/components/ui';
import { AreaChartPro, PieChartPro, PALETTE } from '../../../../shared/components/charts';
import {
  exportarReporteFinancieroPdf, exportarReporteFinancieroExcel,
  reportesService, fmtMoney, fmtNumber,
} from '../../../../services';

const rango0 = rangoUltimos30();
const fmtFechaCorta = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

export default function ReporteFinanciero() {
  const [desde, setDesde] = useState(rango0.desde);
  const [hasta, setHasta] = useState(rango0.hasta);
  const { data, loading, error, reload } = useReporteFinanciero(desde, hasta);

  const serie = (data?.serie_ingresos ?? []).map(d => ({
    label: fmtFechaCorta(d.dia), ingresos: Number(d.ingresos ?? 0),
  }));

  const metodos = (data?.por_metodo_pago ?? []).map(m => ({
    name: m.metodo_pago, value: Number(m.monto ?? 0),
  }));

  const onPdf = async () => {
    if (!data) return;
    exportarReporteFinancieroPdf(data);
    await reportesService.registrarDescarga('financiero', 'pdf', desde, hasta);
  };
  const onExcel = async () => {
    if (!data) return;
    await exportarReporteFinancieroExcel(data);
    await reportesService.registrarDescarga('financiero', 'excel', desde, hasta);
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
            <KpiCardPro label="Emitidas" value={data?.totales?.emitidas}
              icon={Receipt} color="blue" hideComparison />
            <KpiCardPro label="Pagadas" value={data?.totales?.pagadas}
              icon={DollarSign} color="emerald" hideComparison />
            <KpiCardPro label="Pendientes" value={data?.totales?.pendientes}
              icon={AlertCircle} color="amber" hideComparison />
            <KpiCardPro label="Anuladas" value={data?.totales?.anuladas}
              icon={AlertCircle} color="red" hideComparison />

            <KpiCardPro label="Ingresos cobrados" value={data?.totales?.ingresos_pagados}
              format="moneda" icon={TrendingUp} color="emerald" hideComparison />
            <KpiCardPro label="Por cobrar (total)" value={data?.totales?.por_cobrar}
              format="moneda" icon={AlertCircle} color="amber" hideComparison />
            <KpiCardPro label="Facturado período" value={data?.totales?.ingresos_facturados}
              format="moneda" icon={DollarSign} color="blue" hideComparison />
            <KpiCardPro label="Ticket promedio" value={data?.totales?.ticket_promedio}
              format="moneda" icon={Receipt} color="purple" hideComparison />
          </div>

          {/* Ingresos por día (área) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Ingresos por día</h3>
              <p className="text-xs text-gray-500 mb-4">Facturado en el período seleccionado</p>
              {serie.length === 0
                ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
                : <AreaChartPro data={serie} xKey="label" height={280}
                    areas={[{ key: 'ingresos', color: PALETTE.emerald, label: 'Ingresos' }]}
                    formatY={fmtMoney} formatTooltip={fmtMoney} showLegend={false} />}
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Métodos de pago</h3>
              <p className="text-xs text-gray-500 mb-4">Distribución del cobrado</p>
              {metodos.length === 0
                ? <p className="text-sm text-gray-400 py-12 text-center">Sin pagos en el período</p>
                : <PieChartPro data={metodos} height={280}
                    formatTooltip={(v) => fmtMoney(v)} />}
            </div>
          </div>

          {/* Servicios top */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">Servicios más vendidos</h3>
            <TablaServicios items={data?.servicios_top ?? []} />
          </div>

          {/* Cartera vencida */}
          {(data?.cartera_vencida?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Cartera vencida</h3>
              <p className="text-xs text-gray-500 mb-3">
                Facturas con más de 30 días sin pago — {data.cartera_vencida.length} pendientes.
              </p>
              <TablaCartera items={data.cartera_vencida} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TablaServicios({ items }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Servicio</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Veces</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Unidades</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Ingreso</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((s, i) => (
            <tr key={i} className="hover:bg-emerald-50 transition">
              <td className="px-3 py-2 capitalize">{s.servicio}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtNumber(s.veces_vendido)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtNumber(s.unidades)}</td>
              <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700">{fmtMoney(s.ingreso_generado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaCartera({ items }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600"># Factura</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Paciente</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Médico</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Emisión</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Mora</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(c => (
            <tr key={c.id_factura} className="hover:bg-red-50 transition">
              <td className="px-3 py-2 font-mono text-xs text-blue-700">{c.numero_factura ?? '—'}</td>
              <td className="px-3 py-2 font-semibold text-gray-900">{c.paciente_nombre ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-gray-600">{c.medico_nombre ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-gray-600">{c.fecha_emision?.slice(0, 10)}</td>
              <td className="px-3 py-2 text-right font-mono">{fmtMoney(c.total)}</td>
              <td className="px-3 py-2 text-right">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                  c.dias_mora > 90 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {fmtNumber(c.dias_mora)} días
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
