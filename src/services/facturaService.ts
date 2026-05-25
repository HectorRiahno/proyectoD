import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Tabla: factura. Items: factura_item. Vistas: vw_admin_facturas, vw_paciente_mis_facturas
const TABLE = 'factura';
const VIEW  = 'vw_admin_facturas';

export type EstadoFactura =
  | 'borrador' | 'pendiente' | 'pagada' | 'anulada' | 'vencida';

export interface Factura {
  id_factura?: number;
  id_paciente?: number;
  id_medico?: number;
  id_consulta?: number | null;
  numero_factura?: string | null;
  estado?: EstadoFactura;
  fecha_emision?: string;
  fecha_pago?: string;
  fecha_anulacion?: string;
  motivo_anulacion?: string | null;
  metodo_pago?: string;
  subtotal?: number;
  descuento?: number;
  impuesto?: number;
  tasa_impuesto?: number;
  total?: number;
  observaciones?: string | null;
  paciente_nombre?: string;
  paciente_documento?: string;
  medico_nombre?: string;
  medico_especialidad?: string;
  items_count?: number;
  [key: string]: unknown;
}

export interface FacturaItem {
  id_item?: number;
  id_factura?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal?: number;
  notas?: string;
  orden?: number;
}

export interface ListarFacturasOpts {
  estado?: EstadoFactura | 'todas';
  fechaDesde?: string;     // YYYY-MM-DD
  fechaHasta?: string;     // YYYY-MM-DD
}

export const facturaService = {
  async listar(opts: ListarFacturasOpts = {}): Promise<Factura[]> {
    let q = supabase.from(VIEW).select('*').order('id_factura', { ascending: false });
    if (opts.estado && opts.estado !== 'todas') q = q.eq('estado', opts.estado);
    if (opts.fechaDesde) q = q.gte('fecha_emision', `${opts.fechaDesde}T00:00:00`);
    if (opts.fechaHasta) q = q.lte('fecha_emision', `${opts.fechaHasta}T23:59:59`);
    const { data, error } = await q;
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Factura[];
  },

  async getById(id: number | string): Promise<Factura | null> {
    const { data, error } = await supabase
      .from(VIEW).select('*').eq('id_factura', id).maybeSingle();
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? null) as Factura | null;
  },

  async getItems(idFactura: number | string): Promise<FacturaItem[]> {
    const { data, error } = await supabase
      .from('factura_item').select('*').eq('id_factura', idFactura).order('orden');
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as FacturaItem[];
  },

  // ─── Cliente: mis facturas ───────────────────────────────────────────────
  async getMisFacturas(): Promise<Factura[]> {
    const { data, error } = await supabase
      .from('vw_paciente_mis_facturas').select('*');
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Factura[];
  },

  // ─── Mutaciones campo a campo (edición de borrador) ──────────────────────
  async actualizarCampo(idFactura: number | string, campo: string, valor: unknown): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update({ [campo]: valor }).eq('id_factura', idFactura);
    if (error) throw new ServiceError(`No se pudo actualizar ${campo}: ${error.message}`, error.code);
  },

  // ─── Items ───────────────────────────────────────────────────────────────
  async agregarItem(idFactura: number | string, item: Partial<FacturaItem>): Promise<void> {
    const { error } = await supabase.from('factura_item').insert({
      id_factura: idFactura,
      descripcion: item.descripcion ?? 'Nuevo concepto',
      cantidad: item.cantidad ?? 1,
      precio_unitario: item.precio_unitario ?? 0,
      orden: item.orden ?? 1,
      notas: item.notas,
    });
    if (error) throw new ServiceError(`No se pudo agregar línea: ${error.message}`, error.code);
  },

  async actualizarItem(idItem: number | string, campo: string, valor: unknown): Promise<void> {
    const { error } = await supabase
      .from('factura_item').update({ [campo]: valor }).eq('id_item', idItem);
    if (error) throw new ServiceError(`Error: ${error.message}`, error.code);
  },

  /**
   * Actualiza varios campos del item en una sola transacción.
   * Usado al aplicar una plantilla del catálogo (descripcion + precio +
   * id_tipo_consulta) para evitar dos round-trips y dos eventos realtime.
   */
  async actualizarItemCampos(idItem: number | string, updates: Partial<FacturaItem> & Record<string, unknown>): Promise<void> {
    const { error } = await supabase
      .from('factura_item').update(updates).eq('id_item', idItem);
    if (error) throw new ServiceError(`Error: ${error.message}`, error.code);
  },

  async eliminarItem(idItem: number | string): Promise<void> {
    const { error } = await supabase
      .from('factura_item').delete().eq('id_item', idItem);
    if (error) throw new ServiceError(`No se pudo eliminar línea: ${error.message}`, error.code);
  },

  // ─── Workflow de estado ──────────────────────────────────────────────────
  async emitir(idFactura: number | string): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update({ estado: 'pendiente' }).eq('id_factura', idFactura);
    if (error) throw new ServiceError(`No se pudo emitir: ${error.message}`, error.code);
  },

  async marcarPagada(idFactura: number | string, metodoPago: string): Promise<void> {
    const updates: Record<string, unknown> = {
      estado: 'pagada',
      metodo_pago: metodoPago,
    };

    // Cobertura EPS: el paciente no paga nada. Aplicamos descuento = subtotal
    // en el mismo UPDATE; el trigger trg_factura_recalc se encarga de
    // recomputar impuesto/total a 0. El trigger trg_factura_estado permite
    // esta transición (ver migration-factura-eps.sql).
    if (metodoPago.toUpperCase() === 'EPS') {
      const { data: f } = await supabase
        .from(TABLE).select('subtotal').eq('id_factura', idFactura).maybeSingle();
      const sub = Number(f?.subtotal ?? 0);
      if (sub > 0) updates.descuento = sub;
    }

    const { error } = await supabase
      .from(TABLE).update(updates).eq('id_factura', idFactura);
    if (error) throw new ServiceError(error.message, error.code);
  },

  async anular(idFactura: number | string, motivo: string): Promise<void> {
    if (!motivo || motivo.trim().length < 5) {
      throw new ServiceError('El motivo debe tener al menos 5 caracteres.');
    }
    const { error } = await supabase
      .from(TABLE)
      .update({ estado: 'anulada', motivo_anulacion: motivo.trim() })
      .eq('id_factura', idFactura);
    if (error) throw new ServiceError(error.message, error.code);
  },

  async softDelete(idFactura: number | string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_factura', { p_id: idFactura });
    if (error) throw new ServiceError(error.message ?? 'No se pudo eliminar', error.code);
  },

  // ─── Realtime ────────────────────────────────────────────────────────────
  subscribeRealtime(onChange: () => void) {
    const channel = supabase
      .channel('factura-changes-' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'factura' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'factura_item' }, onChange)
      .subscribe();
    return channel;
  },
};

export default facturaService;
