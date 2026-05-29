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
  Toolbar, LoadingState,
} from '../../../shared/components/ui';

const TABLAS = [
  { v: 'todas',            l: 'Todas',     icon: FileText,
    color: 'border-line bg-white',                                badge: 'bg-surface text-ink-700 border border-line' },
  { v: 'consulta_medica',  l: 'Consultas', icon: ClipboardList,
    color: 'border-violet-100 bg-violet-50/60',                   badge: 'bg-violet-50 text-violet-700 border border-violet-100' },
  { v: 'cita',             l: 'Citas',     icon: Calendar,
    color: 'border-brand-100 bg-brand-50/60',                     badge: 'bg-brand-50 text-brand-700 border border-brand-100' },
  { v: 'paciente',         l: 'Pacientes', icon: User,
    color: 'border-emerald-100 bg-emerald-50/60',                 badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  { v: 'medico',           l: 'Médicos',   icon: Stethoscope,
    color: 'border-teal-100 bg-teal-50/60',                       badge: 'bg-teal-50 text-teal-700 border border-teal-100' },
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
      <EmptyState
        icon={ShieldCheck}
        titulo="Acceso restringido"
        descripcion="La papelera es solo para administradores."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Papelera"
        descripcion="Registros borrados lógicamente — restauralos antes de purgar."
        eyebrow="Papelera"
        icon={<Trash2 size={11} strokeWidth={2.25} />}
        variant="rose"
      >
        <KPI label="Total"     value={loading ? '···' : counts.todas} />
        <KPI label="Consultas" value={loading ? '···' : counts.consulta_medica} color="text-violet-700" />
        <KPI label="Citas"     value={loading ? '···' : counts.cita}            color="text-brand-700" />
        <KPI label="Pacientes" value={loading ? '···' : counts.paciente}        color="text-emerald-700" />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />
      <SuccessBanner msg={okMsg} />

      <Toolbar>
        <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.10em] font-medium text-ink-500 mr-1">
          <Filter size={12} strokeWidth={2} /> Filtros
        </div>
        <SearchBar
          className="min-w-[220px]"
          value={search}
          onChange={setSearch}
          placeholder="Buscar por ID o contenido del resumen…"
        />
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
          title="Desde"
          className="px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all" />
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
          title="Hasta"
          className="px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all" />
        <div className="flex-1" />
        <button onClick={cargar}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-ink-700 border border-line rounded-lg hover:bg-surface hover:border-ink-100 transition-colors">
          <RefreshCw size={13} strokeWidth={1.75} /> Recargar
        </button>
      </Toolbar>

      {/* Tabs de tabla */}
      <div className="flex flex-wrap gap-1.5">
        {TABLAS.map(t => {
          const Ico = t.icon;
          const activo = filtroTabla === t.v;
          const n = counts[t.v] ?? 0;
          return (
            <button
              key={t.v}
              onClick={() => setFiltroTabla(t.v)}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150',
                activo
                  ? 'bg-rose-600 text-white shadow-[0_4px_14px_-6px_rgba(11,18,32,0.35)]'
                  : 'bg-surface text-ink-700 hover:bg-ink-100/40 border border-line',
              ].join(' ')}
            >
              <Ico size={13} strokeWidth={1.75} /> {t.l}
              <span className={activo ? 'text-white/70' : 'text-ink-500'}>({n})</span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <LoadingState mensaje="Cargando papelera…" color="amber" />
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
    <div className={`rounded-2xl border ${st.color} p-4 shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:shadow-[0_8px_24px_-14px_rgba(11,18,32,0.16)] transition-all duration-200`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`inline-flex w-9 h-9 items-center justify-center rounded-lg ${st.badge}`}>
            <Ico size={15} strokeWidth={1.75} />
          </span>
          <div>
            <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-md font-medium ${st.badge}`}>
              {st.l}
            </span>
            <p className="text-[11px] text-ink-500 font-mono mt-1">ID #{item.id_registro}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onVerDetalle}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-line text-ink-700 text-[12px] font-medium rounded-lg hover:bg-surface hover:border-ink-100 transition-colors"
            title="Ver datos completos del registro"
          >
            <Eye size={13} strokeWidth={1.75} /> Ver
          </button>
          <button
            onClick={onRestaurar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-medium rounded-lg shadow-[0_4px_14px_-6px_rgba(11,18,32,0.45)] active:scale-[0.99] transition-all duration-150"
          >
            <RotateCcw size={13} strokeWidth={1.75} /> Restaurar
          </button>
        </div>
      </div>

      <ResumenItem tabla={item.tabla} resumen={item.resumen} />

      <div className="mt-3 pt-3 border-t border-line/70 flex items-center justify-between text-[11.5px]">
        <div className="flex items-center gap-1.5 text-ink-500 min-w-0">
          <User size={11} className="flex-shrink-0" strokeWidth={1.75} />
          <span className="truncate">
            Borrado por: <strong className="font-medium text-ink-700">{actor?.nombre_completo ?? '(usuario eliminado o sistema)'}</strong>
            {actor?.rol_nombre && <span className="text-ink-300"> · {actor.rol_nombre}</span>}
          </span>
        </div>
        <div className="flex items-center gap-1 text-ink-500 flex-shrink-0" title={item.deleted_at}>
          <Clock size={10} strokeWidth={1.75} /> {timeAgo(item.deleted_at)}
        </div>
      </div>
    </div>
  );
}

// ─── Renderiza el JSON resumen según la tabla ─────────────────────────────────
function ResumenItem({ tabla, resumen }) {
  if (!resumen || typeof resumen !== 'object') {
    return <p className="text-[12px] text-ink-300 italic">Sin información de resumen</p>;
  }
  if (tabla === 'consulta_medica') {
    return (
      <div className="space-y-1 text-[13px]">
        <p className="font-medium text-ink-900 truncate">{resumen.paciente ?? '—'}</p>
        {resumen.documento && <p className="text-[11.5px] text-ink-500 font-mono">Doc {resumen.documento}</p>}
        <p className="text-ink-700"><span className="font-medium">Fecha:</span> {String(resumen.fecha ?? '—').slice(0, 16).replace('T', ' ')}</p>
        <p className="text-ink-700 line-clamp-2"><span className="font-medium">Motivo:</span> {resumen.motivo ?? '—'}</p>
        {resumen.dx && <p className="text-emerald-700 line-clamp-1"><span className="font-medium">Dx:</span> {resumen.dx}</p>}
      </div>
    );
  }
  if (tabla === 'cita') {
    return (
      <div className="space-y-1 text-[13px]">
        <p className="font-medium text-ink-900 truncate">{resumen.paciente ?? '—'}</p>
        {resumen.documento && <p className="text-[11.5px] text-ink-500 font-mono">Doc {resumen.documento}</p>}
        <p className="text-ink-700"><span className="font-medium">Médico:</span> Dr(a). {resumen.medico ?? '—'}</p>
        <p className="text-ink-700"><span className="font-medium">Fecha:</span> {String(resumen.fecha ?? '—').slice(0, 16).replace('T', ' ')}</p>
        <p className="text-ink-700">
          <span className="font-medium">Estado:</span> {resumen.estado ?? '—'}
          {resumen.motivo && <span className="text-ink-500 ml-1">· {resumen.motivo}</span>}
        </p>
      </div>
    );
  }
  if (tabla === 'paciente') {
    return (
      <div className="space-y-1 text-[13px]">
        <p className="font-medium text-ink-900 truncate">{resumen.nombre ?? '—'}</p>
        {resumen.documento && (
          <p className="text-[11.5px] text-ink-500 font-mono">
            {resumen.tipo_documento ?? 'CC'} {resumen.documento}
          </p>
        )}
        <p className="text-ink-700"><span className="font-medium">HC:</span> {resumen.numero_historia ?? '—'}</p>
        {resumen.email && <p className="text-ink-500 text-[11.5px] truncate">{resumen.email}</p>}
        {resumen.telefono && <p className="text-ink-500 text-[11.5px]">Tel: {resumen.telefono}</p>}
        {resumen.tipo_sangre && (
          <span className="inline-block text-[11px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 font-medium mt-1">
            Sangre: {resumen.tipo_sangre}
          </span>
        )}
      </div>
    );
  }
  if (tabla === 'medico') {
    return (
      <div className="space-y-1 text-[13px]">
        <p className="font-medium text-ink-900 truncate">Dr(a). {resumen.nombre ?? '—'}</p>
        {resumen.documento && <p className="text-[11.5px] text-ink-500 font-mono">Doc {resumen.documento}</p>}
        <p className="text-ink-700"><span className="font-medium">Especialidad:</span> {resumen.especialidad ?? '—'}</p>
        <p className="text-ink-700"><span className="font-medium">Licencia:</span> {resumen.numero_licencia ?? '—'}</p>
        {resumen.consultorio && <p className="text-ink-700"><span className="font-medium">Consultorio:</span> {resumen.consultorio}</p>}
        {resumen.email && <p className="text-ink-500 text-[11.5px] truncate">{resumen.email}</p>}
      </div>
    );
  }
  return (
    <pre className="text-[11.5px] text-ink-700 whitespace-pre-wrap bg-white/70 border border-line rounded-lg p-2 font-mono">
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
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 motion-safe:[animation:hp-fade-up_0.2s_ease-out]">
      <div className="relative bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] border border-line w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex justify-between items-start gap-4 z-10">
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-rose-500" />
          <div className="flex items-start gap-3 ml-2">
            <span className={`flex-shrink-0 inline-flex w-9 h-9 items-center justify-center rounded-lg ${st.badge}`}>
              <Ico size={17} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">Detalle del registro borrado</h2>
              <p className="text-[12px] text-ink-500 mt-0.5">{st.l} · ID #{item.id_registro} · borrado {timeAgo(item.deleted_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 -mt-0.5 -mr-1 text-ink-300 hover:text-ink-900 hover:bg-surface p-1.5 rounded-lg transition-colors">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Resumen rápido */}
          <div className={`rounded-xl border ${st.color} p-4`}>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500 mb-2">Resumen</p>
            <ResumenItem tabla={item.tabla} resumen={item.resumen} />
          </div>

          {/* Metadatos */}
          <div className="grid grid-cols-2 gap-2.5">
            <InfoCell icon={User}  label="Borrado por"      value={actor?.nombre_completo ?? '(sistema)'} sub={actor?.rol_nombre} />
            <InfoCell icon={Clock} label="Fecha de borrado" value={item.deleted_at?.slice(0, 19).replace('T', ' ')} sub={timeAgo(item.deleted_at)} />
          </div>

          {/* Snapshot completo del registro */}
          {cargando ? (
            <div className="py-12 text-center">
              <Loader2 size={24} className="mx-auto mb-2 animate-spin text-rose-600" strokeWidth={1.75} />
              <p className="text-[13px] text-ink-500">Cargando datos completos…</p>
            </div>
          ) : !flat ? (
            <div className="flex items-start gap-2.5 text-[13px] text-amber-800 bg-amber-50/70 border-l-2 border-amber-500 pl-3 pr-3 py-2.5 rounded-r-md">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
              No se pudo cargar el detalle de este registro.
            </div>
          ) : (
            <div>
              <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500 mb-2">
                Todos los datos guardados
              </p>
              <div className="bg-surface border border-line rounded-xl divide-y divide-line max-h-80 overflow-y-auto">
                {Object.entries(flat)
                  .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k} className="px-3 py-2 grid grid-cols-3 gap-2 text-[12px]">
                      <span className="text-ink-500 font-mono col-span-1">{k}</span>
                      <span className="col-span-2 text-ink-800 break-words whitespace-pre-wrap font-mono">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
              </div>
              <p className="text-[11.5px] text-ink-500 mt-2 italic">
                Al restaurar, el registro vuelve exactamente con estos mismos datos.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-3 border-t border-line">
            <button onClick={onClose}
              className="flex-1 px-5 py-2.5 bg-white border border-line text-ink-800 rounded-xl hover:bg-surface hover:border-ink-100 active:scale-[0.99] transition-all duration-150 text-[13.5px] font-medium">
              Cerrar
            </button>
            <button onClick={onRestaurar}
              className="group flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[13.5px] font-medium shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_24px_-14px_rgba(11,18,32,0.40)] active:scale-[0.99] transition-all duration-150">
              <RotateCcw size={14} strokeWidth={1.75} /> Restaurar este registro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-line bg-surface/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">
        {Icon && <Icon size={11} strokeWidth={2} />} {label}
      </div>
      <p className="mt-0.5 text-[13px] font-medium text-ink-900 truncate">{value || '—'}</p>
      {sub && <p className="text-[11px] text-ink-500">{sub}</p>}
    </div>
  );
}

// ─── Modal de confirmación ────────────────────────────────────────────────────
function ModalConfirmarRestaurar({ item, actor, trabajando, onConfirm, onClose }) {
  const st = styleFor(item.tabla);
  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 motion-safe:[animation:hp-fade-up_0.2s_ease-out]">
      <div className="relative bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] border border-line w-full max-w-md overflow-hidden">
        <div className="relative bg-white border-b border-line px-6 py-4 flex items-start gap-3">
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-rose-500" />
          <span className="ml-2 flex-shrink-0 inline-flex w-9 h-9 items-center justify-center rounded-lg bg-rose-50 border border-rose-100 text-rose-700">
            <RotateCcw size={17} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">Restaurar registro</h2>
            <p className="text-[12px] text-ink-500 mt-0.5">Volverá a estar visible para todos los usuarios</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-[13.5px] text-ink-700">
            ¿Confirmas que deseas restaurar este registro de la papelera?
          </p>

          <div className={`p-3 rounded-xl border ${st.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-md font-medium ${st.badge}`}>{st.l}</span>
              <span className="text-[11.5px] text-ink-500 font-mono">#{item.id_registro}</span>
            </div>
            <ResumenItem tabla={item.tabla} resumen={item.resumen} />
            <p className="text-[11.5px] text-ink-500 mt-3 pt-2 border-t border-line/70">
              Borrado {timeAgo(item.deleted_at)} por{' '}
              <strong className="font-medium text-ink-700">{actor?.nombre_completo ?? '(usuario eliminado)'}</strong>
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-[12.5px] text-brand-800 bg-brand-50/70 border-l-2 border-brand-500 pl-3 pr-3 py-2.5 rounded-r-md">
            Al restaurar, el registro queda visible inmediatamente. La acción
            se registra en el log de auditoría como un UPDATE.
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={trabajando}
              className="flex-1 px-5 py-2.5 bg-white border border-line text-ink-800 rounded-xl hover:bg-surface hover:border-ink-100 active:scale-[0.99] transition-all duration-150 text-[13.5px] font-medium disabled:opacity-60">
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={trabajando}
              className="group flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[13.5px] font-medium shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_24px_-14px_rgba(11,18,32,0.40)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60">
              {trabajando
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Restaurando…</>
                : <><RotateCcw size={14} strokeWidth={1.75} /> Sí, restaurar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

