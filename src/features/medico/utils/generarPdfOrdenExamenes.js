import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { centroMedico as centroDefault } from '../../../config/centroMedico';

/* =====================================================================
   Generador de PDF — Orden de Exámenes Paramédicos.
   Documento clínico de una sola página A4 que el médico entrega al
   paciente para que se realice los exámenes en el laboratorio. Contiene:
     • Identificación legal del centro emisor
     • Datos de identificación del paciente (nombre, doc, edad, género, HC)
     • Datos del médico solicitante (nombre, especialidad, licencia)
     • Lista numerada de exámenes solicitados con observaciones por línea
     • Indicaciones generales para el paciente
     • Línea de firma del médico
     • Validez del documento
   ===================================================================== */

const PALETTE = {
  primary:  [124, 58, 237],   // violet-600 (tono médico institucional)
  primary7: [109, 40, 217],   // violet-700
  tint:     [245, 243, 255],  // violet-50
  border:   [221, 214, 254],  // violet-200
  ink:      [11, 18, 32],
  inkN:     [49, 59, 82],
  inkM:     [91, 100, 120],
  inkS:     [144, 153, 172],
  line:     [228, 232, 239],
  surface:  [247, 248, 251],
};

const fmtFecha = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

const fmtFechaHora = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

const calcEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac);
  const hoy = new Date();
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
};

/**
 * @param {object} args
 * @param {object} args.paciente   — datos del paciente cargados en AtenderCita
 * @param {object} [args.medico]   — fila de medicoService.getById (si está disponible)
 * @param {object} [args.medicoFallback] — usuarioLogueado del AuthContext (fallback)
 * @param {object} [args.cita]     — cita relacionada (para el número de orden)
 * @param {object} args.orden      — { items: [{nombre, observaciones}], indicaciones }
 * @param {object} [args.centro]   — override del emisor (por defecto centroMedico)
 */
