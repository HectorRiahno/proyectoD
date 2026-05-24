import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Tabla: medico. Vista vw_admin_medicos incluye persona + counts de citas.
const TABLE = 'medico';
const VIEW  = 'vw_admin_medicos';

export interface Medico {
  id_medico?: number;
  id_persona?: number;
  numero_licencia?: string;
  especialidad?: string;
  consultorio?: string;
  anios_experiencia?: number;
  activo?: boolean;
  documento?: string;
  nombres?: string;
  apellidos?: string;
  nombre_completo?: string;
  email?: string;
  telefono?: string;
  citas_hoy?: number;
  citas_proximas?: number;
  total_citas?: number;
  [key: string]: unknown;
}

export interface CrearMedicoPayload {
  nombres: string;
  apellidos: string;
  documento: string;
  telefono?: string;
  email?: string;
  especialidad: string;
  numero_licencia?: string;
  consultorio?: string;
  anios_experiencia?: number;
}

export interface EditarMedicoPayload {
  nombres: string;
  apellidos: string;
  telefono?: string;
  especialidad?: string;
  numero_licencia?: string;
  consultorio?: string;
  anios_experiencia?: number;
  activo?: boolean;
}

const norm = (v?: string | null) => (v && v.trim()) || null;
const normEmail = (v?: string | null) => (v && v.trim().toLowerCase()) || null;

export const medicoService = {
  async getAll(): Promise<Medico[]> {
    const { data, error } = await supabase
      .from(VIEW).select('*').order('nombre_completo', { ascending: true });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Medico[];
  },

  async getById(id: number | string): Promise<Medico | null> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('id_medico', id).maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? null) as Medico | null;
  },

  /**
   * Catálogo para selects (id + nombre + especialidad, solo activos).
   */
  async getCatalogoActivos() {
    const { data, error } = await supabase
      .from(VIEW)
      .select('id_medico, nombre_completo, especialidad')
      .eq('activo', true)
      .order('nombre_completo');
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async setActivo(idMedico: number | string, activo: boolean): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update({ activo }).eq('id_medico', idMedico);
    if (error) {
      if (error.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql primero.', error.code);
      throw new ServiceError(error.message, error.code);
    }
  },

  async eliminar(idMedico: number | string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id_medico', idMedico);
    if (error) {
      if (error.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql primero.', error.code);
      throw new ServiceError(error.message, error.code);
    }
  },

  /**
   * Crea (o reutiliza por email) la persona + médico.
   */
  async crearCompleto(payload: CrearMedicoPayload): Promise<number> {
    let id_persona: number | null = null;
    let personaCreada = false;

    if (payload.email) {
      const { data: existente } = await supabase
        .from('persona')
        .select('id_persona')
        .eq('email', normEmail(payload.email))
        .maybeSingle();
      if (existente?.id_persona) {
        id_persona = existente.id_persona as number;
        await supabase.from('persona').update({
          documento:  norm(payload.documento),
          nombres:    norm(payload.nombres),
          apellidos:  norm(payload.apellidos),
          telefono:   norm(payload.telefono),
        }).eq('id_persona', id_persona);
      }
    }

    if (!id_persona) {
      const resPersona = await supabase.from('persona').insert({
        documento:      norm(payload.documento),
        tipo_documento: 'CC',
        nombres:        norm(payload.nombres),
        apellidos:      norm(payload.apellidos),
        telefono:       norm(payload.telefono),
        email:          normEmail(payload.email),
      }).select('id_persona');

      if (resPersona.error) {
        const { code, message, details } = resPersona.error;
        if (code === '23505') {
          const campo = details?.includes('email') ? 'email' : 'documento';
          throw new ServiceError(
            `Ya existe una persona con ese ${campo}. Si el médico tiene cuenta en el sistema, ingresa su email para vincularlo automáticamente.`,
            code, details,
          );
        }
        if (code === '42501') {
          throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql en Supabase SQL Editor.', code);
        }
        throw new ServiceError(message ?? 'Error al crear persona', code);
      }
      id_persona = (resPersona.data?.[0]?.id_persona as number) ?? null;
      if (!id_persona) throw new ServiceError('No se obtuvo id_persona tras la inserción.');
      personaCreada = true;
    }

    // Verificar duplicado de médico
    const { data: existe } = await supabase
      .from(TABLE).select('id_medico').eq('id_persona', id_persona).maybeSingle();
    if (existe) throw new ServiceError('Esta persona ya tiene un perfil de médico registrado.');

    const licencia = norm(payload.numero_licencia) ?? `LIC-${Date.now()}`;
    const resMedico = await supabase.from(TABLE).insert({
      id_persona,
      numero_licencia:   licencia,
      especialidad:      payload.especialidad,
      consultorio:       norm(payload.consultorio),
      anios_experiencia: Number(payload.anios_experiencia) || 0,
      activo:            true,
    }).select('id_medico').single();

    if (resMedico.error) {
      if (personaCreada) {
        await supabase.from('persona').delete().eq('id_persona', id_persona);
      }
      const { code, message } = resMedico.error;
      if (code === '23505') throw new ServiceError('Ya existe un médico con ese número de licencia.', code);
      if (code === '42501') {
        throw new ServiceError('Sin permisos para insertar en medico. Ejecuta supabase/rls-admin.sql.', code);
      }
      throw new ServiceError(message ?? 'Error al crear médico', code);
    }

    return resMedico.data?.id_medico as number;
  },

  /**
   * Actualiza persona + médico.
   */
  async editarCompleto(m: { id_persona: number; id_medico: number }, payload: EditarMedicoPayload): Promise<void> {
    const r1 = await supabase
      .from('persona')
      .update({
        nombres:   norm(payload.nombres),
        apellidos: norm(payload.apellidos),
        telefono:  norm(payload.telefono),
      })
      .eq('id_persona', m.id_persona);
    if (r1.error) {
      if (r1.error.code === '42501') {
        throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql en Supabase SQL Editor.', r1.error.code);
      }
      throw new ServiceError(r1.error.message, r1.error.code);
    }

    const r2 = await supabase
      .from(TABLE)
      .update({
        especialidad:      payload.especialidad,
        numero_licencia:   payload.numero_licencia,
        consultorio:       payload.consultorio,
        anios_experiencia: Number(payload.anios_experiencia) || 0,
        activo:            payload.activo,
      })
      .eq('id_medico', m.id_medico);
    if (r2.error) {
      if (r2.error.code === '42501') {
        throw new ServiceError('Sin permisos para actualizar medico. Ejecuta supabase/rls-admin.sql.', r2.error.code);
      }
      throw new ServiceError(r2.error.message, r2.error.code);
    }
  },

  // Pacientes atendidos por el médico autenticado
  async getMisPacientes() {
    const { data, error } = await supabase
      .from('vw_medico_mis_pacientes').select('*');
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },
};

export default medicoService;
