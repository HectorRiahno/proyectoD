import { supabase } from '../lib/supabase';

// Tabla: paciente (id_paciente, id_persona, numero_historia, ...)
// Vista: vw_admin_pacientes (persona + edad + total_citas)
// Vistas paciente autenticado: vw_paciente_mi_perfil, vw_paciente_*
const TABLE = 'paciente';
const VIEW  = 'vw_admin_pacientes';

export interface Paciente {
  id_paciente?: number;
  id_persona?: number;
  numero_historia?: string;
  tipo_sangre?: string;
  alergias?: string;
  enfermedades_cronicas?: string;
  contacto_emergencia?: string;
  telefono_emergencia?: string;
  ocupacion?: string;
  estado_civil?: string;
  documento?: string;
  tipo_documento?: string;
  nombres?: string;
  apellidos?: string;
  nombre_completo?: string;
  fecha_nacimiento?: string;
  edad?: number;
  genero?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  total_citas?: number;
  ultima_visita?: string;
  [key: string]: unknown;
}

export interface CrearPacientePayload {
  documento: string;
  tipo_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento?: string;
  genero?: string;
  telefono?: string;
  direccion?: string;
  email?: string;
  numero_historia?: string;
  tipo_sangre?: string;
  alergias?: string;
  enfermedades_cronicas?: string;
  contacto_emergencia?: string;
  telefono_emergencia?: string;
  ocupacion?: string;
  estado_civil?: string;
}

export interface EditarPacientePayload {
  // persona
  nombres: string;
  apellidos: string;
  fecha_nacimiento?: string;
  genero?: string;
  telefono?: string;
  direccion?: string;
  // paciente
  contacto_emergencia?: string;
  telefono_emergencia?: string;
  ocupacion?: string;
  estado_civil?: string;
  // historial
  tipo_sangre?: string;
  alergias?: string;
  enfermedades_cronicas?: string;
}

// Error con código original de Postgres (42501 = sin permisos, 23505 = duplicado, ...)
export class ServiceError extends Error {
  code?: string;
  details?: string;
  constructor(message: string, code?: string, details?: string) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const norm = (v?: string | null) => (v && v.trim()) || null;
const normEmail = (v?: string | null) => (v && v.trim().toLowerCase()) || null;

export const pacienteService = {
  async getAll(): Promise<Paciente[]> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('*')
      .order('nombre_completo', { ascending: true });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Paciente[];
  },

