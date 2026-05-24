import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Papelera unificada: vw_admin_papelera (todos los soft-deletes).
// Restauración por tabla via RPC. Detalle del snapshot por tabla.

export type TablaPapelera = 'consulta_medica' | 'cita' | 'paciente' | 'medico';

const RESTORE_RPC: Record<TablaPapelera, string> = {
  consulta_medica: 'restore_consulta',
  cita:            'restore_cita',
  paciente:        'restore_paciente',
  medico:          'restore_medico',
};

export interface ItemPapelera {
  tabla: TablaPapelera;
  id_registro: string;
  deleted_at: string;
  deleted_by: string | null;
  resumen: Record<string, unknown> | null;
}

export interface ListarPapeleraOpts {
  tabla?: TablaPapelera | 'todas';
  fechaDesde?: string;
  fechaHasta?: string;
}

const DETAIL_QUERY: Record<TablaPapelera, (id: number) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>> = {
  consulta_medica: (id) => supabase
    .from('consulta_medica')
    .select(`*, paciente:paciente!inner(id_paciente, numero_historia,
              persona:persona!inner(documento, nombres, apellidos, email, telefono))`)
    .eq('id_consulta', id)
    .maybeSingle(),
  cita: (id) => supabase
    .from('cita')
    .select(`*, paciente:paciente(id_paciente, numero_historia,
              persona:persona(documento, nombres, apellidos, email, telefono)),
            medico:medico(id_medico, numero_licencia, especialidad, consultorio,
              persona:persona(nombres, apellidos))`)
    .eq('id_cita', id)
    .maybeSingle(),
  paciente: (id) => supabase
    .from('paciente')
    .select(`*, persona:persona!inner(*)`)
    .eq('id_paciente', id)
    .maybeSingle(),
  medico: (id) => supabase
    .from('medico')
    .select(`*, persona:persona!inner(*)`)
    .eq('id_medico', id)
    .maybeSingle(),
};

export const papeleraService = {
  async listar(opts: ListarPapeleraOpts = {}): Promise<ItemPapelera[]> {
    let q = supabase.from('vw_admin_papelera').select('*');
    if (opts.tabla && opts.tabla !== 'todas') q = q.eq('tabla', opts.tabla);
    if (opts.fechaDesde) q = q.gte('deleted_at', `${opts.fechaDesde}T00:00:00`);
    if (opts.fechaHasta) q = q.lte('deleted_at', `${opts.fechaHasta}T23:59:59`);
    const { data, error } = await q;
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as ItemPapelera[];
  },

  async getDetalle(tabla: TablaPapelera, idRegistro: number | string): Promise<unknown> {
    const q = DETAIL_QUERY[tabla];
    if (!q) throw new ServiceError(`Sin query de detalle para '${tabla}'`);
    const { data, error } = await q(Number(idRegistro));
    if (error) throw new ServiceError(`No se pudo cargar el detalle: ${error.message}`, error.code);
    return data;
  },

  async restaurar(tabla: TablaPapelera, idRegistro: number | string): Promise<void> {
    const rpc = RESTORE_RPC[tabla];
    if (!rpc) throw new ServiceError(`No hay RPC de restore definida para la tabla '${tabla}'`);
    const { error } = await supabase.rpc(rpc, { p_id: Number(idRegistro) });
    if (error) {
      if (error.code === '42501') {
        throw new ServiceError('Solo administradores pueden restaurar registros.', error.code);
      }
      throw new ServiceError(error.message ?? 'No se pudo restaurar', error.code);
    }
  },
};

export default papeleraService;
