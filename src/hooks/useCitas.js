import { useEffect, useCallback, useState } from 'react';
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

  const marcarNoAsistio = useCallback(async (id) => {
    await citaService.marcarNoAsistio(id);
    await res.reload({ silencioso: true });
  }, [res]);

  return { ...res, citas: res.data, softDelete, marcarEnCurso, marcarNoAsistio };
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

/**
 * Carga los slots de fn_slots_disponibles cuando hay médico + fecha. Se
 * recalcula al cambiar el tipo de consulta (cambia la duración).
 */
export function useSlotsCita(idMedico, fecha, idTipoConsulta, excluirCita = null) {
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!idMedico || !fecha) { setSlots([]); return; }
    let cancelado = false;
    setLoading(true);
    setError('');
    citaService.getSlotsDisponibles(
      Number(idMedico), fecha,
      idTipoConsulta ? Number(idTipoConsulta) : null,
      excluirCita,
    )
      .then(s => { if (!cancelado) setSlots(s); })
      .catch(err => { if (!cancelado) { setSlots([]); setError(err.message); } })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [idMedico, fecha, idTipoConsulta, excluirCita]);

  return { slots, loading, error };
}
