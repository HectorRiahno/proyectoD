import { supabase, supabaseHelpers } from '../lib/supabase';

// Nombre de la tabla en Supabase
const TABLE_NAME = 'usuario';

// Tipo para usuario
export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  id_rol: string | number;
  rol_nombre?: string;
  especialidad?: string;
  [key: string]: unknown;
}

/**
 * Servicio para gestionar usuarios en Supabase
 */
export const usuarioService = {
  /**
   * Obtener todos los usuarios
   */
  async getAll(): Promise<Usuario[]> {
    return supabaseHelpers.getAll(TABLE_NAME) as Promise<Usuario[]>;
  },

  /**
   * Obtener usuario por ID
   */
  async getById(id: number | string): Promise<Usuario> {
    return supabaseHelpers.getById(TABLE_NAME, id) as Promise<Usuario>;
  },

  /**
   * Obtener usuario por ID junto con su rol
   */
  async getByIdWithRol(id: number | string): Promise<Usuario> {
    const { data: usuario, error: usuarioError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (usuarioError) {
      throw usuarioError;
    }

    const { data: rolData, error: rolError } = await supabase
      .from('rol')
      .select('nombre')
      .eq('id', usuario.id_rol)
      .single();

    if (rolError) {
      throw rolError;
    }

    return {
      ...usuario,
      rol_nombre: rolData?.nombre || null,
    } as Usuario;
  },

  /**
   * Buscar usuario por email
   */
  async getByEmail(correo: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('correo', correo)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  },

  /**
   * Crear nuevo usuario (solo metadatos)
   */
  async create(usuario: Omit<Usuario, 'id'>): Promise<Usuario[]> {
    return supabaseHelpers.insert(TABLE_NAME, usuario) as Promise<Usuario[]>;
  },

  /**
   * Actualizar usuario
   */
  async update(id: number | string, updates: Partial<Usuario>): Promise<Usuario[]> {
    return supabaseHelpers.update(TABLE_NAME, id, updates) as Promise<Usuario[]>;
  },

  /**
   * Eliminar usuario
   */
  async remove(id: number | string): Promise<boolean> {
    return supabaseHelpers.remove(TABLE_NAME, id);
  }
};

export default usuarioService;