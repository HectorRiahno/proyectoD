import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Estadísticas + counts para los dashboards de admin, médico y cliente.

export interface EstadisticasAdmin {
  total_pacientes?: number;
  total_medicos?: number;
  total_citas?: number;
  citas_hoy?: number;
  citas_proximas?: number;
  [key: string]: unknown;
}

export const dashboardService = {
  // ─── Admin ───────────────────────────────────────────────────────────────
  async getEstadisticasAdmin(): Promise<EstadisticasAdmin | null> {
    const { data, error } = await supabase
      .from('vw_admin_estadisticas').select('*').maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? null) as EstadisticasAdmin | null;
  },

  /** Counts simples (Configuración → estado de la BD). */
  async getCountsCore() {
    const [{ count: cPacientes }, { count: cMedicos }, { count: cCitas }] = await Promise.all([
      supabase.from('paciente').select('*', { count: 'exact', head: true }),
      supabase.from('medico').select('*', { count: 'exact', head: true }),
      supabase.from('cita').select('*', { count: 'exact', head: true }),
    ]);
    return {
      pacientes: cPacientes ?? 0,
      medicos:   cMedicos ?? 0,
      citas:     cCitas ?? 0,
    };
  },

  // ─── Médico ──────────────────────────────────────────────────────────────
  async getCountsMedico() {
    const [{ count: pacientes }, { count: consultas }] = await Promise.all([
      supabase.from('vw_medico_mis_pacientes').select('*', { count: 'exact', head: true }),
      supabase.from('vw_medico_consultas').select('*', { count: 'exact', head: true }),
    ]);
    return {
      pacientes: pacientes ?? 0,
      consultas: consultas ?? 0,
    };
  },

  // ─── Cliente ─────────────────────────────────────────────────────────────
  async getMiPerfilCliente() {
    const { data, error } = await supabase
      .from('vw_paciente_mi_perfil').select('*').maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return data;
  },

  async getProximasCitasCliente(limite = 3) {
    const { data, error } = await supabase
      .from('vw_paciente_proximas_citas').select('*').limit(limite);
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getMisMedicamentosCliente(limite?: number) {
    let q = supabase.from('vw_paciente_mis_medicamentos').select('*');
    if (limite) q = q.limit(limite);
    const { data, error } = await q;
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getUltimoSignoCliente() {
    const { data, error } = await supabase
      .from('vw_paciente_mis_signos').select('*').limit(1).maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return data;
  },

  /**
   * Counts de las secciones de Documentos / ClientDashboard del paciente.
   */
  async getCountsCliente() {
    const [
      { count: citas },
      { count: consultas },
      { count: diagnosticos },
      { count: medicamentos },
      { count: signos },
    ] = await Promise.all([
      supabase.from('vw_paciente_mis_citas').select('*', { count: 'exact', head: true }),
      supabase.from('vw_paciente_mi_historial').select('*', { count: 'exact', head: true }),
      supabase.from('vw_paciente_mis_diagnosticos').select('*', { count: 'exact', head: true }),
      supabase.from('vw_paciente_mis_medicamentos').select('*', { count: 'exact', head: true }),
      supabase.from('vw_paciente_mis_signos').select('*', { count: 'exact', head: true }),
    ]);
    return {
      citas:        citas ?? 0,
      consultas:    consultas ?? 0,
      diagnosticos: diagnosticos ?? 0,
      medicamentos: medicamentos ?? 0,
      signos:       signos ?? 0,
    };
  },
};

export default dashboardService;
