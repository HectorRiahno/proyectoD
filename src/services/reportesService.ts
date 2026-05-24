import { supabase } from '../lib/supabase';
import { ServiceError } from './pacienteService';

// Servicio para el módulo de Reportes y Seguimiento Inteligente.
// Casi todo se hace vía RPCs SQL (postgres/supabase) que retornan JSON listo.

export type Periodo = 'hoy' | 'semana' | 'mes' | 'trimestre';

export interface ActualVsAnterior {
  pacientes_nuevos?: number;
  pacientes_atendidos?: number;
  citas_realizadas?: number;
  citas_canceladas?: number;
  citas_no_asistio?: number;
  ingresos_total?: number;
  ingresos_pagados?: number;
  ingresos_pendientes?: number;
  facturas_emitidas?: number;
  facturas_pagadas?: number;
  consultas_completadas?: number;
}

export interface SerieDia {
  dia: string;
  citas: number;
  canceladas: number;
  pacientes_nuevos: number;
  ingresos: number;
}

export interface HoraPico {
  hora: number;
  citas: number;
}

export interface DemografiaItem {
  genero: string;
  rango_edad: string;
  total: number;
}

export interface TopMedico {
  id_medico: number;
  medico: string;
  especialidad: string;
  mes: number;
}

export interface InventarioCriticoItem {
  id_medicamento: number;
  nombre: string;
  stock: number;
  estado_stock: 'agotado' | 'critico' | 'bajo' | 'ok';
  categoria?: string;
}

export interface DashboardKpis {
  periodo: Periodo;
  desde: string;
  hasta: string;
  desde_prev: string;
  hasta_prev: string;
  actual: ActualVsAnterior;
  anterior: ActualVsAnterior;
  horarios_ocupados: number;
  inventario_criticos: number;
  usuarios_activos: number;
  alertas_activas: number;
  serie: SerieDia[];
  horas_pico: HoraPico[];
  demografia: DemografiaItem[];
  top_medicos: TopMedico[];
  inventario_critico_top: InventarioCriticoItem[];
}

// ─── Tipos de reportes detallados ────────────────────────────────────────────
export interface ReportePacientes {
  desde: string; hasta: string;
  totales: { registrados: number; nuevos: number; atendidos: number; inactivos_12m: number };
  demografia: DemografiaItem[];
  nuevos_por_dia: Array<{ dia: string; nuevos: number }>;
  diagnosticos_top: Array<{ diagnostico: string; codigo_cie10: string; frecuencia: number; pacientes_unicos: number }>;
  frecuentes_top: Array<{ id_paciente: number; paciente: string; documento: string; visitas: number; ultima_visita: string }>;
  inactivos: Array<{ id_paciente: number; nombre_completo: string; documento: string; email: string; telefono: string; ultima_consulta: string; dias_sin_visita: number }>;
}

export interface ReporteMedicos {
  desde: string; hasta: string;
  totales: { medicos_activos: number; consultas_total: number; tiempo_promedio: number | null; cancelaciones: number };
  por_medico: Array<{
    id_medico: number; medico: string; especialidad: string;
    consultas: number; pacientes_unicos: number; canceladas: number;
    min_promedio: number | null; consultas_por_dia: number;
  }>;
  por_especialidad: Array<{ especialidad: string; consultas: number; medicos: number }>;
}

export interface ReporteHorarios {
  desde: string; hasta: string;
  totales: { ocupados: number; canceladas: number; no_asistio: number; completadas: number };
  horas_pico: HoraPico[];
  por_dia_semana: Array<{ dow: number; dia: string; citas: number; canceladas: number }>;
  ocupacion_por_dia: Array<{ dia: string; citas: number; canceladas: number }>;
  periodo_dias: number;
}

export interface ReporteFinanciero {
  desde: string; hasta: string;
  totales: {
    emitidas: number; pagadas: number; pendientes: number; anuladas: number;
    ingresos_facturados: number; ingresos_pagados: number; por_cobrar: number; ticket_promedio: number;
  };
  serie_ingresos: Array<{ dia: string; ingresos: number }>;
  servicios_top: Array<{ servicio: string; veces_vendido: number; unidades: number; ingreso_generado: number }>;
  por_metodo_pago: Array<{ metodo_pago: string; n: number; monto: number }>;
  cartera_vencida: Array<{ id_factura: number; numero_factura: string; paciente_nombre: string; medico_nombre: string; total: number; fecha_emision: string; dias_mora: number }>;
}

export interface ReporteInventario {
  totales: {
    total_medicamentos: number; agotados: number; criticos: number; bajos: number;
    valor_inventario: number; categorias: number;
  };
  criticos: InventarioCriticoItem[];
  mas_usados: Array<{ id_medicamento: number; nombre: string; presentacion: string; recetas: number; stock: number; precio: number }>;
  por_categoria: Array<{ categoria: string; total: number; valor: number }>;
}

export interface ReporteAuditoria {
  desde: string; hasta: string;
  totales: { total: number; insert: number; update: number; delete: number };
  por_dia: Array<{ dia: string; total: number; insertados: number; modificados: number; eliminados: number }>;
  por_tabla: Array<{ tabla: string; total: number; insertados: number; modificados: number; eliminados: number }>;
  por_actor: Array<{ actor: string; actor_rol: string; total: number }>;
}

export interface ReporteUsuarios {
  totales: { total: number; activos: number; inactivos: number; conectados_30d: number; nunca_conectados: number };
  por_rol: Array<{ rol: string; total: number; activos: number }>;
  ultimos_accesos: Array<{ id_usuario: number; nombre_completo: string; email: string; username: string; rol_nombre: string; activo: boolean; ultimo_acceso: string }>;
  sin_conectar_30d: Array<{ id_usuario: number; nombre_completo: string; email: string; rol_nombre: string; ultimo_acceso: string | null }>;
}

