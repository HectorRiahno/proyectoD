import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Tabla: horario_medico (franjas semanales por médico). Usada por Citas para
// determinar qué médicos están disponibles en un slot dado, y por Horarios
// para que el admin defina las franjas.
const TABLE = 'horario_medico';

export interface HorarioMedico {
  id_horario?: number;
  id_medico: number;
  dia_semana: string;     // 'Lunes', 'Martes', ...
  hora_inicio: string;    // HH:MM[:SS]
  hora_fin: string;
  disponible?: boolean;
  [key: string]: unknown;
}

export interface HorarioPayload {
  id_medico: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

export const horarioService = {
  async getAll(): Promise<HorarioMedico[]> {
    const { data, error } = await supabase
      .from(TABLE).select('*').order('id_medico, hora_inicio');
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as HorarioMedico[];
  },

  async getDisponibles(): Promise<HorarioMedico[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id_medico, dia_semana, hora_inicio, hora_fin, disponible')
      .eq('disponible', true);
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as HorarioMedico[];
  },

  async crear(payload: HorarioPayload): Promise<void> {
    const { error } = await supabase.from(TABLE).insert(payload);
    if (error) {
      if (error.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql en Supabase SQL Editor.', error.code);
      if (error.code === '23514') throw new ServiceError('La hora de fin debe ser mayor que la hora de inicio (restricción de BD).', error.code);
      throw new ServiceError(error.message ?? 'Error desconocido', error.code);
    }
  },

  async actualizar(idHorario: number | string, payload: HorarioPayload): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update(payload).eq('id_horario', idHorario);
    if (error) {
      if (error.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql en Supabase SQL Editor.', error.code);
      if (error.code === '23514') throw new ServiceError('La hora de fin debe ser mayor que la hora de inicio (restricción de BD).', error.code);
      throw new ServiceError(error.message ?? 'Error desconocido', error.code);
    }
  },

  async toggleDisponible(idHorario: number | string, disponible: boolean): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update({ disponible }).eq('id_horario', idHorario);
    if (error) {
      if (error.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql primero.', error.code);
      throw new ServiceError(error.message, error.code);
    }
  },

  async eliminar(idHorario: number | string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id_horario', idHorario);
    if (error) {
      if (error.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql primero.', error.code);
      throw new ServiceError(error.message, error.code);
    }
  },

  async getByMedico(idMedico: number | string): Promise<HorarioMedico[]> {
    const { data, error } = await supabase
      .from(TABLE).select('*').eq('id_medico', idMedico).order('hora_inicio');
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as HorarioMedico[];
  },
};

// ─── Tipo de consulta (catálogo) ──────────────────────────────────────────
export const tipoConsultaService = {
  async getAll() {
    const { data, error } = await supabase
      .from('tipo_consulta').select('id_tipo_consulta, nombre').order('nombre');
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },
};

export default horarioService;
