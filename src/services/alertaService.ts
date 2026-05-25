import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Tabla: alerta (severidad: info|warn|crit, estado: activa|vista|resuelta|descartada)
// RLS: solo `es_admin()`. Llamadas desde no-admin devuelven 0 filas.

export type SeveridadAlerta = 'info' | 'warn' | 'crit';
export type EstadoAlerta    = 'activa' | 'vista' | 'resuelta' | 'descartada';

export interface Alerta {
  id_alerta: number;
  tipo: string;
  severidad: SeveridadAlerta;
  titulo: string;
  mensaje: string;
  recomendacion: string | null;
  metadata: Record<string, unknown>;
  entidad_tabla: string | null;
  entidad_id: number | null;
  estado: EstadoAlerta;
  resuelta_por: string | null;
  resuelta_en: string | null;
  detectada_en: string;
}

const TABLE = 'alerta';

export const alertaService = {
  /**
   * Alertas críticas activas (campana del admin). Limit razonable —
   * la campana muestra solo las más recientes, los reportes muestran
   * el detalle completo.
   */
  async getCriticasActivas(limite = 20): Promise<Alerta[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('severidad', 'crit')
      .eq('estado', 'activa')
      .order('detectada_en', { ascending: false })
      .limit(limite);
    if (error) throw new ServiceError(error.message, error.code);
    return (data ?? []) as Alerta[];
  },

  /** Conteo rápido para el badge — evita traer todo el payload. */
  async countCriticasActivas(): Promise<number> {
    const { count, error } = await supabase
      .from(TABLE)
      .select('id_alerta', { count: 'exact', head: true })
      .eq('severidad', 'crit')
      .eq('estado', 'activa');
    if (error) throw new ServiceError(error.message, error.code);
    return count ?? 0;
  },

  /** Marca la alerta como vista (no la oculta, solo cambia estado). */
  async marcarVista(idAlerta: number): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update({ estado: 'vista' }).eq('id_alerta', idAlerta);
    if (error) throw new ServiceError(error.message, error.code);
  },

  /** Resuelve la alerta — sale de la campana. */
  async resolver(idAlerta: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from(TABLE).update({
        estado: 'resuelta',
        resuelta_por: user?.id ?? null,
        resuelta_en: new Date().toISOString(),
      }).eq('id_alerta', idAlerta);
    if (error) throw new ServiceError(error.message, error.code);
  },

  /** Descarta sin resolver (falsa alarma, etc.). */
  async descartar(idAlerta: number): Promise<void> {
    const { error } = await supabase
      .from(TABLE).update({ estado: 'descartada' }).eq('id_alerta', idAlerta);
    if (error) throw new ServiceError(error.message, error.code);
  },

  /**
   * Fuerza re-evaluación de las reglas de inventario en la BD.
   * Devuelve el número de alertas nuevas insertadas. Idempotente —
   * no duplica si ya hay una alerta activa para el mismo medicamento.
   */
  async evaluarInventario(): Promise<number> {
    const { data, error } = await supabase.rpc('evaluar_alertas_inventario');
    if (error) throw new ServiceError(error.message, error.code);
    return Number(data ?? 0);
  },

  /** Realtime: notifica al callback cuando hay inserciones/cambios. */
  subscribeRealtime(onChange: () => void) {
    const channel = supabase
      .channel('alerta-changes-' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, onChange)
      .subscribe();
    return channel;
  },
};

export default alertaService;
