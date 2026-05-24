import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import pacienteService from './pacienteService';
import consultaService from './consultaService';
import adjuntoService, { type Adjunto } from './adjuntoService';

// Genera un PDF con la historia clínica completa del paciente autenticado.
// Estructura del documento:
//   1. Cabecera del centro médico + datos del paciente
//   2. Antecedentes y alergias
//   3. Consultas (motivo, dx, plan, signos vitales, adjuntos)
//   4. Pie de página con número de página
//
// Pensado para "Mi historial" del cliente, pero también lo puede usar el
// médico cuando necesite imprimir/exportar la historia.

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

interface CentroMedico {
  nombre?: string;
  nit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

/**
 * Genera y descarga el PDF de historia clínica del paciente autenticado.
 * Lanza Error si no hay paciente (no autenticado).
 */
export async function generarPdfHistorialCliente(centro: CentroMedico = {}): Promise<void> {
  // 1. Cargar todo lo necesario en paralelo
  const perfil = await pacienteService.getMiPerfil();
  if (!perfil?.id_paciente) {
    throw new Error('No se encontró tu perfil de paciente.');
  }

  const idPaciente = Number(perfil.id_paciente);
  const [consultas, signos, diagnosticos, ordenes, adjuntos] = await Promise.all([
    consultaService.getConsultasPaciente(idPaciente),
    consultaService.getSignosPacienteRecientes(idPaciente, 50),
    consultaService.getDiagnosticosPacienteHistoria(idPaciente),
    consultaService.getOrdenesPacienteHistoria(idPaciente),
    adjuntoService.listarMios(),
  ]);

  // Agrupar todo por id_consulta para iterar
  const signosByConsulta:  Record<number, typeof signos>       = {};
  const dxByConsulta:      Record<number, typeof diagnosticos> = {};
  const ordenesByConsulta: Record<number, typeof ordenes>      = {};
  const adjuntosByConsulta: Record<number, Adjunto[]>          = {};

  for (const s of signos as Array<{ id_consulta?: number }>) {
    if (s.id_consulta) {
      (signosByConsulta[s.id_consulta] ??= []).push(s as never);
    }
  }
  for (const d of diagnosticos as Array<{ id_consulta?: number }>) {
    if (d.id_consulta) {
      (dxByConsulta[d.id_consulta] ??= []).push(d as never);
    }
  }
  for (const o of ordenes as Array<{ id_consulta?: number }>) {
    if (o.id_consulta) {
      (ordenesByConsulta[o.id_consulta] ??= []).push(o as never);
    }
  }
  for (const a of adjuntos) {
    if (a.id_consulta) {
      (adjuntosByConsulta[a.id_consulta] ??= []).push(a);
    }
  }

  // 2. Generar el PDF
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const nombreCentro = centro.nombre    ?? 'Centro Médico Hospitalis';
  const nit          = centro.nit       ?? 'NIT 900.000.000-0';
  const direccion    = centro.direccion ?? 'Av. Principal #123, Ciudad';
  const telefono     = centro.telefono  ?? 'Tel: +57 (1) 234-5678';

  // ─── Cabecera ─────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(nombreCentro, margin, y);
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${nit} · ${direccion} · ${telefono}`, margin, y);
  y += 6;

  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(margin, y, pageW - margin * 2, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('HISTORIA CLÍNICA', pageW / 2, y + 6.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 14;

  // ─── Datos del paciente ────────────────────────────────────────────────
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, pageW - margin * 2, 26, 'F');

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('PACIENTE', margin + 3, y + 4);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(String(perfil.nombre_completo ?? '—'), margin + 3, y + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const linea1 = [
    perfil.tipo_documento && perfil.documento ? `${perfil.tipo_documento} ${perfil.documento}` : null,
    perfil.fecha_nacimiento ? `Nac: ${fmtDate(perfil.fecha_nacimiento)}` : null,
    perfil.edad != null ? `${perfil.edad} años` : null,
    perfil.genero ?? null,
  ].filter(Boolean).join(' · ');
  doc.text(linea1, margin + 3, y + 14);

  const linea2 = [
    perfil.telefono ? `Tel: ${perfil.telefono}` : null,
    perfil.email ?? null,
  ].filter(Boolean).join(' · ');
  if (linea2) doc.text(linea2, margin + 3, y + 18);

  if (perfil.numero_historia) {
    doc.setFont('helvetica', 'bold');
    doc.text(`HC: ${perfil.numero_historia}`, margin + 3, y + 22);
    doc.setFont('helvetica', 'normal');
  }

  if (perfil.tipo_sangre) {
    doc.setFillColor(220, 38, 38);
    doc.roundedRect(pageW - margin - 25, y + 4, 22, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('SANGRE', pageW - margin - 14, y + 9, { align: 'center' });
    doc.setFontSize(11);
    doc.text(String(perfil.tipo_sangre), pageW - margin - 14, y + 15, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
  }
  y += 30;

  // ─── Antecedentes ──────────────────────────────────────────────────────
  if (perfil.alergias || perfil.enfermedades_cronicas) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Antecedentes', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    if (perfil.alergias) {
      doc.setFillColor(254, 226, 226);
      const lines = doc.splitTextToSize(`⚠ Alergias: ${perfil.alergias}`, pageW - margin * 2 - 4);
      doc.rect(margin, y - 2, pageW - margin * 2, lines.length * 4 + 4, 'F');
      doc.setTextColor(127, 29, 29);
      doc.text(lines, margin + 2, y + 2);
      doc.setTextColor(0, 0, 0);
      y += lines.length * 4 + 6;
    }

    if (perfil.enfermedades_cronicas) {
      doc.setFillColor(254, 243, 199);
      const lines = doc.splitTextToSize(`Enf. crónicas: ${perfil.enfermedades_cronicas}`, pageW - margin * 2 - 4);
      doc.rect(margin, y - 2, pageW - margin * 2, lines.length * 4 + 4, 'F');
      doc.setTextColor(120, 53, 15);
      doc.text(lines, margin + 2, y + 2);
      doc.setTextColor(0, 0, 0);
      y += lines.length * 4 + 6;
    }

    y += 3;
  }

  // ─── Consultas (loop) ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Consultas (${consultas.length})`, margin, y);
  y += 6;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > pageH - 18) {
      doc.addPage();
      y = margin;
    }
  };

  if (consultas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('Sin consultas registradas.', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
  }

  for (const c of consultas as Array<{
    id_consulta: number;
    fecha_consulta?: string;
    motivo_consulta?: string | null;
    enfermedad_actual?: string | null;
    impresion_diagnostica?: string | null;
    plan_tratamiento?: string | null;
    observaciones?: string | null;
    medico?: { persona?: { nombres?: string; apellidos?: string }; especialidad?: string };
  }>) {
    newPageIfNeeded(40);

    // Banda de fecha
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, y, pageW - margin * 2, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const fechaTxt = c.fecha_consulta ? new Date(c.fecha_consulta).toLocaleDateString('es-CO', {
      year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
    }) : '—';
    doc.text(fechaTxt, margin + 3, y + 5);

    if (c.medico?.persona) {
      const docName = `Dr(a). ${c.medico.persona.nombres ?? ''} ${c.medico.persona.apellidos ?? ''}` +
                     (c.medico.especialidad ? ` · ${c.medico.especialidad}` : '');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(docName, pageW - margin - 3, y + 5, { align: 'right' });
    }
    doc.setTextColor(0, 0, 0);
    y += 10;

    const drawField = (label: string, value?: string | null) => {
      if (!value) return;
      newPageIfNeeded(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(label, margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, pageW - margin * 2);
      newPageIfNeeded(lines.length * 4 + 2);
      doc.text(lines, margin, y);
      y += lines.length * 4 + 2;
    };

    drawField('Motivo:', c.motivo_consulta);
    drawField('Enfermedad actual:', c.enfermedad_actual);
    drawField('Diagnóstico (impresión):', c.impresion_diagnostica);
    drawField('Plan de tratamiento:', c.plan_tratamiento);
    drawField('Observaciones:', c.observaciones);

    // Diagnósticos estructurados
    const dxList = dxByConsulta[c.id_consulta] ?? [];
    if (dxList.length > 0) {
      newPageIfNeeded(10 + dxList.length * 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Diagnósticos:', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      for (const d of dxList as Array<{ codigo_cie10?: string; descripcion: string; es_principal?: boolean }>) {
        const principal = d.es_principal ? '★ ' : '• ';
        const cie = d.codigo_cie10 ? `[${d.codigo_cie10}] ` : '';
        const txt = `${principal}${cie}${d.descripcion}`;
        const lines = doc.splitTextToSize(txt, pageW - margin * 2 - 4);
        doc.text(lines, margin + 4, y);
        y += lines.length * 4;
      }
      y += 2;
    }

    // Signos vitales
    const svList = signosByConsulta[c.id_consulta] ?? [];
    const sv = svList[0];
    if (sv) {
      newPageIfNeeded(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Signos vitales:', margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      const partes: string[] = [];
      const s = sv as {
        presion_sistolica?: number; presion_diastolica?: number;
        frecuencia_cardiaca?: number; frecuencia_respiratoria?: number;
        temperatura?: number; saturacion_oxigeno?: number;
        peso?: number; talla?: number;
      };
      if (s.presion_sistolica)       partes.push(`PA ${s.presion_sistolica}/${s.presion_diastolica ?? '—'} mmHg`);
      if (s.frecuencia_cardiaca)     partes.push(`FC ${s.frecuencia_cardiaca} bpm`);
      if (s.frecuencia_respiratoria) partes.push(`FR ${s.frecuencia_respiratoria} rpm`);
      if (s.temperatura)             partes.push(`T° ${s.temperatura}°C`);
      if (s.saturacion_oxigeno)      partes.push(`SpO₂ ${s.saturacion_oxigeno}%`);
      if (s.peso)                    partes.push(`Peso ${s.peso} kg`);
      if (s.talla)                   partes.push(`Talla ${s.talla} m`);
      doc.text(partes.join(' · '), margin + 4, y);
      y += 5;
    }

    // Órdenes médicas / medicamentos
    const ordList = ordenesByConsulta[c.id_consulta] ?? [];
    if (ordList.length > 0) {
      newPageIfNeeded(8);
      autoTable(doc, {
        startY: y,
        head: [['Medicamento', 'Dosis', 'Frecuencia', 'Duración']],
        body: (ordList as Array<{
          medicamento?: { nombre?: string; concentracion?: string };
          dosis?: string; frecuencia?: string; duracion?: string;
        }>).map(o => [
          (o.medicamento?.nombre ?? '—') + (o.medicamento?.concentracion ? ` ${o.medicamento.concentracion}` : ''),
          o.dosis ?? '—',
          o.frecuencia ?? '—',
          o.duracion ?? '—',
        ]),
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' }, // indigo-500
        margin: { left: margin, right: margin },
      });
      // @ts-expect-error jspdf-autotable extiende doc
      y = doc.lastAutoTable.finalY + 4;
    }

    // Adjuntos (solo lista; no embed binario)
    const adjList = adjuntosByConsulta[c.id_consulta] ?? [];
    if (adjList.length > 0) {
      newPageIfNeeded(8 + adjList.length * 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Adjuntos (${adjList.length}):`, margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      for (const a of adjList) {
        const tipo = a.tipo_mime?.startsWith('image/') ? '🖼' : '📄';
        const linea = `${tipo} ${a.nombre_archivo}${a.descripcion ? ` — ${a.descripcion}` : ''} (${(a.tamanio_bytes / 1024).toFixed(0)} KB)`;
        const lines = doc.splitTextToSize(linea, pageW - margin * 2 - 4);
        doc.text(lines, margin + 4, y);
        y += lines.length * 3.5;
      }
      doc.setTextColor(0, 0, 0);
      y += 3;
    }

    y += 4;
    // Separador
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  }

  // ─── Pie de página en TODAS las páginas ────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generado: ${fmtDateTime(new Date().toISOString())}`, margin, pageH - 8);
    doc.text(`Página ${p} de ${total}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  // 3. Descargar
  const safeName = (perfil.nombre_completo ?? 'paciente').replace(/\s+/g, '_');
  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`Historia_${safeName}_${stamp}.pdf`);
}

export default { generarPdfHistorialCliente };
