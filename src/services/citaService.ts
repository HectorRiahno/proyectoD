import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';
import { hoyLocalISO } from '../shared/utils/fechas';

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
  id_medico: number;
  fecha: string;
  hora: string;
  estado: EstadoCita;
  motivo?: string;
  observaciones?: string;
  motivo_cancelacion?: string;
  id_tipo_consulta?: number | null;
}

export interface SlotCita {
  hora: string;             // HH:MM
  disponible: boolean;
}

export interface MedicoAgendable {
  id_medico: number;
  nombre: string;
  especialidad: string;
  consultorio: string | null;
  dias: string[];           // 'lunes' … 'domingo' (sin tildes)
}

export interface AgendarMiCitaPayload {
  id_medico: number;
  id_tipo_consulta?: number | null;
  fecha: string;            // YYYY-MM-DD
  hora: string;             // HH:MM
  motivo?: string;
}

const norm = (v?: string | null) => (v && v.trim()) || null;

// Traduce errores de las RPCs de agendamiento. Los RAISE EXCEPTION de la
// BD ya traen mensajes en español; aquí sólo se cubren los casos de
// infraestructura (migración sin ejecutar, permisos).
const errorAgendamiento = (error: { message: string; code?: string }) => {
  if (error.code === 'PGRST202') {
    return new ServiceError(
      'Falta ejecutar en Supabase supabase/migration-agendamiento-citas.sql ' +
      '(o migration-autoagendamiento-paciente.sql para el portal del paciente).', error.code);
  }
  if (error.code === '42501' && /permission denied/i.test(error.message)) {
    return new ServiceError('Sin permisos para agendar. Ejecuta supabase/migration-agendamiento-citas.sql.', error.code);
  }
  return new ServiceError(error.message, error.code === '23P01' ? 'CONFLICT' : error.code);
};

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
    const { data, error } = await supabase
      .from(VIEW).select('*')
      .gte('fecha', hoyLocalISO())
      .order('fecha_cita', { ascending: true }).limit(10);
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Cita[];
  },

  /**
   * Próximas citas para el dashboard de admin: filtradas por fecha >= hoy,
   * solo columnas esenciales.
   */
  async getProximasResumen(limite = 5): Promise<Cita[]> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('id_cita, fecha, hora, estado, paciente_nombre, medico_nombre, medico_especialidad')
      .gte('fecha', hoyLocalISO())
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
    const { data, error } = await supabase
      .from('vw_medico_mis_citas')
      .select('id_cita, fecha, hora, estado, paciente_nombre, motivo, tipo_consulta')
      .gt('fecha', hoyLocalISO())
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

  // ─── Disponibilidad y agendamiento (RPCs de migration-agendamiento-citas.sql) ──
  /**
   * Slots de 15 min del médico en la fecha, ya calculados en BD según la
   * duración del tipo de consulta. `disponible=false` si está ocupado o en
   * el pasado. `excluirCita` permite reprogramar una cita sin chocar consigo
   * misma.
   */
  async getSlotsDisponibles(
    idMedico: number, fecha: string,
    idTipoConsulta?: number | null, excluirCita?: number | null,
  ): Promise<SlotCita[]> {
    const { data, error } = await supabase.rpc('fn_slots_disponibles', {
      p_id_medico:        idMedico,
      p_fecha:            fecha,
      p_id_tipo_consulta: idTipoConsulta ?? null,
      p_excluir_cita:     excluirCita ?? null,
    });
    if (error) throw errorAgendamiento(error);
    return ((data ?? []) as SlotCita[]).map(s => ({ ...s, hora: s.hora.slice(0, 5) }));
  },

  /**
   * Crea una cita vía fn_agendar_cita: la BD valida horario del médico,
   * fecha futura y solapes (de médico y paciente). Devuelve el id creado.
   */
  async crear(payload: CrearCitaPayload): Promise<number> {
    const { data, error } = await supabase.rpc('fn_agendar_cita', {
      p_id_paciente:      Number(payload.id_paciente),
      p_id_medico:        Number(payload.id_medico),
      p_fecha:            payload.fecha,
      p_hora:             payload.hora,
      p_id_tipo_consulta: payload.id_tipo_consulta ? Number(payload.id_tipo_consulta) : null,
      p_estado:           payload.estado,
      p_motivo:           norm(payload.motivo),
      p_observaciones:    norm(payload.observaciones),
    });
    if (error) throw errorAgendamiento(error);
    return data as number;
  },

  // ─── Autoagendamiento del paciente (migration-autoagendamiento-paciente.sql) ──
  /** Médicos activos con horario configurado: lo que el paciente puede elegir. */
  async getMedicosAgendables(): Promise<MedicoAgendable[]> {
    const { data, error } = await supabase.rpc('fn_medicos_agendables');
    if (error) throw errorAgendamiento(error);
    return (data ?? []) as MedicoAgendable[];
  },

  /**
   * El paciente autenticado aparta una cita para sí mismo. La BD valida
   * horario del médico, solapes y los límites del autoagendamiento.
   */
  async agendarMiCita(payload: AgendarMiCitaPayload): Promise<number> {
    const { data, error } = await supabase.rpc('fn_agendar_mi_cita', {
      p_id_medico:        Number(payload.id_medico),
      p_fecha:            payload.fecha,
      p_hora:             payload.hora,
      p_id_tipo_consulta: payload.id_tipo_consulta ? Number(payload.id_tipo_consulta) : null,
      p_motivo:           norm(payload.motivo),
    });
    if (error) throw errorAgendamiento(error);
    return data as number;
  },

  /**
   * Reprograma y/o cambia estado vía fn_editar_cita (valida transiciones,
   * slot y motivo de cancelación).
   */
  async editar(idCita: number | string, payload: EditarCitaPayload): Promise<void> {
    const { error } = await supabase.rpc('fn_editar_cita', {
      p_id_cita:            Number(idCita),
      p_id_medico:          Number(payload.id_medico),
      p_fecha:              payload.fecha,
      p_hora:               payload.hora,
      p_id_tipo_consulta:   payload.id_tipo_consulta ? Number(payload.id_tipo_consulta) : null,
      p_estado:             payload.estado,
      p_motivo:             norm(payload.motivo),
      p_observaciones:      norm(payload.observaciones),
      p_motivo_cancelacion: norm(payload.motivo_cancelacion),
    });
    if (error) throw errorAgendamiento(error);
  },

  /** Admin/asistente o el médico de la cita; sólo si la hora ya llegó. */
  async marcarNoAsistio(idCita: number | string): Promise<void> {
    const { error } = await supabase.rpc('fn_marcar_no_asistio', { p_id_cita: Number(idCita) });
    if (error) throw errorAgendamiento(error);
  },

  async cancelar(idCita: number | string, motivo: string): Promise<void> {
    const { error } = await supabase.rpc('fn_cancelar_cita', {
      p_id_cita: Number(idCita),
      p_motivo:  motivo,
    });
    if (error) throw errorAgendamiento(error);
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
