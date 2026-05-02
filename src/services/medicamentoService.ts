import { supabase, supabaseHelpers } from '../lib/supabase';

const TABLE_NAME = 'medicamentos';

// Tipo para medicamento
export interface Medicamento {
  [key: string]: unknown;
}

export const medicamentoService = {
  async getAll(): Promise<Medicamento[]> {
    return supabaseHelpers.getAll(TABLE_NAME) as Promise<Medicamento[]>;
  },

  async getById(id: number | string): Promise<Medicamento> {
    return supabaseHelpers.getById(TABLE_NAME, id) as Promise<Medicamento>;
  },

  async getByPaciente(pacienteId: number): Promise<Medicamento[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('paciente_id', pacienteId);
    
    if (error) throw error;
    return data || [];
  },

  async search(nombre: string): Promise<Medicamento[]> {
    return supabaseHelpers.search(TABLE_NAME, 'nombre', nombre) as Promise<Medicamento[]>;
  },

  async create(medicamento: Medicamento): Promise<Medicamento[]> {
    return supabaseHelpers.insert(TABLE_NAME, medicamento) as Promise<Medicamento[]>;
  },

  async update(id: number | string, updates: Partial<Medicamento>): Promise<Medicamento[]> {
    return supabaseHelpers.update(TABLE_NAME, id, updates) as Promise<Medicamento[]>;
  },

  async remove(id: number | string): Promise<boolean> {
    return supabaseHelpers.remove(TABLE_NAME, id);
  }
};

export default medicamentoService;