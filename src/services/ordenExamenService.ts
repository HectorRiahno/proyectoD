import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

/* =====================================================================
   ordenExamenService — Persistencia de órdenes de exámenes paramédicos.

   Una orden vive bajo una consulta_medica y contiene N items (cada examen
   solicitado: nombre + observaciones). La cabecera guarda las indicaciones
   generales del médico para el paciente.

   El número de orden lo genera un trigger SQL (ORD-XXXXXXXX), no el frontend.
   ===================================================================== */

const TABLE_HEADER = 'orden_examen';
const TABLE_ITEM   = 'orden_examen_item';
const VIEW_MEDICO  = 'vw_medico_ordenes_examen';
const VIEW_PACIENTE = 'vw_paciente_mis_ordenes_examen';

export interface OrdenExamenItem {
  id_item?: number;
  id_orden_examen?: number;
  orden: number;            // posición 1, 2, 3...
  nombre: string;
  observaciones?: string | null;
}

export interface OrdenExamen {
  id_orden_examen?: number;
  id_consulta: number;
  id_paciente: number;
  id_medico: number;
  numero_orden?: string;
  fecha_emision?: string;
  indicaciones?: string | null;
  items?: OrdenExamenItem[];
  n_items?: number;
  medico_nombre?: string;
  medico_especialidad?: string;
  [key: string]: unknown;
}

export interface CrearOrdenExamenPayload {
  id_consulta: number;
  id_paciente: number;
  id_medico: number;
  indicaciones?: string;
  items: Array<{ nombre: string; observaciones?: string }>;
}

export const ordenExamenService = {
  /**
   * Crea una orden de examen completa (cabecera + items) en una sola
   * operación. Si falla la inserción de items, la cabecera queda huérfana
   * pero válida — se permite editar después. Devuelve el id_orden_examen.
   *
   * El frontend (AtenderCita.handleSubmit) llama esto DESPUÉS de crear la
   * consulta, ya con id_consulta válido.
   */
  async crearConItems(payload: CrearOrdenExamenPayload): Promise<number> {
    // Sanitizar items: nombre obligatorio no vacío
    const itemsLimpios = (payload.items ?? [])
      .map(it => ({
        nombre:        (it.nombre ?? '').trim(),
        observaciones: (it.observaciones ?? '').trim() || null,
      }))
      .filter(it => it.nombre.length > 0);

    if (itemsLimpios.length === 0) {
      throw new ServiceError(
        'La orden debe tener al menos un examen con nombre.',
        'EMPTY_ORDER',
      );
    }

    // 1. Insertar cabecera
    const { data: cab, error: errCab } = await supabase
      .from(TABLE_HEADER)
      .insert({
        id_consulta: payload.id_consulta,
        id_paciente: payload.id_paciente,
        id_medico:   payload.id_medico,
        indicaciones: (payload.indicaciones ?? '').trim() || null,
      })
      .select('id_orden_examen, numero_orden')
      .single();

    if (errCab) throw new ServiceError(errCab.message, errCab.code);
    const idOrden = cab.id_orden_examen as number;

    // 2. Insertar items (en lote)
    const itemsPayload = itemsLimpios.map((it, idx) => ({
      id_orden_examen: idOrden,
      orden:           idx + 1,
      nombre:          it.nombre,
      observaciones:   it.observaciones,
    }));

    const { error: errItems } = await supabase
      .from(TABLE_ITEM)
      .insert(itemsPayload);

    if (errItems) {
      // No rollback transaccional automático en supabase-js — registramos el
      // error y dejamos que el médico pueda re-intentar / contactar admin.
      console.error('[ordenExamen] cabecera creada pero items fallaron:', errItems);
      throw new ServiceError(
        `Orden ${cab.numero_orden} creada pero los exámenes no se guardaron: ${errItems.message}`,
        errItems.code,
      );
    }
    return idOrden;
  },

  /** Devuelve la orden (con items en JSON) para una consulta dada. */
  async getPorConsulta(idConsulta: number): Promise<OrdenExamen[]> {
    const { data, error } = await supabase
      .from(VIEW_MEDICO)
      .select('*')
      .eq('id_consulta', idConsulta)
      .order('fecha_emision', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as OrdenExamen[];
  },

  /** Todas las órdenes que el médico autenticado ha visto/escrito para un paciente. */
  async getPorPaciente(idPaciente: number): Promise<OrdenExamen[]> {
    const { data, error } = await supabase
      .from(VIEW_MEDICO)
      .select('*')
      .eq('id_paciente', idPaciente)
      .order('fecha_emision', { ascending: false });
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as OrdenExamen[];
  },

  /** Las órdenes del paciente autenticado (para el portal del cliente). */
  async getMisOrdenes(): Promise<OrdenExamen[]> {
    const { data, error } = await supabase
      .from(VIEW_PACIENTE)
      .select('*');
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as OrdenExamen[];
  },

  /** Soft-delete: solo el médico autor o un admin pueden borrar. */
  async eliminar(idOrdenExamen: number): Promise<void> {
    const { error } = await supabase
      .from(TABLE_HEADER)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id_orden_examen', idOrdenExamen);
    if (error) throw new ServiceError(error.message, error.code);
  },
};

export default ordenExamenService;
