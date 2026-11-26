// Fachada con carga diferida de los exportadores PDF / Excel.
//
// reportePdfService, reporteExcelService e historialPdfService importan
// jspdf y exceljs (≈ 1.5 MB). Importarlos de forma estática desde el barrel
// `services/index.ts` los metía en el bundle inicial de TODA la app. Aquí
// cada función descarga su módulo la primera vez que se usa.

type PdfMod   = typeof import('./reportePdfService');
type ExcelMod = typeof import('./reporteExcelService');

const pdf = <K extends keyof PdfMod>(fn: K) =>
  async (...args: Parameters<PdfMod[K]>): Promise<void> => {
    const mod = await import('./reportePdfService');
    await (mod[fn] as (...a: unknown[]) => unknown)(...args);
  };

const excel = <K extends keyof ExcelMod>(fn: K) =>
  async (...args: Parameters<ExcelMod[K]>): Promise<void> => {
    const mod = await import('./reporteExcelService');
    await (mod[fn] as (...a: unknown[]) => unknown)(...args);
  };

export const exportarReportePacientesPdf  = pdf('exportarReportePacientesPdf');
export const exportarReporteMedicosPdf    = pdf('exportarReporteMedicosPdf');
export const exportarReporteHorariosPdf   = pdf('exportarReporteHorariosPdf');
export const exportarReporteFinancieroPdf = pdf('exportarReporteFinancieroPdf');
export const exportarReporteInventarioPdf = pdf('exportarReporteInventarioPdf');
export const exportarReporteAuditoriaPdf  = pdf('exportarReporteAuditoriaPdf');
export const exportarReporteUsuariosPdf   = pdf('exportarReporteUsuariosPdf');

export const exportarReportePacientesExcel  = excel('exportarReportePacientesExcel');
export const exportarReporteMedicosExcel    = excel('exportarReporteMedicosExcel');
export const exportarReporteHorariosExcel   = excel('exportarReporteHorariosExcel');
export const exportarReporteFinancieroExcel = excel('exportarReporteFinancieroExcel');
export const exportarReporteInventarioExcel = excel('exportarReporteInventarioExcel');
export const exportarReporteAuditoriaExcel  = excel('exportarReporteAuditoriaExcel');
export const exportarReporteUsuariosExcel   = excel('exportarReporteUsuariosExcel');

export async function generarPdfHistorialCliente(
  ...args: Parameters<typeof import('./historialPdfService').generarPdfHistorialCliente>
): Promise<void> {
  const mod = await import('./historialPdfService');
  await mod.generarPdfHistorialCliente(...args);
}