export function generarPdfOrdenExamenes({
  paciente, medico, medicoFallback, cita, orden, centro,
} = {}) {
  const c = { ...centroDefault, ...(centro ?? {}) };
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  /* ─── Cabecera: brand mark + centro médico ─── */
  // Mark monogram
  doc.setFillColor(...PALETTE.primary);
  doc.roundedRect(margin, y, 9, 9, 1.8, 1.8, 'F');
  // Pulso ECG dentro del mark
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  doc.setLineJoin('round');
  doc.setLineCap('round');
  doc.lines(
    [[1.4, 0], [0.6, -1.8], [0.5, 3.5], [0.5, -2.8], [0.6, 1.1], [1.6, 0]],
    margin + 1.4, y + 4.5,
  );
  doc.setLineWidth(0.2);

  // Wordmark
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PALETTE.ink);
  doc.text('Hospitalis', margin + 12, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.primary);
  doc.text('PRO', margin + 12 + doc.getTextWidth('Hospitalis') + 1.2, y + 4.5);

  // Datos del centro a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PALETTE.ink);
  doc.text(c.razon_social ?? 'Centro Médico Hospitalis', pageW - margin, y + 2.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.inkM);
  doc.text(`NIT ${c.nit ?? '—'}`, pageW - margin, y + 6, { align: 'right' });
  doc.text(
    `${c.direccion ?? ''} · ${c.ciudad ?? ''}`.trim(),
    pageW - margin, y + 9.5, { align: 'right' },
  );
  doc.text(
    `Tel: ${c.telefono ?? '—'} · ${c.email ?? ''}`,
    pageW - margin, y + 13, { align: 'right' },
  );

  y += 18;

  /* ─── Banda título ─── */
  doc.setDrawColor(...PALETTE.line);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);

  y += 6;

  // Eyebrow + título
  doc.setFillColor(...PALETTE.tint);
  doc.setDrawColor(...PALETTE.border);
  const eyebrowText = 'DOCUMENTO CLÍNICO';
  const eyebrowW = doc.getTextWidth(eyebrowText) + 4;
  doc.roundedRect(margin, y, eyebrowW, 4.5, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.primary7);
  doc.text(eyebrowText, margin + 2, y + 3.2);

  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...PALETTE.ink);
  doc.text('Orden de exámenes paramédicos', margin, y);

  y += 7;

  // Fecha + número de orden
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PALETTE.inkN);
  const numeroOrden = `ORD-${String(cita?.id_cita ?? Date.now()).slice(-8)}`;
  doc.text(`Fecha de emisión: ${fmtFecha(new Date().toISOString())}`, margin, y);
  doc.text(`N° orden: ${numeroOrden}`, pageW - margin, y, { align: 'right' });

  y += 4;

  // Stripe acento
  doc.setFillColor(...PALETTE.primary);
  doc.rect(margin, y, 30, 0.8, 'F');

  y += 8;

  /* ─── Sección PACIENTE ─── */
  y = drawSectionLabel(doc, y, 'Paciente', margin);
  y = drawInfoBox(doc, y, margin, pageW - margin * 2, [
    { label: 'Nombre completo', value: paciente?.nombre_completo ?? '—', span: 2 },
    { label: 'Tipo documento',  value: paciente?.tipo_documento ?? 'CC' },
    { label: 'Documento',       value: paciente?.documento ?? '—' },
    { label: 'Edad',            value: paciente?.edad != null
                                  ? `${paciente.edad} años`
                                  : (paciente?.fecha_nacimiento
                                      ? `${calcEdad(paciente.fecha_nacimiento) ?? '—'} años`
                                      : '—') },
    { label: 'Género',          value: paciente?.genero ?? '—' },
    { label: 'Historia clínica', value: paciente?.numero_historia ?? '—' },
    { label: 'Teléfono',         value: paciente?.telefono ?? '—' },
  ]);

  y += 4;

  /* ─── Sección MÉDICO SOLICITANTE ─── */
  const medNombre = medico?.nombre_completo
    ?? medico?.medico
    ?? (medicoFallback?.nombres
        ? `${medicoFallback?.nombres ?? ''} ${medicoFallback?.apellidos ?? ''}`.trim()
        : medicoFallback?.nombre ?? '—');
  const medEsp = medico?.especialidad ?? medicoFallback?.especialidad ?? '—';
  const medLic = medico?.numero_licencia ?? medicoFallback?.numero_licencia ?? '—';
  const medConsultorio = medico?.consultorio ?? '—';

  y = drawSectionLabel(doc, y, 'Médico solicitante', margin);
  y = drawInfoBox(doc, y, margin, pageW - margin * 2, [
    { label: 'Nombre', value: `Dr(a). ${medNombre}`, span: 2 },
    { label: 'Especialidad',     value: medEsp },
    { label: 'N° licencia',      value: medLic },
    { label: 'Consultorio',      value: medConsultorio },
  ]);

  y += 4;

  /* ─── Sección EXÁMENES SOLICITADOS ─── */
  y = drawSectionLabel(doc, y, `Exámenes solicitados (${orden?.items?.length ?? 0})`, margin);

  const itemsBody = (orden?.items ?? []).map((it, i) => [
    `${i + 1}`,
    it.nombre ?? '',
    it.observaciones ?? '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Examen', 'Observaciones / preparación']],
    body: itemsBody.length > 0 ? itemsBody : [['—', '—', '—']],
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      textColor: [PALETTE.inkN[0], PALETTE.inkN[1], PALETTE.inkN[2]],
      lineColor: [PALETTE.line[0], PALETTE.line[1], PALETTE.line[2]],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [PALETTE.surface[0], PALETTE.surface[1], PALETTE.surface[2]],
      textColor: [PALETTE.inkM[0], PALETTE.inkM[1], PALETTE.inkM[2]],
      fontStyle: 'bold',
      fontSize: 7,
      lineWidth: { top: 0.3, right: 0, bottom: 0.4, left: 0 },
      lineColor: [PALETTE.line[0], PALETTE.line[1], PALETTE.line[2]],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10, fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { textColor: [PALETTE.inkM[0], PALETTE.inkM[1], PALETTE.inkM[2]] },
    },
    bodyStyles: {
      lineWidth: { top: 0, right: 0, bottom: 0.15, left: 0 },
    },
    alternateRowStyles: {
      fillColor: [251, 251, 253],
    },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error
  y = doc.lastAutoTable.finalY + 6;

  /* ─── Indicaciones generales ─── */
  if (orden?.indicaciones?.trim()) {
    y = drawSectionLabel(doc, y, 'Indicaciones generales', margin);
    const usableW = pageW - margin * 2;
    const lines = doc.splitTextToSize(orden.indicaciones, usableW - 6);
    const blockH = lines.length * 4.5 + 6;

    doc.setFillColor(...PALETTE.tint);
    doc.setDrawColor(...PALETTE.border);
    doc.roundedRect(margin, y, usableW, blockH, 2, 2, 'FD');
    doc.setFillColor(...PALETTE.primary);
    doc.rect(margin, y, 0.8, blockH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.inkN);
    doc.text(lines, margin + 4, y + 5);

    y += blockH + 6;
  }

  /* ─── Línea de firma del médico ─── */
  // Si no hay espacio para la firma + footer, saltamos a la posición fija
  const minSpaceForSignature = 28;
  if (y + minSpaceForSignature > pageH - 18) {
    y = pageH - 18 - minSpaceForSignature;
  } else {
    y = Math.max(y, pageH - 50);
  }

  // Línea para firma
  doc.setDrawColor(...PALETTE.inkN);
  doc.setLineWidth(0.4);
  const firmaW = 70;
  const firmaX = margin;
  doc.line(firmaX, y, firmaX + firmaW, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PALETTE.ink);
  doc.text(`Dr(a). ${medNombre}`, firmaX, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PALETTE.inkM);
  doc.text(`${medEsp} · Licencia: ${medLic}`, firmaX, y + 8.5);
  doc.text('Firma y sello del médico', firmaX, y + 12, );

  /* ─── Footer ─── */
  doc.setDrawColor(...PALETTE.line);
  doc.setLineWidth(0.2);
  doc.line(margin, pageH - 12, pageW - margin, pageH - 12);

  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.inkS);
  doc.text(
    `Generado el ${fmtFechaHora(new Date().toISOString())}`,
    margin, pageH - 7,
  );
  doc.text(
    'Validez: 30 días desde la emisión',
    pageW - margin, pageH - 7, { align: 'right' },
  );

  /* ─── Descarga ─── */
  const pacSlug = (paciente?.documento ?? paciente?.nombre_completo ?? 'paciente')
    .toString().replace(/[^a-z0-9]/gi, '_').slice(0, 30);
  doc.save(`orden_examenes_${pacSlug}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* =====================================================================
   Helpers de dibujo
   ===================================================================== */

function drawSectionLabel(doc, y, titulo, margin) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PALETTE.primary7);
  doc.text(titulo.toUpperCase(), margin, y);
  // Mini regla
  doc.setDrawColor(...PALETTE.primary);
  doc.setLineWidth(0.6);
  doc.line(margin, y + 1.5, margin + 10, y + 1.5);
  doc.setLineWidth(0.2);
  return y + 5;
}

/**
 * Dibuja una caja de "información clave" con etiquetas + valores en grid
 * de 2 columnas. Cada campo puede ocupar 1 o 2 columnas (span).
 */
function drawInfoBox(doc, y, x, w, fields) {
  const colW = w / 2;
  const rowH = 8;

  // Calcular altura total
  let rowsCount = 0;
  let col = 0;
  fields.forEach(f => {
    const sp = f.span ?? 1;
    if (col + sp > 2) { rowsCount++; col = 0; }
    if (sp === 2) { rowsCount++; col = 0; }
    else { col += 1; if (col === 2) { rowsCount++; col = 0; } }
  });
  if (col > 0) rowsCount++;

  const boxH = rowsCount * rowH + 4;

  // Card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PALETTE.line);
  doc.roundedRect(x, y, w, boxH, 1.5, 1.5, 'FD');

  // Pintar campos
  let cy = y + 2;
  col = 0;
  fields.forEach(f => {
    const sp = f.span ?? 1;
    if (col + sp > 2) { cy += rowH; col = 0; }
    const cx = x + col * colW;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...PALETTE.inkM);
    doc.text(f.label.toUpperCase(), cx + 3, cy + 3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PALETTE.ink);
    const valueText = String(f.value ?? '—');
    const maxW = colW * sp - 6;
    const truncated = doc.splitTextToSize(valueText, maxW)[0] ?? '—';
    doc.text(truncated, cx + 3, cy + 7);

    if (sp === 2) { cy += rowH; col = 0; }
    else {
      col += 1;
      if (col === 2) { cy += rowH; col = 0; }
    }
  });

  return y + boxH;
}
