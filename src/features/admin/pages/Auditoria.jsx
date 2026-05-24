import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, Search, AlertCircle, Loader2, RefreshCw, X,
  Plus, Edit, Trash2, User, Calendar, ChevronDown, ChevronUp,
  FileText, Download, Filter,
} from 'lucide-react';
import { useAuth, useAuditoria } from '../../../hooks';
import {
  PageHeader, KPI, ErrorBanner, SearchBar, LoadingRow, EmptyRow,
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
  { v: 'todas',  l: 'Todas',     bg: 'bg-gray-100 text-gray-700 border-gray-200' },
  { v: 'INSERT', l: 'Creación',  bg: 'bg-green-100 text-green-700 border-green-200', icon: Plus },
  { v: 'UPDATE', l: 'Edición',   bg: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Edit },
  { v: 'DELETE', l: 'Borrado',   bg: 'bg-red-100 text-red-700 border-red-200',      icon: Trash2 },
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
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center space-y-3">
        <ShieldCheck size={48} className="mx-auto text-red-500" />
        <h2 className="text-xl font-bold text-gray-900">Acceso restringido</h2>
        <p className="text-sm text-gray-500">
          La auditoría es solo para administradores. Pide acceso si lo necesitas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Auditoría del sistema"
        descripcion="Registro inmutable de cambios en tablas clínicas"
        icon={<ShieldCheck size={32} />}
        variant="slate"
      >
        <KPI label="Total"     value={loading ? '···' : counts.total}  />
        <KPI label="Creados"   value={loading ? '···' : counts.insert} color="text-green-300" />
        <KPI label="Editados"  value={loading ? '···' : counts.update} color="text-blue-300" />
        <KPI label="Borrados"  value={loading ? '···' : counts.delete} color="text-red-300" />
      </PageHeader>

      <ErrorBanner msg={error} onRetry={cargar} />

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={16} /> Filtros
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <SearchBar
            className="md:col-span-2"
            value={search}
            onChange={setSearch}
            placeholder="Buscar por actor, ID o tabla..."
            focusColor="slate"
          />
          <select value={filtroTabla} onChange={e => setFiltroTabla(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white text-sm">
            {TABLAS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <select value={filtroOp} onChange={e => setFiltroOp(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white text-sm">
            {OPERACIONES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white text-sm">
            <option value={50}>Últimos 50</option>
            <option value={100}>Últimos 100</option>
            <option value={500}>Últimos 500</option>
            <option value={2000}>Últimos 2000</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => { setSearch(''); setFiltroTabla('todas'); setFiltroOp('todas'); setFechaDesde(''); setFechaHasta(''); }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-xl">
              Limpiar filtros
            </button>
            <button onClick={cargar}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-800 transition text-sm">
              <RefreshCw size={14} /> Recargar
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-gray-50 border-b-2 border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase">Fecha</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase">Operación</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase">Tabla</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase">ID</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actor</th>
                <th className="px-5 py-3 text-center text-xs font-bold text-gray-700 uppercase">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <LoadingRow colSpan={6} mensaje="Cargando log..." color="slate" />
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={6} icon={FileText} mensaje="No hay eventos que coincidan con los filtros" />
              ) : filtered.map(l => {
                const op = opStyle(l.operacion);
                const OpIcon = op.icon;
                return (
                  <tr key={l.id_audit} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 text-xs text-gray-700 font-mono whitespace-nowrap">
                      {l.ocurrio_en?.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium border ${op.bg}`}>
                        {OpIcon && <OpIcon size={11} />}
                        {op.l}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-800 font-mono">
                      {TABLAS.find(t => t.v === l.tabla)?.l ?? l.tabla}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 font-mono">#{l.id_registro}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center">
                          <User size={12} className="text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{l.actor_nombre}</p>
                          {l.actor_rol && <p className="text-xs text-gray-500">{l.actor_rol}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => setDetalle(l)}
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium underline">
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
            Mostrando {filtered.length} de {logs.length} eventos cargados.
            {logs.length === limit && ` (Límite alcanzado — sube el límite para ver más)`}
          </div>
        )}
      </div>

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck size={20} /> Evento de auditoría #{log.id_audit}
            </h2>
            <p className="text-slate-300 text-xs">
              {log.ocurrio_en?.replace('T', ' ').slice(0, 19)} · por {log.actor_nombre} ({log.actor_rol ?? '—'})
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <Info label="Operación" valor={
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium border ${op.bg}`}>
                {op.l}
              </span>
            } />
            <Info label="Tabla"    valor={<span className="font-mono">{log.tabla}</span>} />
            <Info label="ID registro" valor={<span className="font-mono">#{log.id_registro}</span>} />
          </div>

          {/* UPDATE: diff campo por campo */}
          {log.operacion === 'UPDATE' && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                Campos modificados ({cambios.length})
              </h3>
              {cambios.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                  Sin cambios significativos (probablemente solo se tocó updated_at).
                </p>
              ) : (
                <div className="space-y-2">
                  {cambios.map(c => (
                    <div key={c.campo} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 font-mono">
                        {c.campo}
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-gray-200">
                        <div className="p-3 bg-red-50">
                          <p className="text-[10px] uppercase font-semibold text-red-700 mb-1">Antes</p>
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">{formatValue(c.antes)}</pre>
                        </div>
                        <div className="p-3 bg-green-50">
                          <p className="text-[10px] uppercase font-semibold text-green-700 mb-1">Después</p>
                          <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">{formatValue(c.despues)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INSERT: estado completo */}
          {log.operacion === 'INSERT' && (
            <div>
              <h3 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-1">
                <Plus size={14} /> Estado del registro creado
              </h3>
              <JsonView data={log.after_data} />
            </div>
          )}

          {/* DELETE: snapshot antes de borrar */}
          {log.operacion === 'DELETE' && (
            <div>
              <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1">
                <Trash2 size={14} /> Estado del registro antes de borrar
              </h3>
              <JsonView data={log.before_data} />
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
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
              className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              <Download size={14} /> Exportar JSON
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
  if (!data || Object.keys(data).length === 0) return <p className="text-xs text-gray-400">Sin datos</p>;
  const entries = Object.entries(data);
  const mostrar = open ? entries : entries.slice(0, 8);
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl divide-y divide-gray-200">
      {mostrar.map(([k, v]) => (
        <div key={k} className="px-3 py-2 grid grid-cols-3 gap-2 text-xs">
          <span className="text-gray-500 font-mono col-span-1">{k}</span>
          <span className="col-span-2 text-gray-800 break-words whitespace-pre-wrap font-mono">{formatValue(v)}</span>
        </div>
      ))}
      {entries.length > 8 && (
        <button onClick={() => setOpen(o => !o)}
          className="w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1">
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {open ? 'Mostrar menos' : `Ver ${entries.length - 8} campos más`}
        </button>
      )}
    </div>
  );
}

function Info({ label, valor }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="text-sm font-semibold text-gray-900">{valor}</div>
    </div>
  );
}

