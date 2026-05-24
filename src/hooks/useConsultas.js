import { useCallback } from 'react';
import { consultaService } from '../services';
import { useAsyncResource } from './useAsyncResource';

/**
 * Consultas del médico autenticado (vw_medico_consultas).
 */
export function useConsultas() {
  const res = useAsyncResource(
    () => consultaService.getMisConsultas(),
    [],
    { initialData: [] },
  );

  const softDelete = useCallback(async (id) => {
    await consultaService.softDelete(id);
    await res.reload({ silencioso: true });
  }, [res]);

  return { ...res, consultas: res.data, softDelete };
}

/** Catálogo de tipos de diagnóstico — para selects. */
export function useTiposDiagnostico() {
  const res = useAsyncResource(
    () => consultaService.getTiposDiagnostico(),
    [],
    { initialData: [] },
  );
  return { ...res, tipos: res.data };
}
