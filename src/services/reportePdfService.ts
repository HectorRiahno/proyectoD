import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtMoney, fmtNumber } from './reportesService';
import type {
  ReportePacientes, ReporteMedicos, ReporteHorarios,
  ReporteFinanciero, ReporteInventario, ReporteAuditoria, ReporteUsuarios,
} from './reportesService';

// Generadores PDF para los 7 reportes detallados.
// Cada uno comparte el mismo header/footer; el contenido cambia.

interface CentroMedico {
  nombre?: string; nit?: string; direccion?: string; telefono?: string;
}

const fmtFecha = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

// ─── Plantilla base — header + footer comunes ────────────────────────────────
function nuevoDoc(titulo: string, subtitulo: string, centro: CentroMedico = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const nombreCentro = centro.nombre    ?? 'Centro Médico Hospitalis';
  const nit          = centro.nit       ?? 'NIT 900.000.000-0';
  const direccion    = centro.direccion ?? 'Av. Principal #123, Ciudad';

  // Encabezado del centro
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(nombreCentro, margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${nit} · ${direccion}`, margin, y);
  y += 6;

  // Banda del título
  doc.setFillColor(37, 99, 235);
  doc.rect(margin, y, pageW - margin * 2, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo.toUpperCase(), pageW / 2, y + 6.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 14;

  // Subtítulo (rango de fechas)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text(subtitulo, margin, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  y += 6;

  return { doc, pageW, margin, y };
}

function pintarPie(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 15, pageH - 8);
    doc.text(`Página ${p} de ${total}`, pageW - 15, pageH - 8, { align: 'right' });
  }
}

// Dibuja una grid 2×2 (o N×2) de tarjetas KPI
function pintarKpisGrid(
  doc: jsPDF, x: number, y: number, ancho: number,
  kpis: Array<{ label: string; value: string }>,
): number {
  const cols = 2;
  const cellW = ancho / cols;
  const cellH = 16;
  let cy = y;

  kpis.forEach((k, i) => {
    const cx = x + (i % cols) * cellW;
    if (i > 0 && i % cols === 0) cy += cellH + 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, cy, cellW - 2, cellH, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label.toUpperCase(), cx + 3, cy + 5);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(k.value, cx + 3, cy + 12);
    doc.setFont('helvetica', 'normal');
  });
  return cy + cellH + 4;
}

const tableHead = (colores: 'blue'|'emerald'|'red'|'purple'|'amber'|'slate' = 'blue') => {
  const map = {
    blue:    [37, 99, 235],
    emerald: [5, 150, 105],
    red:     [220, 38, 38],
    purple:  [147, 51, 234],
    amber:   [217, 119, 6],
    slate:   [71, 85, 105],
  };
  return { fillColor: map[colores], textColor: 255, fontStyle: 'bold' as const };
};

// ============================================================================
// REPORTE DE PACIENTES
// ============================================================================
export function exportarReportePacientesPdf(data: ReportePacientes, centro?: CentroMedico) {
  const { doc, pageW, margin } = nuevoDoc(
    'Reporte de Pacientes',
    `Período: ${fmtFecha(data.desde)} — ${fmtFecha(data.hasta)}`,
    centro,
  );
  let y = (doc as unknown as { _y?: number })._y ?? 36;

  y = pintarKpisGrid(doc, margin, y, pageW - margin * 2, [
    { label: 'Registrados',       value: fmtNumber(data.totales.registrados) },
    { label: 'Nuevos en período',  value: fmtNumber(data.totales.nuevos) },
    { label: 'Atendidos',          value: fmtNumber(data.totales.atendidos) },
    { label: 'Inactivos (>12m)',   value: fmtNumber(data.totales.inactivos_12m) },
  ]);

  // Demografía
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Demografía', margin, y);
  y += 2;
  autoTable(doc, {
    startY: y + 2,
    head: [['Género', 'Rango edad', 'Total']],
    body: data.demografia.map(d => [d.genero, d.rango_edad, fmtNumber(d.total)]),
    theme: 'grid', styles: { fontSize: 9 },
    headStyles: tableHead('blue'),
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error jspdf-autotable extiende doc
  y = doc.lastAutoTable.finalY + 6;

  // Diagnósticos top
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Diagnósticos más frecuentes', margin, y);
  autoTable(doc, {
    startY: y + 2,
    head: [['CIE-10', 'Diagnóstico', 'Frecuencia', 'Pacientes únicos']],
    body: (data.diagnosticos_top ?? []).map(d => [
      d.codigo_cie10 ?? '—', d.diagnostico,
      fmtNumber(d.frecuencia), fmtNumber(d.pacientes_unicos),
    ]),
    theme: 'striped', styles: { fontSize: 9 },
    headStyles: tableHead('emerald'),
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 6;

  // Pacientes frecuentes
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Pacientes más frecuentes', margin, y);
  autoTable(doc, {
    startY: y + 2,
    head: [['Paciente', 'Documento', 'Visitas', 'Última visita']],
    body: (data.frecuentes_top ?? []).map(p => [
      p.paciente, p.documento ?? '—',
      fmtNumber(p.visitas), p.ultima_visita?.slice(0, 10) ?? '—',
    ]),
    theme: 'striped', styles: { fontSize: 9 },
    headStyles: tableHead('purple'),
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 6;

  // Inactivos (puede ir en página nueva)
  if (data.inactivos?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pacientes sin visita (>12 meses) — ${data.inactivos.length}`, margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Paciente', 'Documento', 'Email', 'Última consulta', 'Días sin visita']],
      body: data.inactivos.map(p => [
        p.nombre_completo, p.documento ?? '—', p.email ?? '—',
        p.ultima_consulta?.slice(0, 10) ?? 'Nunca',
        fmtNumber(p.dias_sin_visita),
      ]),
      theme: 'striped', styles: { fontSize: 8 },
      headStyles: tableHead('amber'),
      margin: { left: margin, right: margin },
    });
  }

  pintarPie(doc);
  doc.save(`reporte_pacientes_${data.desde}_${data.hasta}.pdf`);
}

