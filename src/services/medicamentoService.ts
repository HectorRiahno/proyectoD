import { supabase } from '../lib/supabase';

// Tabla: medicamento (id_medicamento, id_categoria, nombre, nombre_generico, presentacion, ...)
// Para LECTURA del catálogo se usa la tabla directa (no requiere JOINs especiales).
// Para "medicamentos de un paciente" se usa la vista vw_paciente_mis_medicamentos
// (que en realidad lee de orden_medica → consulta_medica).
const TABLE = 'medicamento';

export interface Medicamento {
  id_medicamento?: number;
  id_categoria?: number;
  nombre?: string;
  nombre_generico?: string;
  presentacion?: string;
  concentracion?: string;
  via_administracion?: string;
  stock?: number;
  precio?: number;
  activo?: boolean;
  [key: string]: unknown;
}

export const medicamentoService = {
  async getAll(): Promise<Medicamento[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Medicamento[];
  },

  async getById(id: number | string): Promise<Medicamento> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id_medicamento', id)
      .single();
    if (error) throw error;
    return data as Medicamento;
  },

  /**
   * Devuelve los medicamentos recetados a un paciente (vía orden_medica).
   */
  async getByPaciente(pacienteId: number): Promise<Medicamento[]> {
    const { data, error } = await supabase
      .from('orden_medica')
      .select(`
        id_orden,
        dosis,
        frecuencia,
        duracion,
        indicaciones,
        fecha_emision,
        medicamento:id_medicamento ( * ),
        consulta_medica!inner ( id_paciente )
      `)
      .eq('consulta_medica.id_paciente', pacienteId);
    if (error) throw error;
    return (data ?? []) as unknown as Medicamento[];
  },

  /**
   * Medicamentos del PACIENTE autenticado (vista filtrada por auth.email()).
   */
  async getMisMedicamentos(): Promise<Medicamento[]> {
    const { data, error } = await supabase
      .from('vw_paciente_mis_medicamentos')
      .select('*');
    if (error) throw error;
    return (data ?? []) as Medicamento[];
  },

  async search(nombre: string): Promise<Medicamento[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .ilike('nombre', `%${nombre}%`);
    if (error) throw error;
    return (data ?? []) as Medicamento[];
  },

  async create(medicamento: Partial<Medicamento>): Promise<Medicamento[]> {
    const { data, error } = await supabase.from(TABLE).insert(medicamento).select();
    if (error) throw error;
    return (data ?? []) as Medicamento[];
  },

  async update(id: number | string, updates: Partial<Medicamento>): Promise<Medicamento[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id_medicamento', id)
      .select();
    if (error) throw error;
    return (data ?? []) as Medicamento[];
  },

  async remove(id: number | string): Promise<boolean> {
    const { error } = await supabase.from(TABLE).delete().eq('id_medicamento', id);
    if (error) throw error;
    return true;
  },
};

export default medicamentoService;
