import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, X, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { alertaService } from '../../../services';

// Mapeo entidad → ruta admin. Si la alerta apunta a otra entidad, se
// puede agregar acá sin tocar el resto del componente.
const RUTAS_ENTIDAD = {
  medicamento: (id) => `/dashboard/inventario?highlight=${id}`,
};

/**
 * Campana de notificaciones del admin.
 * Muestra solo alertas con severidad='crit' y estado='activa'.
 * Realtime: el badge y la lista se actualizan cuando se inserta/cambia
 * una fila en `alerta`. RLS limita el acceso a admin, así que renderizar
 * este componente fuera de admin no expone datos — aún así, montarlo
 * solo en EmployeeNavbar cuando esAdmin evita el ruido del canal.
 */
export default function NotificacionesBell() {
  const navigate = useNavigate();
  const [alertas, setAlertas]   = useState([]);
  const [count, setCount]       = useState(0);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [accionId, setAccionId] = useState(null);
  const popRef = useRef(null);

  // Click en el cuerpo de la alerta → navega a la entidad referenciada
  // y marca como vista (para que no quede sin atención).
  const irAEntidad = (a) => {
    const builder = RUTAS_ENTIDAD[a.entidad_tabla];
    if (!builder || !a.entidad_id) return;
    alertaService.marcarVista(a.id_alerta).catch(() => {});
    setOpen(false);
    navigate(builder(a.entidad_id));
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [lista, total] = await Promise.all([
        alertaService.getCriticasActivas(20),
        alertaService.countCriticasActivas(),
      ]);
      setAlertas(lista);
      setCount(total);
    } catch {
      // RLS deny u otros → tratamos como sin alertas (no romper el navbar).
      setAlertas([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial: evalúa reglas (por si hay alertas pendientes que el
  // trigger no detectó por estado pre-existente) y luego carga la lista.
  // Errores en la evaluación (ej. no admin) se ignoran — la lista carga igual.
  useEffect(() => {
    alertaService.evaluarInventario()
      .catch(() => {})
      .finally(cargar);
    const channel = alertaService.subscribeRealtime(cargar);
    return () => { channel.unsubscribe(); };
  }, [cargar]);

  // Cada vez que se abre el popover, refrescar por si cambió algo.
  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  // Cerrar el popover al hacer click fuera.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const resolver = async (id) => {
    setAccionId(id);
    try {
      await alertaService.resolver(id);
      await cargar();
    } finally {
      setAccionId(null);
    }
  };

  const descartar = async (id) => {
    setAccionId(id);
    try {
      await alertaService.descartar(id);
      await cargar();
    } finally {
      setAccionId(null);
    }
  };

  const fmtHora = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const ahora = Date.now();
    const diffMin = Math.round((ahora - d.getTime()) / 60000);
    if (diffMin < 1)  return 'ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24)   return `hace ${diffH}h`;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="relative" ref={popRef}>
      <button
        onClick={() => setOpen(!open)}
        title={count > 0 ? `${count} alerta(s) crítica(s)` : 'Sin alertas críticas'}
        className="relative p-2.5 rounded-xl bg-white/70 hover:bg-white hover:shadow-md transition border border-blue-100"
      >
        <Bell size={20} className={count > 0 ? 'text-red-600' : 'text-gray-500'} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow ring-2 ring-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              <h3 className="font-bold text-gray-900 text-sm">Alertas críticas</h3>
            </div>
            <span className="text-xs text-gray-500">{count} activa{count !== 1 ? 's' : ''}</span>
          </div>

          {/* Lista */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 size={20} className="mx-auto animate-spin text-red-500" />
              </div>
            ) : alertas.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                <p className="text-sm text-gray-600 font-medium">Todo en orden</p>
                <p className="text-xs text-gray-400">No hay alertas críticas activas.</p>
              </div>
            ) : alertas.map(a => {
              const navegable = !!RUTAS_ENTIDAD[a.entidad_tabla] && !!a.entidad_id;
              return (
                <div
                  key={a.id_alerta}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-red-50/40 transition ${navegable ? 'cursor-pointer' : ''}`}
                  onClick={navegable ? () => irAEntidad(a) : undefined}
                  role={navegable ? 'button' : undefined}
                  title={navegable ? 'Ir al detalle' : undefined}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0">
                      <AlertTriangle size={16} className="text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-bold text-gray-900 truncate flex items-center gap-1">
                          {a.titulo}
                          {navegable && <ExternalLink size={11} className="text-gray-400" />}
                        </p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtHora(a.detectada_en)}</span>
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5">{a.mensaje}</p>
                      {a.recomendacion && (
                        <p className="text-[11px] text-gray-500 italic mt-1">
                          Recomendación: {a.recomendacion}
                        </p>
                      )}
                      {/* stopPropagation evita que el click en los botones
                          dispare la navegación del card. */}
                      <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => resolver(a.id_alerta)}
                          disabled={accionId === a.id_alerta}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition disabled:opacity-50"
                        >
                          {accionId === a.id_alerta
                            ? <Loader2 size={11} className="animate-spin" />
                            : <CheckCircle size={11} />}
                          Resolver
                        </button>
                        <button
                          onClick={() => descartar(a.id_alerta)}
                          disabled={accionId === a.id_alerta}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition disabled:opacity-50"
                        >
                          <X size={11} /> Descartar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {alertas.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-500 text-center">
              Las alertas se actualizan en tiempo real
            </div>
          )}
        </div>
      )}
    </div>
  );
}
