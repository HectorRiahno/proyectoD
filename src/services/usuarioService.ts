import { supabase, supabaseHelpers } from '../lib/supabase';

// Nombre de la tabla en Supabase
const TABLE_NAME = 'usuarios';

// Tipo para usuario
export interface Usuario {
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
   * Buscar usuario por documento
   */
  async getByDocumento(documento: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('documento', documento)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Buscar usuario por nombre de usuario
   */
  async getByUsuario(usuario: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('usuario', usuario)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Iniciar sesión (validar credenciales)
   */
  async login(usuario: string, contrasena: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('usuario', usuario)
      .eq('contrasena', contrasena)
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Crear nuevo usuario
   */
  async create(usuario: Usuario): Promise<Usuario[]> {
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