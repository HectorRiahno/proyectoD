import React from 'react';
import {
  AlertCircle, CheckCircle, Clock, FileText, Ban, XCircle,
} from 'lucide-react';

// ─── Estilos de estado de CITA ─────────────────────────────────────────────────
const ESTADOS_CITA = {
  programada: { label: 'Programada', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  confirmada: { label: 'Confirmada', cls: 'bg-green-100 text-green-700 border-green-200' },
  en_curso:   { label: 'En curso',   cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  completada: { label: 'Completada', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  cancelada:  { label: 'Cancelada',  cls: 'bg-red-100 text-red-700 border-red-200' },
  no_asistio: { label: 'No asistió', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
};

// ─── Estilos de estado de FACTURA ──────────────────────────────────────────────
const ESTADOS_FACTURA = {
  borrador:  { label: 'Borrador',  cls: 'bg-gray-200 text-gray-700 border-gray-300',       icon: FileText },
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 border-amber-200',    icon: AlertCircle },
  pagada:    { label: 'Pagada',    cls: 'bg-green-100 text-green-700 border-green-200',    icon: CheckCircle },
  anulada:   { label: 'Anulada',   cls: 'bg-red-100 text-red-700 border-red-200',          icon: Ban },
  vencida:   { label: 'Vencida',   cls: 'bg-orange-100 text-orange-700 border-orange-200', icon: XCircle },
};

const MAPAS = {
  cita:    ESTADOS_CITA,
  factura: ESTADOS_FACTURA,
};

/**
 * Badge unificado para estados de cita/factura.
 *
 *   <EstadoBadge type="cita"    estado={c.estado} />
 *   <EstadoBadge type="factura" estado={f.estado} withIcon />
 */
export function EstadoBadge({ type = 'cita', estado, withIcon = false, size = 'sm' }) {
  const map = MAPAS[type] ?? MAPAS.cita;
  const cfg = map[estado] ?? { label: estado, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
  const Icon = withIcon ? cfg.icon : null;
  const padding = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-3 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium border capitalize ${padding} ${cfg.cls}`}>
      {Icon && <Icon size={11} />} {cfg.label}
    </span>
  );
}

/** Obtener etiqueta legible sin renderizar — útil en logs. */
export function estadoLabel(type, estado) {
  return MAPAS[type]?.[estado]?.label ?? estado;
}

/** Obtener clases CSS sin renderizar — útil cuando el componente envuelve más cosas. */
export function estadoCls(type, estado) {
  return MAPAS[type]?.[estado]?.cls ?? 'bg-gray-100 text-gray-700 border-gray-200';
}

export default EstadoBadge;
