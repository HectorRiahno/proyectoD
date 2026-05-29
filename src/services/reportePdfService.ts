import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtMoney, fmtNumber } from './reportesService';
import type {
  ReportePacientes, ReporteMedicos, ReporteHorarios,
  ReporteFinanciero, ReporteInventario, ReporteAuditoria, ReporteUsuarios,
} from './reportesService';

/* =====================================================================
   reportePdfService — Generador de PDFs financieros/operativos.
   Estructura premium siguiendo el estándar de informes corporativos:
     1. Portada (cover) — identidad de marca + título + período + meta
     2. Resumen ejecutivo (MD&A) — narrativa auto-generada de los KPIs
     3. Indicadores clave — grid de KPI cards con descripciones
     4. Secciones de detalle — tablas con jerarquía visual
     5. Notas metodológicas — cómo se calculan los datos
     6. Footer en cada página — entidad · reporte · paginado
   ===================================================================== */

interface CentroMedico {
  nombre?: string; nit?: string; direccion?: string; telefono?: string;
}

interface ReportMeta {
  titulo:     string;
  subtitulo?: string;
  eyebrow:   string;  // "REPORTE FINANCIERO", "REPORTE DE PACIENTES", etc.
  periodo:   string;  // "1 ene 2026 — 31 ene 2026" o "Generado al 28 may"
  archivoNombre: string;
  centro: Required<Pick<CentroMedico, 'nombre' | 'nit' | 'direccion'>>;
  accent: AccentName;
}

type AccentName = 'brand' | 'emerald' | 'amber' | 'violet' | 'sky' | 'slate' | 'rose';

/* ─── Paleta — espejo de los tokens del sistema en index.css ─── */
const PALETTE = {
  brand:   { primary: [30, 79, 216],   tint: [238, 243, 255], tintBorder: [221, 231, 254] }, // brand-600 / brand-50 / brand-100
  emerald: { primary: [5, 150, 105],   tint: [236, 253, 245], tintBorder: [209, 250, 229] }, // emerald-600 / emerald-50 / emerald-100
  amber:   { primary: [217, 119, 6],   tint: [255, 251, 235], tintBorder: [254, 243, 199] }, // amber-600 / amber-50 / amber-100
  violet:  { primary: [124, 58, 237],  tint: [245, 243, 255], tintBorder: [237, 233, 254] }, // violet-600 / violet-50 / violet-100
  sky:     { primary: [2, 132, 199],   tint: [240, 249, 255], tintBorder: [224, 242, 254] }, // sky-600 / sky-50 / sky-100
  slate:   { primary: [71, 85, 105],   tint: [247, 248, 251], tintBorder: [228, 232, 239] }, // ink-700 / surface / line
  rose:    { primary: [225, 29, 72],   tint: [255, 241, 242], tintBorder: [254, 226, 226] }, // rose-600 / rose-50 / rose-100
} as const satisfies Record<AccentName, { primary: number[]; tint: number[]; tintBorder: number[] }>;

const INK    = { strong: [11, 18, 32], normal: [49, 59, 82], muted: [91, 100, 120], soft: [144, 153, 172] };
const LINE   = [228, 232, 239];
const SURFACE = [247, 248, 251];

/* ─── Geometría ─── */
const MM = (n: number) => n;
const MARGIN = MM(15);
const COVER_MARGIN = MM(20);

const fmtFechaCorta = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtFechaLarga = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
};

/* =====================================================================
   PORTADA
   ===================================================================== */
