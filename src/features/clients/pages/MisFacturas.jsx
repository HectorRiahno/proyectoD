import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt, AlertCircle, Loader2, RefreshCw, X, Filter,
  Download, Eye, CheckCircle2, Calendar,
} from 'lucide-react';
import { facturaService } from '../../../services';
import { useMisFacturas } from '../../../hooks';
import { generarPdfFactura } from '../utils/generarPdfFactura';
import {
  PageHeader, KPI, ErrorBanner, EmptyState, LoadingState,
  SearchBar, EstadoBadge,
} from '../../../shared/components/ui';

// ─── Constantes ────────────────────────────────────────────────────────────────
const ESTADOS = [
  { v: 'todas',     l: 'Todas' },
  { v: 'pendiente', l: 'Pendientes' },
  { v: 'pagada',    l: 'Pagadas' },
  { v: 'anulada',   l: 'Anuladas' },
  { v: 'vencida',   l: 'Vencidas' },
];

const fmtMoney = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number(n ?? 0));

// ─── Página principal ──────────────────────────────────────────────────────────
export default function MisFacturas() {
  const { facturas, loading, error, setError, reload: cargar } = useMisFacturas();
  const [search, setSearch]           = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [detalle, setDetalle]         = useState(null);
  const [descargando, setDescargando] = useState(null);

  const filtered = useMemo(() => facturas.filter(f => {
    const matchEstado = filtroEstado === 'todas' || f.estado === filtroEstado;
    if (!search.trim()) return matchEstado;
    const term = search.toLowerCase();
    const matchSearch =
      (f.numero_factura ?? '').toLowerCase().includes(term) ||
      (f.medico_nombre ?? '').toLowerCase().includes(term);
    return matchEstado && matchSearch;
  }), [facturas, search, filtroEstado]);

  const kpis = useMemo(() => ({
    total:      facturas.length,
    pendientes: facturas.filter(f => f.estado === 'pendiente').length,
    porPagar:   facturas
      .filter(f => ['pendiente', 'vencida'].includes(f.estado))
      .reduce((s, f) => s + Number(f.total ?? 0), 0),
    pagado:     facturas
      .filter(f => f.estado === 'pagada')
      .reduce((s, f) => s + Number(f.total ?? 0), 0),
  }), [facturas]);

  const descargarPdf = async (factura) => {
    setDescargando(factura.id_factura);
    setError('');
    try {
      const items = await facturaService.getItems(factura.id_factura);
      generarPdfFactura(factura, items ?? []);
    } catch (err) {
      setError(`No se pudo generar el PDF: ${err.message ?? err}`);
    } finally {
      setDescargando(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Mis facturas"
        descripcion="Historial de cobros y pagos"
        eyebrow="Facturas"
        icon={<Receipt size={11} strokeWidth={2.25} />}
        variant="sky"
      >
        <KPI label="Total"      value={loading ? '···' : kpis.total} />
        <KPI label="Pendientes" value={loading ? '···' : kpis.pendientes} color="text-amber-700" />
        <KPI label="Por pagar"  value={loading ? '···' : fmtMoney(kpis.porPagar)} mono color="text-amber-700" />
        <KPI label="Pagado"     value={loading ? '···' : fmtMoney(kpis.pagado)}   mono color="text-emerald-700" />
      </PageHeader>

      <ErrorBanner msg={error} onDismiss={() => setError('')} />

      <div className="rounded-2xl border border-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-[0.10em] font-medium text-ink-500 mr-1">
            <Filter size={12} strokeWidth={2} /> Filtros
          </div>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Buscar por número de factura o médico…"
          />
          <button onClick={cargar}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-ink-700 border border-line rounded-lg hover:bg-surface hover:border-ink-100 transition-colors">
            <RefreshCw size={13} strokeWidth={1.75} /> Recargar
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ESTADOS.map(e => {
            const active = filtroEstado === e.v;
            const n = e.v === 'todas' ? facturas.length : facturas.filter(f => f.estado === e.v).length;
            return (
              <button key={e.v} onClick={() => setFiltroEstado(e.v)}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all duration-150',
                  active
                    ? 'bg-sky-600 text-white shadow-[0_4px_14px_-6px_rgba(11,18,32,0.35)]'
                    : 'bg-surface text-ink-700 hover:bg-ink-100/40 border border-line',
                ].join(' ')}>
                {e.l}
                <span className={active ? 'text-white/70' : 'text-ink-500'}>({n})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <LoadingState mensaje="Cargando facturas…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          titulo={facturas.length === 0 ? 'Aún no tienes facturas' : 'No hay facturas que coincidan'}
          descripcion={facturas.length === 0 ? 'Cuando tengas una consulta, aparecerá aquí la factura correspondiente.' : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(f => (
            <FacturaCard
              key={f.id_factura}
              factura={f}
              onVer={() => setDetalle(f)}
              onDescargar={() => descargarPdf(f)}
              descargando={descargando === f.id_factura}
            />
          ))}
        </div>
      )}

      {detalle && (
        <ModalDetalle
          factura={detalle}
          onClose={() => setDetalle(null)}
          onDescargar={() => descargarPdf(detalle)}
          descargando={descargando === detalle.id_factura}
        />
      )}
    </div>
  );
}

// ─── Card de factura ──────────────────────────────────────────────────────────
function FacturaCard({ factura, onVer, onDescargar, descargando }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:border-ink-100 hover:shadow-[0_8px_28px_-14px_rgba(11,18,32,0.18)] transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-[15px] font-semibold text-ink-900">{factura.numero_factura ?? '—'}</p>
          <p className="text-[11.5px] text-ink-500 flex items-center gap-1 mt-0.5 tabular-nums">
            <Calendar size={10} strokeWidth={1.75} /> {factura.fecha_emision?.slice(0, 10) ?? '—'}
          </p>
        </div>
        <EstadoBadge type="factura" estado={factura.estado} withIcon />
      </div>

      <div className="space-y-1 text-[12.5px] border-t border-line/70 pt-3">
        <p className="text-ink-700">
          <span className="text-ink-500">Médico:</span> Dr(a). {factura.medico_nombre ?? '—'}
        </p>
        {factura.medico_especialidad && (
          <p className="text-[11.5px] text-ink-500">{factura.medico_especialidad}</p>
        )}
        {factura.fecha_pago && (
          <p className="text-[11.5px] text-emerald-700 flex items-center gap-1 mt-1">
            <CheckCircle2 size={11} strokeWidth={2} /> Pagada el {factura.fecha_pago.slice(0, 10)}
            {factura.metodo_pago && ` · ${factura.metodo_pago}`}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between mt-4 pt-3 border-t border-line/70">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">Total</p>
          <p className="text-[22px] font-semibold text-ink-900 font-mono tabular-nums leading-none mt-0.5">{fmtMoney(factura.total)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onVer}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-line text-ink-800 text-[12.5px] font-medium rounded-lg hover:bg-surface hover:border-ink-100 transition-colors">
            <Eye size={13} strokeWidth={1.75} /> Ver
          </button>
          <button onClick={onDescargar} disabled={descargando}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-[12.5px] font-medium rounded-lg shadow-[0_4px_14px_-6px_rgba(11,18,32,0.45)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60">
            {descargando
              ? <Loader2 size={13} className="animate-spin" />
              : <Download size={13} strokeWidth={1.75} />} PDF
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Modal detalle ────────────────────────────────────────────────────────────
function ModalDetalle({ factura, onClose, onDescargar, descargando }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    facturaService.getItems(factura.id_factura)
      .then(data => setItems(data ?? []))
      .finally(() => setLoading(false));
  }, [factura.id_factura]);

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 motion-safe:[animation:hp-fade-up_0.2s_ease-out]">
      <div className="relative bg-white rounded-2xl shadow-[0_30px_60px_-20px_rgba(11,18,32,0.35)] border border-line w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex justify-between items-start gap-4 z-10">
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-sky-500" />
          <div className="ml-2 flex items-start gap-3">
            <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-sky-50 border border-sky-100 text-sky-700">
              <Receipt size={16} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-ink-900 font-mono">{factura.numero_factura ?? '—'}</h2>
              <p className="text-[12px] text-ink-500 mt-0.5">{factura.fecha_emision?.slice(0, 10) ?? 'sin emitir'}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 -mt-0.5 -mr-1 text-ink-300 hover:text-ink-900 hover:bg-surface p-1.5 rounded-lg transition-colors">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex justify-center">
            <EstadoBadge type="factura" estado={factura.estado} withIcon size="lg" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Info label="Médico"        value={`Dr(a). ${factura.medico_nombre ?? '—'}`} />
            <Info label="Especialidad"  value={factura.medico_especialidad} />
            <Info label="Fecha emisión" value={factura.fecha_emision?.slice(0, 16).replace('T', ' ') ?? '—'} />
            {factura.fecha_vencimiento && (
              <Info label="Vencimiento" value={factura.fecha_vencimiento} />
            )}
            {factura.fecha_pago && (
              <Info label="Pagada" value={`${factura.fecha_pago?.slice(0, 16).replace('T', ' ')}${factura.metodo_pago ? ` · ${factura.metodo_pago}` : ''}`} />
            )}
          </div>

          {/* Items */}
          <div className="rounded-xl border border-line overflow-hidden">
            <div className="px-4 py-2 bg-surface border-b border-line text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-500">
              Detalle de líneas
            </div>
            {loading ? (
              <div className="p-6 text-center"><Loader2 size={18} className="animate-spin mx-auto text-sky-600" strokeWidth={1.75} /></div>
            ) : items.length === 0 ? (
              <p className="p-4 text-[13px] text-ink-500 italic">Sin líneas.</p>
            ) : (
              <table className="w-full text-[12.5px]">
                <thead className="bg-white border-b border-line">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.10em] text-ink-500">Descripción</th>
                    <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.10em] text-ink-500">Cant.</th>
                    <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.10em] text-ink-500">Precio</th>
                    <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.10em] text-ink-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {items.map(it => (
                    <tr key={it.id_item}>
                      <td className="px-3 py-2 text-ink-800">
                        {it.descripcion}
                        {it.notas && <p className="text-[11px] text-ink-500 italic">{it.notas}</p>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-700">{Number(it.cantidad)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-700">{fmtMoney(it.precio_unitario)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-ink-900">{fmtMoney(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totales */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 space-y-1.5 text-[13px]">
            <div className="flex justify-between text-ink-700">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums">{fmtMoney(factura.subtotal)}</span>
            </div>
            {Number(factura.descuento) > 0 && (
              <div className="flex justify-between text-red-700">
                <span>Descuento:</span>
                <span className="font-mono tabular-nums">- {fmtMoney(factura.descuento)}</span>
              </div>
            )}
            {Number(factura.impuesto) > 0 && (
              <div className="flex justify-between text-ink-700">
                <span>Impuesto:</span>
                <span className="font-mono tabular-nums">{fmtMoney(factura.impuesto)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-sky-200 text-sky-900 text-[15px] font-semibold">
              <span>Total:</span>
              <span className="font-mono tabular-nums">{fmtMoney(factura.total)}</span>
            </div>
          </div>

          {/* Aviso si pendiente */}
          {factura.estado === 'pendiente' && (
            <div className="flex items-start gap-2.5 text-[13px] text-amber-800 bg-amber-50/70 border-l-2 border-amber-500 pl-3 pr-3 py-2.5 rounded-r-md">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p>Esta factura aún está <strong className="font-medium">pendiente de pago</strong>. Acércate a recepción o usa el portal de pagos.</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-3 border-t border-line">
            <button onClick={onClose}
              className="flex-1 px-5 py-2.5 bg-white border border-line text-ink-800 rounded-xl hover:bg-surface hover:border-ink-100 active:scale-[0.99] transition-all duration-150 text-[13.5px] font-medium">
              Cerrar
            </button>
            <button onClick={onDescargar} disabled={descargando}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[13.5px] font-medium shadow-[0_1px_2px_rgba(11,18,32,0.10),0_10px_24px_-14px_rgba(11,18,32,0.40)] active:scale-[0.99] transition-all duration-150 disabled:opacity-60">
              {descargando
                ? <><Loader2 size={14} className="animate-spin" /> Generando…</>
                : <><Download size={14} strokeWidth={1.75} /> Descargar PDF</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg border border-line bg-surface/60 px-3 py-2">
      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{label}</p>
      <p className="mt-0.5 text-[13px] font-medium text-ink-900">{value || <span className="text-ink-300 font-normal">—</span>}</p>
    </div>
  );
}
