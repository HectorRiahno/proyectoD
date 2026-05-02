import { supabase, supabaseHelpers } from '../lib/supabase';

const TABLE_NAME = 'historial_medico';

// Tipo para historial médico
export interface HistorialMedico {
  [key: string]: unknown;
}

export const historialService = {
  async getAll(): Promise<HistorialMedico[]> {
    return supabaseHelpers.getAll(TABLE_NAME) as Promise<HistorialMedico[]>;
  },

  async getById(id: number | string): Promise<HistorialMedico> {
    return supabaseHelpers.getById(TABLE_NAME, id) as Promise<HistorialMedico>;
  },

  async getByPaciente(pacienteId: number): Promise<HistorialMedico[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('fecha', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(historial: HistorialMedico): Promise<HistorialMedico[]> {
    return supabaseHelpers.insert(TABLE_NAME, historial) as Promise<HistorialMedico[]>;
  },

  async update(id: number | string, updates: Partial<HistorialMedico>): Promise<HistorialMedico[]> {
    return supabaseHelpers.update(TABLE_NAME, id, updates) as Promise<HistorialMedico[]>;
  },

  async remove(id: number | string): Promise<boolean> {
    return supabaseHelpers.remove(TABLE_NAME, id);
  }
};

export default historialService;