function drawCover(doc: jsPDF, meta: ReportMeta) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const accent = PALETTE[meta.accent];

  // Brand mark — cuadrado redondeado con pulso ECG
  const markX = COVER_MARGIN;
  const markY = COVER_MARGIN;
  doc.setFillColor(accent.primary[0], accent.primary[1], accent.primary[2]);
  doc.roundedRect(markX, markY, 10, 10, 2, 2, 'F');
  // Pulso ECG simplificado en blanco
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.7);
  doc.setLineJoin('round');
  doc.setLineCap('round');
  const px = markX + 1.5;
  const py = markY + 5;
  doc.lines(
    [[1.5, 0], [0.6, -2], [0.5, 4], [0.5, -3.2], [0.6, 1.2], [2, 0]],
    px, py,
  );
  doc.setLineWidth(0.2);

  // Wordmark al lado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(INK.strong[0], INK.strong[1], INK.strong[2]);
  doc.text('Hospitalis', markX + 14, markY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(accent.primary[0], accent.primary[1], accent.primary[2]);
  doc.text('PRO', markX + 14 + doc.getTextWidth('Hospitalis') + 1.5, markY + 6);

  // Identificación de entidad arriba a la derecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
  doc.text(meta.centro.nombre, pageW - COVER_MARGIN, markY + 3, { align: 'right' });
  doc.text(meta.centro.nit, pageW - COVER_MARGIN, markY + 7, { align: 'right' });
  doc.text(meta.centro.direccion, pageW - COVER_MARGIN, markY + 11, { align: 'right' });

  // Watermark sutil: rejilla de puntos en el centro/abajo derecha
  doc.setFillColor(accent.primary[0], accent.primary[1], accent.primary[2]);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const anyDoc = doc as unknown as {
    GState: (opts: { opacity: number }) => unknown;
    setGState: (state: unknown) => void;
  };
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 14; col++) {
      const opacity = (row + col) / 32;
      if (opacity < 0.05) continue;
      anyDoc.setGState(anyDoc.GState({ opacity: 0.06 + opacity * 0.05 }));
      doc.circle(
        pageW - COVER_MARGIN - col * 6,
        pageH - COVER_MARGIN - 30 - row * 6,
        0.5, 'F',
      );
    }
  }
  anyDoc.setGState(anyDoc.GState({ opacity: 1 }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Bloque central — eyebrow + título + período
  const blockY = pageH / 2 - 30;

  // Eyebrow chip
  const eyebrowW = doc.getTextWidth(meta.eyebrow) + 6;
  doc.setFillColor(accent.tint[0], accent.tint[1], accent.tint[2]);
  doc.setDrawColor(accent.tintBorder[0], accent.tintBorder[1], accent.tintBorder[2]);
  doc.roundedRect(COVER_MARGIN, blockY, eyebrowW, 6, 1.5, 1.5, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(accent.primary[0], accent.primary[1], accent.primary[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(meta.eyebrow, COVER_MARGIN + 3, blockY + 4);

  // Título grande
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(INK.strong[0], INK.strong[1], INK.strong[2]);
  doc.text(meta.titulo, COVER_MARGIN, blockY + 22);

  // Subtítulo
  if (meta.subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(INK.normal[0], INK.normal[1], INK.normal[2]);
    doc.text(meta.subtitulo, COVER_MARGIN, blockY + 32);
  }

  // Período en cápsula
  doc.setFontSize(8);
  doc.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
  doc.text('PERÍODO DEL REPORTE', COVER_MARGIN, blockY + 46);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(INK.strong[0], INK.strong[1], INK.strong[2]);
  doc.text(meta.periodo, COVER_MARGIN, blockY + 53);

  // Barra acento horizontal larga
  doc.setFillColor(accent.primary[0], accent.primary[1], accent.primary[2]);
  doc.rect(COVER_MARGIN, blockY + 58, 40, 1.2, 'F');

  // Pie de portada
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(INK.soft[0], INK.soft[1], INK.soft[2]);
  doc.text('CONFIDENCIAL', COVER_MARGIN, pageH - COVER_MARGIN);
  doc.text(
    `Generado el ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} · ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`,
    pageW - COVER_MARGIN, pageH - COVER_MARGIN, { align: 'right' },
  );
}

/* =====================================================================
   HEADER + FOOTER (en páginas de contenido, no en portada)
   ===================================================================== */
function drawRunningHeaderFooter(doc: jsPDF, meta: ReportMeta) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const accent = PALETTE[meta.accent];
  const total = doc.getNumberOfPages();

  for (let p = 2; p <= total; p++) {
    doc.setPage(p);

    // Header
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, MM(12), pageW - MARGIN, MM(12));

    // Brand monogram pequeño
    doc.setFillColor(accent.primary[0], accent.primary[1], accent.primary[2]);
    doc.roundedRect(MARGIN, 5, 4, 4, 0.8, 0.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(INK.strong[0], INK.strong[1], INK.strong[2]);
    doc.text('Hospitalis Pro', MARGIN + 5.5, 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    doc.text(meta.titulo, pageW / 2, 8, { align: 'center' });
    doc.text(meta.periodo, pageW - MARGIN, 8, { align: 'right' });

    // Footer
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pageH - MM(12), pageW - MARGIN, pageH - MM(12));

    doc.setFontSize(7);
    doc.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    doc.text(`${meta.centro.nombre} · ${meta.centro.nit}`, MARGIN, pageH - 7);
    doc.setTextColor(INK.soft[0], INK.soft[1], INK.soft[2]);
    doc.text(`Página ${p} de ${total}`, pageW - MARGIN, pageH - 7, { align: 'right' });
  }

  // En la portada solo el footer minimal con copyright
  doc.setPage(1);
  doc.setFontSize(7);
  doc.setTextColor(INK.soft[0], INK.soft[1], INK.soft[2]);
  doc.text(`Página 1 de ${total}`, pageW - COVER_MARGIN, pageH - 7, { align: 'right' });
}

/* =====================================================================
   PRIMITIVES de contenido (corren en páginas > 1)
   ===================================================================== */

/** Asegura que hay al menos `needed` mm de espacio; si no, salta de página. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - MM(20)) {
    doc.addPage();
    return MM(20);
  }
  return y;
}

/** Header de sección: eyebrow + título + subtítulo opcional + regla. */
function drawSectionHeader(
  doc: jsPDF, y: number,
  eyebrow: string, titulo: string, subtitulo: string | undefined,
  accent: AccentName,
): number {
  y = ensureSpace(doc, y, 30);
  const pageW = doc.internal.pageSize.getWidth();
  const palette = PALETTE[accent];

  // Eyebrow
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(palette.primary[0], palette.primary[1], palette.primary[2]);
  doc.text(eyebrow.toUpperCase(), MARGIN, y);

  // Título
  doc.setFontSize(16);
  doc.setTextColor(INK.strong[0], INK.strong[1], INK.strong[2]);
  doc.text(titulo, MARGIN, y + 7);

  // Subtítulo
  if (subtitulo) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    doc.text(subtitulo, MARGIN, y + 13);
  }

  // Regla acento
  doc.setDrawColor(palette.primary[0], palette.primary[1], palette.primary[2]);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + (subtitulo ? 17 : 11), MARGIN + 18, y + (subtitulo ? 17 : 11));
  doc.setLineWidth(0.2);

  return y + (subtitulo ? 22 : 16);
}

/** Bloque de párrafo narrativo (MD&A) con justificado simple. */
function drawNarrative(doc: jsPDF, y: number, text: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usableW = pageW - MARGIN * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(INK.normal[0], INK.normal[1], INK.normal[2]);
  const lines = doc.splitTextToSize(text, usableW) as string[];
  const lineH = 5;
  y = ensureSpace(doc, y, lines.length * lineH + 4);
  doc.text(lines, MARGIN, y);
  return y + lines.length * lineH + 4;
}

/** Bloque "callout" con eyebrow + texto en panel tenue. */
function drawCallout(
  doc: jsPDF, y: number, eyebrow: string, text: string, accent: AccentName,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usableW = pageW - MARGIN * 2;
  const palette = PALETTE[accent];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(text, usableW - 8) as string[];
  const lineH = 4.5;
  const blockH = lines.length * lineH + 11;

  y = ensureSpace(doc, y, blockH + 4);

  // Panel
  doc.setFillColor(palette.tint[0], palette.tint[1], palette.tint[2]);
  doc.setDrawColor(palette.tintBorder[0], palette.tintBorder[1], palette.tintBorder[2]);
  doc.roundedRect(MARGIN, y, usableW, blockH, 2, 2, 'FD');

  // Stripe
  doc.setFillColor(palette.primary[0], palette.primary[1], palette.primary[2]);
  doc.rect(MARGIN, y, 0.8, blockH, 'F');

  // Eyebrow
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(palette.primary[0], palette.primary[1], palette.primary[2]);
  doc.text(eyebrow.toUpperCase(), MARGIN + 4, y + 4.5);

  // Texto
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(INK.normal[0], INK.normal[1], INK.normal[2]);
  doc.text(lines, MARGIN + 4, y + 9.5);

  return y + blockH + 5;
}

/** KPI card refinada con icono dot, label, value y opcional sub. */
interface KpiItem {
  label: string;
  value: string;
  sub?: string;
  tone?: AccentName;
}

function drawKpiGrid(
  doc: jsPDF, y: number, kpis: KpiItem[], columns: 2 | 3 | 4 = 4,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usableW = pageW - MARGIN * 2;
  const gap = 3;
  const cardW = (usableW - gap * (columns - 1)) / columns;
  const cardH = 22;

  for (let i = 0; i < kpis.length; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    if (col === 0 && row > 0) {
      y += cardH + gap;
    }
    if (col === 0) {
      y = ensureSpace(doc, y, cardH + 2);
    }

    const x = MARGIN + col * (cardW + gap);
    const k = kpis[i];
    const palette = k.tone ? PALETTE[k.tone] : PALETTE.brand;

    // Card body
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.roundedRect(x, y, cardW, cardH, 1.8, 1.8, 'FD');

    // Dot accent
    doc.setFillColor(palette.primary[0], palette.primary[1], palette.primary[2]);
    doc.circle(x + 4.2, y + 5.5, 1.2, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    doc.text(k.label.toUpperCase(), x + 8, y + 6.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(INK.strong[0], INK.strong[1], INK.strong[2]);
    doc.text(k.value, x + 4, y + 15);

    // Sub
    if (k.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
      doc.text(k.sub, x + 4, y + 19.5);
    }
  }
  return y + cardH + 6;
}

/** Tabla refinada con estilos consistentes (head ink, rows alternadas sutiles). */
interface TableConfig {
  head: string[];
  body: (string | number)[][];
  accent?: AccentName;
  startY: number;
  columnAligns?: ('left' | 'center' | 'right')[];
  fontSize?: number;
}

function drawTable(doc: jsPDF, cfg: TableConfig): number {
  const palette = PALETTE[cfg.accent ?? 'slate'];
  const columnStyles: Record<number, { halign: 'left' | 'center' | 'right' }> = {};
  if (cfg.columnAligns) {
    cfg.columnAligns.forEach((align, i) => { columnStyles[i] = { halign: align }; });
  }

  autoTable(doc, {
    startY: cfg.startY,
    head: [cfg.head],
    body: cfg.body,
    theme: 'plain',
    styles: {
      fontSize: cfg.fontSize ?? 8.5,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      textColor: [INK.normal[0], INK.normal[1], INK.normal[2]] as [number, number, number],
      lineColor: [LINE[0], LINE[1], LINE[2]] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [SURFACE[0], SURFACE[1], SURFACE[2]] as [number, number, number],
      textColor: [INK.muted[0], INK.muted[1], INK.muted[2]] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      lineWidth: { top: 0.3, right: 0, bottom: 0.4, left: 0 },
      lineColor: [LINE[0], LINE[1], LINE[2]] as [number, number, number],
    },
    bodyStyles: {
      lineWidth: { top: 0, right: 0, bottom: 0.15, left: 0 },
    },
    alternateRowStyles: {
      fillColor: [251, 251, 253] as [number, number, number],
    },
    columnStyles,
    margin: { left: MARGIN, right: MARGIN },
    didDrawPage: () => { /* footers se pintan después */ },
    showHead: 'everyPage',
  });

  // @ts-expect-error jspdf-autotable extiende doc
  return doc.lastAutoTable.finalY + 5;
}

/** Notas metodológicas: lista de bullets con eyebrow superior. */
function drawNotes(doc: jsPDF, y: number, items: { titulo: string; texto: string }[]): number {
  const pageW = doc.internal.pageSize.getWidth();
  const usableW = pageW - MARGIN * 2;
  y = ensureSpace(doc, y, 20);

  // Eyebrow + título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
  doc.text('NOTAS METODOLÓGICAS', MARGIN, y);

  doc.setFontSize(13);
  doc.setTextColor(INK.strong[0], INK.strong[1], INK.strong[2]);
  doc.text('Cómo se calculan estos datos', MARGIN, y + 6);

  doc.setDrawColor(INK.strong[0], INK.strong[1], INK.strong[2]);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 10, MARGIN + 14, y + 10);
  doc.setLineWidth(0.2);

  y += 15;

  for (const note of items) {
    // Calcular altura del párrafo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(note.texto, usableW - 4) as string[];
    const blockH = lines.length * 4.3 + 7;
    y = ensureSpace(doc, y, blockH);

    // Bullet point
    doc.setFillColor(INK.soft[0], INK.soft[1], INK.soft[2]);
    doc.circle(MARGIN + 1, y + 1.5, 0.8, 'F');

    // Título de la nota
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(INK.strong[0], INK.strong[1], INK.strong[2]);
    doc.text(note.titulo, MARGIN + 4, y + 2.5);

    // Texto
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(INK.muted[0], INK.muted[1], INK.muted[2]);
    doc.text(lines, MARGIN + 4, y + 7);

    y += blockH + 1;
  }
  return y;
}

/* =====================================================================
   FACTORY común: prepara doc + portada + meta
   ===================================================================== */
function startReport(meta: ReportMeta): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  drawCover(doc, meta);
  doc.addPage();
  return doc;
}

function finalize(doc: jsPDF, meta: ReportMeta) {
  drawRunningHeaderFooter(doc, meta);
  doc.save(meta.archivoNombre);
}

function defaultCentro(c?: CentroMedico): ReportMeta['centro'] {
  return {
    nombre:    c?.nombre    ?? 'Centro Médico Hospitalis',
    nit:       c?.nit       ?? 'NIT 900.000.000-0',
    direccion: c?.direccion ?? 'Av. Principal #123, Ocaña, Norte de Santander',
  };
}

/* =====================================================================
   Narrativa MD&A — generada automáticamente desde los KPIs
   ===================================================================== */
function narrativePacientes(d: ReportePacientes): string {
  const t = d.totales;
  const pct = t.registrados > 0 ? (t.atendidos / t.registrados) * 100 : 0;
  return (
    `Durante el período comprendido entre ${fmtFechaLarga(d.desde)} y ${fmtFechaLarga(d.hasta)}, ` +
    `el centro médico contó con ${fmtNumber(t.registrados)} pacientes registrados, de los cuales ${fmtNumber(t.atendidos)} ` +
    `recibieron al menos una atención (${pct.toFixed(1)}% del total). ` +
    `Se sumaron ${fmtNumber(t.nuevos)} nuevos pacientes en el período, ` +
    `mientras que ${fmtNumber(t.inactivos_12m)} permanecen inactivos con más de doce meses sin consultar. ` +
    `Esta diferencia entre el padrón activo y la base potencial sugiere oportunidades de reactivación clínica.`
  );
}

function narrativeMedicos(d: ReporteMedicos): string {
  const t = d.totales;
  const promedio = t.consultas_total > 0 && t.medicos_activos > 0
    ? (t.consultas_total / t.medicos_activos)
    : 0;
  return (
    `El cuerpo médico está conformado por ${fmtNumber(t.medicos_activos)} profesionales activos que atendieron ` +
    `${fmtNumber(t.consultas_total)} consultas en el período, con un promedio de ${promedio.toFixed(1)} consultas por médico. ` +
    `El tiempo promedio de atención fue de ${fmtNumber(t.tiempo_promedio ?? 0)} minutos. ` +
    `Se registraron ${fmtNumber(t.cancelaciones)} cancelaciones, lo que invita a revisar las causas y reforzar la confirmación previa de las citas.`
  );
}

function narrativeHorarios(d: ReporteHorarios): string {
  const t = d.totales;
  const tasaCompletada = t.ocupados > 0 ? (t.completadas / t.ocupados) * 100 : 0;
  const tasaNoAsistio  = t.ocupados > 0 ? (t.no_asistio / t.ocupados) * 100 : 0;
  return (
    `Durante los ${d.periodo_dias} días analizados se registraron ${fmtNumber(t.ocupados)} horarios ocupados. ` +
    `De estos, ${fmtNumber(t.completadas)} se completaron exitosamente (${tasaCompletada.toFixed(1)}% de cumplimiento), ` +
    `${fmtNumber(t.canceladas)} fueron canceladas y ${fmtNumber(t.no_asistio)} terminaron como inasistencia (${tasaNoAsistio.toFixed(1)}%). ` +
    `La distribución por horas y días permite identificar las franjas de mayor demanda para optimizar la asignación de turnos.`
  );
}

function narrativeFinanciero(d: ReporteFinanciero): string {
  const t = d.totales;
  const tasaCobro = t.ingresos_facturados > 0
    ? (t.ingresos_pagados / t.ingresos_facturados) * 100
    : 0;
  return (
    `Durante el período ${fmtFechaLarga(d.desde)} — ${fmtFechaLarga(d.hasta)}, se emitieron ${fmtNumber(t.emitidas)} facturas ` +
    `por un total facturado de ${fmtMoney(t.ingresos_facturados)}. De este monto, se cobraron efectivamente ${fmtMoney(t.ingresos_pagados)}, ` +
    `lo que representa una tasa de cobro del ${tasaCobro.toFixed(1)}%. La cartera por cobrar asciende a ${fmtMoney(t.por_cobrar)}, ` +
    `distribuida entre ${fmtNumber(t.pendientes)} facturas pendientes. ` +
    `El ticket promedio del período fue de ${fmtMoney(t.ticket_promedio)}, ` +
    `dato útil para proyectar ingresos futuros y dimensionar el flujo de caja operativo del centro.`
  );
}

function narrativeInventario(d: ReporteInventario): string {
  const t = d.totales;
  return (
    `El inventario gestiona ${fmtNumber(t.total_medicamentos)} medicamentos distribuidos en ${fmtNumber(t.categorias)} categorías, ` +
    `con un valor total estimado de ${fmtMoney(t.valor_inventario)}. ` +
    `Actualmente hay ${fmtNumber(t.agotados)} ítems agotados, ${fmtNumber(t.criticos)} en estado crítico (≤5 unidades) ` +
    `y ${fmtNumber(t.bajos)} con stock bajo (≤10 unidades). ` +
    `Estos indicadores deben revisarse semanalmente para evitar quiebres en la atención clínica y planificar las reposiciones con proveedores.`
  );
}

function narrativeAuditoria(d: ReporteAuditoria): string {
  const t = d.totales;
  return (
    `Durante el período ${fmtFechaLarga(d.desde)} — ${fmtFechaLarga(d.hasta)} se registraron ${fmtNumber(t.total)} eventos en el log de auditoría: ` +
    `${fmtNumber(t.insert)} creaciones, ${fmtNumber(t.update)} modificaciones y ${fmtNumber(t.delete)} borrados lógicos. ` +
    `Este registro inmutable garantiza la trazabilidad de los cambios en datos clínicos y administrativos, ` +
    `requisito fundamental para el cumplimiento normativo y para la rendición de cuentas frente a autoridades sanitarias.`
  );
}

function narrativeUsuarios(d: ReporteUsuarios): string {
  const t = d.totales;
  const tasaActivos = t.total > 0 ? (t.activos / t.total) * 100 : 0;
  return (
    `El sistema cuenta con ${fmtNumber(t.total)} usuarios registrados, de los cuales ${fmtNumber(t.activos)} ` +
    `(${tasaActivos.toFixed(1)}%) tienen sus cuentas habilitadas. ` +
    `En los últimos 30 días se conectaron ${fmtNumber(t.conectados_30d)} usuarios, ` +
    `cifra que permite evaluar la adopción real del sistema por parte del personal y los pacientes.`
  );
}

/* =====================================================================
   GENERADORES — uno por cada reporte
   ===================================================================== */

// ────────────────────────────── PACIENTES ──────────────────────────────
export function exportarReportePacientesPdf(data: ReportePacientes, centro?: CentroMedico) {
  const meta: ReportMeta = {
    titulo: 'Reporte de Pacientes',
    subtitulo: 'Demografía, frecuencia de atención y cohorte inactiva',
    eyebrow: 'Reporte · Pacientes',
    periodo: `${fmtFechaCorta(data.desde)} — ${fmtFechaCorta(data.hasta)}`,
    archivoNombre: `reporte_pacientes_${data.desde}_${data.hasta}.pdf`,
    centro: defaultCentro(centro),
    accent: 'emerald',
  };
  const doc = startReport(meta);
  let y = MM(20);

  // Resumen ejecutivo
  y = drawSectionHeader(doc, y, 'Resumen ejecutivo', 'Visión general del período', undefined, meta.accent);
  y = drawNarrative(doc, y, narrativePacientes(data));

  const t = data.totales;
  const pct = t.registrados > 0 ? (t.atendidos / t.registrados) * 100 : 0;
  y = drawCallout(doc, y, 'Hallazgo principal',
    `${pct.toFixed(1)}% de la base de pacientes recibió al menos una atención en el período. ` +
    `${fmtNumber(t.inactivos_12m)} pacientes permanecen sin contacto desde hace más de un año.`,
    meta.accent);

  // KPIs
  y = drawSectionHeader(doc, y, 'Indicadores clave', 'Métricas operativas del período', undefined, meta.accent);
  y = drawKpiGrid(doc, y, [
    { label: 'Registrados',     value: fmtNumber(t.registrados),   sub: 'Padrón total',          tone: 'brand' },
    { label: 'Nuevos',          value: fmtNumber(t.nuevos),        sub: 'Altas en el período',   tone: 'emerald' },
    { label: 'Atendidos',       value: fmtNumber(t.atendidos),     sub: 'Con consulta registrada', tone: 'sky' },
    { label: 'Inactivos > 12m', value: fmtNumber(t.inactivos_12m), sub: 'Sin contacto reciente', tone: 'amber' },
  ]);

  // Demografía
  y = drawSectionHeader(doc, y, 'Demografía', 'Distribución por género y rango etario', undefined, meta.accent);
  y = drawTable(doc, {
    startY: y, accent: 'emerald',
    head: ['Género', 'Rango edad', 'Total'],
    body: data.demografia.map(d => [d.genero, d.rango_edad, fmtNumber(d.total)]),
    columnAligns: ['left', 'left', 'right'],
  });

  // Diagnósticos
  if ((data.diagnosticos_top ?? []).length) {
    y = drawSectionHeader(doc, y, 'Diagnósticos', 'Patologías más frecuentes en el período', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'emerald',
      head: ['CIE-10', 'Diagnóstico', 'Frecuencia', 'Pacientes únicos'],
      body: (data.diagnosticos_top ?? []).map(d => [
        d.codigo_cie10 ?? '—', d.diagnostico,
        fmtNumber(d.frecuencia), fmtNumber(d.pacientes_unicos),
      ]),
      columnAligns: ['left', 'left', 'right', 'right'],
    });
  }

  // Pacientes frecuentes
  if ((data.frecuentes_top ?? []).length) {
    y = drawSectionHeader(doc, y, 'Frecuencia', 'Pacientes con mayor número de visitas', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'emerald',
      head: ['Paciente', 'Documento', 'Visitas', 'Última visita'],
      body: (data.frecuentes_top ?? []).map(p => [
        p.paciente, p.documento ?? '—',
        fmtNumber(p.visitas), p.ultima_visita?.slice(0, 10) ?? '—',
      ]),
      columnAligns: ['left', 'left', 'right', 'left'],
    });
  }

  // Inactivos
  if (data.inactivos?.length) {
    y = drawSectionHeader(doc, y, 'Inactivos', `${data.inactivos.length} pacientes sin consulta en los últimos 12 meses`, undefined, 'amber');
    y = drawTable(doc, {
      startY: y, accent: 'amber',
      head: ['Paciente', 'Documento', 'Email', 'Última consulta', 'Días'],
      body: data.inactivos.map(p => [
        p.nombre_completo, p.documento ?? '—', p.email ?? '—',
        p.ultima_consulta?.slice(0, 10) ?? 'Nunca',
        fmtNumber(p.dias_sin_visita),
      ]),
      columnAligns: ['left', 'left', 'left', 'left', 'right'],
      fontSize: 7.5,
    });
  }

  // Notas
  y = drawNotes(doc, y, [
    { titulo: 'Cohorte de inactivos', texto: 'Pacientes registrados cuya última consulta es anterior a la fecha actual menos 12 meses. Incluye altas históricas con cualquier consulta registrada, no solo del período.' },
    { titulo: 'Demografía',            texto: 'Los rangos etarios se calculan a partir de fecha_nacimiento al momento de la consulta. Los pacientes sin fecha registrada se agrupan en "Sin dato".' },
    { titulo: 'Diagnósticos top',       texto: 'Frecuencia cuenta cada vez que el diagnóstico aparece en una consulta; pacientes únicos cuenta el número de individuos distintos asociados al diagnóstico.' },
  ]);

  finalize(doc, meta);
}

