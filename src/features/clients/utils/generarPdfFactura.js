import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtMoney = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number(n ?? 0));

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

/**
 * Genera y descarga un PDF de factura.
 * @param {Object} factura — fila de vw_admin_facturas / vw_paciente_mis_facturas
 * @param {Array}  items   — filas de factura_item
 * @param {Object} centro  — datos del centro médico (nombre, NIT, dir, tel)
 */
export function generarPdfFactura(factura, items, centro = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const nombreCentro = centro.nombre ?? 'Centro Médico Hospitalis';
  const nit          = centro.nit    ?? 'NIT 900.000.000-0';
  const direccion    = centro.direccion ?? 'Av. Principal #123, Ciudad';
  const telefono     = centro.telefono  ?? 'Tel: +57 (1) 234-5678';
  const email        = centro.email     ?? 'facturacion@hospitalis.co';

  // ─── Cabecera del centro médico ─────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(nombreCentro, margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(nit, margin, y);              y += 4;
  doc.text(direccion, margin, y);        y += 4;
  doc.text(`${telefono} · ${email}`, margin, y);  y += 4;

  // ─── Banda del tipo de documento (FACTURA / ANULADA) ────────────────
  const labelTipo = factura.estado === 'anulada' ? 'FACTURA ANULADA' : 'FACTURA DE VENTA';
  const bgTipo = factura.estado === 'anulada' ? [220, 38, 38] : [16, 185, 129];

  doc.setFillColor(...bgTipo);
  doc.rect(pageW - margin - 70, margin, 70, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(labelTipo, pageW - margin - 35, margin + 7, { align: 'center' });
  doc.setFontSize(13);
  doc.text(factura.numero_factura ?? '(borrador)', pageW - margin - 35, margin + 14, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  y = Math.max(y, margin + 22) + 8;

  // ─── Estado y fechas ───────────────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha emisión:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(fmtDate(factura.fecha_emision), margin + 30, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', pageW / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(estadoLabel(factura.estado), pageW / 2 + 15, y);
  y += 5;

  if (factura.fecha_vencimiento) {
    doc.setFont('helvetica', 'bold');
    doc.text('Vencimiento:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtDate(factura.fecha_vencimiento), margin + 30, y);
    y += 5;
  }
  if (factura.fecha_pago) {
    doc.setFont('helvetica', 'bold');
    doc.text('Pagada el:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(fmtDateTime(factura.fecha_pago) + (factura.metodo_pago ? ` · ${factura.metodo_pago}` : ''), margin + 30, y);
    y += 5;
  }

  // ─── Datos del paciente / médico ────────────────────────────────────
  y += 3;
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageW - margin * 2, 22, 'F');

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('CLIENTE', margin + 3, y + 4);
  doc.text('PROFESIONAL', pageW / 2 + 3, y + 4);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(String(factura.paciente_nombre ?? '—'), margin + 3, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (factura.paciente_documento) doc.text(`Doc: ${factura.paciente_documento}`, margin + 3, y + 13);
  if (factura.paciente_email)     doc.text(factura.paciente_email, margin + 3, y + 17);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dr(a). ${factura.medico_nombre ?? '—'}`, pageW / 2 + 3, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (factura.medico_especialidad) doc.text(factura.medico_especialidad, pageW / 2 + 3, y + 13);

  y += 26;

  // ─── Tabla de items ─────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['#', 'Descripción', 'Cant.', 'Precio unit.', 'Subtotal']],
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

  // ─── Totales ────────────────────────────────────────────────────────
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
    doc.text(`Impuesto (${pct}%):`, totalesX, y);
    doc.text(fmtMoney(factura.impuesto), totalesX + totalesW, y, { align: 'right' });
    y += 5;
  }

  // Línea + TOTAL
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(totalesX, y, totalesX + totalesW, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TOTAL:', totalesX, y);
  doc.text(fmtMoney(factura.total), totalesX + totalesW, y, { align: 'right' });

  y += 10;

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

  // ─── Pie de página ──────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, pageH - 18, pageW - margin, pageH - 18);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento generado electrónicamente.', margin, pageH - 14);
  doc.text(`Generado: ${fmtDateTime(new Date().toISOString())}`, margin, pageH - 10);
  doc.text(`Página 1 de 1`, pageW - margin, pageH - 10, { align: 'right' });

  // Descargar
  const nombreArchivo = `${factura.numero_factura ?? 'borrador'}-${(factura.paciente_nombre ?? 'paciente').replace(/\s+/g, '_')}.pdf`;
  doc.save(nombreArchivo);
}

function estadoLabel(e) {
  return ({
    borrador:  'Borrador',
    pendiente: 'Pendiente de pago',
    pagada:    'Pagada',
    anulada:   'Anulada',
    vencida:   'Vencida',
  }[e]) ?? e;
}
