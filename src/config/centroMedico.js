// =====================================================================
// CONFIGURACIÓN DEL CENTRO MÉDICO (emisor de facturas)
//
// IMPORTANTE — Antes de usar en producción, REEMPLAZA los valores
// marcados con 'XXXX-EDITAR' por los datos reales que la DIAN te asignó.
//
// La factura electrónica de venta colombiana exige (Resolución DIAN
// 042/2020 y siguientes):
//   • Razón social + NIT del emisor (con dígito de verificación)
//   • Régimen tributario y calidad de retenedor
//   • Resolución DIAN de autorización con prefijo, rango y vencimiento
//   • Fecha y hora de expedición (la genera la app al crear el PDF)
//
// Estos datos viven aquí (módulo JS) para que un dev los edite. Si
// algún día manejas múltiples sedes, conviene migrar a una tabla en BD
// (`centro_medico_config`) leíble desde Configuración.
// =====================================================================

export const centroMedico = {
  // ─── Identificación legal ────────────────────────────────────────────
  razon_social: 'Centro Médico Hospitalis S.A.S.',
  nit:          'XXXX-EDITAR',          // ej: '900.123.456-7'  (incluye DV)
  matricula_mercantil: 'XXXX-EDITAR',   // opcional pero recomendado

  // ─── Datos de contacto ───────────────────────────────────────────────
  direccion:  'Av. Principal #123',
  ciudad:     'Ocaña, Norte de Santander',
  pais:       'Colombia',
  telefono:   '+57 (1) 234-5678',
  email:      'facturacion@hospitalis.co',
  sitio_web:  'www.hospitalis.co',

  // ─── Régimen tributario y responsabilidades ──────────────────────────
  // Estos textos se imprimen al pie de la factura como exige la DIAN.
  regimen_tributario: 'Régimen Ordinario',          // o 'Régimen Simple'
  responsable_iva:    'Responsable de IVA',          // o 'No responsable de IVA'
  // Calidad de retenedor (uno o más, separados por " · " para mostrar):
  //   'Autorretenedor de renta', 'Gran contribuyente',
  //   'Agente retenedor de IVA', 'No autorretenedor'
  calidad_retenedor:  'No autorretenedor',

  // ─── Resolución DIAN de facturación electrónica ──────────────────────
  // Sin estos datos la factura NO es válida ante la DIAN.
  resolucion_dian: {
    numero:    'XXXX-EDITAR',           // ej: '18764000001234'
    fecha:     'YYYY-MM-DD',            // fecha de la resolución
    prefijo:   'FE',                    // prefijo de numeración asignado
    desde:     1,                       // primer consecutivo autorizado
    hasta:     5000,                    // último consecutivo autorizado
    vence:     'YYYY-MM-DD',            // fecha de vencimiento
    modalidad: 'Factura electrónica de venta',
  },
};

export default centroMedico;
