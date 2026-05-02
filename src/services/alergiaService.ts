import { supabase, supabaseHelpers } from '../lib/supabase';

const TABLE_NAME = 'alergias';

// Tipo para alergia
export interface Alergia {
  [key: string]: unknown;
}

export const alergiaService = {
  async getAll(): Promise<Alergia[]> {
    return supabaseHelpers.getAll(TABLE_NAME) as Promise<Alergia[]>;
  },

  async getById(id: number | string): Promise<Alergia> {
    return supabaseHelpers.getById(TABLE_NAME, id) as Promise<Alergia>;
  },

  async getByPaciente(pacienteId: number): Promise<Alergia[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('paciente_id', pacienteId);
    
    if (error) throw error;
    return data || [];
  },

  async create(alergia: Alergia): Promise<Alergia[]> {
    return supabaseHelpers.insert(TABLE_NAME, alergia) as Promise<Alergia[]>;
  },

  async update(id: number | string, updates: Partial<Alergia>): Promise<Alergia[]> {
    return supabaseHelpers.update(TABLE_NAME, id, updates) as Promise<Alergia[]>;
  },

  async remove(id: number | string): Promise<boolean> {
    return supabaseHelpers.remove(TABLE_NAME, id);
  }
};

export default alergiaService;