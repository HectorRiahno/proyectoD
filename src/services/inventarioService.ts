import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Catálogo de medicamentos + categorías.
// La página Inventario los maneja como CRUD físico (no soft-delete).
const TABLE = 'medicamento';

export interface MedicamentoInventario {
  id_medicamento?: number;
  id_categoria?: number;
  nombre: string;
  nombre_generico?: string;
  presentacion?: string;
  concentracion?: string;
  via_administracion?: string;
  stock?: number;
  precio?: number;
  activo?: boolean;
  categoria_medicamento?: { nombre: string } | null;
}

export interface CategoriaMedicamento {
  id_categoria: number;
  nombre: string;
  descripcion?: string;
}

export const inventarioService = {
  async getMedicamentos(): Promise<MedicamentoInventario[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, categoria_medicamento(nombre)')
      .order('nombre');
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as MedicamentoInventario[];
  },

  async getCategorias(): Promise<CategoriaMedicamento[]> {
    const { data, error } = await supabase
      .from('categoria_medicamento').select('*').order('nombre');
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as CategoriaMedicamento[];
  },

  async crear(med: Partial<MedicamentoInventario>): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(med);
    if (error) throw new ServiceError(error.message, error.code);
  },

  async actualizar(id: number | string, med: Partial<MedicamentoInventario>): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update(med).eq('id_medicamento', id);
    if (error) throw new ServiceError(error.message, error.code);
  },

  async eliminar(id: number | string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id_medicamento', id);
    if (error) throw new ServiceError(error.message, error.code);
  },
};

export default inventarioService;
