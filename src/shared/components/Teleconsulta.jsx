import React from 'react';
import { Video, MessageCircle, Smartphone } from 'lucide-react';
import { telefonoWhatsappValido, enlaceWhatsapp } from '../utils/whatsapp';

// ─── Teleconsulta y WhatsApp: piezas compartidas ──────────────────────────────

// ─── Opción "Avisos por WhatsApp" del formulario de agendar ───────────────────
const ACENTO = {
  brand: { ring: 'focus:border-brand-500 focus:ring-brand-500/10', box: 'accent-brand-700', bg: 'bg-brand-50/50 border-brand-100' },
  sky:   { ring: 'focus:border-sky-500 focus:ring-sky-500/10',     box: 'accent-sky-600',   bg: 'bg-sky-50/60 border-sky-100' },
};

export function OpcionWhatsapp({
  activo, onActivo, telefono, onTelefono, teleconsulta = false, paraPaciente = false, color = 'brand',
}) {
  const c = ACENTO[color] ?? ACENTO.brand;
  const invalido = activo && telefono && !telefonoWhatsappValido(telefono);
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${c.bg}`}>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" checked={activo} onChange={e => onActivo(e.target.checked)}
          className={`mt-0.5 w-4 h-4 flex-shrink-0 ${c.box}`} />
        <span className="text-[13px] text-ink-800 leading-snug">
          <span className="font-medium flex items-center gap-1.5">
            <MessageCircle size={14} className="text-emerald-600" />
            {paraPaciente ? 'Recibir avisos por WhatsApp' : 'Enviar avisos por WhatsApp al paciente'}
          </span>
          <span className="block text-[12px] text-ink-500 mt-0.5">
            Confirmación de la cita y recordatorio un día antes
            {teleconsulta && <>, y <strong className="font-medium text-ink-700">el enlace de la videollamada</strong> (también una hora antes)</>}.
            {paraPaciente ? ' Al marcar esta opción autorizas que te escribamos por WhatsApp.' : ' El paciente debe haberlo autorizado.'}
          </span>
        </span>
      </label>

      {activo && (
        <div>
          <label className="text-[12.5px] font-medium text-ink-700 mb-1 flex items-center gap-1.5">
            <Smartphone size={13} className="text-ink-500" /> Número de WhatsApp *
          </label>
          <input
            type="tel" inputMode="tel" value={telefono} onChange={e => onTelefono(e.target.value)}
            placeholder="300 123 4567" maxLength={20}
            className={[
              'w-full sm:w-64 px-3.5 py-2 text-[13.5px] bg-white border rounded-xl text-ink-900 focus:outline-none focus:ring-4 transition-all',
              invalido ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : `border-line ${c.ring}`,
            ].join(' ')}
          />
          {invalido && (
            <p className="text-[11.5px] text-red-600 mt-1">Escribe un celular de 10 dígitos (ej: 300 123 4567) o un número con +indicativo.</p>
          )}
        </div>
      )}

      {teleconsulta && !activo && (
        <p className="text-[11.5px] text-amber-700">
          Sin WhatsApp, el enlace de la videollamada {paraPaciente ? 'lo verás' : 'lo verá el paciente'} sólo en «Mis citas» del portal.
        </p>
      )}
    </div>
  );
}

// ─── Botones ──────────────────────────────────────────────────────────────────
export function BotonTeleconsulta({ enlace, children = 'Entrar a la teleconsulta', className = '' }) {
  if (!enlace) return null;
  return (
    <a href={enlace} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors ${className}`}>
      <Video size={14} /> {children}
    </a>
  );
}

export function BotonEnviarWhatsapp({ telefono, mensaje, children = 'Enviar por WhatsApp', className = '' }) {
  if (!telefono) return null;
  return (
    <a href={enlaceWhatsapp(telefono, mensaje)} target="_blank" rel="noopener noreferrer"
      title="Abre WhatsApp con el mensaje listo para enviar"
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors ${className}`}>
      <MessageCircle size={14} /> {children}
    </a>
  );
}

export function EtiquetaTeleconsulta() {
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100">
      <Video size={11} /> Teleconsulta
    </span>
  );
}
