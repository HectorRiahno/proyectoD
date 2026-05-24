import { dashboardService, citaService } from '../services';
import { useParallelResources } from './useAsyncResource';

/**
 * KPIs + próximas citas para la home del admin.
 */
export function useDashboardAdmin(limiteCitas = 5) {
  const res = useParallelResources({
    stats: () => dashboardService.getEstadisticasAdmin(),
    citas: () => citaService.getProximasResumen(limiteCitas),
  }, [limiteCitas]);

  return {
    ...res,
    stats:         res.data?.stats ?? null,
    proximasCitas: res.data?.citas ?? [],
  };
}

/**
 * Dashboard del médico — agenda de hoy + próximas + counts.
 */
export function useDashboardMedico() {
  const res = useParallelResources({
    agenda:   () => citaService.getAgendaHoyMedicoResumen(['confirmada', 'programada']),
    proximas: () => citaService.getProximasCitasMedico(5),
    counts:   () => dashboardService.getCountsMedico(),
  }, []);

  // Orden: confirmadas primero, luego programadas; cada grupo por hora.
  const agenda = [...(res.data?.agenda ?? [])].sort((a, b) => {
    const peso = { confirmada: 0, programada: 1 };
    const pa = peso[a.estado] ?? 9;
    const pb = peso[b.estado] ?? 9;
    if (pa !== pb) return pa - pb;
    return (a.hora ?? '').localeCompare(b.hora ?? '');
  });

  return {
    ...res,
    agenda,
    proximas: res.data?.proximas ?? [],
    counts:   res.data?.counts   ?? { pacientes: 0, consultas: 0 },
  };
}

/**
 * Dashboard del cliente — perfil + próximas + medicamentos + último signo + counts.
 */
export function useDashboardCliente() {
  const res = useParallelResources({
    perfil:       () => dashboardService.getMiPerfilCliente(),
    proximas:     () => dashboardService.getProximasCitasCliente(3),
    medicamentos: () => dashboardService.getMisMedicamentosCliente(3),
    ultimoSigno:  () => dashboardService.getUltimoSignoCliente(),
    counts:       () => dashboardService.getCountsCliente(),
  }, []);

  return {
    ...res,
    perfil:       res.data?.perfil ?? null,
    proximas:     res.data?.proximas ?? [],
    medicamentos: res.data?.medicamentos ?? [],
    ultimoSigno:  res.data?.ultimoSigno ?? null,
    counts:       res.data?.counts ?? { citas: 0, consultas: 0, diagnosticos: 0, medicamentos: 0, signos: 0 },
  };
}
