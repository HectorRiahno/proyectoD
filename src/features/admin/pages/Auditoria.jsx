import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, RefreshCw, X,
  Plus, Edit, Trash2, User, ChevronDown, ChevronUp,
  FileText, Download, Filter,
} from 'lucide-react';
import { useAuth, useAuditoria } from '../../../hooks';
import {
  PageHeader, KPI, ErrorBanner, SearchBar, LoadingRow, EmptyRow,
  Toolbar, TableShell, Thead, Tbody, Tr, EmptyState,
} from '../../../shared/components/ui';

const TABLAS = [
  { v: 'todas', l: 'Todas' },
  { v: 'consulta_medica', l: 'Consultas' },
  { v: 'diagnostico', l: 'Diagnósticos' },
  { v: 'sintoma', l: 'Síntomas' },
  { v: 'signos_vitales', l: 'Signos vitales' },
  { v: 'orden_medica', l: 'Órdenes médicas' },
  { v: 'cita', l: 'Citas' },
  { v: 'asignacion_rol', l: 'Asignación de rol' },
  { v: 'paciente', l: 'Pacientes' },
  { v: 'medico', l: 'Médicos' },
  { v: 'persona', l: 'Personas' },
];

const OPERACIONES = [
  { v: 'todas',  l: 'Todas',     bg: 'bg-surface text-ink-700 border-line' },
  { v: 'INSERT', l: 'Creación',  bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: Plus },
  { v: 'UPDATE', l: 'Edición',   bg: 'bg-brand-50 text-brand-700 border-brand-100',       icon: Edit },
  { v: 'DELETE', l: 'Borrado',   bg: 'bg-red-50 text-red-700 border-red-100',             icon: Trash2 },
];

const opStyle = (op) => OPERACIONES.find(o => o.v === op) ?? OPERACIONES[0];

