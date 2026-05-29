import React from 'react';
import {
  AlertCircle, CheckCircle, Clock, FileText, Ban, XCircle,
} from 'lucide-react';

/* =====================================================================
   EstadoBadge — píldora con dot + label + color sutil. Mantiene la API
   (type, estado, withIcon, size) pero usa colores refinados (no saturados).
   ===================================================================== */

// Estilos: tint suave (bg-{tone}-50) + text-{tone}-700 + dot-{tone}-500
const ESTADOS_CITA = {
  programada: { label: 'Programada', cls: 'bg-brand-50 text-brand-700 border-brand-100',         dot: 'bg-brand-500' },
  confirmada: { label: 'Confirmada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100',   dot: 'bg-emerald-500' },
  en_curso:   { label: 'En curso',   cls: 'bg-amber-50 text-amber-700 border-amber-100',         dot: 'bg-amber-500' },
  completada: { label: 'Completada', cls: 'bg-surface text-ink-700 border-line',                 dot: 'bg-ink-300' },
  cancelada:  { label: 'Cancelada',  cls: 'bg-red-50 text-red-700 border-red-100',               dot: 'bg-red-500' },
  no_asistio: { label: 'No asistió', cls: 'bg-rose-50 text-rose-700 border-rose-100',            dot: 'bg-rose-500' },
};

const ESTADOS_FACTURA = {
  borrador:  { label: 'Borrador',  cls: 'bg-surface text-ink-700 border-line',                  dot: 'bg-ink-300',     icon: FileText },
  pendiente: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-100',          dot: 'bg-amber-500',   icon: AlertCircle },
  pagada:    { label: 'Pagada',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-100',    dot: 'bg-emerald-500', icon: CheckCircle },
  anulada:   { label: 'Anulada',   cls: 'bg-red-50 text-red-700 border-red-100',                dot: 'bg-red-500',     icon: Ban },
  vencida:   { label: 'Vencida',   cls: 'bg-rose-50 text-rose-700 border-rose-100',             dot: 'bg-rose-500',    icon: XCircle },
};

const MAPAS = {
  cita:    ESTADOS_CITA,
  factura: ESTADOS_FACTURA,
};

/**
 *   <EstadoBadge type="cita"    estado={c.estado} />
 *   <EstadoBadge type="factura" estado={f.estado} withIcon />
 */
export function EstadoBadge({ type = 'cita', estado, withIcon = false, size = 'sm' }) {
  const map = MAPAS[type] ?? MAPAS.cita;
  const cfg = map[estado] ?? { label: estado, cls: 'bg-surface text-ink-700 border-line', dot: 'bg-ink-300' };
  const IconCfg = withIcon ? cfg.icon : null;
  const padding = size === 'lg' ? 'px-2.5 py-1 text-[12px]' : 'px-2 py-0.5 text-[11px]';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${padding} ${cfg.cls}`}>
      {IconCfg
        ? <IconCfg size={11} strokeWidth={2} />
        : <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
      {cfg.label}
    </span>
  );
}

/** Etiqueta legible sin renderizar — útil en logs/tooltips. */
export function estadoLabel(type, estado) {
  return MAPAS[type]?.[estado]?.label ?? estado;
}

/** Clases CSS sin renderizar — útil cuando se envuelve algo más complejo. */
export function estadoCls(type, estado) {
  return MAPAS[type]?.[estado]?.cls ?? 'bg-surface text-ink-700 border-line';
}

export default EstadoBadge;
