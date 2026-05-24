import React from 'react';
import { Package, AlertTriangle, AlertCircle, DollarSign } from 'lucide-react';
import { useReporteInventario } from '../../../../hooks';
import {
  KpiCardPro, ErrorBanner, LoadingState, ExportButton,
} from '../../../../shared/components/ui';
import { BarChartPro, PieChartPro, PALETTE } from '../../../../shared/components/charts';
import {
  exportarReporteInventarioPdf, exportarReporteInventarioExcel,
  reportesService, fmtMoney, fmtNumber,
} from '../../../../services';

const hoy = () => new Date().toISOString().slice(0, 10);

export default function ReporteInventario() {
  const { data, loading, error, reload } = useReporteInventario();

  const masUsados = (data?.mas_usados ?? []).map(m => ({
    medicamento: m.nombre, recetas: Number(m.recetas ?? 0),
  }));

  const categorias = (data?.por_categoria ?? []).map(c => ({
    name: c.categoria, value: Number(c.total ?? 0),
  }));

  const onPdf = async () => {
    if (!data) return;
    exportarReporteInventarioPdf(data);
    await reportesService.registrarDescarga('inventario', 'pdf', hoy(), hoy());
  };
  const onExcel = async () => {
    if (!data) return;
    await exportarReporteInventarioExcel(data);
    await reportesService.registrarDescarga('inventario', 'excel', hoy(), hoy());
  };

  return (
    <div className="space-y-6">
      <ErrorBanner msg={error} onRetry={() => reload()} />

      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Estado actual del inventario · Generado: <strong>{hoy()}</strong>
        </p>
        <ExportButton onPdf={onPdf} onExcel={onExcel} disabled={!data || loading} />
      </div>

      {loading && !data ? <LoadingState mensaje="Cargando reporte..." /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCardPro label="Total medicamentos" value={data?.totales?.total_medicamentos}
              icon={Package} color="blue" hideComparison />
            <KpiCardPro label="Agotados" value={data?.totales?.agotados}
              icon={AlertTriangle} color="red" hideComparison />
            <KpiCardPro label="Críticos (≤5)" value={data?.totales?.criticos}
              icon={AlertCircle} color="orange" hideComparison />
            <KpiCardPro label="Bajos (≤10)" value={data?.totales?.bajos}
              icon={AlertCircle} color="amber" hideComparison />
            <KpiCardPro label="Valor inventario" value={data?.totales?.valor_inventario}
              format="moneda" icon={DollarSign} color="emerald" hideComparison />
            <KpiCardPro label="Categorías" value={data?.totales?.categorias}
              icon={Package} color="purple" hideComparison />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Más recetados (últimos 90 días)</h3>
              <p className="text-xs text-gray-500 mb-4">Top 15 medicamentos</p>
              {masUsados.length === 0
                ? <p className="text-sm text-gray-400 py-12 text-center">Sin recetas recientes</p>
                : <BarChartPro data={masUsados} xKey="medicamento"
                    bars={[{ key: 'recetas', color: PALETTE.indigo, label: 'Recetas' }]}
                    layout="vertical" height={400} showLegend={false} formatY={fmtNumber} />}
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Por categoría</h3>
              <p className="text-xs text-gray-500 mb-4">Cantidad de productos</p>
              {categorias.length === 0
                ? <p className="text-sm text-gray-400 py-12 text-center">Sin categorías</p>
                : <PieChartPro data={categorias} height={300} />}
            </div>
          </div>

          {/* Críticos */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900">Medicamentos críticos</h3>
                <p className="text-xs text-gray-500">Stock ≤ 20 unidades</p>
              </div>
            </div>
            <TablaCriticos items={data?.criticos ?? []} />
          </div>
        </>
      )}
    </div>
  );
}

function TablaCriticos({ items }) {
  if (items.length === 0) return (
    <p className="text-sm text-emerald-600 text-center py-6">✓ Sin medicamentos críticos</p>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Medicamento</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Categoría</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Presentación</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Stock</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">Estado</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Precio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(m => {
            const color = {
              agotado: 'bg-red-100 text-red-700',
              critico: 'bg-orange-100 text-orange-700',
              bajo:    'bg-amber-100 text-amber-700',
            }[m.estado_stock] ?? 'bg-gray-100 text-gray-700';
            return (
              <tr key={m.id_medicamento} className="hover:bg-red-50 transition">
                <td className="px-3 py-2 font-semibold text-gray-900">
                  {m.nombre}
                  {m.nombre_generico && (
                    <p className="text-xs text-gray-500">{m.nombre_generico}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-purple-600">{m.categoria ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{m.presentacion ?? '—'}</td>
                <td className="px-3 py-2 text-right font-mono font-bold">{m.stock}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
                    {String(m.estado_stock).toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">{fmtMoney(m.precio ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
