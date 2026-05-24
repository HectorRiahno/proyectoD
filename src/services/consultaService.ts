import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Tablas: consulta_medica, diagnostico, signos_vitales, sintoma, orden_medica
// Catálogos: tipo_diagnostico
// Vistas: vw_medico_consultas, vw_paciente_mi_historial

export interface ConsultaMedica {
  id_consulta?: number;
  id_paciente?: number;
  id_medico?: number;
  id_cita?: number | null;
  fecha_consulta?: string;
  motivo_consulta?: string;
  enfermedad_actual?: string;
  revision_sistemas?: string;
  examen_fisico?: string;
  examenes_complementarios?: string;
  analisis_clinico?: string;
  impresion_diagnostica?: string;
  plan_tratamiento?: string;
  observaciones?: string;
  [key: string]: unknown;
}

export interface SignosVitales {
  id_signos?: number;
  id_paciente?: number;
  id_consulta?: number;
  id_medico?: number;
  presion_sistolica?: number | null;
  presion_diastolica?: number | null;
  frecuencia_cardiaca?: number | null;
  frecuencia_respiratoria?: number | null;
  temperatura?: number | null;
  saturacion_oxigeno?: number | null;
  peso?: number | null;
  talla?: number | null;
  fecha_registro?: string;
}

export interface DiagnosticoPayload {
  id_tipo_diagnostico?: number | string | null;
  codigo_cie10?: string;
  descripcion: string;
  es_principal?: boolean;
  tipo_dx?: string;        // 'impresion' | 'confirmado_nuevo' | 'confirmado_repetido'
  prioridad?: number;
}

export interface ConsultaCompletaPayload {
  consulta: Partial<ConsultaMedica>;
  diagnosticos?: DiagnosticoPayload[];
  signos?: Partial<SignosVitales> | null;
}

const norm = (v?: string | null) => (v && v.trim()) || null;
const numOrNull = (v: unknown) =>
  v === '' || v == null ? null : Number(v);

/**
 * Resuelve el id_medico del usuario autenticado.
 * Intenta primero la RPC `mi_id_medico`; si no devuelve nada, busca por id_persona.
 */
async function resolveIdMedico(idPersona?: number | null): Promise<number | null> {
  const { data: rpcData } = await supabase.rpc('mi_id_medico');
  if (rpcData) return rpcData as number;
  if (!idPersona) return null;
  const { data } = await supabase
    .from('medico').select('id_medico').eq('id_persona', idPersona).maybeSingle();
  return (data?.id_medico as number) ?? null;
}

