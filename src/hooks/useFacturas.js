import { useEffect, useCallback, useMemo } from 'react';
import { facturaService } from '../services';
import { useAsyncResource } from './useAsyncResource';

/**
 * Facturas del admin con filtros server-side (estado, fechaDesde, fechaHasta).
 * Suscripción realtime opcional.
 */
export function useFacturas({ estado = 'todas', fechaDesde, fechaHasta, realtime = false } = {}) {
  const opts = useMemo(() => ({ estado, fechaDesde, fechaHasta }), [estado, fechaDesde, fechaHasta]);

  const res = useAsyncResource(
    () => facturaService.listar(opts),
    [opts.estado, opts.fechaDesde, opts.fechaHasta],
    { initialData: [] },
  );

  useEffect(() => {
    if (!realtime) return;
    const channel = facturaService.subscribeRealtime(() => res.reload({ silencioso: true }));
    return () => { channel.unsubscribe(); };
  }, [realtime, res]);

  const softDelete = useCallback(async (id) => {
    await facturaService.softDelete(id);
    await res.reload({ silencioso: true });
  }, [res]);

  return { ...res, facturas: res.data, softDelete };
}

/** Facturas del paciente autenticado (vw_paciente_mis_facturas). */
export function useMisFacturas() {
  const res = useAsyncResource(
    () => facturaService.getMisFacturas(),
    [],
    { initialData: [] },
  );
  return { ...res, facturas: res.data };
}