// ────────────────────────────── MÉDICOS ──────────────────────────────
export function exportarReporteMedicosPdf(data: ReporteMedicos, centro?: CentroMedico) {
  const meta: ReportMeta = {
    titulo: 'Reporte de Médicos',
    subtitulo: 'Productividad clínica y carga asistencial',
    eyebrow: 'Reporte · Médicos',
    periodo: `${fmtFechaCorta(data.desde)} — ${fmtFechaCorta(data.hasta)}`,
    archivoNombre: `reporte_medicos_${data.desde}_${data.hasta}.pdf`,
    centro: defaultCentro(centro),
    accent: 'violet',
  };
  const doc = startReport(meta);
  let y = MM(20);

  y = drawSectionHeader(doc, y, 'Resumen ejecutivo', 'Análisis de productividad clínica', undefined, meta.accent);
  y = drawNarrative(doc, y, narrativeMedicos(data));

  const t = data.totales;
  y = drawCallout(doc, y, 'Hallazgo principal',
    `Cancelaciones en el período: ${fmtNumber(t.cancelaciones)}. ` +
    `Tiempo promedio por consulta: ${fmtNumber(t.tiempo_promedio ?? 0)} minutos.`,
    meta.accent);

  y = drawSectionHeader(doc, y, 'Indicadores clave', 'Métricas agregadas del cuerpo médico', undefined, meta.accent);
  y = drawKpiGrid(doc, y, [
    { label: 'Médicos activos',  value: fmtNumber(t.medicos_activos),                tone: 'violet' },
    { label: 'Consultas',         value: fmtNumber(t.consultas_total),                tone: 'brand' },
    { label: 'Tiempo promedio',   value: `${fmtNumber(t.tiempo_promedio ?? 0)} min`,  tone: 'sky' },
    { label: 'Cancelaciones',     value: fmtNumber(t.cancelaciones),                  tone: 'rose' },
  ]);

  if ((data.por_medico ?? []).length) {
    y = drawSectionHeader(doc, y, 'Por médico', 'Distribución individual de consultas y pacientes', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'violet',
      head: ['Médico', 'Especialidad', 'Consultas', 'Pacientes', 'Cancel.', 'Min/cons', 'Cons/día'],
      body: data.por_medico.map(m => [
        m.medico, m.especialidad ?? '—',
        fmtNumber(m.consultas), fmtNumber(m.pacientes_unicos),
        fmtNumber(m.canceladas), fmtNumber(m.min_promedio ?? 0),
        m.consultas_por_dia?.toFixed(2) ?? '0.00',
      ]),
      columnAligns: ['left', 'left', 'right', 'right', 'right', 'right', 'right'],
      fontSize: 7.5,
    });
  }

  if (data.por_especialidad?.length) {
    y = drawSectionHeader(doc, y, 'Especialidades', 'Concentración de consultas por especialidad', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'violet',
      head: ['Especialidad', 'Consultas', 'Médicos'],
      body: data.por_especialidad.map(e => [e.especialidad, fmtNumber(e.consultas), fmtNumber(e.medicos)]),
      columnAligns: ['left', 'right', 'right'],
    });
  }

  y = drawNotes(doc, y, [
    { titulo: 'Tiempo promedio',  texto: 'Calculado como diferencia entre inicio y fin de la consulta en consultas con ambos timestamps. Excluye consultas sin tiempo registrado.' },
    { titulo: 'Cancelaciones',    texto: 'Cuenta de citas con estado "cancelada" o "no_asistio". No discrimina causa de cancelación (paciente vs médico).' },
    { titulo: 'Consultas por día', texto: 'Promedio diario considerando únicamente los días laborales con al menos una consulta del médico.' },
  ]);

  finalize(doc, meta);
}

