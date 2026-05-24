import React, { useState } from 'react';
import { ShieldCheck, Plus, Edit, Trash2 } from 'lucide-react';
import { useReporteAuditoria } from '../../../../hooks';
import {
  KpiCardPro, FiltroFechas, rangoUltimos30, ErrorBanner, LoadingState,
  ExportButton, Select,
} from '../../../../shared/components/ui';
import { LineChartPro, BarChartPro, PALETTE } from '../../../../shared/components/charts';
import {
  exportarReporteAuditoriaPdf, exportarReporteAuditoriaExcel,
  reportesService, fmtNumber,
} from '../../../../services';

const rango0 = rangoUltimos30();

const TABLAS = [
  '', 'consulta_medica', 'diagnostico', 'sintoma', 'signos_vitales',
  'orden_medica', 'cita', 'asignacion_rol', 'paciente', 'medico', 'persona',
];

const OPS = ['', 'INSERT', 'UPDATE', 'DELETE'];

const fmtFechaCorta = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

export default function ReporteAuditoria() {
  const [desde, setDesde] = useState(rango0.desde);
  const [hasta, setHasta] = useState(rango0.hasta);
  const [tabla, setTabla] = useState('');
  const [op, setOp] = useState('');
  const { data, loading, error, reload } = useReporteAuditoria(
    desde, hasta,
    { tabla: tabla || null, operacion: op || null },
  );

  const porDia = (data?.por_dia ?? []).map(d => ({
    ...d, label: fmtFechaCorta(d.dia),
  }));

  const porTabla = (data?.por_tabla ?? []).slice(0, 10);

  const onPdf = async () => {
    if (!data) return;
    exportarReporteAuditoriaPdf(data);
    await reportesService.registrarDescarga('auditoria', 'pdf', desde, hasta, { tabla, op });
  };
  const onExcel = async () => {
    if (!data) return;
    await exportarReporteAuditoriaExcel(data);
    await reportesService.registrarDescarga('auditoria', 'excel', desde, hasta, { tabla, op });
  };

  return (
    <div className="space-y-6">
      <ErrorBanner msg={error} onRetry={() => reload()} />

      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 space-y-3">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <FiltroFechas desde={desde} hasta={hasta}
            onChange={(d, h) => { setDesde(d); setHasta(h); }} />
          <ExportButton onPdf={onPdf} onExcel={onExcel} disabled={!data || loading} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <Select label="Tabla" value={tabla} onChange={(e) => setTabla(e.target.value)}>
            <option value="">Todas las tablas</option>
            {TABLAS.filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Operación" value={op} onChange={(e) => setOp(e.target.value)}>
            <option value="">Todas las operaciones</option>
            {OPS.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </Select>
        </div>
      </div>

      {loading && !data ? <LoadingState mensaje="Cargando reporte..." /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCardPro label="Total eventos" value={data?.totales?.total}
              icon={ShieldCheck} color="slate" hideComparison />
            <KpiCardPro label="Insertados" value={data?.totales?.insert}
              icon={Plus} color="emerald" hideComparison />
            <KpiCardPro label="Modificados" value={data?.totales?.update}
              icon={Edit} color="blue" hideComparison />
            <KpiCardPro label="Eliminados" value={data?.totales?.delete}
              icon={Trash2} color="red" hideComparison />
          </div>

          {/* Eventos por día */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-1">Eventos por día</h3>
            <p className="text-xs text-gray-500 mb-4">Operaciones registradas en el período</p>
            {porDia.length === 0
              ? <p className="text-sm text-gray-400 py-12 text-center">Sin eventos</p>
              : <LineChartPro data={porDia} xKey="label" height={280}
                  lines={[
                    { key: 'insertados',  color: PALETTE.emerald, label: 'Insertados' },
                    { key: 'modificados', color: PALETTE.blue,    label: 'Modificados' },
                    { key: 'eliminados',  color: PALETTE.red,     label: 'Eliminados' },
                  ]}
                  formatY={fmtNumber} />}
          </div>

          {/* Top tablas */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-1">Eventos por tabla (top 10)</h3>
            <p className="text-xs text-gray-500 mb-4">Las tablas más activas</p>
            {porTabla.length === 0
              ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
              : <BarChartPro data={porTabla} xKey="tabla"
                  bars={[
                    { key: 'insertados',  color: PALETTE.emerald, label: 'Insertados' },
                    { key: 'modificados', color: PALETTE.blue,    label: 'Modificados' },
                    { key: 'eliminados',  color: PALETTE.red,     label: 'Eliminados' },
                  ]}
                  layout="vertical" height={350} formatY={fmtNumber} />}
          </div>

          {/* Top actores */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">Top actores</h3>
            <TablaActores items={data?.por_actor ?? []} />
          </div>
        </>
      )}
    </div>
  );
}

function TablaActores({ items }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Actor</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Rol</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Eventos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((a, i) => (
            <tr key={i} className="hover:bg-slate-50 transition">
              <td className="px-3 py-2 font-semibold text-gray-900">{a.actor}</td>
              <td className="px-3 py-2 text-xs text-purple-600">{a.actor_rol ?? '—'}</td>
              <td className="px-3 py-2 text-right font-mono font-bold">{fmtNumber(a.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
