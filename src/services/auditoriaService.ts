import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Log inmutable de cambios. Vista vw_audit_log + vw_audit_usuarios (resolver actor).
export type OperacionAudit = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id_audit: number;
  ocurrio_en: string;
  operacion: OperacionAudit;
  tabla: string;
  id_registro: string;
  actor_uuid: string | null;
  actor_nombre: string | null;
  actor_rol: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
}

export interface ListarAuditOpts {
  tabla?: string;          // 'todas' o tabla específica
  operacion?: OperacionAudit | 'todas';
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
}

export const auditoriaService = {
  async listar(opts: ListarAuditOpts = {}): Promise<AuditLog[]> {
    let q = supabase.from('vw_audit_log').select('*').limit(opts.limit ?? 100);
    if (opts.tabla && opts.tabla !== 'todas') q = q.eq('tabla', opts.tabla);
    if (opts.operacion && opts.operacion !== 'todas') q = q.eq('operacion', opts.operacion);
    if (opts.fechaDesde) q = q.gte('ocurrio_en', `${opts.fechaDesde}T00:00:00`);
    if (opts.fechaHasta) q = q.lte('ocurrio_en', `${opts.fechaHasta}T23:59:59`);
    const { data, error } = await q;
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as AuditLog[];
  },

  /**
   * Resuelve nombres/roles de los UUIDs que aparecen como actores.
   * Devuelve un mapa { uuid → { nombre_completo, rol_nombre } }.
   */
  async resolverActores(uuids: string[]): Promise<Record<string, { nombre_completo: string; rol_nombre: string }>> {
    const unicos = [...new Set(uuids.filter(Boolean))];
    if (unicos.length === 0) return {};
    const { data, error } = await supabase
      .from('vw_audit_usuarios')
      .select('uuid, nombre_completo, rol_nombre')
      .in('uuid', unicos);
    if (error) throw new ServiceError(error.message, error.code);
    return Object.fromEntries(
      ((data ?? []) as Array<{ uuid: string; nombre_completo: string; rol_nombre: string }>)
        .map(a => [a.uuid, { nombre_completo: a.nombre_completo, rol_nombre: a.rol_nombre }]),
    );
  },
};

export default auditoriaService;