// ────────────────────────────── HORARIOS ──────────────────────────────
export function exportarReporteHorariosPdf(data: ReporteHorarios, centro?: CentroMedico) {
  const meta: ReportMeta = {
    titulo: 'Reporte de Horarios',
    subtitulo: 'Ocupación, horas pico y patrones de demanda',
    eyebrow: 'Reporte · Horarios',
    periodo: `${fmtFechaCorta(data.desde)} — ${fmtFechaCorta(data.hasta)} (${data.periodo_dias} días)`,
    archivoNombre: `reporte_horarios_${data.desde}_${data.hasta}.pdf`,
    centro: defaultCentro(centro),
    accent: 'sky',
  };
  const doc = startReport(meta);
  let y = MM(20);

  y = drawSectionHeader(doc, y, 'Resumen ejecutivo', 'Patrón de ocupación del centro', undefined, meta.accent);
  y = drawNarrative(doc, y, narrativeHorarios(data));

  const t = data.totales;
  const tasaCompletada = t.ocupados > 0 ? (t.completadas / t.ocupados) * 100 : 0;
  y = drawCallout(doc, y, 'Tasa de cumplimiento',
    `${tasaCompletada.toFixed(1)}% de las citas ocupadas se completaron exitosamente. ` +
    `Las cancelaciones e inasistencias representan ${fmtNumber(t.canceladas + t.no_asistio)} eventos.`,
    meta.accent);

  y = drawSectionHeader(doc, y, 'Indicadores clave', 'Estado agregado de la agenda', undefined, meta.accent);
  y = drawKpiGrid(doc, y, [
    { label: 'Ocupados',    value: fmtNumber(t.ocupados),    tone: 'sky' },
    { label: 'Completadas', value: fmtNumber(t.completadas), tone: 'emerald' },
    { label: 'Canceladas',  value: fmtNumber(t.canceladas),  tone: 'rose' },
    { label: 'No asistió',  value: fmtNumber(t.no_asistio),  tone: 'amber' },
  ]);

  if ((data.horas_pico ?? []).length) {
    y = drawSectionHeader(doc, y, 'Horas pico', 'Distribución de citas por hora del día', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'sky',
      head: ['Hora', 'Citas'],
      body: data.horas_pico.map(h => [`${String(h.hora).padStart(2,'0')}:00`, fmtNumber(h.citas)]),
      columnAligns: ['left', 'right'],
    });
  }

  if ((data.por_dia_semana ?? []).length) {
    y = drawSectionHeader(doc, y, 'Por día de la semana', 'Concentración semanal de la demanda', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'sky',
      head: ['Día', 'Citas', 'Canceladas'],
      body: data.por_dia_semana.map(d => [d.dia, fmtNumber(d.citas), fmtNumber(d.canceladas)]),
      columnAligns: ['left', 'right', 'right'],
    });
  }

  y = drawNotes(doc, y, [
    { titulo: 'Horas pico',  texto: 'Calculadas únicamente con citas de los últimos 30 días, agrupando por la hora del campo fecha_cita.' },
    { titulo: 'Ocupados',    texto: 'Cuenta de horarios con al menos una cita asignada, independientemente de su estado final.' },
    { titulo: 'Sin asistencia', texto: 'Suma de los estados "no_asistio" y "cancelada por paciente". Permite detectar franjas con bajo cumplimiento.' },
  ]);

  finalize(doc, meta);
}

