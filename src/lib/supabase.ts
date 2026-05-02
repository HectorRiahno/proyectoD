import { createClient } from '@supabase/supabase-js';

// Tipos para los helpers
type TableName = string;
type IdType = number | string;
type RowData = Record<string, unknown> | unknown[];
type UpdateData = Record<string, unknown>;

// Variables de entorno requeridas:
// VITE_SUPABASE_URL=tu_url_de_supabase
// VITE_SUPABASE_PUBLISHABLE_KEY=tu_clave_publishable

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Error: Faltan variables de entorno de Supabase');
  console.error('Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en tu archivo .env');
}

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// Funciones helper para operaciones comunes
export const supabaseHelpers = {
  // Obtener todos los registros de una tabla
  async getAll(table: TableName): Promise<unknown[]> {
    const { data, error } = await supabase
      .from(table)
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  // Obtener un registro por ID
  async getById(table: TableName, id: IdType): Promise<unknown> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Insertar un registro
  async insert(table: TableName, row: RowData | RowData[]): Promise<unknown[]> {
    const { data, error } = await supabase
      .from(table)
      .insert(row)
      .select();
    
    if (error) throw error;
    return data || [];
  },

  // Actualizar un registro
  async update(table: TableName, id: IdType, updates: UpdateData): Promise<unknown[]> {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data || [];
  },

  // Eliminar un registro
  async remove(table: TableName, id: IdType): Promise<boolean> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Buscar registros con filtro
  async search(table: TableName, field: string, value: string): Promise<unknown[]> {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .ilike(field, `%${value}%`);
    
    if (error) throw error;
    return data || [];
  }
};

export default supabase;