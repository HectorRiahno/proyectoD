import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type {
  ReportePacientes, ReporteMedicos, ReporteHorarios,
  ReporteFinanciero, ReporteInventario, ReporteAuditoria, ReporteUsuarios,
} from './reportesService';

// Generadores Excel para los 7 reportes detallados. Cada reporte se exporta
// como un .xlsx con varias hojas (Resumen + N detalles).

const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
  border: {
    top:    { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    left:   { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    right:  { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
  },
};

function nuevoWorkbook(titulo: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hospitalis';
  wb.created = new Date();
  wb.title = titulo;
  return wb;
}

function styleHeader(ws: ExcelJS.Worksheet, row = 1) {
  ws.getRow(row).eachCell(cell => {
    cell.font      = HEADER_STYLE.font;
    cell.fill      = HEADER_STYLE.fill;
    cell.alignment = HEADER_STYLE.alignment;
    cell.border    = HEADER_STYLE.border;
  });
  ws.getRow(row).height = 22;
}

function autosize(ws: ExcelJS.Worksheet, max = 50) {
  ws.columns.forEach(col => {
    let largo = (col.header as string)?.length ?? 10;
    col.eachCell?.({ includeEmpty: false }, cell => {
      const v = String(cell.value ?? '');
      if (v.length > largo) largo = v.length;
    });
    col.width = Math.min(Math.max(largo + 2, 10), max);
  });
}

async function descargar(wb: ExcelJS.Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }), filename);
}

// Hoja de resumen estándar
function pintarResumen(ws: ExcelJS.Worksheet, titulo: string, subtitulo: string, kpis: Array<{ k: string; v: string | number }>) {
  ws.mergeCells('A1:B1');
  ws.getCell('A1').value = titulo;
  ws.getCell('A1').font = { bold: true, size: 16 };
  ws.mergeCells('A2:B2');
  ws.getCell('A2').value = subtitulo;
  ws.getCell('A2').font = { italic: true, color: { argb: 'FF64748B' } };

  ws.getCell('A4').value = 'KPI';
  ws.getCell('B4').value = 'Valor';
  styleHeader(ws, 4);

  kpis.forEach((k, i) => {
    ws.getCell(`A${5 + i}`).value = k.k;
    ws.getCell(`B${5 + i}`).value = k.v;
    ws.getCell(`A${5 + i}`).font  = { bold: true };
    ws.getCell(`B${5 + i}`).alignment = { horizontal: 'right' };
  });
  ws.getColumn('A').width = 35;
  ws.getColumn('B').width = 20;
}

// ============================================================================
// PACIENTES
// ============================================================================
export async function exportarReportePacientesExcel(data: ReportePacientes) {
  const wb = nuevoWorkbook('Reporte de Pacientes');
  const ws1 = wb.addWorksheet('Resumen');
  pintarResumen(ws1, 'Reporte de Pacientes', `Período: ${data.desde} — ${data.hasta}`, [
    { k: 'Total registrados',         v: data.totales.registrados },
    { k: 'Nuevos en período',          v: data.totales.nuevos },
    { k: 'Atendidos en período',       v: data.totales.atendidos },
    { k: 'Inactivos (>12 meses)',      v: data.totales.inactivos_12m },
  ]);

  const ws2 = wb.addWorksheet('Demografía');
  ws2.columns = [
    { header: 'Género',     key: 'genero',     width: 22 },
    { header: 'Rango edad', key: 'rango_edad', width: 16 },
    { header: 'Total',      key: 'total',      width: 12 },
  ];
  ws2.addRows(data.demografia ?? []);
  styleHeader(ws2);

  const ws3 = wb.addWorksheet('Diagnósticos top');
  ws3.columns = [
    { header: 'CIE-10',           key: 'codigo_cie10',     width: 14 },
    { header: 'Diagnóstico',      key: 'diagnostico',      width: 50 },
    { header: 'Frecuencia',       key: 'frecuencia',       width: 14 },
    { header: 'Pacientes únicos', key: 'pacientes_unicos', width: 18 },
  ];
  ws3.addRows(data.diagnosticos_top ?? []);
  styleHeader(ws3);

  const ws4 = wb.addWorksheet('Pacientes frecuentes');
  ws4.columns = [
    { header: 'Paciente',      key: 'paciente',      width: 36 },
    { header: 'Documento',     key: 'documento',     width: 18 },
    { header: 'Visitas',       key: 'visitas',       width: 12 },
    { header: 'Última visita', key: 'ultima_visita', width: 14 },
  ];
  ws4.addRows((data.frecuentes_top ?? []).map(p => ({
    ...p, ultima_visita: p.ultima_visita?.slice(0, 10) ?? '',
  })));
  styleHeader(ws4);

  if (data.inactivos?.length) {
    const ws5 = wb.addWorksheet('Inactivos (>12m)');
    ws5.columns = [
      { header: 'Paciente',        key: 'nombre_completo', width: 36 },
      { header: 'Documento',       key: 'documento',       width: 18 },
      { header: 'Email',           key: 'email',           width: 30 },
      { header: 'Teléfono',        key: 'telefono',        width: 18 },
      { header: 'Última consulta', key: 'ultima_consulta', width: 14 },
      { header: 'Días sin visita', key: 'dias_sin_visita', width: 16 },
    ];
    ws5.addRows(data.inactivos.map(p => ({
      ...p, ultima_consulta: p.ultima_consulta?.slice(0, 10) ?? 'Nunca',
    })));
    styleHeader(ws5);
  }

  await descargar(wb, `reporte_pacientes_${data.desde}_${data.hasta}.xlsx`);
}

