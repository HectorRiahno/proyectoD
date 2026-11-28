// ─── WhatsApp: teléfonos y enlaces wa.me ──────────────────────────────────────

/** Misma regla que fn_telefono_whatsapp en la BD: celular colombiano o '+indicativo'. */
export function telefonoWhatsappValido(t) {
  const d = String(t ?? '').replace(/\D/g, '');
  if (/^3\d{9}$/.test(d) || /^573\d{9}$/.test(d)) return true;
  return String(t ?? '').trim().startsWith('+') && /^[1-9]\d{9,14}$/.test(d);
}

/** wa.me sólo acepta dígitos con indicativo: '300 123 4567' → '573001234567'. */
export function telefonoInternacional(t) {
  const d = String(t ?? '').replace(/\D/g, '');
  return /^3\d{9}$/.test(d) ? `57${d}` : d;
}

/**
 * Enlace para abrir WhatsApp (web o app) con un mensaje ya escrito.
 * No necesita configuración: lo envía la persona desde su propio WhatsApp.
 */
export function enlaceWhatsapp(telefono, mensaje) {
  return `https://wa.me/${telefonoInternacional(telefono)}?text=${encodeURIComponent(mensaje)}`;
}

export function mensajeTeleconsulta({ paciente, medico, fecha, hora, enlace }) {
  return [
    `Hola${paciente ? ` ${paciente.split(' ')[0]}` : ''}, este es el enlace de tu teleconsulta`,
    medico ? ` con Dr(a). ${medico}` : '',
    fecha ? ` el ${fecha}` : '',
    hora ? ` a las ${hora}` : '',
    `:\n${enlace}\n\nÁbrelo unos minutos antes desde tu celular o computador y permite el uso de cámara y micrófono.`,
  ].join('');
}
