import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Tabla: cita; Vistas por rol: vw_admin_citas, vw_medico_*, vw_paciente_*
const TABLE = 'cita';
const VIEW  = 'vw_admin_citas';

export type EstadoCita =
  | 'programada' | 'confirmada' | 'en_curso'
  | 'completada' | 'cancelada'  | 'no_asistio';

export const ESTADOS_CITA: EstadoCita[] = [
  'programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_asistio',
];

export interface Cita {
  id_cita?: number;
  id_paciente?: number;
  id_medico?: number;
  id_tipo_consulta?: number;
  fecha_cita?: string;
  estado?: EstadoCita;
  motivo?: string;
  observaciones?: string;
  fecha?: string;
  hora?: string;
  paciente_nombre?: string;
  paciente_documento?: string;
  paciente_telefono?: string;
  paciente_email?: string;
  paciente_eliminado?: boolean;
  medico_nombre?: string;
  medico_especialidad?: string;
  medico_consultorio?: string;
  medico_eliminado?: boolean;
  tipo_consulta_nombre?: string;
  numero_historia?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface CrearCitaPayload {
  id_paciente: number;
  id_medico: number;
  id_tipo_consulta?: number | null;
  fecha: string;            // YYYY-MM-DD
  hora: string;             // HH:MM
  estado: EstadoCita;
  motivo?: string;
  observaciones?: string;
}

export interface EditarCitaPayload {
  fecha: string;
  hora: string;
  estado: EstadoCita;
  motivo?: string;
  observaciones?: string;
  id_tipo_consulta?: number | null;
}

const norm = (v?: string | null) => (v && v.trim()) || null;

export const citaService = {
  async getAll(): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(VIEW).select('*').order('fecha_cita', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  async getById(id: number | string): Promise<Cita> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('id_cita', id).single();
    if (error) throw new ServiceError(error.message, error.code);
    return data as Cita;
  },

  async getByPaciente(pacienteId: number): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('id_paciente', pacienteId)
      .order('fecha_cita', { ascending: true });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  async getByDoctor(medicoId: number): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('id_medico', medicoId)
      .order('fecha_cita', { ascending: true });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  async getProximas(): Promise<Cita[]> {
    const hoy = new Date().toISOString();
    const { data, error } = await supabase
      .from(VIEW).select('*')
      .gte('fecha_cita', hoy)
      .order('fecha_cita', { ascending: true }).limit(10);
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  /**
   * Próximas citas para el dashboard de admin: filtradas por fecha >= hoy,
   * solo columnas esenciales.
   */
  async getProximasResumen(limite = 5): Promise<Cita[]> {
    const hoy = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from(VIEW)
      .select('id_cita, fecha, hora, estado, paciente_nombre, medico_nombre, medico_especialidad')
      .gte('fecha', hoy)
      .order('fecha_cita', { ascending: true })
      .limit(limite);
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  // ─── Vistas filtradas por rol (RLS) ──────────────────────────────────────
  async getMisCitasMedico(): Promise<Cita[]> {
    const { data, error } = await supabase
      .from('vw_medico_mis_citas').select('*').order('fecha_cita', { ascending: true });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  async getMisCitasMedicoPorEstado(estados: EstadoCita[]): Promise<Cita[]> {
    const { data, error } = await supabase
      .from('vw_medico_mis_citas')
      .select('id_cita, fecha, hora, paciente_nombre, estado, id_paciente')
      .in('estado', estados)
      .order('fecha', { ascending: true });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  /**
   * Próximas citas del médico (programadas, para días siguientes a hoy).
   */
  async getProximasCitasMedico(limite = 5): Promise<Cita[]> {
    const hoyISO = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('vw_medico_mis_citas')
      .select('id_cita, fecha, hora, estado, paciente_nombre, motivo, tipo_consulta')
      .gt('fecha', hoyISO)
      .eq('estado', 'programada')
      .order('fecha_cita', { ascending: true })
      .limit(limite);
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  async getCitaMedicoExtra(idCita: number | string): Promise<Cita | null> {
    const { data, error } = await supabase
      .from('vw_medico_mis_citas')
      .select('id_cita, fecha, hora, paciente_nombre, estado, id_paciente')
      .eq('id_cita', idCita).maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? null) as Cita | null;
  },

  async getAgendaHoyMedico(soloEstados: EstadoCita[] = []): Promise<Cita[]> {
    let q = supabase.from('vw_medico_agenda_hoy').select('*');
    if (soloEstados.length) q = q.in('estado', soloEstados);
    const { data, error } = await q;
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  /**
   * Versión resumida de la agenda del día para el dashboard (sólo columnas
   * esenciales) — opcionalmente filtrada por estados.
   */
  async getAgendaHoyMedicoResumen(soloEstados: EstadoCita[] = []): Promise<Cita[]> {
    let q = supabase.from('vw_medico_agenda_hoy')
      .select('id_cita, fecha, hora, estado, paciente_nombre, motivo, tipo_consulta');
    if (soloEstados.length) q = q.in('estado', soloEstados);
    const { data, error } = await q;
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  async getMisCitasPaciente(): Promise<Cita[]> {
    const { data, error } = await supabase
      .from('vw_paciente_mis_citas').select('*');
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  async getProximasCitasPaciente(limite?: number): Promise<Cita[]> {
    let q = supabase.from('vw_paciente_proximas_citas').select('*');
    if (limite) q = q.limit(limite);
    const { data, error } = await q;
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  // ─── Validación de disponibilidad ────────────────────────────────────────
  /**
   * Devuelve los id_medico que YA tienen una cita activa en la fecha+hora dadas.
   * Útil para deshabilitar médicos al agendar.
   */
  async getMedicosOcupados(fecha: string, hora: string): Promise<number[]> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('id_medico, hora, estado')
      .eq('fecha', fecha);
    if (error) throw new ServiceError(error.message, error.code);
    return ((data ?? []) as Array<{ id_medico: number; hora: string; estado: string }>)
      .filter(c => (c.hora ?? '').slice(0, 5) === hora && c.estado !== 'cancelada')
      .map(c => c.id_medico);
  },

  /**
   * Verifica si un médico específico tiene conflicto en fecha+hora.
   * Re-consulta justo antes del INSERT para mitigar race conditions.
   */
  async medicoTieneConflicto(idMedico: number, fecha: string, hora: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('id_cita, hora, estado')
      .eq('fecha', fecha)
      .eq('id_medico', idMedico);
    if (error) throw new ServiceError(error.message, error.code);
    return ((data ?? []) as Array<{ hora: string; estado: string }>)
      .some(c => (c.hora ?? '').slice(0, 5) === hora && c.estado !== 'cancelada');
  },

  // ─── Mutaciones ──────────────────────────────────────────────────────────
  /**
   * Crea una cita. Re-verifica el conflicto justo antes del INSERT y lanza
   * ServiceError con código 'CONFLICT' si ya hay otra cita ocupando ese slot.
   */
  async crear(payload: CrearCitaPayload): Promise<void> {
    const choca = await this.medicoTieneConflicto(payload.id_medico, payload.fecha, payload.hora);
    if (choca) {
      throw new ServiceError(
        'Ese médico ya tiene una cita a esa fecha y hora. Elige otro o cambia el horario.',
        'CONFLICT',
      );
    }

    const fecha_cita = `${payload.fecha}T${payload.hora}:00`;
    const { error } = await supabase.from(TABLE).insert({
      id_paciente:      Number(payload.id_paciente),
      id_medico:        Number(payload.id_medico),
      id_tipo_consulta: payload.id_tipo_consulta ? Number(payload.id_tipo_consulta) : null,
      fecha_cita,
      estado:           payload.estado,
      motivo:           norm(payload.motivo),
      observaciones:    norm(payload.observaciones),
    });
    if (error) {
      if (error.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql primero.', error.code);
      if (error.code === '23503') throw new ServiceError('El paciente o médico seleccionado no existe.', error.code);
      throw new ServiceError(error.message, error.code);
    }
  },

  async editar(idCita: number | string, payload: EditarCitaPayload): Promise<void> {
    const fecha_cita = `${payload.fecha}T${payload.hora}:00`;
    const { error } = await supabase.from(TABLE).update({
      fecha_cita,
      estado:           payload.estado,
      motivo:           norm(payload.motivo),
      observaciones:    norm(payload.observaciones),
      id_tipo_consulta: payload.id_tipo_consulta ? Number(payload.id_tipo_consulta) : null,
    }).eq('id_cita', idCita);
    if (error) {
      if (error.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql primero.', error.code);
      throw new ServiceError(error.message, error.code);
    }
  },

  /**
   * Marca la cita como 'en_curso' (cuando el médico la toma) — paso intermedio
   * antes de guardar la consulta y pasar a 'completada'.
   */
  async marcarEnCurso(idCita: number | string): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update({ estado: 'en_curso' }).eq('id_cita', idCita);
    if (error) {
      if (error.code === '42501') {
        throw new ServiceError('Sin permisos para iniciar la cita. Ejecuta supabase/rls-medico.sql.', error.code);
      }
      throw new ServiceError(error.message ?? 'No se pudo iniciar la cita', error.code);
    }
  },

  /**
   * Marca la cita como completada (lo hace el médico tras guardar la consulta).
   */
  async marcarCompletada(idCita: number | string): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update({ estado: 'completada' }).eq('id_cita', idCita);
    if (error) {
      if (error.code === '42501') throw new ServiceError('Sin permisos para finalizar la cita. Ejecuta supabase/rls-medico.sql.', error.code);
      throw new ServiceError(error.message ?? 'No se pudo finalizar la cita', error.code);
    }
  },

  async softDelete(idCita: number | string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_cita', { p_id: idCita });
    if (error) {
      if (error.code === '42501') {
        throw new ServiceError('Sin permisos. Ejecuta supabase/migration-soft-delete.sql.', error.code);
      }
      throw new ServiceError(error.message, error.code);
    }
  },

  /**
   * Cita + paciente + historial embebidos — usado por AtenderCita al abrir.
   */
  async getCitaConPaciente(idCita: number | string) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        id_cita, fecha_cita, estado, motivo, observaciones, id_paciente,
        paciente:paciente!inner(
          id_paciente, numero_historia,
          contacto_emergencia, telefono_emergencia, ocupacion, estado_civil,
          persona:persona!inner(documento, tipo_documento, nombres, apellidos,
            fecha_nacimiento, genero, telefono, email, direccion),
          historial:historial_clinico(tipo_sangre, alergias, enfermedades_cronicas,
            antecedentes_familiares, antecedentes_quirurgicos,
            medicamentos_permanentes, habitos, notas_generales)
        )
      `)
      .eq('id_cita', idCita)
      .single();
    if (error) throw new ServiceError(error.message ?? 'No se encontró la cita', error.code);
    return data;
  },

  /**
   * Suscripción realtime a cambios en la tabla `cita`. Devuelve el canal para
   * que el caller llame removeChannel al desmontar.
   */
  subscribeRealtime(onChange: () => void) {
    const channel = supabase
      .channel('cita-changes-' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cita' }, onChange)
      .subscribe();
    return channel;
  },

  // ─── Métodos genéricos ───────────────────────────────────────────────────
  async create(cita: Partial<Cita>): Promise<Cita[]> {
    const { data, error } = await supabase.from(TABLE).insert(cita).select();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  async update(id: number | string, updates: Partial<Cita>): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(TABLE).update(updates).eq('id_cita', id).select();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  async remove(id: number | string): Promise<boolean> {
    const { error } = await supabase.from(TABLE).delete().eq('id_cita', id);
    if (error) throw new ServiceError(error.message, error.code);
    return true;
  },
};

export default citaService;
