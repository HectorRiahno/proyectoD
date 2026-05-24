import { useCallback, useMemo } from 'react';
import { auditoriaService, papeleraService } from '../services';
import { useAsyncResource } from './useAsyncResource';

/**
 * Log de auditoría con filtros server-side.
 */
export function useAuditoria({ tabla = 'todas', operacion = 'todas', fechaDesde, fechaHasta, limit = 100 } = {}, enabled = true) {
  const opts = useMemo(
    () => ({ tabla, operacion, fechaDesde, fechaHasta, limit }),
    [tabla, operacion, fechaDesde, fechaHasta, limit],
  );

  const res = useAsyncResource(
    () => (enabled ? auditoriaService.listar(opts) : Promise.resolve([])),
    [opts.tabla, opts.operacion, opts.fechaDesde, opts.fechaHasta, opts.limit, enabled],
    { initialData: [] },
  );

  return { ...res, logs: res.data };
}

/**
 * Papelera + resolución de actores (quién borró cada registro).
 */
export function usePapelera({ tabla = 'todas', fechaDesde, fechaHasta } = {}, enabled = true) {
  const opts = useMemo(
    () => ({ tabla, fechaDesde, fechaHasta }),
    [tabla, fechaDesde, fechaHasta],
  );

  const res = useAsyncResource(
    async () => {
      if (!enabled) return { items: [], actores: {} };
      const items = await papeleraService.listar(opts);
      const uuids = items.map(i => i.deleted_by).filter(Boolean);
      const actores = uuids.length > 0 ? await auditoriaService.resolverActores(uuids) : {};
      return { items, actores };
    },
    [opts.tabla, opts.fechaDesde, opts.fechaHasta, enabled],
    { initialData: { items: [], actores: {} } },
  );

  const restaurar = useCallback(async (item) => {
    await papeleraService.restaurar(item.tabla, item.id_registro);
    await res.reload({ silencioso: true });
  }, [res]);

  return {
    ...res,
    items:   res.data?.items ?? [],
    actores: res.data?.actores ?? {},
    restaurar,
  };
}
