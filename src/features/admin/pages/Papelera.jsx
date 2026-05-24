import React, { useState, useMemo } from 'react';
import {
  Trash2, Search, AlertCircle, Loader2, RefreshCw, X,
  Calendar, Clock, User, Stethoscope, ClipboardList, FileText,
  RotateCcw, ShieldCheck, Filter, Eye, IdCard, Mail, Phone, Hash,
} from 'lucide-react';
import { papeleraService } from '../../../services';
import { useAuth, usePapelera } from '../../../hooks';
import {
  PageHeader, KPI, ErrorBanner, SuccessBanner, SearchBar, EmptyState,
} from '../../../shared/components/ui';

const TABLAS = [
  { v: 'todas',            l: 'Todas',     icon: FileText },
  { v: 'consulta_medica',  l: 'Consultas', icon: ClipboardList,
    color: 'border-purple-200 bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  { v: 'cita',             l: 'Citas',     icon: Calendar,
    color: 'border-blue-200 bg-blue-50',     badge: 'bg-blue-100 text-blue-700' },
  { v: 'paciente',         l: 'Pacientes', icon: User,
    color: 'border-green-200 bg-green-50',   badge: 'bg-green-100 text-green-700' },
  { v: 'medico',           l: 'Médicos',   icon: Stethoscope,
    color: 'border-teal-200 bg-teal-50',     badge: 'bg-teal-100 text-teal-700' },
];

const styleFor = (tabla) => TABLAS.find(t => t.v === tabla) ?? TABLAS[0];