// ============================================================================
// REPORTE DE MÉDICOS
// ============================================================================
export function exportarReporteMedicosPdf(data: ReporteMedicos, centro?: CentroMedico) {
  const { doc, pageW, margin } = nuevoDoc(
    'Reporte de Médicos',
    `Período: ${fmtFecha(data.desde)} — ${fmtFecha(data.hasta)}`,
    centro,
  );
  let y = 36;

  y = pintarKpisGrid(doc, margin, y, pageW - margin * 2, [
    { label: 'Médicos activos',  value: fmtNumber(data.totales.medicos_activos) },
    { label: 'Total consultas',  value: fmtNumber(data.totales.consultas_total) },
    { label: 'Tiempo promedio',  value: `${fmtNumber(data.totales.tiempo_promedio ?? 0)} min` },
    { label: 'Cancelaciones',    value: fmtNumber(data.totales.cancelaciones) },
  ]);

  // Tabla por médico
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Productividad por médico', margin, y);
  autoTable(doc, {
    startY: y + 2,
    head: [['Médico', 'Especialidad', 'Consultas', 'Pacientes', 'Canceladas', 'Min/cons', 'Cons/día']],
    body: (data.por_medico ?? []).map(m => [
      m.medico, m.especialidad ?? '—',
      fmtNumber(m.consultas), fmtNumber(m.pacientes_unicos),
      fmtNumber(m.canceladas), fmtNumber(m.min_promedio ?? 0),
      m.consultas_por_dia?.toFixed(2) ?? '0.00',
    ]),
    theme: 'striped', styles: { fontSize: 8 },
    headStyles: tableHead('emerald'),
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 6;

  // Por especialidad
  if (data.por_especialidad?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Por especialidad', margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Especialidad', 'Consultas', 'Médicos']],
      body: data.por_especialidad.map(e => [
        e.especialidad, fmtNumber(e.consultas), fmtNumber(e.medicos),
      ]),
      theme: 'grid', styles: { fontSize: 9 },
      headStyles: tableHead('purple'),
      margin: { left: margin, right: margin },
    });
  }

  pintarPie(doc);
  doc.save(`reporte_medicos_${data.desde}_${data.hasta}.pdf`);
}