export default function Auditoria() {
  const { esAdmin } = useAuth();
  const [search, setSearch]           = useState('');
  const [filtroTabla, setFiltroTabla] = useState('todas');
  const [filtroOp, setFiltroOp]       = useState('todas');
  const [fechaDesde, setFechaDesde]   = useState('');
  const [fechaHasta, setFechaHasta]   = useState('');
  const [detalle, setDetalle]         = useState(null);
  const [limit, setLimit]             = useState(100);

  const {
    logs, loading, error,
    reload: cargar,
  } = useAuditoria(
    { tabla: filtroTabla, operacion: filtroOp, fechaDesde, fechaHasta, limit },
    esAdmin,
  );

  const filtered = useMemo(() => logs.filter(l => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (l.actor_nombre ?? '').toLowerCase().includes(term) ||
      (l.id_registro ?? '').includes(search) ||
      (l.tabla ?? '').toLowerCase().includes(term)
    );
  }), [logs, search]);

  const counts = useMemo(() => ({
    total:  logs.length,
    insert: logs.filter(l => l.operacion === 'INSERT').length,
    update: logs.filter(l => l.operacion === 'UPDATE').length,
    delete: logs.filter(l => l.operacion === 'DELETE').length,
  }), [logs]);

  if (!esAdmin) {
    return (
      <EmptyState
        icon={ShieldCheck}
        titulo="Acceso restringido"
        descripcion="La auditoría es solo para administradores. Pide acceso si lo necesitas."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Auditoría del sistema"
        descripcion="Registro inmutable de cambios en tablas clínicas"
        eyebrow="Auditoría"
        icon={<ShieldCheck size={11} strokeWidth={2.25} />}
        variant="slate"
      >
        <KPI label="Total"     value={loading ? '···' : counts.total}  />
        <KPI label="Creados"   value={loading ? '···' : counts.insert} color="text-emerald-700" />
        <KPI label="Editados"  value={loading ? '···' : counts.update} color="text-brand-700" />
        <KPI label="Borrados"  value={loading ? '···' : counts.delete} color="text-red-700" />
      </PageHeader>

      <ErrorBanner msg={error} onRetry={cargar} />

      <Toolbar>
        <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.10em] font-medium text-ink-500 mr-1">
          <Filter size={12} strokeWidth={2} /> Filtros
        </div>
        <SearchBar
          className="min-w-[220px]"
          value={search}
          onChange={setSearch}
          placeholder="Buscar por actor, ID o tabla…"
        />
        <select value={filtroTabla} onChange={e => setFiltroTabla(e.target.value)}
          className="px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all">
          {TABLAS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        <select value={filtroOp} onChange={e => setFiltroOp(e.target.value)}
          className="px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all">
          {OPERACIONES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <select value={limit} onChange={e => setLimit(Number(e.target.value))}
          className="px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all">
          <option value={50}>Últimos 50</option>
          <option value={100}>Últimos 100</option>
          <option value={500}>Últimos 500</option>
          <option value={2000}>Últimos 2000</option>
        </select>
        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
          title="Desde"
          className="px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all" />
        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
          title="Hasta"
          className="px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all" />
        <div className="flex-1" />
        <button onClick={() => { setSearch(''); setFiltroTabla('todas'); setFiltroOp('todas'); setFechaDesde(''); setFechaHasta(''); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-ink-700 border border-line rounded-lg hover:bg-surface hover:border-ink-100 transition-colors">
          Limpiar
        </button>
        <button onClick={cargar}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-white bg-ink-900 hover:bg-ink-800 rounded-lg transition-colors shadow-[0_4px_14px_-6px_rgba(11,18,32,0.45)]">
          <RefreshCw size={13} strokeWidth={1.75} /> Recargar
        </button>
      </Toolbar>

      <TableShell>
        <Thead columnas={[
          'Fecha', 'Operación', 'Tabla', 'ID', 'Actor',
          { label: 'Detalles', align: 'center' },
        ]} />
        <Tbody>
          {loading ? (
            <LoadingRow colSpan={6} mensaje="Cargando log…" color="slate" />
          ) : filtered.length === 0 ? (
            <EmptyRow colSpan={6} icon={FileText} mensaje="No hay eventos que coincidan con los filtros" />
          ) : filtered.map(l => {
            const op = opStyle(l.operacion);
            const OpIcon = op.icon;
            return (
              <Tr key={l.id_audit}>
                <td className="px-5 py-3.5 text-[12px] text-ink-700 font-mono whitespace-nowrap">
                  {l.ocurrio_en?.slice(0, 19).replace('T', ' ')}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md font-medium border ${op.bg}`}>
                    {OpIcon && <OpIcon size={10} strokeWidth={2} />}
                    {op.l}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[13px] text-ink-800 font-mono">
                  {TABLAS.find(t => t.v === l.tabla)?.l ?? l.tabla}
                </td>
                <td className="px-5 py-3.5 text-[12px] text-ink-500 font-mono">#{l.id_registro}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-surface border border-line">
                      <User size={12} className="text-ink-700" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-ink-900">{l.actor_nombre}</p>
                      {l.actor_rol && <p className="text-[11px] text-ink-500">{l.actor_rol}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button onClick={() => setDetalle(l)}
                    className="text-[12px] text-brand-600 hover:text-brand-700 font-medium underline-offset-2 hover:underline">
                    Ver
                  </button>
                </td>
              </Tr>
            );
          })}
        </Tbody>
      </TableShell>
      {filtered.length > 0 && (
        <p className="text-[11.5px] text-ink-500 px-1">
          Mostrando {filtered.length} de {logs.length} eventos cargados.
          {logs.length === limit && ` (Límite alcanzado — sube el límite para ver más)`}
        </p>
      )}

      {detalle && <ModalDetalle log={detalle} onClose={() => setDetalle(null)} />}
    </div>
  );
}

// ─── Modal detalle: muestra before/after con diff ──────────────────────────────
function ModalDetalle({ log, onClose }) {
  const op = opStyle(log.operacion);

  // Calcular diff para UPDATE
  const cambios = useMemo(() => {
    if (log.operacion !== 'UPDATE' || !log.before_data || !log.after_data) return [];
    const keys = new Set([...Object.keys(log.before_data), ...Object.keys(log.after_data)]);
    const ignoreKeys = new Set(['updated_at', 'updated_by']);
    return [...keys].filter(k => {
      if (ignoreKeys.has(k)) return false;
      const a = JSON.stringify(log.before_data[k] ?? null);
      const b = JSON.stringify(log.after_data[k] ?? null);
      return a !== b;
    }).map(k => ({
      campo: k,
      antes:    log.before_data[k] ?? null,
      despues:  log.after_data[k]  ?? null,
    }));
  }, [log]);

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 motion-safe:[animation:hp-fade-up_0.2s_ease-out]">
      <div className="relative bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] border border-line w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex justify-between items-start gap-4 z-10">
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-ink-700" />
          <div className="flex items-start gap-3 ml-2">
            <span className="flex-shrink-0 inline-flex w-9 h-9 items-center justify-center rounded-lg border bg-surface border-line text-ink-700">
              <ShieldCheck size={16} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">
                Evento de auditoría #{log.id_audit}
              </h2>
              <p className="text-[12px] text-ink-500 mt-0.5">
                {log.ocurrio_en?.replace('T', ' ').slice(0, 19)} · por <span className="text-ink-700 font-medium">{log.actor_nombre}</span> ({log.actor_rol ?? '—'})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 -mt-0.5 -mr-1 text-ink-300 hover:text-ink-900 hover:bg-surface p-1.5 rounded-lg transition-colors">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-2.5">
            <Info label="Operación" valor={
              <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md font-medium border ${op.bg}`}>
                {op.l}
              </span>
            } />
            <Info label="Tabla"       valor={<span className="font-mono text-[13px]">{log.tabla}</span>} />
            <Info label="ID registro" valor={<span className="font-mono text-[13px]">#{log.id_registro}</span>} />
          </div>

          {/* UPDATE: diff campo por campo */}
          {log.operacion === 'UPDATE' && (
            <div>
              <h3 className="text-[13px] font-semibold text-ink-800 mb-2.5">
                Campos modificados ({cambios.length})
              </h3>
              {cambios.length === 0 ? (
                <p className="text-[12px] text-ink-500 italic p-3 bg-surface border border-line rounded-lg">
                  Sin cambios significativos (probablemente solo se tocó updated_at).
                </p>
              ) : (
                <div className="space-y-2">
                  {cambios.map(c => (
                    <div key={c.campo} className="border border-line rounded-xl overflow-hidden">
                      <div className="bg-surface border-b border-line px-3 py-1.5 text-[12px] font-medium text-ink-700 font-mono">
                        {c.campo}
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-line">
                        <div className="p-3 bg-red-50/60">
                          <p className="text-[10px] uppercase tracking-[0.10em] font-medium text-red-700 mb-1">Antes</p>
                          <pre className="text-[12px] text-ink-800 whitespace-pre-wrap break-words font-mono">{formatValue(c.antes)}</pre>
                        </div>
                        <div className="p-3 bg-emerald-50/60">
                          <p className="text-[10px] uppercase tracking-[0.10em] font-medium text-emerald-700 mb-1">Después</p>
                          <pre className="text-[12px] text-ink-800 whitespace-pre-wrap break-words font-mono">{formatValue(c.despues)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INSERT */}
          {log.operacion === 'INSERT' && (
            <div>
              <h3 className="text-[13px] font-semibold text-emerald-700 mb-2.5 flex items-center gap-1.5">
                <Plus size={13} strokeWidth={2} /> Estado del registro creado
              </h3>
              <JsonView data={log.after_data} />
            </div>
          )}

          {/* DELETE */}
          {log.operacion === 'DELETE' && (
            <div>
              <h3 className="text-[13px] font-semibold text-red-700 mb-2.5 flex items-center gap-1.5">
                <Trash2 size={13} strokeWidth={2} /> Estado del registro antes de borrar
              </h3>
              <JsonView data={log.before_data} />
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-line flex items-center justify-between">
            <p className="text-[11.5px] text-ink-500">
              UUID actor: <span className="font-mono">{log.actor_uuid ?? '—'}</span>
            </p>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `audit-${log.id_audit}.json`; a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1.5 text-[12px] text-brand-600 hover:text-brand-700 font-medium"
            >
              <Download size={13} strokeWidth={1.75} /> Exportar JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatValue(v) {
  if (v === null || v === undefined) return '∅ (null)';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  if (v === '') return '(vacío)';
  return String(v);
}

function JsonView({ data }) {
  const [open, setOpen] = useState(false);
  if (!data || Object.keys(data).length === 0) return <p className="text-[12px] text-ink-300">Sin datos</p>;
  const entries = Object.entries(data);
  const mostrar = open ? entries : entries.slice(0, 8);
  return (
    <div className="bg-surface border border-line rounded-xl divide-y divide-line">
      {mostrar.map(([k, v]) => (
        <div key={k} className="px-3 py-2 grid grid-cols-3 gap-2 text-[12px]">
          <span className="text-ink-500 font-mono col-span-1">{k}</span>
          <span className="col-span-2 text-ink-800 break-words whitespace-pre-wrap font-mono">{formatValue(v)}</span>
        </div>
      ))}
      {entries.length > 8 && (
        <button onClick={() => setOpen(o => !o)}
          className="w-full px-3 py-2 text-[12px] text-ink-700 hover:bg-white/50 flex items-center justify-center gap-1.5 transition-colors">
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {open ? 'Mostrar menos' : `Ver ${entries.length - 8} campos más`}
        </button>
      )}
    </div>
  );
}

function Info({ label, valor }) {
  return (
    <div className="rounded-lg border border-line bg-surface/60 px-3 py-2">
      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{label}</p>
      <div className="mt-0.5 text-[13.5px] font-medium text-ink-900">{valor}</div>
    </div>
  );
}