// ============================================================================
// MÉDICOS
// ============================================================================
export async function exportarReporteMedicosExcel(data: ReporteMedicos) {
  const wb = nuevoWorkbook('Reporte de Médicos');
  const ws1 = wb.addWorksheet('Resumen');
  pintarResumen(ws1, 'Reporte de Médicos', `Período: ${data.desde} — ${data.hasta}`, [
    { k: 'Médicos activos',  v: data.totales.medicos_activos },
    { k: 'Total consultas',  v: data.totales.consultas_total },
    { k: 'Tiempo promedio (min)', v: data.totales.tiempo_promedio ?? 0 },
    { k: 'Cancelaciones',    v: data.totales.cancelaciones },
  ]);

  const ws2 = wb.addWorksheet('Por médico');
  ws2.columns = [
    { header: 'Médico',           key: 'medico',           width: 30 },
    { header: 'Especialidad',     key: 'especialidad',     width: 24 },
    { header: 'Consultas',        key: 'consultas',        width: 12 },
    { header: 'Pacientes únicos', key: 'pacientes_unicos', width: 18 },
    { header: 'Canceladas',       key: 'canceladas',       width: 14 },
    { header: 'Min/consulta',     key: 'min_promedio',     width: 14 },
    { header: 'Consultas/día',    key: 'consultas_por_dia',width: 16 },
  ];
  ws2.addRows(data.por_medico ?? []);
  styleHeader(ws2);

  const ws3 = wb.addWorksheet('Por especialidad');
  ws3.columns = [
    { header: 'Especialidad', key: 'especialidad', width: 30 },
    { header: 'Consultas',    key: 'consultas',    width: 14 },
    { header: 'Médicos',      key: 'medicos',      width: 14 },
  ];
  ws3.addRows(data.por_especialidad ?? []);
  styleHeader(ws3);

  await descargar(wb, `reporte_medicos_${data.desde}_${data.hasta}.xlsx`);
}