// ============================================================================
// REPORTE DE HORARIOS
// ============================================================================
export function exportarReporteHorariosPdf(data: ReporteHorarios, centro?: CentroMedico) {
  const { doc, pageW, margin } = nuevoDoc(
    'Reporte de Horarios',
    `Período: ${fmtFecha(data.desde)} — ${fmtFecha(data.hasta)} (${data.periodo_dias} días)`,
    centro,
  );
  let y = 36;

  y = pintarKpisGrid(doc, margin, y, pageW - margin * 2, [
    { label: 'Horarios ocupados', value: fmtNumber(data.totales.ocupados) },
    { label: 'Completadas',       value: fmtNumber(data.totales.completadas) },
    { label: 'Canceladas',        value: fmtNumber(data.totales.canceladas) },
    { label: 'No asistió',        value: fmtNumber(data.totales.no_asistio) },
  ]);

  // Horas pico
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Horas pico (últimos 30 días)', margin, y);
  autoTable(doc, {
    startY: y + 2,
    head: [['Hora', 'Citas']],
    body: (data.horas_pico ?? []).map(h => [`${String(h.hora).padStart(2,'0')}:00`, fmtNumber(h.citas)]),
    theme: 'striped', styles: { fontSize: 9 },
    headStyles: tableHead('amber'),
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 6;

  // Por día de la semana
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Por día de la semana', margin, y);
  autoTable(doc, {
    startY: y + 2,
    head: [['Día', 'Citas', 'Canceladas']],
    body: (data.por_dia_semana ?? []).map(d => [d.dia, fmtNumber(d.citas), fmtNumber(d.canceladas)]),
    theme: 'grid', styles: { fontSize: 9 },
    headStyles: tableHead('blue'),
    margin: { left: margin, right: margin },
  });

  pintarPie(doc);
  doc.save(`reporte_horarios_${data.desde}_${data.hasta}.pdf`);
}

// ============================================================================
// REPORTE FINANCIERO
// ============================================================================
export function exportarReporteFinancieroPdf(data: ReporteFinanciero, centro?: CentroMedico) {
  const { doc, pageW, margin } = nuevoDoc(
    'Reporte Financiero',
    `Período: ${fmtFecha(data.desde)} — ${fmtFecha(data.hasta)}`,
    centro,
  );
  let y = 36;

  y = pintarKpisGrid(doc, margin, y, pageW - margin * 2, [
    { label: 'Facturas emitidas',  value: fmtNumber(data.totales.emitidas) },
    { label: 'Pagadas',            value: fmtNumber(data.totales.pagadas) },
    { label: 'Pendientes',         value: fmtNumber(data.totales.pendientes) },
    { label: 'Anuladas',           value: fmtNumber(data.totales.anuladas) },
    { label: 'Ingresos cobrados',  value: fmtMoney(data.totales.ingresos_pagados) },
    { label: 'Por cobrar (total)', value: fmtMoney(data.totales.por_cobrar) },
    { label: 'Ticket promedio',    value: fmtMoney(data.totales.ticket_promedio) },
    { label: 'Facturado período',  value: fmtMoney(data.totales.ingresos_facturados) },
  ]);

  // Servicios top
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Servicios más vendidos', margin, y);
  autoTable(doc, {
    startY: y + 2,
    head: [['Servicio', 'Veces', 'Unidades', 'Ingreso']],
    body: (data.servicios_top ?? []).map(s => [
      s.servicio, fmtNumber(s.veces_vendido), fmtNumber(s.unidades), fmtMoney(s.ingreso_generado),
    ]),
    theme: 'striped', styles: { fontSize: 9 },
    headStyles: tableHead('emerald'),
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 6;

  // Por método de pago
  if (data.por_metodo_pago?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Ingresos por método de pago', margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Método', 'Pagos', 'Monto']],
      body: data.por_metodo_pago.map(m => [m.metodo_pago, fmtNumber(m.n), fmtMoney(m.monto)]),
      theme: 'grid', styles: { fontSize: 9 },
      headStyles: tableHead('purple'),
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error
    y = doc.lastAutoTable.finalY + 6;
  }

  // Cartera vencida
  if (data.cartera_vencida?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Cartera vencida — ${data.cartera_vencida.length}`, margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['# Factura', 'Paciente', 'Emisión', 'Total', 'Días mora']],
      body: data.cartera_vencida.map(c => [
        c.numero_factura ?? '—', c.paciente_nombre ?? '—',
        c.fecha_emision?.slice(0, 10), fmtMoney(c.total), fmtNumber(c.dias_mora),
      ]),
      theme: 'striped', styles: { fontSize: 8 },
      headStyles: tableHead('red'),
      margin: { left: margin, right: margin },
    });
  }

  pintarPie(doc);
  doc.save(`reporte_financiero_${data.desde}_${data.hasta}.pdf`);
}

// ============================================================================
// REPORTE DE INVENTARIO
// ============================================================================
export function exportarReporteInventarioPdf(data: ReporteInventario, centro?: CentroMedico) {
  const { doc, pageW, margin } = nuevoDoc(
    'Reporte de Inventario',
    `Generado: ${fmtFecha(new Date().toISOString().slice(0, 10))}`,
    centro,
  );
  let y = 36;

  y = pintarKpisGrid(doc, margin, y, pageW - margin * 2, [
    { label: 'Total medicamentos', value: fmtNumber(data.totales.total_medicamentos) },
    { label: 'Agotados',           value: fmtNumber(data.totales.agotados) },
    { label: 'Críticos (≤5)',      value: fmtNumber(data.totales.criticos) },
    { label: 'Bajos (≤10)',        value: fmtNumber(data.totales.bajos) },
    { label: 'Valor inventario',   value: fmtMoney(data.totales.valor_inventario) },
    { label: 'Categorías',         value: fmtNumber(data.totales.categorias) },
  ]);

  // Críticos
  if (data.criticos?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Medicamentos críticos — ${data.criticos.length}`, margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Medicamento', 'Categoría', 'Stock', 'Estado', 'Precio']],
      body: data.criticos.map(m => [
        m.nombre, m.categoria ?? '—',
        fmtNumber(m.stock), m.estado_stock.toUpperCase(),
        fmtMoney(m.precio ?? 0),
      ]),
      theme: 'striped', styles: { fontSize: 8 },
      headStyles: tableHead('red'),
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error
    y = doc.lastAutoTable.finalY + 6;
  }

  // Más usados
  if (data.mas_usados?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Medicamentos más recetados (90 días)', margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Medicamento', 'Presentación', 'Recetas', 'Stock', 'Precio']],
      body: data.mas_usados.map(m => [
        m.nombre, m.presentacion ?? '—',
        fmtNumber(m.recetas), fmtNumber(m.stock),
        fmtMoney(m.precio ?? 0),
      ]),
      theme: 'striped', styles: { fontSize: 8 },
      headStyles: tableHead('emerald'),
      margin: { left: margin, right: margin },
    });
  }

  pintarPie(doc);
  doc.save(`reporte_inventario_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ============================================================================
// REPORTE DE AUDITORÍA
// ============================================================================
export function exportarReporteAuditoriaPdf(data: ReporteAuditoria, centro?: CentroMedico) {
  const { doc, pageW, margin } = nuevoDoc(
    'Reporte de Auditoría',
    `Período: ${fmtFecha(data.desde)} — ${fmtFecha(data.hasta)}`,
    centro,
  );
  let y = 36;

  y = pintarKpisGrid(doc, margin, y, pageW - margin * 2, [
    { label: 'Total eventos',   value: fmtNumber(data.totales.total) },
    { label: 'Inserciones',     value: fmtNumber(data.totales.insert) },
    { label: 'Modificaciones',  value: fmtNumber(data.totales.update) },
    { label: 'Borrados',        value: fmtNumber(data.totales.delete) },
  ]);

  // Por tabla
  if (data.por_tabla?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Eventos por tabla', margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Tabla', 'Total', 'Insertados', 'Modificados', 'Eliminados']],
      body: data.por_tabla.map(t => [
        t.tabla, fmtNumber(t.total),
        fmtNumber(t.insertados), fmtNumber(t.modificados), fmtNumber(t.eliminados),
      ]),
      theme: 'striped', styles: { fontSize: 9 },
      headStyles: tableHead('slate'),
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error
    y = doc.lastAutoTable.finalY + 6;
  }

  // Por actor
  if (data.por_actor?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Eventos por actor', margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Actor', 'Rol', 'Eventos']],
      body: data.por_actor.map(a => [a.actor, a.actor_rol ?? '—', fmtNumber(a.total)]),
      theme: 'striped', styles: { fontSize: 9 },
      headStyles: tableHead('blue'),
      margin: { left: margin, right: margin },
    });
  }

  pintarPie(doc);
  doc.save(`reporte_auditoria_${data.desde}_${data.hasta}.pdf`);
}

// ============================================================================
// REPORTE DE USUARIOS
// ============================================================================
export function exportarReporteUsuariosPdf(data: ReporteUsuarios, centro?: CentroMedico) {
  const { doc, pageW, margin } = nuevoDoc(
    'Reporte de Usuarios',
    `Generado: ${fmtFecha(new Date().toISOString().slice(0, 10))}`,
    centro,
  );
  let y = 36;

  y = pintarKpisGrid(doc, margin, y, pageW - margin * 2, [
    { label: 'Total',           value: fmtNumber(data.totales.total) },
    { label: 'Activos',         value: fmtNumber(data.totales.activos) },
    { label: 'Inactivos',       value: fmtNumber(data.totales.inactivos) },
    { label: 'Conectados 30d',  value: fmtNumber(data.totales.conectados_30d) },
  ]);

  // Por rol
  if (data.por_rol?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Usuarios por rol', margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Rol', 'Total', 'Activos']],
      body: data.por_rol.map(r => [r.rol, fmtNumber(r.total), fmtNumber(r.activos)]),
      theme: 'grid', styles: { fontSize: 9 },
      headStyles: tableHead('blue'),
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error
    y = doc.lastAutoTable.finalY + 6;
  }

  // Últimos accesos
  if (data.ultimos_accesos?.length) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Últimos accesos', margin, y);
    autoTable(doc, {
      startY: y + 2,
      head: [['Usuario', 'Email', 'Rol', 'Estado', 'Último acceso']],
      body: data.ultimos_accesos.map(u => [
        u.nombre_completo, u.email ?? '—', u.rol_nombre ?? '—',
        u.activo ? 'Activo' : 'Inactivo',
        u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-CO') : 'Nunca',
      ]),
      theme: 'striped', styles: { fontSize: 8 },
      headStyles: tableHead('emerald'),
      margin: { left: margin, right: margin },
    });
  }

  pintarPie(doc);
  doc.save(`reporte_usuarios_${new Date().toISOString().slice(0, 10)}.pdf`);
}