// ────────────────────────────── FINANCIERO ──────────────────────────────
export function exportarReporteFinancieroPdf(data: ReporteFinanciero, centro?: CentroMedico) {
  const meta: ReportMeta = {
    titulo: 'Reporte Financiero',
    subtitulo: 'Facturación, cobranza y cartera por antigüedad',
    eyebrow: 'Reporte · Financiero',
    periodo: `${fmtFechaCorta(data.desde)} — ${fmtFechaCorta(data.hasta)}`,
    archivoNombre: `reporte_financiero_${data.desde}_${data.hasta}.pdf`,
    centro: defaultCentro(centro),
    accent: 'brand',
  };
  const doc = startReport(meta);
  let y = MM(20);

  // MD&A
  y = drawSectionHeader(doc, y, 'Resumen ejecutivo', 'Discusión y análisis de la dirección', undefined, meta.accent);
  y = drawNarrative(doc, y, narrativeFinanciero(data));

  const t = data.totales;
  const tasaCobro = t.ingresos_facturados > 0
    ? (t.ingresos_pagados / t.ingresos_facturados) * 100
    : 0;

  y = drawCallout(doc, y, 'Indicador clave del período',
    `Tasa de cobro: ${tasaCobro.toFixed(1)}%. Cartera por cobrar: ${fmtMoney(t.por_cobrar)}. ` +
    `Ticket promedio: ${fmtMoney(t.ticket_promedio)}.`,
    meta.accent);

  // KPIs de volumen
  y = drawSectionHeader(doc, y, 'Volumen de facturación', 'Conteo de facturas por estado', undefined, meta.accent);
  y = drawKpiGrid(doc, y, [
    { label: 'Emitidas',   value: fmtNumber(t.emitidas),   sub: 'Total del período',  tone: 'brand' },
    { label: 'Pagadas',    value: fmtNumber(t.pagadas),    sub: 'Cobro confirmado',   tone: 'emerald' },
    { label: 'Pendientes', value: fmtNumber(t.pendientes), sub: 'En espera de cobro', tone: 'amber' },
    { label: 'Anuladas',   value: fmtNumber(t.anuladas),   sub: 'Reversadas',         tone: 'rose' },
  ]);

  // KPIs monetarios
  y = drawSectionHeader(doc, y, 'Resultado económico', 'Ingresos facturados, cobrados y cartera', undefined, meta.accent);
  y = drawKpiGrid(doc, y, [
    { label: 'Ingresos cobrados',  value: fmtMoney(t.ingresos_pagados),     sub: 'Efectivo confirmado',         tone: 'emerald' },
    { label: 'Por cobrar',         value: fmtMoney(t.por_cobrar),           sub: 'Cartera pendiente',           tone: 'amber' },
    { label: 'Facturado período',  value: fmtMoney(t.ingresos_facturados),  sub: 'Total emitido',               tone: 'brand' },
    { label: 'Ticket promedio',    value: fmtMoney(t.ticket_promedio),      sub: 'Por factura pagada',          tone: 'violet' },
  ]);

  // Servicios top
  if ((data.servicios_top ?? []).length) {
    y = drawSectionHeader(doc, y, 'Servicios', 'Productos y servicios con mayor contribución al ingreso', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'brand',
      head: ['Servicio', 'Veces', 'Unidades', 'Ingreso'],
      body: data.servicios_top.map(s => [
        s.servicio, fmtNumber(s.veces_vendido), fmtNumber(s.unidades), fmtMoney(s.ingreso_generado),
      ]),
      columnAligns: ['left', 'right', 'right', 'right'],
    });
  }

  // Métodos de pago
  if (data.por_metodo_pago?.length) {
    y = drawSectionHeader(doc, y, 'Métodos de pago', 'Distribución del cobrado por canal', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'brand',
      head: ['Método', 'Pagos', 'Monto'],
      body: data.por_metodo_pago.map(m => [m.metodo_pago, fmtNumber(m.n), fmtMoney(m.monto)]),
      columnAligns: ['left', 'right', 'right'],
    });
  }

  // Cartera vencida
  if (data.cartera_vencida?.length) {
    y = drawSectionHeader(doc, y, 'Cartera vencida',
      `${data.cartera_vencida.length} facturas con más de 30 días de antigüedad`,
      undefined, 'rose');
    y = drawTable(doc, {
      startY: y, accent: 'rose',
      head: ['# Factura', 'Paciente', 'Emisión', 'Total', 'Días mora'],
      body: data.cartera_vencida.map(c => [
        c.numero_factura ?? '—', c.paciente_nombre ?? '—',
        c.fecha_emision?.slice(0, 10), fmtMoney(c.total), fmtNumber(c.dias_mora),
      ]),
      columnAligns: ['left', 'left', 'left', 'right', 'right'],
      fontSize: 7.5,
    });
  }

  // Notas metodológicas — al estilo de las notas a los estados financieros
  y = drawNotes(doc, y, [
    { titulo: 'Base contable',     texto: 'Los ingresos se reconocen al momento de emisión de la factura. Los cobros se registran al momento de la confirmación efectiva del pago en la respectiva pasarela o conciliación bancaria.' },
    { titulo: 'Tasa de cobro',     texto: 'Se calcula como el cociente entre ingresos pagados e ingresos facturados del mismo período. No considera cobros recibidos en el período correspondientes a facturas emitidas en períodos anteriores.' },
    { titulo: 'Cartera vencida',   texto: 'Facturas con estado pendiente y fecha de emisión anterior a la fecha actual menos 30 días. El cálculo de días de mora usa la fecha de emisión cuando no existe fecha de vencimiento explícita.' },
    { titulo: 'Ticket promedio',   texto: 'Promedio aritmético del total facturado dividido entre el número de facturas emitidas en el período (incluye facturas anuladas si no se excluyen explícitamente).' },
    { titulo: 'Anulaciones',       texto: 'Facturas reversadas no descuentan del total facturado en este reporte; se muestran como métrica independiente para preservar la trazabilidad histórica.' },
  ]);

  finalize(doc, meta);
}

