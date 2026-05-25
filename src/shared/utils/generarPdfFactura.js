import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { centroMedico as centroDefault } from '../../config/centroMedico';

// ─── Helpers de formato ──────────────────────────────────────────────────────
const fmtMoney = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number(n ?? 0));

const fmtFecha = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

// Fecha + hora exigida por DIAN para la expedición.
const fmtFechaHora = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
};

// Mapea 'CC' / 'CE' / 'NIT' / etc. al rótulo legible que pide la DIAN.
const tipoDocLabel = (tipo) => ({
  CC:  'C.C.',
  CE:  'C.E.',
  TI:  'T.I.',
  PA:  'Pasaporte',
  NIT: 'NIT',
  RC:  'R.C.',
}[String(tipo ?? '').toUpperCase()] ?? (tipo || 'Doc.'));

const estadoLabel = (e) => ({
  borrador:  'Borrador',
  pendiente: 'Pendiente de pago',
  pagada:    'Pagada',
  anulada:   'Anulada',
  vencida:   'Vencida',
}[e]) ?? e;

/**
 * Genera y descarga el PDF de la factura electrónica de venta.
 * Cumple los requisitos mínimos DIAN (Colombia):
 *   • Razón social + NIT del emisor y del adquiriente
 *   • Fecha y hora de expedición
 *   • Forma de pago, total, impuestos discriminados
 *   • Descripción de bienes/servicios (líneas)
 *   • Título "Factura electrónica de venta"
 *   • Resolución DIAN + prefijo + rango + vencimiento
 *   • Régimen tributario y calidad de retenedor
 *
 * @param {Object} factura  — fila de vw_admin_facturas o vw_paciente_mis_facturas
 *   campos esperados:
 *     numero_factura, estado, fecha_emision, fecha_vencimiento, fecha_pago,
 *     metodo_pago, subtotal, descuento, tasa_impuesto, impuesto, total,
 *     observaciones, motivo_anulacion,
 *     paciente_nombre, paciente_documento, paciente_tipo_documento,
 *     paciente_email, paciente_telefono,
 *     medico_nombre, medico_especialidad
 * @param {Array}  items    — filas de factura_item
 * @param {Object} [centro] — override de datos del emisor (default: centroMedico config)
 */