export type TipoReporte =
  | 'pacientes' | 'medicos' | 'horarios' | 'financiero'
  | 'inventario' | 'auditoria' | 'usuarios';

export const reportesService = {
  /**
   * Endpoint principal del dashboard. Devuelve TODOS los datos para construir
   * la pantalla de un solo round-trip: KPIs + comparativa + serie + horas pico
   * + demografía + top médicos + inventario crítico.
   */
  async getDashboardKpis(periodo: Periodo = 'mes'): Promise<DashboardKpis> {
    const { data, error } = await supabase.rpc('rpc_dashboard_kpis', { p_periodo: periodo });
    if (error) {
      if (error.code === '42501') {
        throw new ServiceError('Solo administradores pueden ver el dashboard de reportes.', error.code);
      }
      throw new ServiceError(error.message, error.code);
    }
    return data as DashboardKpis;
  },

  /**
   * Re-calcula el snapshot del día. Útil cuando pg_cron no está disponible
   * o el admin quiere refrescar los KPIs manualmente.
   */
  async regenerarSnapshotHoy(): Promise<void> {
    const { error } = await supabase.rpc('generar_snapshot_diario', {
      p_fecha: new Date().toISOString().slice(0, 10),
    });
    if (error) {
      if (error.code === '42501') {
        throw new ServiceError('Sin permisos.', error.code);
      }
      throw new ServiceError(error.message, error.code);
    }
  },

  // ─── Reportes detallados ────────────────────────────────────────────────
  async getReportePacientes(desde: string, hasta: string): Promise<ReportePacientes> {
    const { data, error } = await supabase.rpc('rpc_reporte_pacientes', { p_desde: desde, p_hasta: hasta });
    if (error) throw new ServiceError(error.message, error.code);
    return data as ReportePacientes;
  },
  async getReporteMedicos(desde: string, hasta: string): Promise<ReporteMedicos> {
    const { data, error } = await supabase.rpc('rpc_reporte_medicos', { p_desde: desde, p_hasta: hasta });
    if (error) throw new ServiceError(error.message, error.code);
    return data as ReporteMedicos;
  },
  async getReporteHorarios(desde: string, hasta: string): Promise<ReporteHorarios> {
    const { data, error } = await supabase.rpc('rpc_reporte_horarios', { p_desde: desde, p_hasta: hasta });
    if (error) throw new ServiceError(error.message, error.code);
    return data as ReporteHorarios;
  },
  async getReporteFinanciero(desde: string, hasta: string): Promise<ReporteFinanciero> {
    const { data, error } = await supabase.rpc('rpc_reporte_financiero', { p_desde: desde, p_hasta: hasta });
    if (error) throw new ServiceError(error.message, error.code);
    return data as ReporteFinanciero;
  },
  async getReporteInventario(): Promise<ReporteInventario> {
    const { data, error } = await supabase.rpc('rpc_reporte_inventario');
    if (error) throw new ServiceError(error.message, error.code);
    return data as ReporteInventario;
  },
  async getReporteAuditoria(desde: string, hasta: string, opts: { tabla?: string; operacion?: string } = {}): Promise<ReporteAuditoria> {
    const { data, error } = await supabase.rpc('rpc_reporte_auditoria', {
      p_desde: desde, p_hasta: hasta,
      p_tabla: opts.tabla ?? null, p_operacion: opts.operacion ?? null,
    });
    if (error) throw new ServiceError(error.message, error.code);
    return data as ReporteAuditoria;
  },
  async getReporteUsuarios(): Promise<ReporteUsuarios> {
    const { data, error } = await supabase.rpc('rpc_reporte_usuarios');
    if (error) throw new ServiceError(error.message, error.code);
    return data as ReporteUsuarios;
  },

  /**
   * Registra que un reporte fue descargado — alimenta el historial.
   */
  async registrarDescarga(
    tipo: TipoReporte | 'general',
    formato: 'pdf' | 'excel',
    desde: string,
    hasta: string,
    parametros: Record<string, unknown> = {},
  ): Promise<void> {
    await supabase.rpc('rpc_registrar_descarga_reporte', {
      p_tipo: tipo, p_formato: formato,
      p_desde: desde, p_hasta: hasta,
      p_parametros: parametros,
    });
  },
};

// ─── Helpers de formato y comparación ───────────────────────────────────────
export const fmtMoney = (n: number | null | undefined) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(Number(n ?? 0));

export const fmtNumber = (n: number | null | undefined) =>
  new Intl.NumberFormat('es-CO').format(Number(n ?? 0));

export const fmtPercent = (n: number | null | undefined, digits = 1) =>
  `${Number(n ?? 0).toFixed(digits)}%`;

/**
 * Calcula el delta entre dos valores: absoluto, porcentual y tendencia.
 *   compararValores(120, 100) → { absoluto: 20, pct: 20, tendencia: 'sube' }
 */
export function compararValores(actual: number, anterior: number) {
  const a = Number(actual ?? 0);
  const b = Number(anterior ?? 0);
  const absoluto = a - b;
  const pct = b === 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100;
  let tendencia: 'sube' | 'baja' | 'estable' = 'estable';
  if (Math.abs(pct) >= 0.5) tendencia = pct > 0 ? 'sube' : 'baja';
  return { absoluto, pct, tendencia };
}

export default reportesService;