// ────────────────────────────── INVENTARIO ──────────────────────────────
export function exportarReporteInventarioPdf(data: ReporteInventario, centro?: CentroMedico) {
  const meta: ReportMeta = {
    titulo: 'Reporte de Inventario',
    subtitulo: 'Estado del stock, valor económico y consumo',
    eyebrow: 'Reporte · Inventario',
    periodo: `Corte al ${fmtFechaCorta(new Date().toISOString().slice(0, 10))}`,
    archivoNombre: `reporte_inventario_${new Date().toISOString().slice(0, 10)}.pdf`,
    centro: defaultCentro(centro),
    accent: 'amber',
  };
  const doc = startReport(meta);
  let y = MM(20);

  y = drawSectionHeader(doc, y, 'Resumen ejecutivo', 'Estado actual del inventario', undefined, meta.accent);
  y = drawNarrative(doc, y, narrativeInventario(data));

  const t = data.totales;
  const enRiesgo = t.agotados + t.criticos;
  y = drawCallout(doc, y,
    enRiesgo > 0 ? 'Alerta de reposición' : 'Inventario en orden',
    enRiesgo > 0
      ? `${fmtNumber(enRiesgo)} medicamentos requieren reposición inmediata (agotados o críticos). ` +
        `Coordinar con proveedores para evitar quiebres en la atención clínica.`
      : 'No hay alertas críticas. Mantener la revisión semanal del stock bajo.',
    enRiesgo > 0 ? 'rose' : 'emerald');

  y = drawSectionHeader(doc, y, 'Indicadores clave', 'Estado agregado del catálogo', undefined, meta.accent);
  y = drawKpiGrid(doc, y, [
    { label: 'Total',         value: fmtNumber(t.total_medicamentos), sub: 'En catálogo',    tone: 'brand' },
    { label: 'Agotados',      value: fmtNumber(t.agotados),            sub: 'Stock = 0',     tone: 'rose' },
    { label: 'Críticos',      value: fmtNumber(t.criticos),            sub: 'Stock ≤ 5',     tone: 'amber' },
    { label: 'Bajos',         value: fmtNumber(t.bajos),               sub: 'Stock ≤ 10',    tone: 'amber' },
    { label: 'Valor total',   value: fmtMoney(t.valor_inventario),     sub: 'Inventario valorizado', tone: 'emerald' },
    { label: 'Categorías',    value: fmtNumber(t.categorias),          sub: 'Agrupaciones',  tone: 'violet' },
  ], 3);

  if (data.criticos?.length) {
    y = drawSectionHeader(doc, y, 'Medicamentos críticos',
      `${data.criticos.length} ítems requieren atención prioritaria`,
      undefined, 'rose');
    y = drawTable(doc, {
      startY: y, accent: 'rose',
      head: ['Medicamento', 'Categoría', 'Stock', 'Estado', 'Precio'],
      body: data.criticos.map(m => [
        m.nombre, m.categoria ?? '—',
        fmtNumber(m.stock), m.estado_stock.toUpperCase(),
        fmtMoney(m.precio ?? 0),
      ]),
      columnAligns: ['left', 'left', 'right', 'center', 'right'],
      fontSize: 7.5,
    });
  }

  if (data.mas_usados?.length) {
    y = drawSectionHeader(doc, y, 'Más recetados', 'Top de consumo en los últimos 90 días', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'amber',
      head: ['Medicamento', 'Presentación', 'Recetas', 'Stock', 'Precio'],
      body: data.mas_usados.map(m => [
        m.nombre, m.presentacion ?? '—',
        fmtNumber(m.recetas), fmtNumber(m.stock),
        fmtMoney(m.precio ?? 0),
      ]),
      columnAligns: ['left', 'left', 'right', 'right', 'right'],
      fontSize: 7.5,
    });
  }

  y = drawNotes(doc, y, [
    { titulo: 'Valor de inventario', texto: 'Calculado como stock × precio unitario por cada medicamento activo. No incluye items inactivos del catálogo ni medicamentos con precio nulo.' },
    { titulo: 'Estados de stock',    texto: 'Agotado (=0), crítico (≤5), bajo (≤10), normal (>10). Los umbrales son fijos a nivel de sistema y deberían parametrizarse por medicamento en versiones futuras.' },
    { titulo: 'Más recetados',       texto: 'Cuenta de órdenes médicas que incluyen el medicamento en los últimos 90 días naturales. Una orden con dos unidades cuenta como una receta.' },
  ]);

  finalize(doc, meta);
}

