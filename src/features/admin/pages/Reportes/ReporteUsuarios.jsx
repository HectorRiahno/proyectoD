import React from 'react';
import { Users, UserCheck, UserX, Activity } from 'lucide-react';
import { useReporteUsuarios } from '../../../../hooks';
import {
  KpiCardPro, ErrorBanner, LoadingState, ExportButton,
} from '../../../../shared/components/ui';
import { PieChartPro, BarChartPro, PALETTE } from '../../../../shared/components/charts';
import {
  exportarReporteUsuariosPdf, exportarReporteUsuariosExcel,
  reportesService, fmtNumber,
} from '../../../../services';

const hoy = () => new Date().toISOString().slice(0, 10);

export default function ReporteUsuarios() {
  const { data, loading, error, reload } = useReporteUsuarios();

  const porRol = (data?.por_rol ?? []).map(r => ({
    name: r.rol, value: Number(r.total ?? 0),
  }));

  const porRolBar = (data?.por_rol ?? []).map(r => ({
    rol: r.rol,
    total: Number(r.total ?? 0),
    activos: Number(r.activos ?? 0),
  }));

  const onPdf = async () => {
    if (!data) return;
    exportarReporteUsuariosPdf(data);
    await reportesService.registrarDescarga('usuarios', 'pdf', hoy(), hoy());
  };
  const onExcel = async () => {
    if (!data) return;
    await exportarReporteUsuariosExcel(data);
    await reportesService.registrarDescarga('usuarios', 'excel', hoy(), hoy());
  };

  return (
    <div className="space-y-6">
      <ErrorBanner msg={error} onRetry={() => reload()} />

      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Estado actual de cuentas de usuario · Generado: <strong>{hoy()}</strong>
        </p>
        <ExportButton onPdf={onPdf} onExcel={onExcel} disabled={!data || loading} />
      </div>

      {loading && !data ? <LoadingState mensaje="Cargando reporte..." /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCardPro label="Total" value={data?.totales?.total}
              icon={Users} color="blue" hideComparison />
            <KpiCardPro label="Activos" value={data?.totales?.activos}
              icon={UserCheck} color="emerald" hideComparison />
            <KpiCardPro label="Inactivos" value={data?.totales?.inactivos}
              icon={UserX} color="red" hideComparison />
            <KpiCardPro label="Conectados (30d)" value={data?.totales?.conectados_30d}
              icon={Activity} color="emerald" hideComparison />
            <KpiCardPro label="Nunca conectados" value={data?.totales?.nunca_conectados}
              icon={UserX} color="amber" hideComparison />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Distribución por rol</h3>
              <p className="text-xs text-gray-500 mb-4">Total de cuentas</p>
              {porRol.length === 0
                ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
                : <PieChartPro data={porRol} height={280} />}
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Total vs activos por rol</h3>
              <p className="text-xs text-gray-500 mb-4">Identifica roles con cuentas desactivadas</p>
              {porRolBar.length === 0
                ? <p className="text-sm text-gray-400 py-12 text-center">Sin datos</p>
                : <BarChartPro data={porRolBar} xKey="rol"
                    bars={[
                      { key: 'total',   color: PALETTE.slate,   label: 'Total' },
                      { key: 'activos', color: PALETTE.emerald, label: 'Activos' },
                    ]}
                    height={280} formatY={fmtNumber} />}
            </div>
          </div>

          {/* Últimos accesos */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-3">Últimos accesos</h3>
            <TablaUltimosAccesos items={data?.ultimos_accesos ?? []} />
          </div>

          {/* Sin conectar */}
          {(data?.sin_conectar_30d?.length ?? 0) > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-1">Usuarios sin conectar en 30+ días</h3>
              <p className="text-xs text-gray-500 mb-3">
                Cuentas activas pero inactivas. Mostrando {data.sin_conectar_30d.length}.
              </p>
              <TablaSinConectar items={data.sin_conectar_30d} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TablaUltimosAccesos({ items }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Sin datos</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Usuario</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Email</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Rol</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-600">Estado</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Último acceso</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(u => (
            <tr key={u.id_usuario} className="hover:bg-blue-50 transition">
              <td className="px-3 py-2 font-semibold text-gray-900">{u.nombre_completo}</td>
              <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-[200px]">{u.email ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-purple-600">{u.rol_nombre ?? '—'}</td>
              <td className="px-3 py-2 text-center">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-gray-600">
                {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-CO') : 'Nunca'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaSinConectar({ items }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Usuario</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Email</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Rol</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Último acceso</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map(u => (
            <tr key={u.id_usuario} className="hover:bg-amber-50 transition">
              <td className="px-3 py-2 font-semibold text-gray-900">{u.nombre_completo}</td>
              <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-[200px]">{u.email ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-purple-600">{u.rol_nombre ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-gray-600">
                {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-CO') : 'Nunca'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
