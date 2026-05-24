import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Tabla: usuario (login). Vista vw_admin_usuarios incluye persona + rol.
// La asignación de rol vive en `asignacion_rol`. El catálogo de roles en `rol`.
const TABLE = 'usuario';
const VIEW  = 'vw_admin_usuarios';

export interface Usuario {
  id_usuario?: number;
  auth_user_id?: string;
  username?: string;
  id_persona?: number;
  activo?: boolean;
  ultimo_acceso?: string;
  created_at?: string;
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

export interface EditarUsuarioPayload {
  nombres: string;
  apellidos: string;
  telefono?: string;
  documento?: string;
  activo: boolean;
  rol: string;       // ej: 'admin', 'medico', 'asistente', 'cliente'
}

const norm = (v?: string | null) => (v && v.trim()) || null;
const isUuid = (v: unknown) =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v);

export const usuarioService = {
  async getAll(): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from(VIEW).select('*').order('nombre_completo', { ascending: true });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Usuario[];
  },

  async getById(id: number | string): Promise<Usuario> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('id_usuario', id).single();
    if (error) throw new ServiceError(error.message, error.code);
    return data as Usuario;
  },

  async getByAuthUserId(authUserId: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('auth_user_id', authUserId).maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? null) as Usuario | null;
  },

  async getByIdWithRol(id: number | string): Promise<Usuario | null> {
    if (isUuid(id)) return this.getByAuthUserId(id as string);
    return this.getById(id);
  },

  async getByEmail(email: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('email', email).maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? null) as Usuario | null;
  },

  async getByUsername(username: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('username', username).maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? null) as Usuario | null;
  },

  /**
   * Activa/desactiva la cuenta de login.
   */
  async setActivo(idUsuario: number | string, activo: boolean): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update({ activo }).eq('id_usuario', idUsuario);
    if (error) {
      if (error.code === '42501') {
        throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql primero.', error.code);
      }
      throw new ServiceError(error.message, error.code);
    }
  },

  /**
   * Elimina asignaciones de rol + usuario. La persona queda como registro
   * histórico. El acceso de login se quita desde Supabase Dashboard → Auth.
   */
  async eliminar(idUsuario: number | string): Promise<void> {
    await supabase.from('asignacion_rol').delete().eq('id_usuario', idUsuario);
    const { error } = await supabase.from(TABLE).delete().eq('id_usuario', idUsuario);
    if (error) {
      if (error.code === '42501') {
        throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql primero.', error.code);
      }
      throw new ServiceError(error.message, error.code);
    }
  },

  /**
   * Edición completa: persona + activo + rol. Auto-provisiona la fila en
   * `paciente`/`medico` si el rol cambia a cliente o medico.
   */
  async editarCompleto(u: Usuario, payload: EditarUsuarioPayload): Promise<void> {
    // 1. persona
    if (u.id_persona) {
      const { error: e1 } = await supabase.from('persona').update({
        nombres:   norm(payload.nombres),
        apellidos: norm(payload.apellidos),
        telefono:  norm(payload.telefono),
        documento: norm(payload.documento),
      }).eq('id_persona', u.id_persona);
      if (e1) {
        if (e1.code === '42501') throw new ServiceError('Sin permisos sobre persona. Ejecuta supabase/rls-admin.sql.', e1.code);
        if (e1.code === '23505') throw new ServiceError('Ya existe una persona con ese documento.', e1.code);
        throw new ServiceError(e1.message, e1.code);
      }
    }

    // 2. activo
    const { error: e2 } = await supabase
      .from(TABLE).update({ activo: payload.activo }).eq('id_usuario', u.id_usuario!);
    if (e2) {
      if (e2.code === '42501') throw new ServiceError('Sin permisos sobre usuario. Ejecuta supabase/rls-admin.sql.', e2.code);
      throw new ServiceError(e2.message, e2.code);
    }

    // 3. cambio de rol
    if (payload.rol !== u.rol_nombre) {
      // 'cliente' acepta 'paciente' como sinónimo histórico
      const candidatos = payload.rol === 'cliente' ? ['cliente', 'paciente'] : [payload.rol];
      const { data: rolData } = await supabase
        .from('rol').select('id_rol, nombre').in('nombre', candidatos).maybeSingle();
      if (!rolData?.id_rol) {
        throw new ServiceError(`Rol "${payload.rol}" no existe en la BD. Ejecuta supabase/migration-rol-cliente.sql.`);
      }

      await supabase.from('asignacion_rol').delete().eq('id_usuario', u.id_usuario!);

      const { error: e3 } = await supabase.from('asignacion_rol').insert({
        id_usuario: u.id_usuario,
        id_rol:     rolData.id_rol,
      });
      if (e3) {
        if (e3.code === '42501') throw new ServiceError('Sin permisos sobre asignacion_rol. Ejecuta supabase/rls-admin.sql.', e3.code);
        throw new ServiceError(e3.message, e3.code);
      }

      // Auto-provisioning de filas hijas
      if (payload.rol === 'cliente' && u.id_persona) {
        const { data: existe } = await supabase
          .from('paciente').select('id_paciente').eq('id_persona', u.id_persona).maybeSingle();
        if (!existe) {
          const { error: ePac } = await supabase.from('paciente').insert({
            id_persona:      u.id_persona,
            numero_historia: `HC-${u.id_persona}-${Date.now().toString(36)}`,
          });
          if (ePac && ePac.code !== '23505') {
            throw new ServiceError(`Rol asignado, pero falló crear el paciente: ${ePac.message}`, ePac.code);
          }
        }
      }

      if (payload.rol === 'medico' && u.id_persona) {
        const { data: existe } = await supabase
          .from('medico').select('id_medico').eq('id_persona', u.id_persona).maybeSingle();
        if (!existe) {
          const { error: eMed } = await supabase.from('medico').insert({
            id_persona:      u.id_persona,
            numero_licencia: `LIC-${Date.now().toString(36)}`,
            activo:          true,
          });
          if (eMed && eMed.code !== '23505') {
            throw new ServiceError(
              `Rol asignado, pero falló crear el médico: ${eMed.message}. Después complétalo desde "Médicos".`,
              eMed.code,
            );
          }
        }
      }
    }
  },

  // ─── Métodos genéricos ────────────────────────────────────────────────────
  async create(usuario: Partial<Usuario>): Promise<Usuario[]> {
    const { data, error } = await supabase.from(TABLE).insert(usuario).select();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Usuario[];
  },

  async update(id: number | string, updates: Partial<Usuario>): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from(TABLE).update(updates).eq('id_usuario', id).select();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Usuario[];
  },

  async remove(id: number | string): Promise<boolean> {
    const { error } = await supabase.from(TABLE).delete().eq('id_usuario', id);
    if (error) throw new ServiceError(error.message, error.code);
    return true;
  },
};

export default usuarioService;