// ────────────────────────────── AUDITORÍA ──────────────────────────────
export function exportarReporteAuditoriaPdf(data: ReporteAuditoria, centro?: CentroMedico) {
  const meta: ReportMeta = {
    titulo: 'Reporte de Auditoría',
    subtitulo: 'Trazabilidad y rendición de cuentas',
    eyebrow: 'Reporte · Auditoría',
    periodo: `${fmtFechaCorta(data.desde)} — ${fmtFechaCorta(data.hasta)}`,
    archivoNombre: `reporte_auditoria_${data.desde}_${data.hasta}.pdf`,
    centro: defaultCentro(centro),
    accent: 'slate',
  };
  const doc = startReport(meta);
  let y = MM(20);

  y = drawSectionHeader(doc, y, 'Resumen ejecutivo', 'Actividad registrada en el sistema', undefined, meta.accent);
  y = drawNarrative(doc, y, narrativeAuditoria(data));

  const t = data.totales;
  y = drawCallout(doc, y, 'Cumplimiento normativo',
    `El registro de ${fmtNumber(t.total)} eventos garantiza la trazabilidad inmutable requerida por las normativas de auditoría sanitaria y por las políticas internas de gobernanza del dato.`,
    'brand');

  y = drawSectionHeader(doc, y, 'Indicadores clave', 'Volumen de eventos por tipo de operación', undefined, meta.accent);
  y = drawKpiGrid(doc, y, [
    { label: 'Eventos totales', value: fmtNumber(t.total),  tone: 'slate' },
    { label: 'Inserciones',     value: fmtNumber(t.insert), tone: 'emerald' },
    { label: 'Modificaciones',  value: fmtNumber(t.update), tone: 'brand' },
    { label: 'Borrados',        value: fmtNumber(t.delete), tone: 'rose' },
  ]);

  if (data.por_tabla?.length) {
    y = drawSectionHeader(doc, y, 'Por tabla', 'Eventos agrupados por entidad afectada', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'slate',
      head: ['Tabla', 'Total', 'Insertados', 'Modificados', 'Eliminados'],
      body: data.por_tabla.map(t => [
        t.tabla, fmtNumber(t.total),
        fmtNumber(t.insertados), fmtNumber(t.modificados), fmtNumber(t.eliminados),
      ]),
      columnAligns: ['left', 'right', 'right', 'right', 'right'],
    });
  }

  if (data.por_actor?.length) {
    y = drawSectionHeader(doc, y, 'Por actor', 'Usuarios con mayor actividad en el período', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'slate',
      head: ['Actor', 'Rol', 'Eventos'],
      body: data.por_actor.map(a => [a.actor, a.actor_rol ?? '—', fmtNumber(a.total)]),
      columnAligns: ['left', 'left', 'right'],
    });
  }

  y = drawNotes(doc, y, [
    { titulo: 'Registro inmutable',  texto: 'Los eventos de auditoría se almacenan en una tabla append-only protegida por triggers SQL. No es posible editarlos ni eliminarlos desde la aplicación.' },
    { titulo: 'Borrados lógicos',   texto: 'Los registros "DELETE" representan borrados lógicos (deleted_at != null). Los datos originales se preservan en la papelera para auditoría y eventual restauración.' },
    { titulo: 'Identidad del actor', texto: 'Se identifica al usuario mediante auth_user_id de Supabase. Cuando una acción no tiene actor (ej. trigger automático del sistema), se registra como "sistema".' },
  ]);

  finalize(doc, meta);
}

