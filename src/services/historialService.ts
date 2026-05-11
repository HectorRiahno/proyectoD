import { supabase } from '../lib/supabase';

// NOTA: En la BD real no existe `historial_medico`. El historial se compone de:
//   - consulta_medica (visitas + diagnóstico)
//   - diagnostico    (diagnósticos por consulta)
//   - signos_vitales (signos por paciente)
//
// Este servicio expone una API agregada.

const TABLE_CONSULTA = 'consulta_medica';

export interface HistorialMedico {
  id_consulta?: number;
  id_cita?: number;
  id_paciente?: number;
  id_medico?: number;
  fecha_consulta?: string;
  motivo_consulta?: string;
  examen_fisico?: string;
  impresion_diagnostica?: string;
  plan_tratamiento?: string;
  observaciones?: string;
  // Campos extra (de vistas)
  medico_nombre?: string;
  medico_especialidad?: string;
  paciente_nombre?: string;
  paciente_documento?: string;
  [key: string]: unknown;
}

export const historialService = {
  async getAll(): Promise<HistorialMedico[]> {
    const { data, error } = await supabase
      .from(TABLE_CONSULTA)
      .select('*')
      .order('fecha_consulta', { ascending: false });
    if (error) throw error;
    return (data ?? []) as HistorialMedico[];
  },

  async getById(id: number | string): Promise<HistorialMedico> {
    const { data, error } = await supabase
      .from(TABLE_CONSULTA)
      .select('*')
      .eq('id_consulta', id)
      .single();
    if (error) throw error;
    return data as HistorialMedico;
  },

  /**
   * Historial completo (consultas) de un paciente.
   */
  async getByPaciente(pacienteId: number): Promise<HistorialMedico[]> {
    const { data, error } = await supabase
      .from(TABLE_CONSULTA)
      .select('*')
      .eq('id_paciente', pacienteId)
      .order('fecha_consulta', { ascending: false });
    if (error) throw error;
    return (data ?? []) as HistorialMedico[];
  },

  /**
   * Historial del PACIENTE autenticado (vista filtrada).
   */
  async getMiHistorial(): Promise<HistorialMedico[]> {
    const { data, error } = await supabase
      .from('vw_paciente_mi_historial')
      .select('*');
    if (error) throw error;
    return (data ?? []) as HistorialMedico[];
  },

  /**
   * Diagnósticos del PACIENTE autenticado.
   */
  async getMisDiagnosticos(): Promise<HistorialMedico[]> {
    const { data, error } = await supabase
      .from('vw_paciente_mis_diagnosticos')
      .select('*');
    if (error) throw error;
    return (data ?? []) as HistorialMedico[];
  },

  /**
   * Signos vitales del PACIENTE autenticado.
   */
  async getMisSignos(): Promise<HistorialMedico[]> {
    const { data, error } = await supabase
      .from('vw_paciente_mis_signos')
      .select('*');
    if (error) throw error;
    return (data ?? []) as HistorialMedico[];
  },

  /**
   * Consultas realizadas por el MÉDICO autenticado.
   */
  async getConsultasMedico(): Promise<HistorialMedico[]> {
    const { data, error } = await supabase
      .from('vw_medico_consultas')
      .select('*');
    if (error) throw error;
    return (data ?? []) as HistorialMedico[];
  },

  async create(historial: Partial<HistorialMedico>): Promise<HistorialMedico[]> {
    const { data, error } = await supabase.from(TABLE_CONSULTA).insert(historial).select();
    if (error) throw error;
    return (data ?? []) as HistorialMedico[];
  },

  async update(id: number | string, updates: Partial<HistorialMedico>): Promise<HistorialMedico[]> {
    const { data, error } = await supabase
      .from(TABLE_CONSULTA)
      .update(updates)
      .eq('id_consulta', id)
      .select();
    if (error) throw error;
    return (data ?? []) as HistorialMedico[];
  },

  async remove(id: number | string): Promise<boolean> {
    const { error } = await supabase.from(TABLE_CONSULTA).delete().eq('id_consulta', id);
    if (error) throw error;
    return true;
  },
};

export default historialService;
