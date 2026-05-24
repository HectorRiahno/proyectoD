import { useEffect, useCallback } from 'react';
import { citaService } from '../services';
import { useAsyncResource } from './useAsyncResource';

/**
 * Citas del rol indicado. Para 'admin' usa vw_admin_citas (todas las citas).
 * Para 'medico' usa vw_medico_mis_citas. Para 'cliente' usa vw_paciente_mis_citas.
 * Soporta refresco realtime + recarga al recuperar foco de la pestaña.
 *
 *   const { citas, loading, error, reload, softDelete } = useCitas({ role: 'admin', realtime: true });
 */
export function useCitas({ role = 'admin', realtime = false } = {}) {
  const fetcher =
    role === 'medico'  ? () => citaService.getMisCitasMedico() :
    role === 'cliente' ? () => citaService.getMisCitasPaciente() :
                         () => citaService.getAll();

  const res = useAsyncResource(fetcher, [role], { initialData: [] });

  // Realtime + visibility — opcional. Idéntico al patrón que tenían
  // Citas.jsx (admin) y MisCitas.jsx (médico).
  useEffect(() => {
    if (!realtime) return;
    const channel = citaService.subscribeRealtime(() => res.reload({ silencioso: true }));
    const onVisible = () => {
      if (document.visibilityState === 'visible') res.reload({ silencioso: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      channel.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [realtime, res]);

  const softDelete = useCallback(async (id) => {
    await citaService.softDelete(id);
    await res.reload({ silencioso: true });
  }, [res]);

  const marcarEnCurso = useCallback(async (id) => {
    await citaService.marcarEnCurso(id);
    await res.reload({ silencioso: true });
  }, [res]);

  return { ...res, citas: res.data, softDelete, marcarEnCurso };
}

/** Agenda del día del médico autenticado (vw_medico_agenda_hoy). */
export function useAgendaHoyMedico(soloEstados) {
  const deps = soloEstados ? [soloEstados.join('|')] : [];
  const res = useAsyncResource(
    () => citaService.getAgendaHoyMedico(soloEstados),
    deps,
    { initialData: [] },
  );
  return { ...res, citas: res.data };
}
