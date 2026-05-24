import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt, Search, AlertCircle, Loader2, RefreshCw, X, Filter,
  Download, Eye, CheckCircle, Clock, Ban, XCircle, Calendar,
  DollarSign, FileText,
} from 'lucide-react';
import { facturaService } from '../../../services';
import { useMisFacturas } from '../../../hooks';
import { generarPdfFactura } from '../utils/generarPdfFactura';

// ─── Constantes ────────────────────────────────────────────────────────────────
const ESTADOS = [
  { v: 'todas',     l: 'Todas',     bg: 'bg-gray-100 text-gray-700 border-gray-200' },
  { v: 'pendiente', l: 'Pendientes', bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  { v: 'pagada',    l: 'Pagadas',    bg: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  { v: 'anulada',   l: 'Anuladas',   bg: 'bg-red-100 text-red-700 border-red-200', icon: Ban },
  { v: 'vencida',   l: 'Vencidas',   bg: 'bg-orange-100 text-orange-700 border-orange-200', icon: XCircle },
];

const estadoStyle = (e) => ESTADOS.find(x => x.v === e) ?? ESTADOS[0];

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
    total:       facturas.length,
    pendientes:  facturas.filter(f => f.estado === 'pendiente').length,
    porPagar:    facturas
      .filter(f => ['pendiente', 'vencida'].includes(f.estado))
      .reduce((s, f) => s + Number(f.total ?? 0), 0),
    pagado:      facturas
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
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Receipt size={32} /> Mis facturas
            </h1>
            <p className="text-sky-100">Historial de cobros y pagos</p>
          </div>
          <div className="flex gap-6 text-center">
            <KPI label="Total"      value={loading ? '···' : kpis.total} />
            <KPI label="Pendientes" value={loading ? '···' : kpis.pendientes} color="text-amber-200" />
            <KPI label="Por pagar"  value={loading ? '···' : fmtMoney(kpis.porPagar)} small color="text-amber-200" />
            <KPI label="Pagado"     value={loading ? '···' : fmtMoney(kpis.pagado)} small color="text-green-200" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter size={16} /> Filtros
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por número de factura o médico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {ESTADOS.map(e => {
            const activo = filtroEstado === e.v;
            const n = e.v === 'todas' ? facturas.length : facturas.filter(f => f.estado === e.v).length;
            return (
              <button key={e.v} onClick={() => setFiltroEstado(e.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                  activo ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                         : 'bg-white border-gray-200 text-gray-700 hover:border-sky-300'
                }`}>
                {e.l}
                <span className={`ml-1 text-xs px-1.5 rounded-full ${activo ? 'bg-white/30' : 'bg-gray-100'}`}>
                  {n}
                </span>
              </button>
            );
          })}
          <button onClick={cargar}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg">
            <RefreshCw size={14} /> Recargar
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-16 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-sky-600" />
          <p className="text-gray-500 text-sm">Cargando facturas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-16 text-center border border-gray-100">
          <Receipt size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">
            {facturas.length === 0 ? 'Aún no tienes facturas' : 'No hay facturas que coincidan'}
          </p>
          {facturas.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Cuando tengas una consulta, aparecerá aquí la factura correspondiente.
            </p>
          )}
        </div>
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
  const st = estadoStyle(factura.estado);
  const StIcon = st.icon;
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono font-bold text-lg text-gray-900">{factura.numero_factura ?? '—'}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Calendar size={11} /> {factura.fecha_emision?.slice(0, 10) ?? '—'}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${st.bg}`}>
          {StIcon && <StIcon size={12} />} {st.l.replace(/s$/, '')}
        </span>
      </div>

      <div className="space-y-1 text-sm border-t border-gray-100 pt-3">
        <p className="text-gray-700">
          <span className="text-gray-500">Médico:</span> Dr(a). {factura.medico_nombre ?? '—'}
        </p>
        {factura.medico_especialidad && (
          <p className="text-xs text-gray-500">{factura.medico_especialidad}</p>
        )}
        {factura.fecha_pago && (
          <p className="text-xs text-green-700 flex items-center gap-1 mt-1">
            <CheckCircle size={11} /> Pagada el {factura.fecha_pago.slice(0, 10)}
            {factura.metodo_pago && ` · ${factura.metodo_pago}`}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between mt-4 pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900 font-mono">{fmtMoney(factura.total)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onVer}
            className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition">
            <Eye size={14} /> Ver
          </button>
          <button onClick={onDescargar} disabled={descargando}
            className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-sky-600 to-cyan-600 text-white text-sm font-semibold rounded-lg hover:from-sky-700 hover:to-cyan-700 transition shadow-sm disabled:opacity-60">
            {descargando
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />} PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal detalle ────────────────────────────────────────────────────────────
function ModalDetalle({ factura, onClose, onDescargar, descargando }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const st = estadoStyle(factura.estado);

  useEffect(() => {
    facturaService.getItems(factura.id_factura)
      .then(data => setItems(data ?? []))
      .finally(() => setLoading(false));
  }, [factura.id_factura]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-sky-700 to-cyan-700 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Receipt size={22} /> {factura.numero_factura ?? '—'}
            </h2>
            <p className="text-sky-100 text-xs">{factura.fecha_emision?.slice(0, 10) ?? 'sin emitir'}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Estado */}
          <div className={`p-3 rounded-xl border text-center font-bold ${st.bg}`}>
            {st.l.replace(/s$/, '').toUpperCase()}
          </div>

          {/* Datos */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Médico" value={`Dr(a). ${factura.medico_nombre ?? '—'}`} />
            <Info label="Especialidad" value={factura.medico_especialidad} />
            <Info label="Fecha emisión" value={factura.fecha_emision?.slice(0, 16).replace('T', ' ') ?? '—'} />
            {factura.fecha_vencimiento && (
              <Info label="Vencimiento" value={factura.fecha_vencimiento} />
            )}
            {factura.fecha_pago && (
              <Info label="Pagada" value={`${factura.fecha_pago?.slice(0, 16).replace('T', ' ')}${factura.metodo_pago ? ` · ${factura.metodo_pago}` : ''}`} />
            )}
          </div>

          {/* Items */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 text-xs font-bold text-gray-700 uppercase">
              Detalle de líneas
            </div>
            {loading ? (
              <div className="p-6 text-center"><Loader2 size={20} className="animate-spin mx-auto" /></div>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-gray-400 italic">Sin líneas</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Descripción</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">Cant.</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">Precio</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(it => (
                    <tr key={it.id_item}>
                      <td className="px-3 py-2">
                        {it.descripcion}
                        {it.notas && <p className="text-xs text-gray-500 italic">{it.notas}</p>}
                      </td>
                      <td className="px-3 py-2 text-right">{Number(it.cantidad)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtMoney(it.precio_unitario)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">{fmtMoney(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totales */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-mono">{fmtMoney(factura.subtotal)}</span>
            </div>
            {Number(factura.descuento) > 0 && (
              <div className="flex justify-between text-red-700">
                <span>Descuento:</span>
                <span className="font-mono">- {fmtMoney(factura.descuento)}</span>
              </div>
            )}
            {Number(factura.impuesto) > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Impuesto:</span>
                <span className="font-mono">{fmtMoney(factura.impuesto)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-sky-300 text-sky-900 text-lg font-bold">
              <span>Total:</span>
              <span className="font-mono">{fmtMoney(factura.total)}</span>
            </div>
          </div>

          {/* Aviso si pendiente */}
          {factura.estado === 'pendiente' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <p>Esta factura aún está <strong>pendiente de pago</strong>. Acércate a recepción o usa el portal de pagos.</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-3 border-t border-gray-200">
            <button onClick={onClose}
              className="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold">
              Cerrar
            </button>
            <button onClick={onDescargar} disabled={descargando}
              className="flex-1 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-xl hover:from-sky-700 hover:to-cyan-700 transition font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              {descargando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {descargando ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
    </div>
  );
}

function KPI({ label, value, color = 'text-white', small = false }) {
  return (
    <div>
      <p className="text-xs text-sky-100">{label}</p>
      <p className={`font-bold ${color} ${small ? 'text-base font-mono' : 'text-3xl'}`}>{value}</p>
    </div>
  );
}
