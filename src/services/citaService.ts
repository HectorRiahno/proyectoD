import { supabase, supabaseHelpers } from '../lib/supabase';

const TABLE_NAME = 'citas';

// Tipo para cita
export interface Cita {
  [key: string]: unknown;
}

export const citaService = {
  async getAll(): Promise<Cita[]> {
    return supabaseHelpers.getAll(TABLE_NAME) as Promise<Cita[]>;
  },

  async getById(id: number | string): Promise<Cita> {
    return supabaseHelpers.getById(TABLE_NAME, id) as Promise<Cita>;
  },

  async getByPaciente(pacienteId: number): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getByDoctor(doctorId: number): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('doctor_id', doctorId)
      .order('fecha', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getProximas(): Promise<Cita[]> {
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .gte('fecha', hoy)
      .order('fecha', { ascending: true })
      .limit(10);
    
    if (error) throw error;
    return data || [];
  },

  async create(cita: Cita): Promise<Cita[]> {
    return supabaseHelpers.insert(TABLE_NAME, cita) as Promise<Cita[]>;
  },

  async update(id: number | string, updates: Partial<Cita>): Promise<Cita[]> {
    return supabaseHelpers.update(TABLE_NAME, id, updates) as Promise<Cita[]>;
  },

  async remove(id: number | string): Promise<boolean> {
    return supabaseHelpers.remove(TABLE_NAME, id);
  }
};

export default citaService;