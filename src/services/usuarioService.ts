import { supabase } from '../lib/supabase';

// Tabla: usuario (id_usuario, username, id_persona, activo, ...)
// Vista para LECTURA: vw_admin_usuarios (incluye persona + rol via asignacion_rol)
const TABLE = 'usuario';
const VIEW  = 'vw_admin_usuarios';

export interface Usuario {
  id_usuario?: number;
  auth_user_id?: string;     // UUID de auth.users
  username?: string;
  id_persona?: number;
  activo?: boolean;
  ultimo_acceso?: string;
  created_at?: string;
  // Campos provenientes de la vista (persona + rol)
  documento?: string;
  nombres?: string;
  apellidos?: string;
  nombre_completo?: string;
  email?: string;
  telefono?: string;
  id_rol?: number;
  rol_nombre?: string;
  [key: string]: unknown;
}

export const usuarioService = {
  async getAll(): Promise<Usuario[]> {
    const { data, error } = await supabase.from(VIEW).select('*');
    if (error) throw error;
    return (data ?? []) as Usuario[];
  },

  async getById(id: number | string): Promise<Usuario> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .eq('id_usuario', id)
      .single();
    if (error) throw error;
    return data as Usuario;
  },

  /**
   * Busca un usuario por su UUID de auth.users (vínculo con Supabase Auth).
   * Es el método principal después del login.
   */
  async getByAuthUserId(authUserId: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Usuario | null;
  },

  /**
   * Devuelve el usuario con su rol — la vista ya hace el JOIN.
   * Acepta tanto BIGINT (id_usuario) como UUID (auth_user_id).
   */
  async getByIdWithRol(id: number | string): Promise<Usuario | null> {
    // Si parece UUID, buscar por auth_user_id
    if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id)) {
      return this.getByAuthUserId(id);
    }
    return this.getById(id);
  },

  /**
   * Busca por email (de la tabla persona, expuesto en la vista).
   */
  async getByEmail(email: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Usuario | null;
  },

  /**
   * Busca por username (auth) — útil para login flow.
   */
  async getByUsername(username: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .eq('username', username)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Usuario | null;
  },

  async create(usuario: Partial<Usuario>): Promise<Usuario[]> {
    const { data, error } = await supabase.from(TABLE).insert(usuario).select();
    if (error) throw error;
    return (data ?? []) as Usuario[];
  },

  async update(id: number | string, updates: Partial<Usuario>): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id_usuario', id)
      .select();
    if (error) throw error;
    return (data ?? []) as Usuario[];
  },

  async remove(id: number | string): Promise<boolean> {
    const { error } = await supabase.from(TABLE).delete().eq('id_usuario', id);
    if (error) throw error;
    return true;
  },
};

export default usuarioService;