// ============================================================================
// HORARIOS
// ============================================================================
export async function exportarReporteHorariosExcel(data: ReporteHorarios) {
  const wb = nuevoWorkbook('Reporte de Horarios');
  const ws1 = wb.addWorksheet('Resumen');
  pintarResumen(ws1, 'Reporte de Horarios', `Período: ${data.desde} — ${data.hasta}`, [
    { k: 'Horarios ocupados', v: data.totales.ocupados },
    { k: 'Completadas',       v: data.totales.completadas },
    { k: 'Canceladas',        v: data.totales.canceladas },
    { k: 'No asistió',        v: data.totales.no_asistio },
    { k: 'Días en período',   v: data.periodo_dias },
  ]);

  const ws2 = wb.addWorksheet('Horas pico');
  ws2.columns = [
    { header: 'Hora',  key: 'hora',  width: 12 },
    { header: 'Citas', key: 'citas', width: 14 },
  ];
  ws2.addRows((data.horas_pico ?? []).map(h => ({
    hora: `${String(h.hora).padStart(2, '0')}:00`, citas: h.citas,
  })));
  styleHeader(ws2);

  const ws3 = wb.addWorksheet('Por día de semana');
  ws3.columns = [
    { header: 'Día',        key: 'dia',        width: 16 },
    { header: 'Citas',      key: 'citas',      width: 12 },
    { header: 'Canceladas', key: 'canceladas', width: 12 },
  ];
  ws3.addRows(data.por_dia_semana ?? []);
  styleHeader(ws3);

  const ws4 = wb.addWorksheet('Ocupación por día');
  ws4.columns = [
    { header: 'Día',        key: 'dia',        width: 14 },
    { header: 'Citas',      key: 'citas',      width: 12 },
    { header: 'Canceladas', key: 'canceladas', width: 12 },
  ];
  ws4.addRows(data.ocupacion_por_dia ?? []);
  styleHeader(ws4);

  await descargar(wb, `reporte_horarios_${data.desde}_${data.hasta}.xlsx`);
}

// ============================================================================
// FINANCIERO
// ============================================================================
export async function exportarReporteFinancieroExcel(data: ReporteFinanciero) {
  const wb = nuevoWorkbook('Reporte Financiero');
  const ws1 = wb.addWorksheet('Resumen');
  pintarResumen(ws1, 'Reporte Financiero', `Período: ${data.desde} — ${data.hasta}`, [
    { k: 'Facturas emitidas',    v: data.totales.emitidas },
    { k: 'Pagadas',              v: data.totales.pagadas },
    { k: 'Pendientes',           v: data.totales.pendientes },
    { k: 'Anuladas',             v: data.totales.anuladas },
    { k: 'Ingresos facturados',  v: data.totales.ingresos_facturados },
    { k: 'Ingresos cobrados',    v: data.totales.ingresos_pagados },
    { k: 'Por cobrar (total)',   v: data.totales.por_cobrar },
    { k: 'Ticket promedio',      v: data.totales.ticket_promedio },
  ]);

  const ws2 = wb.addWorksheet('Ingresos por día');
  ws2.columns = [
    { header: 'Día',      key: 'dia',      width: 14 },
    { header: 'Ingresos', key: 'ingresos', width: 16, style: { numFmt: '"$"#,##0' } },
  ];
  ws2.addRows(data.serie_ingresos ?? []);
  styleHeader(ws2);

  const ws3 = wb.addWorksheet('Servicios top');
  ws3.columns = [
    { header: 'Servicio',  key: 'servicio',         width: 40 },
    { header: 'Veces',     key: 'veces_vendido',    width: 12 },
    { header: 'Unidades',  key: 'unidades',         width: 12 },
    { header: 'Ingreso',   key: 'ingreso_generado', width: 16, style: { numFmt: '"$"#,##0' } },
  ];
  ws3.addRows(data.servicios_top ?? []);
  styleHeader(ws3);

  const ws4 = wb.addWorksheet('Por método de pago');
  ws4.columns = [
    { header: 'Método', key: 'metodo_pago', width: 20 },
    { header: 'Pagos',  key: 'n',           width: 12 },
    { header: 'Monto',  key: 'monto',       width: 16, style: { numFmt: '"$"#,##0' } },
  ];
  ws4.addRows(data.por_metodo_pago ?? []);
  styleHeader(ws4);

  if (data.cartera_vencida?.length) {
    const ws5 = wb.addWorksheet('Cartera vencida');
    ws5.columns = [
      { header: '# Factura',     key: 'numero_factura',   width: 16 },
      { header: 'Paciente',      key: 'paciente_nombre',  width: 28 },
      { header: 'Médico',        key: 'medico_nombre',    width: 24 },
      { header: 'Fecha emisión', key: 'fecha_emision',    width: 14 },
      { header: 'Total',         key: 'total',            width: 14, style: { numFmt: '"$"#,##0' } },
      { header: 'Días mora',     key: 'dias_mora',        width: 12 },
    ];
    ws5.addRows(data.cartera_vencida.map(c => ({
      ...c, fecha_emision: c.fecha_emision?.slice(0, 10) ?? '',
    })));
    styleHeader(ws5);
  }

  await descargar(wb, `reporte_financiero_${data.desde}_${data.hasta}.xlsx`);
}

