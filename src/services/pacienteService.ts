import { supabase, supabaseHelpers } from '../lib/supabase';

const TABLE_NAME = 'pacientes';

// Tipo para paciente
export interface Paciente {
  [key: string]: unknown;
}

export const pacienteService = {
  async getAll(): Promise<Paciente[]> {
    return supabaseHelpers.getAll(TABLE_NAME) as Promise<Paciente[]>;
  },

  async getById(id: number | string): Promise<Paciente> {
    return supabaseHelpers.getById(TABLE_NAME, id) as Promise<Paciente>;
  },

  async getByDocumento(documento: string): Promise<Paciente | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('documento', documento)
      .single();
    
    if (error) throw error;
    return data;
  },

  async search(nombre: string): Promise<Paciente[]> {
    return supabaseHelpers.search(TABLE_NAME, 'nombre', nombre) as Promise<Paciente[]>;
  },

  async create(paciente: Paciente): Promise<Paciente[]> {
    return supabaseHelpers.insert(TABLE_NAME, paciente) as Promise<Paciente[]>;
  },

  async update(id: number | string, updates: Partial<Paciente>): Promise<Paciente[]> {
    return supabaseHelpers.update(TABLE_NAME, id, updates) as Promise<Paciente[]>;
  },

  async remove(id: number | string): Promise<boolean> {
    return supabaseHelpers.remove(TABLE_NAME, id);
  }
};

export default pacienteService;