function timeAgo(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'hace segundos';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} día${d === 1 ? '' : 's'}`;
  return new Date(iso).toLocaleDateString('es-ES');
}

export default function Papelera() {
  const { esAdmin } = useAuth();
  const [search, setSearch]           = useState('');
  const [filtroTabla, setFiltroTabla] = useState('todas');
  const [fechaDesde, setFechaDesde]   = useState('');
  const [fechaHasta, setFechaHasta]   = useState('');
  const [restaurando, setRestaurando] = useState(null);   // item siendo confirmado para restaurar
  const [trabajando, setTrabajando]   = useState(false);  // mientras se ejecuta la RPC
  const [okMsg, setOkMsg]             = useState('');
  const [detalle, setDetalle]         = useState(null);   // item siendo inspeccionado
  const [detalleData, setDetalleData] = useState(null);   // snapshot completo cargado
  const [cargandoDet, setCargandoDet] = useState(false);

  const {
    items, actores, loading, error, setError,
    reload: cargar, restaurar: restaurarHook,
  } = usePapelera({ tabla: filtroTabla, fechaDesde, fechaHasta }, esAdmin);

  const filtered = useMemo(() => items.filter(i => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const resumenTxt = JSON.stringify(i.resumen ?? {}).toLowerCase();
    return (
      (i.id_registro ?? '').includes(search) ||
      resumenTxt.includes(term)
    );
  }), [items, search]);

  const counts = useMemo(() => ({
    todas:           items.length,
    consulta_medica: items.filter(i => i.tabla === 'consulta_medica').length,
    cita:            items.filter(i => i.tabla === 'cita').length,
    paciente:        items.filter(i => i.tabla === 'paciente').length,
    medico:          items.filter(i => i.tabla === 'medico').length,
  }), [items]);

  const abrirDetalle = async (item) => {
    setDetalle(item);
    setDetalleData(null);
    setCargandoDet(true);
    try {
      const data = await papeleraService.getDetalle(item.tabla, item.id_registro);
      setDetalleData(data);
    } catch (err) {
      setError(err.message);
      setDetalle(null);
    } finally {
      setCargandoDet(false);
    }
  };

  const confirmarRestaurar = async () => {
    if (!restaurando) return;
    setTrabajando(true);
    setError(''); setOkMsg('');
    try {
      await restaurarHook(restaurando);
      setOkMsg(`${styleFor(restaurando.tabla).l} #${restaurando.id_registro} restaurado correctamente.`);
      setRestaurando(null);
      setTimeout(() => setOkMsg(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTrabajando(false);
    }
  };

  if (!esAdmin) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center space-y-3">
        <ShieldCheck size={48} className="mx-auto text-red-500" />
        <h2 className="text-xl font-bold text-gray-900">Acceso restringido</h2>
        <p className="text-sm text-gray-500">
          La papelera es solo para administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Papelera"
        descripcion="Registros borrados lógicamente — restauralos antes de purgar."
        icon={<Trash2 size={32} />}
        variant="amber"
      >
        <KPI label="Total"     value={loading ? '···' : counts.todas} />
        <KPI label="Consultas" value={loading ? '···' : counts.consulta_medica} />
        <KPI label="Citas"     value={loading ? '···' : counts.cita} />
        <KPI label="Pacientes" value={loading ? '···' : counts.paciente} />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />
      <SuccessBanner msg={okMsg} />

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={16} /> Filtros
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <SearchBar
            className="md:col-span-2"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por ID o contenido del resumen..."
            focusColor="amber"
          />
          <div>
            <label className="text-xs text-gray-500 block mb-1">Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
        </div>

        {/* Tabs de tabla */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {TABLAS.map(t => {
            const Ico = t.icon;
            const activo = filtroTabla === t.v;
            const n = counts[t.v] ?? 0;
            return (
              <button
                key={t.v}
                onClick={() => setFiltroTabla(t.v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition border ${
                  activo
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-amber-300'
                }`}
              >
                <Ico size={14} /> {t.l}
                <span className={`text-xs px-1.5 rounded-full ${activo ? 'bg-white/30' : 'bg-gray-100'}`}>
                  {n}
                </span>
              </button>
            );
          })}
          <button
            onClick={cargar}
            className="ml-auto flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
          >
            <RefreshCw size={14} /> Recargar
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-16 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-amber-600" />
          <p className="text-gray-500 text-sm">Cargando papelera...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Trash2}
          titulo="Papelera vacía"
          descripcion={items.length === 0
            ? 'No hay registros borrados en este momento.'
            : 'Ningún registro coincide con los filtros aplicados.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <ItemCard
              key={`${item.tabla}-${item.id_registro}`}
              item={item}
              actor={actores[item.deleted_by] ?? null}
              onRestaurar={() => setRestaurando(item)}
              onVerDetalle={() => abrirDetalle(item)}
            />
          ))}
        </div>
      )}

      {restaurando && (
        <ModalConfirmarRestaurar
          item={restaurando}
          actor={actores[restaurando.deleted_by] ?? null}
          trabajando={trabajando}
          onConfirm={confirmarRestaurar}
          onClose={() => setRestaurando(null)}
        />
      )}

      {detalle && (
        <ModalDetalle
          item={detalle}
          data={detalleData}
          cargando={cargandoDet}
          actor={actores[detalle.deleted_by] ?? null}
          onRestaurar={() => { setDetalle(null); setRestaurando(detalle); }}
          onClose={() => { setDetalle(null); setDetalleData(null); }}
        />
      )}
    </div>
  );
}

// ─── Card por item ─────────────────────────────────────────────────────────────
function ItemCard({ item, actor, onRestaurar, onVerDetalle }) {
  const st = styleFor(item.tabla);
  const Ico = st.icon;
  return (
    <div className={`rounded-xl border-2 ${st.color} p-4 shadow-sm hover:shadow-md transition`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg ${st.badge} flex items-center justify-center`}>
            <Ico size={18} />
          </div>
          <div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${st.badge}`}>
              {st.l}
            </span>
            <p className="text-xs text-gray-500 font-mono mt-1">ID #{item.id_registro}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onVerDetalle}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition"
            title="Ver datos completos del registro"
          >
            <Eye size={14} /> Ver
          </button>
          <button
            onClick={onRestaurar}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition shadow-sm"
          >
            <RotateCcw size={14} /> Restaurar
          </button>
        </div>
      </div>

      <ResumenItem tabla={item.tabla} resumen={item.resumen} />

      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
          <User size={12} className="flex-shrink-0" />
          <span className="truncate">
            Borrado por: <strong>{actor?.nombre_completo ?? '(usuario eliminado o sistema)'}</strong>
            {actor?.rol_nombre && <span className="text-gray-400"> · {actor.rol_nombre}</span>}
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-500 flex-shrink-0" title={item.deleted_at}>
          <Clock size={11} /> {timeAgo(item.deleted_at)}
        </div>
      </div>
    </div>
  );
}

// ─── Renderiza el JSON resumen según la tabla ─────────────────────────────────
function ResumenItem({ tabla, resumen }) {
  if (!resumen || typeof resumen !== 'object') {
    return <p className="text-xs text-gray-400 italic">Sin información de resumen</p>;
  }
  if (tabla === 'consulta_medica') {
    return (
      <div className="space-y-1 text-sm">
        <p className="font-bold text-gray-900 truncate">{resumen.paciente ?? '—'}</p>
        {resumen.documento && <p className="text-xs text-gray-500 font-mono">Doc {resumen.documento}</p>}
        <p className="text-gray-700"><span className="font-semibold">Fecha:</span> {String(resumen.fecha ?? '—').slice(0, 16).replace('T', ' ')}</p>
        <p className="text-gray-700 line-clamp-2"><span className="font-semibold">Motivo:</span> {resumen.motivo ?? '—'}</p>
        {resumen.dx && <p className="text-emerald-700 line-clamp-1"><span className="font-semibold">Dx:</span> {resumen.dx}</p>}
      </div>
    );
  }
  if (tabla === 'cita') {
    return (
      <div className="space-y-1 text-sm">
        <p className="font-bold text-gray-900 truncate">{resumen.paciente ?? '—'}</p>
        {resumen.documento && <p className="text-xs text-gray-500 font-mono">Doc {resumen.documento}</p>}
        <p className="text-gray-700"><span className="font-semibold">Médico:</span> Dr(a). {resumen.medico ?? '—'}</p>
        <p className="text-gray-700"><span className="font-semibold">Fecha:</span> {String(resumen.fecha ?? '—').slice(0, 16).replace('T', ' ')}</p>
        <p className="text-gray-700">
          <span className="font-semibold">Estado:</span> {resumen.estado ?? '—'}
          {resumen.motivo && <span className="text-gray-500 ml-1">· {resumen.motivo}</span>}
        </p>
      </div>
    );
  }
  if (tabla === 'paciente') {
    return (
      <div className="space-y-1 text-sm">
        <p className="font-bold text-gray-900 truncate">{resumen.nombre ?? '—'}</p>
        {resumen.documento && (
          <p className="text-xs text-gray-500 font-mono">
            {resumen.tipo_documento ?? 'CC'} {resumen.documento}
          </p>
        )}
        <p className="text-gray-700"><span className="font-semibold">HC:</span> {resumen.numero_historia ?? '—'}</p>
        {resumen.email && <p className="text-gray-600 text-xs truncate">{resumen.email}</p>}
        {resumen.telefono && <p className="text-gray-600 text-xs">Tel: {resumen.telefono}</p>}
        {resumen.tipo_sangre && (
          <span className="inline-block text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">
            Sangre: {resumen.tipo_sangre}
          </span>
        )}
      </div>
    );
  }
  if (tabla === 'medico') {
    return (
      <div className="space-y-1 text-sm">
        <p className="font-bold text-gray-900 truncate">Dr(a). {resumen.nombre ?? '—'}</p>
        {resumen.documento && <p className="text-xs text-gray-500 font-mono">Doc {resumen.documento}</p>}
        <p className="text-gray-700"><span className="font-semibold">Especialidad:</span> {resumen.especialidad ?? '—'}</p>
        <p className="text-gray-700"><span className="font-semibold">Licencia:</span> {resumen.numero_licencia ?? '—'}</p>
        {resumen.consultorio && <p className="text-gray-700"><span className="font-semibold">Consultorio:</span> {resumen.consultorio}</p>}
        {resumen.email && <p className="text-gray-600 text-xs truncate">{resumen.email}</p>}
      </div>
    );
  }
  return (
    <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white/60 rounded-lg p-2 font-mono">
      {JSON.stringify(resumen, null, 2)}
    </pre>
  );
}

// ─── Modal de detalle completo ────────────────────────────────────────────────
function ModalDetalle({ item, data, cargando, actor, onRestaurar, onClose }) {
  const st = styleFor(item.tabla);
  const Ico = st.icon;

  // "Aplanamos" la persona embebida para mostrar todo el detalle.
  const flat = useMemo(() => {
    if (!data) return null;
    const { persona, paciente, medico, ...rest } = data;
    const out = { ...rest };
    if (persona) Object.entries(persona).forEach(([k, v]) => out[`persona_${k}`] = v);
    if (paciente?.persona) {
      Object.entries(paciente).forEach(([k, v]) => { if (k !== 'persona') out[`paciente_${k}`] = v; });
      Object.entries(paciente.persona).forEach(([k, v]) => out[`paciente_persona_${k}`] = v);
    }
    if (medico?.persona) {
      Object.entries(medico).forEach(([k, v]) => { if (k !== 'persona') out[`medico_${k}`] = v; });
      Object.entries(medico.persona).forEach(([k, v]) => out[`medico_persona_${k}`] = v);
    }
    return out;
  }, [data]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className={`sticky top-0 z-10 px-6 py-4 flex justify-between items-center rounded-t-2xl ${st.badge}`}>
          <div className="flex items-center gap-3">
            <Ico size={24} />
            <div>
              <h2 className="text-xl font-bold">Detalle del registro borrado</h2>
              <p className="text-xs opacity-80">{st.l} · ID #{item.id_registro} · borrado {timeAgo(item.deleted_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-black/10 p-2 rounded-lg">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Resumen rápido siempre visible (lo que ya muestra la card) */}
          <div className={`rounded-xl border ${st.color} p-4`}>
            <p className="text-xs font-bold uppercase text-gray-600 mb-2">Resumen</p>
            <ResumenItem tabla={item.tabla} resumen={item.resumen} />
          </div>

          {/* Metadatos del borrado */}
          <div className="grid grid-cols-2 gap-3">
            <Info icon={User} label="Borrado por" value={actor?.nombre_completo ?? '(sistema)'} sub={actor?.rol_nombre} />
            <Info icon={Clock} label="Fecha de borrado" value={item.deleted_at?.slice(0, 19).replace('T', ' ')} sub={timeAgo(item.deleted_at)} />
          </div>

          {/* Snapshot completo del registro */}
          {cargando ? (
            <div className="py-12 text-center">
              <Loader2 size={28} className="mx-auto mb-2 animate-spin text-amber-600" />
              <p className="text-sm text-gray-500">Cargando datos completos...</p>
            </div>
          ) : !flat ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 flex items-start gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              No se pudo cargar el detalle de este registro.
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold uppercase text-gray-600 mb-2">
                Todos los datos guardados
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl divide-y divide-gray-200 max-h-80 overflow-y-auto">
                {Object.entries(flat)
                  .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k} className="px-3 py-2 grid grid-cols-3 gap-2 text-xs">
                      <span className="text-gray-500 font-mono col-span-1">{k}</span>
                      <span className="col-span-2 text-gray-800 break-words whitespace-pre-wrap">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 italic">
                Al restaurar, el registro vuelve exactamente con estos mismos datos.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-3 border-t border-gray-200">
            <button onClick={onClose}
              className="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold">
              Cerrar
            </button>
            <button onClick={onRestaurar}
              className="flex-1 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 transition font-semibold shadow-lg flex items-center justify-center gap-2">
              <RotateCcw size={16} /> Restaurar este registro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        {Icon && <Icon size={12} />} {label}
      </div>
      <p className="text-sm font-semibold text-gray-900 truncate">{value || '—'}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

// ─── Modal de confirmación ────────────────────────────────────────────────────
function ModalConfirmarRestaurar({ item, actor, trabajando, onConfirm, onClose }) {
  const st = styleFor(item.tabla);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-4 flex items-center gap-3">
          <div className="bg-white/20 rounded-full p-2">
            <RotateCcw size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold">Restaurar registro</h2>
            <p className="text-xs text-amber-100">Volverá a estar visible para todos los usuarios</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            ¿Confirmas que deseas restaurar este registro de la papelera?
          </p>

          <div className={`p-3 rounded-xl border ${st.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${st.badge}`}>{st.l}</span>
              <span className="text-xs text-gray-600 font-mono">#{item.id_registro}</span>
            </div>
            <ResumenItem tabla={item.tabla} resumen={item.resumen} />
            <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200">
              Borrado {timeAgo(item.deleted_at)} por{' '}
              <strong>{actor?.nombre_completo ?? '(usuario eliminado)'}</strong>
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            Al restaurar, el registro queda visible inmediatamente. La acción
            se registra en el log de auditoría como un UPDATE.
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={trabajando}
              className="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold disabled:opacity-60">
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={trabajando}
              className="flex-1 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 transition font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              <RotateCcw size={16} />
              {trabajando ? 'Restaurando...' : 'Sí, restaurar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