export const consultaService = {
  /** Id del médico autenticado (helper público). */
  resolveIdMedico,

  /**
   * Lista las consultas del médico autenticado (vw_medico_consultas).
   */
  async getMisConsultas() {
    const { data, error } = await supabase
      .from('vw_medico_consultas').select('*')
      .order('fecha_consulta', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  // ─── Catálogos ───────────────────────────────────────────────────────────
  async getTiposDiagnostico() {
    const { data, error } = await supabase
      .from('tipo_diagnostico')
      .select('id_tipo_diagnostico, nombre')
      .order('nombre');
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  // ─── Consultas del paciente (historia clínica) ───────────────────────────
  async getConsultasPaciente(idPaciente: number) {
    const { data, error } = await supabase
      .from('consulta_medica')
      .select(`
        id_consulta, fecha_consulta, motivo_consulta, enfermedad_actual,
        impresion_diagnostica, plan_tratamiento, observaciones, id_medico,
        medico:medico(persona:persona(nombres, apellidos), especialidad)
      `)
      .eq('id_paciente', idPaciente)
      .order('fecha_consulta', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getConsultasPacienteResumen(idPaciente: number, limite = 5) {
    const { data, error } = await supabase
      .from('consulta_medica')
      .select('id_consulta, fecha_consulta, motivo_consulta, impresion_diagnostica, plan_tratamiento')
      .eq('id_paciente', idPaciente)
      .order('fecha_consulta', { ascending: false })
      .limit(limite);
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getConsultasPacienteFichaMedico(idPaciente: number) {
    const { data, error } = await supabase
      .from('consulta_medica')
      .select('id_consulta, fecha_consulta, motivo_consulta, impresion_diagnostica, plan_tratamiento, observaciones')
      .eq('id_paciente', idPaciente)
      .order('fecha_consulta', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getIdsConsultasPaciente(idPaciente: number): Promise<number[]> {
    const { data, error } = await supabase
      .from('consulta_medica').select('id_consulta').eq('id_paciente', idPaciente);
    if (error) throw new ServiceError(error.message, error.code);
    return ((data ?? []) as Array<{ id_consulta: number }>).map(c => c.id_consulta);
  },

  // ─── Diagnósticos / síntomas / órdenes ───────────────────────────────────
  async getDiagnosticosConsulta(idConsulta: number) {
    const { data, error } = await supabase
      .from('diagnostico')
      .select('*, tipo_diagnostico(nombre)')
      .eq('id_consulta', idConsulta)
      .order('es_principal', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getDiagnosticosConsultaSimple(idConsulta: number) {
    const { data, error } = await supabase
      .from('diagnostico')
      .select('*')
      .eq('id_consulta', idConsulta)
      .order('prioridad', { ascending: true });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getDiagnosticosPaciente(idPaciente: number) {
    const ids = await this.getIdsConsultasPaciente(idPaciente);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('diagnostico')
      .select('id_diagnostico, codigo_cie10, descripcion, es_principal, fecha, id_consulta, tipo_diagnostico(nombre)')
      .in('id_consulta', ids)
      .order('fecha', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getDiagnosticosPacienteHistoria(idPaciente: number) {
    const ids = await this.getIdsConsultasPaciente(idPaciente);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('diagnostico')
      .select('*, tipo_diagnostico(nombre)')
      .in('id_consulta', ids)
      .order('fecha', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getSintomasConsulta(idConsulta: number) {
    const { data, error } = await supabase
      .from('sintoma').select('*').eq('id_consulta', idConsulta);
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getOrdenesConsulta(idConsulta: number) {
    const { data, error } = await supabase
      .from('orden_medica')
      .select('*, medicamento(nombre, presentacion, concentracion, via_administracion)')
      .eq('id_consulta', idConsulta)
      .order('fecha_emision', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getOrdenesPaciente(idPaciente: number) {
    const ids = await this.getIdsConsultasPaciente(idPaciente);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('orden_medica')
      .select('id_orden, dosis, frecuencia, duracion, indicaciones, fecha_emision, medicamento(nombre, presentacion)')
      .in('id_consulta', ids)
      .order('fecha_emision', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getOrdenesPacienteHistoria(idPaciente: number) {
    const ids = await this.getIdsConsultasPaciente(idPaciente);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('orden_medica')
      .select('*, medicamento(nombre, presentacion, concentracion, via_administracion)')
      .in('id_consulta', ids)
      .order('fecha_emision', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  // ─── Signos vitales ──────────────────────────────────────────────────────
  async getSignosPacienteRecientes(idPaciente: number, limite = 10) {
    const { data, error } = await supabase
      .from('signos_vitales').select('*')
      .eq('id_paciente', idPaciente)
      .order('fecha_registro', { ascending: false })
      .limit(limite);
    if (error) throw new ServiceError(error.message, error.code);
    return data ?? [];
  },

  async getUltimoSignoConsulta(idConsulta: number) {
    const { data, error } = await supabase
      .from('signos_vitales').select('*')
      .eq('id_consulta', idConsulta)
      .order('fecha_registro', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return data;
  },

  // ─── Crear consulta completa ─────────────────────────────────────────────
  /**
   * Inserta consulta + diagnósticos + signos. Devuelve id_consulta.
   * Las inserciones secundarias (dx, signos) loggean pero no abortan el save.
   */
  async crearConsultaCompleta(idMedico: number, payload: ConsultaCompletaPayload): Promise<number> {
    if (!payload.consulta.id_paciente) throw new ServiceError('Falta id_paciente.');

    const rC = await supabase.from('consulta_medica').insert({
      ...payload.consulta,
      id_medico: idMedico,
      motivo_consulta:          norm(payload.consulta.motivo_consulta as string | null | undefined),
      enfermedad_actual:        norm(payload.consulta.enfermedad_actual as string | null | undefined),
      revision_sistemas:        norm(payload.consulta.revision_sistemas as string | null | undefined),
      examen_fisico:            norm(payload.consulta.examen_fisico as string | null | undefined),
      examenes_complementarios: norm(payload.consulta.examenes_complementarios as string | null | undefined),
      analisis_clinico:         norm(payload.consulta.analisis_clinico as string | null | undefined),
      impresion_diagnostica:    norm(payload.consulta.impresion_diagnostica as string | null | undefined),
      plan_tratamiento:         norm(payload.consulta.plan_tratamiento as string | null | undefined),
      observaciones:            norm(payload.consulta.observaciones as string | null | undefined),
    }).select('id_consulta');

    if (rC.error) {
      const { code, message } = rC.error;
      if (code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-medico.sql.', code);
      if (code === '42703') throw new ServiceError('Faltan columnas. Ejecuta supabase/migration-consulta.sql.', code);
      throw new ServiceError(message ?? 'Error al crear la consulta', code);
    }
    const id_consulta = rC.data?.[0]?.id_consulta as number;
    if (!id_consulta) throw new ServiceError('No se obtuvo ID de consulta.');

    // Diagnósticos
    const dxValidos = (payload.diagnosticos ?? []).filter(d => d.descripcion?.trim());
    if (dxValidos.length > 0) {
      const { error: eDx } = await supabase.from('diagnostico').insert(
        dxValidos.map((d, i) => ({
          id_consulta,
          id_tipo_diagnostico: d.id_tipo_diagnostico ? Number(d.id_tipo_diagnostico) : null,
          codigo_cie10:        norm(d.codigo_cie10),
          descripcion:         d.descripcion.trim(),
          es_principal:        i === 0,
          tipo_dx:             d.tipo_dx || 'impresion',
          prioridad:           d.prioridad || (i + 1),
        })),
      );
      if (eDx) console.warn('[consultaService] diagnósticos:', eDx.message);
    }

    // Signos
    const s = payload.signos;
    const tieneSignos = s && Object.values(s).some(v => v !== '' && v != null);
    if (tieneSignos && s) {
      const { error: eSig } = await supabase.from('signos_vitales').insert({
        id_paciente:             Number(payload.consulta.id_paciente),
        id_consulta,
        id_medico:               idMedico,
        presion_sistolica:       numOrNull(s.presion_sistolica),
        presion_diastolica:      numOrNull(s.presion_diastolica),
        frecuencia_cardiaca:     numOrNull(s.frecuencia_cardiaca),
        frecuencia_respiratoria: numOrNull(s.frecuencia_respiratoria),
        temperatura:             numOrNull(s.temperatura),
        saturacion_oxigeno:      numOrNull(s.saturacion_oxigeno),
        peso:                    numOrNull(s.peso),
        talla:                   numOrNull(s.talla),
      });
      if (eSig) console.warn('[consultaService] signos:', eSig.message);
    }

    return id_consulta;
  },

  /**
   * Edita una consulta + actualiza/inserta signos + reemplaza diagnósticos.
   * (delete-all + insert para diagnósticos: más simple que diff).
   */
  async editarConsultaCompleta(
    idConsulta: number,
    idPaciente: number,
    payload: ConsultaCompletaPayload,
    signosId?: number,
  ): Promise<void> {
    // 1. consulta
    const { error: eC } = await supabase.from('consulta_medica').update({
      motivo_consulta:          norm(payload.consulta.motivo_consulta as string | null | undefined),
      enfermedad_actual:        norm(payload.consulta.enfermedad_actual as string | null | undefined),
      revision_sistemas:        norm(payload.consulta.revision_sistemas as string | null | undefined),
      examen_fisico:            norm(payload.consulta.examen_fisico as string | null | undefined),
      examenes_complementarios: norm(payload.consulta.examenes_complementarios as string | null | undefined),
      impresion_diagnostica:    norm(payload.consulta.impresion_diagnostica as string | null | undefined),
      analisis_clinico:         norm(payload.consulta.analisis_clinico as string | null | undefined),
      plan_tratamiento:         norm(payload.consulta.plan_tratamiento as string | null | undefined),
      observaciones:            norm(payload.consulta.observaciones as string | null | undefined),
    }).eq('id_consulta', idConsulta);
    if (eC) {
      if (eC.code === '42501') throw new ServiceError('Sin permisos. Ejecuta supabase/rls-medico.sql.', eC.code);
      throw new ServiceError(eC.message, eC.code);
    }

    // 2. signos: update si ya existe, insert si no
    const s = payload.signos;
    const tieneSignos = s && Object.values(s).some(v => v !== '' && v != null);
    if (tieneSignos && s) {
      const payloadS = {
        presion_sistolica:       numOrNull(s.presion_sistolica),
        presion_diastolica:      numOrNull(s.presion_diastolica),
        frecuencia_cardiaca:     numOrNull(s.frecuencia_cardiaca),
        frecuencia_respiratoria: numOrNull(s.frecuencia_respiratoria),
        temperatura:             numOrNull(s.temperatura),
        saturacion_oxigeno:      numOrNull(s.saturacion_oxigeno),
        peso:                    numOrNull(s.peso),
        talla:                   numOrNull(s.talla),
      };
      if (signosId) {
        const { error: eS } = await supabase
          .from('signos_vitales').update(payloadS).eq('id_signos', signosId);
        if (eS) console.warn('[consultaService] update signos:', eS.message);
      } else {
        const { error: eS } = await supabase.from('signos_vitales').insert({
          ...payloadS, id_paciente: idPaciente, id_consulta: idConsulta,
        });
        if (eS) console.warn('[consultaService] insert signos:', eS.message);
      }
    }

    // 3. Diagnósticos: reemplazo completo
    const { error: eDel } = await supabase
      .from('diagnostico').delete().eq('id_consulta', idConsulta);
    if (eDel) console.warn('[consultaService] delete dx:', eDel.message);

    const dxValidos = (payload.diagnosticos ?? []).filter(d => d.descripcion?.trim());
    if (dxValidos.length > 0) {
      const { error: eIns } = await supabase.from('diagnostico').insert(
        dxValidos.map((d, i) => ({
          id_consulta:         idConsulta,
          id_tipo_diagnostico: d.id_tipo_diagnostico ? Number(d.id_tipo_diagnostico) : null,
          codigo_cie10:        norm(d.codigo_cie10),
          descripcion:         d.descripcion.trim(),
          es_principal:        i === 0,
          tipo_dx:             d.tipo_dx || 'impresion',
          prioridad:           d.prioridad || (i + 1),
        })),
      );
      if (eIns) console.warn('[consultaService] insert dx:', eIns.message);
    }
  },

  async softDelete(idConsulta: number | string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_consulta', { p_id: idConsulta });
    if (error) {
      if (error.code === '42501') {
        throw new ServiceError('Sin permisos. Ejecuta supabase/migration-soft-delete.sql.', error.code);
      }
      throw new ServiceError(error.message, error.code);
    }
  },
};

export default consultaService;