// ============================================================================
// INVENTARIO
// ============================================================================
export async function exportarReporteInventarioExcel(data: ReporteInventario) {
  const wb = nuevoWorkbook('Reporte de Inventario');
  const today = new Date().toISOString().slice(0, 10);
  const ws1 = wb.addWorksheet('Resumen');
  pintarResumen(ws1, 'Reporte de Inventario', `Generado: ${today}`, [
    { k: 'Total medicamentos', v: data.totales.total_medicamentos },
    { k: 'Agotados',           v: data.totales.agotados },
    { k: 'Críticos (≤5)',      v: data.totales.criticos },
    { k: 'Bajos (≤10)',        v: data.totales.bajos },
    { k: 'Valor del inventario', v: data.totales.valor_inventario },
    { k: 'Categorías',         v: data.totales.categorias },
  ]);

  if (data.criticos?.length) {
    const ws2 = wb.addWorksheet('Críticos');
    ws2.columns = [
      { header: 'Medicamento',     key: 'nombre',          width: 30 },
      { header: 'Genérico',        key: 'nombre_generico', width: 24 },
      { header: 'Presentación',    key: 'presentacion',    width: 18 },
      { header: 'Categoría',       key: 'categoria',       width: 20 },
      { header: 'Stock',           key: 'stock',           width: 10 },
      { header: 'Estado',          key: 'estado_stock',    width: 14 },
      { header: 'Precio',          key: 'precio',          width: 14, style: { numFmt: '"$"#,##0' } },
    ];
    ws2.addRows(data.criticos);
    styleHeader(ws2);
  }

  if (data.mas_usados?.length) {
    const ws3 = wb.addWorksheet('Más usados (90d)');
    ws3.columns = [
      { header: 'Medicamento',  key: 'nombre',       width: 30 },
      { header: 'Presentación', key: 'presentacion', width: 20 },
      { header: 'Recetas',      key: 'recetas',      width: 10 },
      { header: 'Stock',        key: 'stock',        width: 10 },
      { header: 'Precio',       key: 'precio',       width: 14, style: { numFmt: '"$"#,##0' } },
    ];
    ws3.addRows(data.mas_usados);
    styleHeader(ws3);
  }

  if (data.por_categoria?.length) {
    const ws4 = wb.addWorksheet('Por categoría');
    ws4.columns = [
      { header: 'Categoría', key: 'categoria', width: 26 },
      { header: 'Total',     key: 'total',     width: 12 },
      { header: 'Valor',     key: 'valor',     width: 16, style: { numFmt: '"$"#,##0' } },
    ];
    ws4.addRows(data.por_categoria);
    styleHeader(ws4);
  }

  await descargar(wb, `reporte_inventario_${today}.xlsx`);
}