export function generarPdfFactura(factura, items, centro = centroDefault) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Merge profundo simple — campos opcionales del centro caen al default.
  const c = { ...centroDefault, ...centro,
    resolucion_dian: { ...centroDefault.resolucion_dian, ...(centro?.resolucion_dian ?? {}) }};

  // ─── Cabecera del emisor ─────────────────────────────────────────────
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(c.razon_social ?? 'Centro Médico', margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIT: ${c.nit ?? '—'}`, margin, y);                                 y += 3.5;
  doc.text(`${c.direccion ?? ''} · ${c.ciudad ?? ''}`, margin, y);             y += 3.5;
  doc.text(`${c.telefono ?? ''} · ${c.email ?? ''}`, margin, y);               y += 3.5;
  doc.text(`${c.regimen_tributario ?? ''} · ${c.responsable_iva ?? ''}`, margin, y); y += 3.5;
  doc.text(`Calidad: ${c.calidad_retenedor ?? '—'}`, margin, y);               y += 3.5;

  // ─── Banda del tipo de documento ─────────────────────────────────────
  const labelTipo = factura.estado === 'anulada'
    ? 'FACTURA ANULADA'
    : 'FACTURA ELECTRÓNICA DE VENTA';
  const bgTipo = factura.estado === 'anulada' ? [220, 38, 38] : [16, 185, 129];

  const bandaW = 80;
  const bandaH = 24;
  const bandaX = pageW - margin - bandaW;
  doc.setFillColor(...bgTipo);
  doc.rect(bandaX, margin, bandaW, bandaH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(labelTipo, bandaX + bandaW / 2, margin + 6, { align: 'center' });
  doc.setFontSize(14);
  doc.text(factura.numero_factura ?? '(borrador)', bandaX + bandaW / 2, margin + 13, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Estado: ${estadoLabel(factura.estado)}`, bandaX + bandaW / 2, margin + 19, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  y = Math.max(y, margin + bandaH) + 6;

  // ─── Línea separadora ───────────────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // ─── Fechas (incluye HORA, exigida por DIAN) ────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha y hora de expedición:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(fmtFechaHora(factura.fecha_emision), margin + 55, y);
  y += 4;

  if (factura.fecha_vencimiento) {
    doc.setFont('helvetica', 'bold');
    doc.text('Vencimiento de pago:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtFecha(factura.fecha_vencimiento), margin + 55, y);
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Forma de pago:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.metodo_pago ?? (factura.fecha_pago ? '—' : 'Pendiente'), margin + 55, y);
  y += 4;

  if (factura.fecha_pago) {
    doc.setFont('helvetica', 'bold');
    doc.text('Pagada el:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtFechaHora(factura.fecha_pago), margin + 55, y);
    y += 4;
  }

  y += 2;

  // ─── Datos adquiriente (cliente) ────────────────────────────────────
  const tipoDoc = tipoDocLabel(factura.paciente_tipo_documento);
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageW - margin * 2, 26, 'F');

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('ADQUIRIENTE', margin + 3, y + 4);
  doc.text('PROFESIONAL QUE PRESTÓ EL SERVICIO', pageW / 2 + 3, y + 4);
  doc.setTextColor(0, 0, 0);

  // Cliente — lado izquierdo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(String(factura.paciente_nombre ?? '—'), margin + 3, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${tipoDoc}: ${factura.paciente_documento ?? '—'}`, margin + 3, y + 13);
  if (factura.paciente_email)    doc.text(`Email: ${factura.paciente_email}`,    margin + 3, y + 17);
  if (factura.paciente_telefono) doc.text(`Tel.: ${factura.paciente_telefono}`,  margin + 3, y + 21);

  // Médico — lado derecho
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dr(a). ${factura.medico_nombre ?? '—'}`, pageW / 2 + 3, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (factura.medico_especialidad) doc.text(factura.medico_especialidad, pageW / 2 + 3, y + 13);
  if (factura.numero_historia)     doc.text(`Historia clínica: ${factura.numero_historia}`, pageW / 2 + 3, y + 17);

  y += 30;

  // ─── Tabla de items ──────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['#', 'Descripción del servicio o bien', 'Cant.', 'Precio unit.', 'Subtotal']],
    body: items.map((it, i) => [
      String(i + 1),
      it.descripcion + (it.notas ? `\n${it.notas}` : ''),
      Number(it.cantidad).toString(),
      fmtMoney(it.precio_unitario),
      fmtMoney(it.subtotal),
    ]),
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'right',  cellWidth: 18 },
      3: { halign: 'right',  cellWidth: 30 },
      4: { halign: 'right',  cellWidth: 32, fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ─── Totales (impuestos discriminados) ──────────────────────────────
  const totalesX = pageW - margin - 70;
  const totalesW = 70;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text('Subtotal:', totalesX, y);
  doc.text(fmtMoney(factura.subtotal), totalesX + totalesW, y, { align: 'right' });
  y += 5;

  if (Number(factura.descuento) > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text('Descuento:', totalesX, y);
    doc.text(`- ${fmtMoney(factura.descuento)}`, totalesX + totalesW, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 5;
  }

  if (Number(factura.tasa_impuesto) > 0) {
    const pct = (Number(factura.tasa_impuesto) * 100).toFixed(0);
    doc.text(`IVA (${pct}%):`, totalesX, y);
    doc.text(fmtMoney(factura.impuesto), totalesX + totalesW, y, { align: 'right' });
    y += 5;
  } else {
    doc.setFontSize(8);
    doc.text('IVA: Excluido', totalesX, y);
    doc.setFontSize(10);
    y += 5;
  }

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(totalesX, y, totalesX + totalesW, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TOTAL:', totalesX, y);
  doc.text(fmtMoney(factura.total), totalesX + totalesW, y, { align: 'right' });
  y += 8;

  // ─── Observaciones ──────────────────────────────────────────────────
  if (factura.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Observaciones:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(factura.observaciones, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  // ─── Bloque ANULADA ──────────────────────────────────────────────────
  if (factura.estado === 'anulada' && factura.motivo_anulacion) {
    doc.setFillColor(254, 226, 226);
    doc.rect(margin, y, pageW - margin * 2, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(9);
    doc.text('FACTURA ANULADA', margin + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Motivo: ${factura.motivo_anulacion}`, margin + 3, y + 9);
    doc.setTextColor(0, 0, 0);
    y += 14;
  }

  // ─── Bloque legal DIAN (pie) ─────────────────────────────────────────
  // Va siempre abajo: la DIAN exige resolución, rango y vencimiento.
  const dian = c.resolucion_dian ?? {};
  const pieY = pageH - 30;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(margin, pieY - 2, pageW - margin, pieY - 2);

  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Información legal — DIAN', margin, pieY + 2);
  doc.setFont('helvetica', 'normal');

  const dianLine1 = `${dian.modalidad ?? 'Factura electrónica de venta'} · Resolución DIAN N° ${dian.numero ?? '—'} del ${dian.fecha ?? '—'}`;
  const dianLine2 = `Autoriza numeración con prefijo "${dian.prefijo ?? '—'}" desde ${dian.desde ?? '—'} hasta ${dian.hasta ?? '—'} · Vigente hasta ${dian.vence ?? '—'}`;
  const dianLine3 = `${c.razon_social ?? ''} — ${c.regimen_tributario ?? ''} · ${c.responsable_iva ?? ''} · ${c.calidad_retenedor ?? ''}`;

  doc.text(dianLine1, margin, pieY + 6);
  doc.text(dianLine2, margin, pieY + 10);
  doc.text(dianLine3, margin, pieY + 14);

  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Representación impresa de factura electrónica · Generada ${fmtFechaHora(new Date().toISOString())}`,
    margin, pieY + 18,
  );
  doc.setTextColor(0, 0, 0);

  // ─── Descargar ──────────────────────────────────────────────────────
  const nombreArchivo = `${factura.numero_factura ?? 'borrador'}-${(factura.paciente_nombre ?? 'cliente').replace(/\s+/g, '_')}.pdf`;
  doc.save(nombreArchivo);
}

export default generarPdfFactura;
