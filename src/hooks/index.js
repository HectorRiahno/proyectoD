// Barrel de hooks customizados — todos los componentes deberían importar desde aquí.

export { useAuth }  from './useAuth';
export { useUser }  from './useUser';

export { useAsyncResource, useParallelResources } from './useAsyncResource';

export {
  usePacientes, usePacientesCatalogo,
  useMisPacientesMedico,
  useMedicos, useMedicosActivos,
  useUsuarios,
} from './usePacientes';

export { useCitas, useAgendaHoyMedico } from './useCitas';
export { useConsultas, useTiposDiagnostico } from './useConsultas';
export { useFacturas, useMisFacturas } from './useFacturas';
export { useInventario, useHorarios } from './useInventario';
export { useAuditoria, usePapelera } from './useAuditoriaPapelera';
export { useDashboardAdmin, useDashboardMedico, useDashboardCliente } from './useDashboards';
export { useAdjuntos, useAdjuntosPacienteMedico, useMisAdjuntos } from './useAdjuntos';
export {
  useDashboardReportes,
  useReportePacientes, useReporteMedicos, useReporteHorarios,
  useReporteFinanciero, useReporteInventario, useReporteAuditoria,
  useReporteUsuarios,
} from './useReportes';