  async getById(id: number | string): Promise<Paciente> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('id_paciente', id).single();
    if (error) throw new ServiceError(error.message, error.code);
    return data as Paciente;
  },

  async getByDocumento(documento: string): Promise<Paciente | null> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('documento', documento).maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? null) as Paciente | null;
  },

  /**
   * Datos completos del paciente con persona + historial clínico embebidos.
   * Usado por AtenderCita y Consultas (médico) para ver toda la ficha.
   */
  async getDatosCompletos(id: number | string) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        id_paciente, numero_historia,
        contacto_emergencia, telefono_emergencia, ocupacion, estado_civil, created_at,
        persona:persona!inner(
          id_persona, documento, tipo_documento, nombres, apellidos,
          fecha_nacimiento, genero, telefono, email, direccion
        ),
        historial:historial_clinico(
          tipo_sangre, alergias, enfermedades_cronicas,
          antecedentes_familiares, antecedentes_quirurgicos,
          medicamentos_permanentes, habitos, notas_generales
        )
      `)
      .eq('id_paciente', id)
      .maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return data;
  },

  /**
   * Antecedentes resumidos (vw_admin_pacientes) — útil al seleccionar paciente
   * en el formulario de consulta libre.
   */
  async getAntecedentes(id: number | string) {
    const { data, error } = await supabase
      .from(VIEW)
      .select('tipo_sangre, alergias, enfermedades_cronicas, ocupacion, estado_civil, nombre_completo, fecha_nacimiento, edad')
      .eq('id_paciente', id)
      .maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return data;
  },

  /**
   * Catálogo simple (id + nombre + documento) para selects de formularios.
   */
  async getCatalogo(): Promise<Array<{ id_paciente: number; nombre_completo: string; documento: string }>> {
    const { data, error } = await supabase
      .from(VIEW)
      .select('id_paciente, nombre_completo, documento')
      .order('nombre_completo');
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Array<{ id_paciente: number; nombre_completo: string; documento: string }>;
  },

  async search(nombre: string): Promise<Paciente[]> {
    const { data, error } = await supabase
      .from(VIEW).select('*').ilike('nombre_completo', `%${nombre}%`);
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Paciente[];
  },

  /**
   * Crea un paciente completo: persona (o reutiliza por email) + paciente +
   * historial clínico opcional. Hace rollback si falla el insert de paciente.
   */
  async createCompleto(payload: CrearPacientePayload): Promise<number> {
    // 1. Buscar persona por email
    let id_persona: number | null = null;
    let personaCreada = false;

    if (payload.email) {
      const { data: existe } = await supabase
        .from('persona')
        .select('id_persona')
        .eq('email', normEmail(payload.email))
        .maybeSingle();
      if (existe?.id_persona) {
        id_persona = existe.id_persona as number;
        await supabase.from('persona').update({
          documento: norm(payload.documento),
          nombres:   norm(payload.nombres),
          apellidos: norm(payload.apellidos),
          fecha_nacimiento: payload.fecha_nacimiento || null,
          genero:    norm(payload.genero),
          telefono:  norm(payload.telefono),
          direccion: norm(payload.direccion),
        }).eq('id_persona', id_persona);
      }
    }

    // 2. Crear persona nueva si no existe
    if (!id_persona) {
      const r = await supabase.from('persona').insert({
        documento:       norm(payload.documento),
        tipo_documento:  payload.tipo_documento,
        nombres:         norm(payload.nombres),
        apellidos:       norm(payload.apellidos),
        fecha_nacimiento: payload.fecha_nacimiento || null,
        genero:          norm(payload.genero),
        telefono:        norm(payload.telefono),
        direccion:       norm(payload.direccion),
        email:           normEmail(payload.email),
      }).select('id_persona');

      if (r.error) {
        const { code, details } = r.error;
        if (code === '23505') {
          const campo = details?.includes('email') ? 'email' : 'documento';
          throw new ServiceError(`Ya existe una persona con ese ${campo}.`, code, details);
        }
        if (code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql.', code);
        throw new ServiceError(r.error.message, code, details);
      }
      id_persona = (r.data?.[0]?.id_persona as number) ?? null;
      if (!id_persona) throw new ServiceError('No se obtuvo id_persona.');
      personaCreada = true;
    }

    // 3. Verificar que la persona no tenga ya paciente
    const { data: pEx } = await supabase.from('paciente')
      .select('id_paciente').eq('id_persona', id_persona).maybeSingle();
    if (pEx) throw new ServiceError('Esta persona ya tiene un perfil de paciente.');

    // 4. Crear paciente
    const historia = norm(payload.numero_historia) ?? `HC-${Date.now()}`;
    const rPac = await supabase.from('paciente').insert({
      id_persona,
      numero_historia:      historia,
      contacto_emergencia:  norm(payload.contacto_emergencia),
      telefono_emergencia:  norm(payload.telefono_emergencia),
      ocupacion:            norm(payload.ocupacion),
      estado_civil:         norm(payload.estado_civil),
    }).select('id_paciente').single();

    if (rPac.error) {
      // Rollback de persona si la creamos en este flujo
      if (personaCreada) {
        await supabase.from('persona').delete().eq('id_persona', id_persona);
      }
      if (rPac.error.code === '42501') {
        throw new ServiceError('Sin permisos para insertar paciente. Ejecuta rls-admin.sql.', rPac.error.code);
      }
      throw new ServiceError(rPac.error.message, rPac.error.code);
    }

    const id_paciente = rPac.data?.id_paciente as number;

    // 5. Historial clínico opcional
    const tieneHist = payload.tipo_sangre || payload.alergias || payload.enfermedades_cronicas;
    if (tieneHist && id_paciente) {
      const { error: eHist } = await supabase.rpc('upsert_historial_clinico', {
        p_id_paciente:           id_paciente,
        p_tipo_sangre:           norm(payload.tipo_sangre),
        p_alergias:              norm(payload.alergias),
        p_enfermedades_cronicas: norm(payload.enfermedades_cronicas),
      });
      // No se aborta — el paciente quedó creado.
      if (eHist) console.warn('[pacienteService.createCompleto] historial:', eHist.message);
    }

    return id_paciente;
  },

  /**
   * Actualiza persona + paciente + historial clínico. Devuelve true si todo OK.
   * Lanza ServiceError con código de Postgres en caso de fallo.
   */
  async updateCompleto(p: { id_persona: number; id_paciente: number }, payload: EditarPacientePayload): Promise<void> {
    // 1. persona
    const r1 = await supabase.from('persona').update({
      nombres:          norm(payload.nombres),
      apellidos:        norm(payload.apellidos),
      fecha_nacimiento: payload.fecha_nacimiento || null,
      genero:           norm(payload.genero),
      telefono:         norm(payload.telefono),
      direccion:        norm(payload.direccion),
    }).eq('id_persona', p.id_persona);
    if (r1.error) {
      if (r1.error.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql.', r1.error.code);
      throw new ServiceError(r1.error.message, r1.error.code);
    }

    // 2. paciente
    const r2 = await supabase.from('paciente').update({
      contacto_emergencia:  norm(payload.contacto_emergencia),
      telefono_emergencia:  norm(payload.telefono_emergencia),
      ocupacion:            norm(payload.ocupacion),
      estado_civil:         norm(payload.estado_civil),
    }).eq('id_paciente', p.id_paciente);
    if (r2.error) {
      if (r2.error.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-admin.sql.', r2.error.code);
      throw new ServiceError(r2.error.message, r2.error.code);
    }

    // 3. historial clínico
    const { error: eHist } = await supabase.rpc('upsert_historial_clinico', {
      p_id_paciente:           p.id_paciente,
      p_tipo_sangre:           norm(payload.tipo_sangre),
      p_alergias:              norm(payload.alergias),
      p_enfermedades_cronicas: norm(payload.enfermedades_cronicas),
    });
    if (eHist) {
      if (eHist.code === '42501') {
        throw new ServiceError('Sin permisos sobre historial_clinico. Ejecuta supabase/migration-historial-clinico.sql.', eHist.code);
      }
      throw new ServiceError(`Datos guardados, pero falló el historial: ${eHist.message}`, eHist.code);
    }
  },

  /**
   * Soft-delete (RPC) — marca deleted_at. Se restaura desde la Papelera.
   */
  async softDelete(id: number | string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_paciente', { p_id: id });
    if (error) {
      if (error.code === '42501') {
        throw new ServiceError('Sin permisos. Ejecuta supabase/migration-soft-delete.sql.', error.code);
      }
      throw new ServiceError(error.message, error.code);
    }
  },

  /**
   * Devuelve el perfil del paciente AUTENTICADO (vista filtrada).
   */
  async getMiPerfil(): Promise<Paciente | null> {
    const { data, error } = await supabase
      .from('vw_paciente_mi_perfil').select('*').maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? null) as Paciente | null;
  },

  // ─── Métodos genéricos retrocompatibles ───────────────────────────────────
  async create(paciente: Partial<Paciente>): Promise<Paciente[]> {
    const { data, error } = await supabase.from(TABLE).insert(paciente).select();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Paciente[];
  },

  async update(id: number | string, updates: Partial<Paciente>): Promise<Paciente[]> {
    const { data, error } = await supabase
      .from(TABLE).update(updates).eq('id_paciente', id).select();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Paciente[];
  },

  async remove(id: number | string): Promise<boolean> {
    const { error } = await supabase.from(TABLE).delete().eq('id_paciente', id);
    if (error) throw new ServiceError(error.message, error.code);
    return true;
  },
};

export default pacienteService;
