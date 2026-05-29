// Índice de servicios de Supabase
// Capa entre los componentes y supabase-js: todas las queries viven acá
// para que los componentes solo orquesten estado/UI.

export { supabase, supabaseHelpers, esErrorDeSesion } from '../lib/supabase';

// Núcleo de personas/roles
export { default as usuarioService, type Usuario } from './usuarioService';
export { default as pacienteService, type Paciente, ServiceError } from './pacienteService';
export { default as medicoService,   type Medico   } from './medicoService';

// Operativos
export { default as citaService,      type Cita, type EstadoCita, ESTADOS_CITA } from './citaService';
export { default as consultaService,  type ConsultaMedica, type SignosVitales, type DiagnosticoPayload } from './consultaService';
export { default as facturaService,   type Factura, type FacturaItem, type EstadoFactura } from './facturaService';
export { default as horarioService,   type HorarioMedico, tipoConsultaService } from './horarioService';

// Catálogo
export { default as medicamentoService, type Medicamento } from './medicamentoService';
export { default as alergiaService,     type Alergia      } from './alergiaService';
export { default as historialService,   type HistorialMedico } from './historialService';
export { default as inventarioService,  type MedicamentoInventario, type CategoriaMedicamento } from './inventarioService';

// Administración / observabilidad
export { default as auditoriaService,   type AuditLog, type OperacionAudit } from './auditoriaService';
export { default as papeleraService,    type ItemPapelera, type TablaPapelera } from './papeleraService';
export { default as dashboardService,   type EstadisticasAdmin } from './dashboardService';
export { default as alertaService,      type Alerta, type SeveridadAlerta, type EstadoAlerta } from './alertaService';

// Adjuntos clínicos + PDFs
export { default as adjuntoService, type Adjunto, TIPOS_PERMITIDOS, TAMANIO_MAX_BYTES } from './adjuntoService';
export { generarPdfHistorialCliente } from './historialPdfService';

// Órdenes de exámenes paramédicos
export {
  default as ordenExamenService,
  type OrdenExamen,
  type OrdenExamenItem,
  type CrearOrdenExamenPayload,
} from './ordenExamenService';

// Módulo Reportes
export {
  default as reportesService,
  type DashboardKpis, type Periodo, type SerieDia, type HoraPico,
  type DemografiaItem, type TopMedico, type InventarioCriticoItem,
  type ReportePacientes, type ReporteMedicos, type ReporteHorarios,
  type ReporteFinanciero, type ReporteInventario, type ReporteAuditoria,
  type ReporteUsuarios, type TipoReporte,
  fmtMoney, fmtNumber, fmtPercent, compararValores,
} from './reportesService';

export {
  exportarReportePacientesPdf, exportarReporteMedicosPdf,
  exportarReporteHorariosPdf, exportarReporteFinancieroPdf,
  exportarReporteInventarioPdf, exportarReporteAuditoriaPdf,
  exportarReporteUsuariosPdf,
} from './reportePdfService';

export {
  exportarReportePacientesExcel, exportarReporteMedicosExcel,
  exportarReporteHorariosExcel, exportarReporteFinancieroExcel,
  exportarReporteInventarioExcel, exportarReporteAuditoriaExcel,
  exportarReporteUsuariosExcel,
} from './reporteExcelService';

// Onboarding / invitaciones
export { inviteUser, validarPasswordSegura, createUserAccount, createDoctorAccount,
         type InviteUserPayload } from './adminService';