// ============================================================================
// AUDITORÍA
// ============================================================================
export async function exportarReporteAuditoriaExcel(data: ReporteAuditoria) {
  const wb = nuevoWorkbook('Reporte de Auditoría');
  const ws1 = wb.addWorksheet('Resumen');
  pintarResumen(ws1, 'Reporte de Auditoría', `Período: ${data.desde} — ${data.hasta}`, [
    { k: 'Total eventos',  v: data.totales.total },
    { k: 'Inserciones',    v: data.totales.insert },
    { k: 'Modificaciones', v: data.totales.update },
    { k: 'Borrados',       v: data.totales.delete },
  ]);

  const ws2 = wb.addWorksheet('Por día');
  ws2.columns = [
    { header: 'Día',           key: 'dia',          width: 14 },
    { header: 'Total',         key: 'total',        width: 10 },
    { header: 'Insertados',    key: 'insertados',   width: 14 },
    { header: 'Modificados',   key: 'modificados',  width: 14 },
    { header: 'Eliminados',    key: 'eliminados',   width: 14 },
  ];
  ws2.addRows((data.por_dia ?? []).map(d => ({ ...d, dia: d.dia?.slice(0, 10) })));
  styleHeader(ws2);

  const ws3 = wb.addWorksheet('Por tabla');
  ws3.columns = [
    { header: 'Tabla',         key: 'tabla',        width: 24 },
    { header: 'Total',         key: 'total',        width: 10 },
    { header: 'Insertados',    key: 'insertados',   width: 14 },
    { header: 'Modificados',   key: 'modificados',  width: 14 },
    { header: 'Eliminados',    key: 'eliminados',   width: 14 },
  ];
  ws3.addRows(data.por_tabla ?? []);
  styleHeader(ws3);

  const ws4 = wb.addWorksheet('Por actor');
  ws4.columns = [
    { header: 'Actor',   key: 'actor',     width: 30 },
    { header: 'Rol',     key: 'actor_rol', width: 16 },
    { header: 'Eventos', key: 'total',     width: 12 },
  ];
  ws4.addRows(data.por_actor ?? []);
  styleHeader(ws4);

  await descargar(wb, `reporte_auditoria_${data.desde}_${data.hasta}.xlsx`);
}

// ============================================================================
// USUARIOS
// ============================================================================
export async function exportarReporteUsuariosExcel(data: ReporteUsuarios) {
  const wb = nuevoWorkbook('Reporte de Usuarios');
  const today = new Date().toISOString().slice(0, 10);
  const ws1 = wb.addWorksheet('Resumen');
  pintarResumen(ws1, 'Reporte de Usuarios', `Generado: ${today}`, [
    { k: 'Total',                v: data.totales.total },
    { k: 'Activos',              v: data.totales.activos },
    { k: 'Inactivos',            v: data.totales.inactivos },
    { k: 'Conectados (30 días)', v: data.totales.conectados_30d },
    { k: 'Nunca conectados',     v: data.totales.nunca_conectados },
  ]);

  const ws2 = wb.addWorksheet('Por rol');
  ws2.columns = [
    { header: 'Rol',     key: 'rol',     width: 22 },
    { header: 'Total',   key: 'total',   width: 12 },
    { header: 'Activos', key: 'activos', width: 12 },
  ];
  ws2.addRows(data.por_rol ?? []);
  styleHeader(ws2);

  const ws3 = wb.addWorksheet('Últimos accesos');
  ws3.columns = [
    { header: 'Usuario',        key: 'nombre_completo', width: 30 },
    { header: 'Email',          key: 'email',           width: 30 },
    { header: 'Username',       key: 'username',        width: 22 },
    { header: 'Rol',            key: 'rol_nombre',      width: 16 },
    { header: 'Activo',         key: 'activo',          width: 10 },
    { header: 'Último acceso',  key: 'ultimo_acceso',   width: 22 },
  ];
  ws3.addRows((data.ultimos_accesos ?? []).map(u => ({
    ...u,
    activo: u.activo ? 'Sí' : 'No',
    ultimo_acceso: u.ultimo_acceso
      ? new Date(u.ultimo_acceso).toLocaleString('es-CO')
      : 'Nunca',
  })));
  styleHeader(ws3);

  if (data.sin_conectar_30d?.length) {
    const ws4 = wb.addWorksheet('Sin conectar 30d');
    ws4.columns = [
      { header: 'Usuario',       key: 'nombre_completo', width: 30 },
      { header: 'Email',         key: 'email',           width: 30 },
      { header: 'Rol',           key: 'rol_nombre',      width: 16 },
      { header: 'Último acceso', key: 'ultimo_acceso',   width: 22 },
    ];
    ws4.addRows(data.sin_conectar_30d.map(u => ({
      ...u,
      ultimo_acceso: u.ultimo_acceso
        ? new Date(u.ultimo_acceso).toLocaleString('es-CO')
        : 'Nunca',
    })));
    styleHeader(ws4);
  }

  await descargar(wb, `reporte_usuarios_${today}.xlsx`);
}