// ────────────────────────────── USUARIOS ──────────────────────────────
export function exportarReporteUsuariosPdf(data: ReporteUsuarios, centro?: CentroMedico) {
  const meta: ReportMeta = {
    titulo: 'Reporte de Usuarios',
    subtitulo: 'Adopción del sistema y estado de cuentas',
    eyebrow: 'Reporte · Usuarios',
    periodo: `Corte al ${fmtFechaCorta(new Date().toISOString().slice(0, 10))}`,
    archivoNombre: `reporte_usuarios_${new Date().toISOString().slice(0, 10)}.pdf`,
    centro: defaultCentro(centro),
    accent: 'violet',
  };
  const doc = startReport(meta);
  let y = MM(20);

  y = drawSectionHeader(doc, y, 'Resumen ejecutivo', 'Estado de la base de usuarios', undefined, meta.accent);
  y = drawNarrative(doc, y, narrativeUsuarios(data));

  const t = data.totales;
  const tasaActivos = t.total > 0 ? (t.activos / t.total) * 100 : 0;
  y = drawCallout(doc, y, 'Tasa de adopción',
    `${tasaActivos.toFixed(1)}% de las cuentas están activas. ` +
    `En los últimos 30 días se conectaron ${fmtNumber(t.conectados_30d)} usuarios.`,
    meta.accent);

  y = drawSectionHeader(doc, y, 'Indicadores clave', 'Métricas agregadas del directorio', undefined, meta.accent);
  y = drawKpiGrid(doc, y, [
    { label: 'Total',           value: fmtNumber(t.total),           tone: 'brand' },
    { label: 'Activos',         value: fmtNumber(t.activos),         tone: 'emerald' },
    { label: 'Inactivos',       value: fmtNumber(t.inactivos),       tone: 'slate' },
    { label: 'Conectados 30d',  value: fmtNumber(t.conectados_30d),  tone: 'sky' },
  ]);

  if (data.por_rol?.length) {
    y = drawSectionHeader(doc, y, 'Por rol', 'Distribución de usuarios por tipo de cuenta', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'violet',
      head: ['Rol', 'Total', 'Activos'],
      body: data.por_rol.map(r => [r.rol, fmtNumber(r.total), fmtNumber(r.activos)]),
      columnAligns: ['left', 'right', 'right'],
    });
  }

  if (data.ultimos_accesos?.length) {
    y = drawSectionHeader(doc, y, 'Últimos accesos', 'Trazabilidad del uso reciente del sistema', undefined, meta.accent);
    y = drawTable(doc, {
      startY: y, accent: 'violet',
      head: ['Usuario', 'Email', 'Rol', 'Estado', 'Último acceso'],
      body: data.ultimos_accesos.map(u => [
        u.nombre_completo, u.email ?? '—', u.rol_nombre ?? '—',
        u.activo ? 'Activo' : 'Inactivo',
        u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-CO') : 'Nunca',
      ]),
      columnAligns: ['left', 'left', 'left', 'center', 'left'],
      fontSize: 7.5,
    });
  }

  y = drawNotes(doc, y, [
    { titulo: 'Última conexión',  texto: 'Se considera la fecha del último signIn registrado en Supabase Auth. No incluye las renovaciones automáticas de token.' },
    { titulo: 'Cuenta activa',    texto: 'Cuenta con activo=true en la base de datos. Una cuenta inactiva no puede iniciar sesión aunque exista en Supabase Auth.' },
    { titulo: 'Conectados 30d',   texto: 'Usuarios con al menos un signIn en los últimos 30 días naturales. Métrica de adopción real del sistema.' },
  ]);

  finalize(doc, meta);
}
