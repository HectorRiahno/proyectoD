import { supabase } from '../lib/supabase';

// Tabla: cita (id_cita, id_paciente, id_medico, id_tipo_consulta, fecha_cita, estado, motivo, ...)
// Vistas:
//   vw_admin_citas         → todas las citas con paciente+médico
//   vw_medico_mis_citas    → solo las del médico autenticado
//   vw_paciente_mis_citas  → solo las del paciente autenticado
const TABLE = 'cita';
const VIEW  = 'vw_admin_citas';

export interface Cita {
  id_cita?: number;
  id_paciente?: number;
  id_medico?: number;
  id_tipo_consulta?: number;
  fecha_cita?: string;
  estado?: 'programada' | 'confirmada' | 'en_curso' | 'completada' | 'cancelada' | 'no_asistio';
  motivo?: string;
  observaciones?: string;
  // Campos de la vista
  fecha?: string;
  hora?: string;
  paciente_nombre?: string;
  paciente_documento?: string;
  paciente_telefono?: string;
  paciente_email?: string;
  medico_nombre?: string;
  medico_especialidad?: string;
  medico_consultorio?: string;
  tipo_consulta_nombre?: string;
  numero_historia?: string;
  [key: string]: unknown;
}

export const citaService = {
  async getAll(): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .order('fecha_cita', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Cita[];
  },

  async getById(id: number | string): Promise<Cita> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .eq('id_cita', id)
      .single();
    if (error) throw error;
    return data as Cita;
  },

  async getByPaciente(pacienteId: number): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .eq('id_paciente', pacienteId)
      .order('fecha_cita', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Cita[];
  },

  async getByDoctor(medicoId: number): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .eq('id_medico', medicoId)
      .order('fecha_cita', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Cita[];
  },

  async getProximas(): Promise<Cita[]> {
    const hoy = new Date().toISOString();
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .gte('fecha_cita', hoy)
      .order('fecha_cita', { ascending: true })
      .limit(10);
    if (error) throw error;
    return (data ?? []) as Cita[];
  },

  /**
   * Citas del MÉDICO autenticado (vista filtrada).
   */
  async getMisCitasMedico(): Promise<Cita[]> {
    const { data, error } = await supabase
      .from('vw_medico_mis_citas')
      .select('*')
      .order('fecha_cita', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Cita[];
  },

  /**
   * Agenda del día del MÉDICO autenticado.
   */
  async getAgendaHoyMedico(): Promise<Cita[]> {
    const { data, error } = await supabase.from('vw_medico_agenda_hoy').select('*');
    if (error) throw error;
    return (data ?? []) as Cita[];
  },

  /**
   * Citas del PACIENTE autenticado.
   */
  async getMisCitasPaciente(): Promise<Cita[]> {
    const { data, error } = await supabase
      .from('vw_paciente_mis_citas')
      .select('*');
    if (error) throw error;
    return (data ?? []) as Cita[];
  },

  /**
   * Próximas citas del PACIENTE autenticado.
   */
  async getProximasCitasPaciente(): Promise<Cita[]> {
    const { data, error } = await supabase
      .from('vw_paciente_proximas_citas')
      .select('*');
    if (error) throw error;
    return (data ?? []) as Cita[];
  },

  async create(cita: Partial<Cita>): Promise<Cita[]> {
    const { data, error } = await supabase.from(TABLE).insert(cita).select();
    if (error) throw error;
    return (data ?? []) as Cita[];
  },

  async update(id: number | string, updates: Partial<Cita>): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id_cita', id)
      .select();
    if (error) throw error;
    return (data ?? []) as Cita[];
  },

  async remove(id: number | string): Promise<boolean> {
    const { error } = await supabase.from(TABLE).delete().eq('id_cita', id);
    if (error) throw error;
    return true;
  },
};

export default citaService;
