import { useCallback } from 'react';
import { reportesService } from '../services';
import { useAsyncResource } from './useAsyncResource';

/**
 * Carga TODOS los datos del dashboard de reportes de una sola RPC.
 *
 *   const { data, loading, error, reload, regenerarHoy } = useDashboardReportes('mes');
 *
 * data tiene: actual, anterior, serie, horas_pico, demografia, top_medicos, ...
 */
export function useDashboardReportes(periodo = 'mes') {
  const res = useAsyncResource(
    () => reportesService.getDashboardKpis(periodo),
    [periodo],
    { initialData: null },
  );

  // Permite al admin recalcular el snapshot del día sin esperar al cron
  const regenerarHoy = useCallback(async () => {
    await reportesService.regenerarSnapshotHoy();
    await res.reload({ silencioso: true });
  }, [res]);

  return { ...res, dashboard: res.data, regenerarHoy };
}

// ─── Hooks por tipo de reporte ───────────────────────────────────────────────
// Cada uno toma { desde, hasta } (yyyy-mm-dd) y devuelve el reporte tipado.

export function useReportePacientes(desde, hasta) {
  return useAsyncResource(
    () => reportesService.getReportePacientes(desde, hasta),
    [desde, hasta],
    { initialData: null },
  );
}
export function useReporteMedicos(desde, hasta) {
  return useAsyncResource(
    () => reportesService.getReporteMedicos(desde, hasta),
    [desde, hasta],
    { initialData: null },
  );
}
export function useReporteHorarios(desde, hasta) {
  return useAsyncResource(
    () => reportesService.getReporteHorarios(desde, hasta),
    [desde, hasta],
    { initialData: null },
  );
}
export function useReporteFinanciero(desde, hasta) {
  return useAsyncResource(
    () => reportesService.getReporteFinanciero(desde, hasta),
    [desde, hasta],
    { initialData: null },
  );
}
export function useReporteInventario() {
  return useAsyncResource(
    () => reportesService.getReporteInventario(),
    [],
    { initialData: null },
  );
}
export function useReporteAuditoria(desde, hasta, opts = {}) {
  const tabla = opts.tabla ?? null;
  const operacion = opts.operacion ?? null;
  return useAsyncResource(
    () => reportesService.getReporteAuditoria(desde, hasta, { tabla, operacion }),
    [desde, hasta, tabla, operacion],
    { initialData: null },
  );
}
export function useReporteUsuarios() {
  return useAsyncResource(
    () => reportesService.getReporteUsuarios(),
    [],
    { initialData: null },
  );
}
