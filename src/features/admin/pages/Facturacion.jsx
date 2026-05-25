import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Receipt, Search, Edit, Eye, Trash2, AlertCircle, Loader2,
  Filter, RefreshCw, FileText, CheckCircle, XCircle, DollarSign,
  Send, Ban, Percent, Download,
  PlusCircle, MinusCircle,
} from 'lucide-react';
import { facturaService, tipoConsultaService } from '../../../services';
import { useAuth, useFacturas } from '../../../hooks';
import {
  Modal, PageHeader, KPI, Campo, CampoReadOnly, ErrorBox, ErrorBanner,
  SuccessBanner, SearchBar, LoadingRow, EmptyRow, EstadoBadge,
} from '../../../shared/components/ui';
import { generarPdfFactura } from '../../../shared/utils/generarPdfFactura';

// ─── Constantes ────────────────────────────────────────────────────────────────
const ESTADOS = [
  { v: 'todas',     l: 'Todas',     bg: 'bg-gray-100 text-gray-700' },
  { v: 'borrador',  l: 'Borradores', bg: 'bg-gray-200 text-gray-700 border-gray-300', icon: FileText },
  { v: 'pendiente', l: 'Pendientes', bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
  { v: 'pagada',    l: 'Pagadas',    bg: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  { v: 'anulada',   l: 'Anuladas',   bg: 'bg-red-100 text-red-700 border-red-200', icon: Ban },
  { v: 'vencida',   l: 'Vencidas',   bg: 'bg-orange-100 text-orange-700 border-orange-200', icon: XCircle },
];

const METODOS_PAGO = [
  'Efectivo', 'Tarjeta débito', 'Tarjeta crédito',
  'Transferencia', 'PSE', 'Nequi', 'Daviplata', 'EPS', 'Otro',
];

const estadoStyle = (e) => ESTADOS.find(x => x.v === e) ?? ESTADOS[0];

const fmtMoney = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(Number(n ?? 0));

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Facturacion() {
  const { esAdmin } = useAuth();
  const [search, setSearch]           = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [fechaDesde, setFechaDesde]   = useState('');
  const [fechaHasta, setFechaHasta]   = useState('');
  const [detalle, setDetalle]         = useState(null);
  const [editando, setEditando]       = useState(null);
  const [pagando, setPagando]         = useState(null);
  const [anulando, setAnulando]       = useState(null);
  const [eliminando, setEliminando]   = useState(null);
  const [okMsg, setOkMsg]             = useState('');
  const [descargandoId, setDescargandoId] = useState(null);

  const {
    facturas, loading, error, setError,
    reload: cargar, softDelete,
  } = useFacturas({ estado: filtroEstado, fechaDesde, fechaHasta, realtime: true });

  const filtered = useMemo(() => facturas.filter(f => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (f.numero_factura     ?? '').toLowerCase().includes(term) ||
      (f.paciente_nombre    ?? '').toLowerCase().includes(term) ||
      (f.paciente_documento ?? '').includes(search) ||
      (f.medico_nombre      ?? '').toLowerCase().includes(term)
    );
  }), [facturas, search]);

  const kpis = useMemo(() => ({
    total:    facturas.length,
    pendientes: facturas.filter(f => f.estado === 'pendiente').length,
    pagadas: facturas.filter(f => f.estado === 'pagada').length,
    porCobrar: facturas
      .filter(f => ['pendiente', 'vencida'].includes(f.estado))
      .reduce((s, f) => s + Number(f.total ?? 0), 0),
    ingresosMes: facturas
      .filter(f => f.estado === 'pagada'
        && f.fecha_pago?.startsWith(new Date().toISOString().slice(0, 7)))
      .reduce((s, f) => s + Number(f.total ?? 0), 0),
  }), [facturas]);

  const descargarPdf = useCallback(async (f) => {
    // No se imprimen borradores: aún no tienen número DIAN.
    if (f.estado === 'borrador') {
      setError('No se puede imprimir un borrador. Emite la factura primero.');
      return;
    }
    setDescargandoId(f.id_factura);
    setError('');
    try {
      const items = await facturaService.getItems(f.id_factura);
      generarPdfFactura(f, items ?? []);
    } catch (err) {
      setError(`No se pudo generar el PDF: ${err.message ?? err}`);
    } finally {
      setDescargandoId(null);
    }
  }, [setError]);

  const handleEliminarConfirmado = async (f) => {
    try {
      await softDelete(f.id_factura);
      setOkMsg(`Factura ${f.numero_factura ?? 'borrador'} enviada a papelera.`);
      setTimeout(() => setOkMsg(''), 4000);
      return true;
    } catch (err) {
      setError(err.message ?? 'No se pudo eliminar');
      return false;
    }
  };

  if (!esAdmin && !['admin', 'asistente'].includes(undefined)) {
    // Asistente también puede acceder; el chequeo más fuerte está en RLS/RPC.
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Facturación"
        descripcion="Gestión de facturas y cobros"
        icon={<Receipt size={32} />}
        variant="emeraldDark"
      >
        <KPI label="Total"       value={loading ? '···' : kpis.total} />
        <KPI label="Pendientes"  value={loading ? '···' : kpis.pendientes} color="text-amber-300" />
        <KPI label="Pagadas"     value={loading ? '···' : kpis.pagadas} color="text-green-300" />
        <KPI label="Por cobrar"  value={loading ? '···' : fmtMoney(kpis.porCobrar)} mono />
        <KPI label="Mes actual"  value={loading ? '···' : fmtMoney(kpis.ingresosMes)} mono color="text-green-300" />
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
            placeholder="Buscar por número, paciente, documento o médico..."
            focusColor="emerald"
          />
          <div>
            <label className="text-xs text-gray-500 block mb-1">Desde</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Hasta</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
          </div>
        </div>

        {/* Tabs de estado */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {ESTADOS.map(e => {
            const activo = filtroEstado === e.v;
            const n = e.v === 'todas' ? facturas.length : facturas.filter(f => f.estado === e.v).length;
            return (
              <button key={e.v} onClick={() => setFiltroEstado(e.v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                  activo
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                }`}>
                {e.l}
                <span className={`ml-1 text-xs px-1.5 rounded-full ${activo ? 'bg-white/30' : 'bg-gray-100'}`}>
                  {n}
                </span>
              </button>
            );
          })}
          <button onClick={() => cargar()}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg">
            <RefreshCw size={14} /> Recargar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b-2 border-emerald-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase">Número</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase">Estado</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase">Fecha</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase">Paciente</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-700 uppercase">Médico</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-700 uppercase">Total</th>
                <th className="px-5 py-3 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <LoadingRow colSpan={7} mensaje="Cargando facturas..." color="emerald" />
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={7} icon={Receipt} mensaje="No hay facturas que coincidan" />
              ) : filtered.map(f => {
                const st = estadoStyle(f.estado);
                const StIcon = st.icon;
                return (
                  <tr key={f.id_factura} className="hover:bg-emerald-50 transition">
                    <td className="px-5 py-3">
                      {f.numero_factura ? (
                        <span className="font-mono font-semibold text-gray-900">{f.numero_factura}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin emitir</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <EstadoBadge type="factura" estado={f.estado} withIcon />
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {f.fecha_emision?.slice(0, 10) ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{f.paciente_nombre ?? '—'}</p>
                      <p className="text-xs text-gray-500 font-mono">{f.paciente_documento}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700 truncate max-w-[160px]">
                      Dr(a). {f.medico_nombre ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-mono font-semibold text-gray-900">{fmtMoney(f.total)}</span>
                      {f.items_count > 0 && (
                        <p className="text-xs text-gray-500">{f.items_count} {f.items_count === 1 ? 'línea' : 'líneas'}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setDetalle(f)} title="Ver"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                          <Eye size={16} />
                        </button>
                        {f.estado !== 'borrador' && (
                          <button
                            onClick={() => descargarPdf(f)}
                            disabled={descargandoId === f.id_factura}
                            title="Descargar PDF"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50"
                          >
                            {descargandoId === f.id_factura
                              ? <Loader2 size={16} className="animate-spin" />
                              : <Download size={16} />}
                          </button>
                        )}
                        {f.estado === 'borrador' && (
                          <button onClick={() => setEditando(f)} title="Editar borrador"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                            <Edit size={16} />
                          </button>
                        )}
                        {f.estado === 'pendiente' && (
                          <button onClick={() => setPagando(f)} title="Marcar como pagada"
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition">
                            <DollarSign size={16} />
                          </button>
                        )}
                        {['pendiente', 'pagada'].includes(f.estado) && (
                          <button onClick={() => setAnulando(f)} title="Anular"
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition">
                            <Ban size={16} />
                          </button>
                        )}
                        <button onClick={() => setEliminando(f)} title="Enviar a papelera"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detalle  && (
        <ModalDetalle
          factura={detalle}
          onClose={() => setDetalle(null)}
          onDescargar={() => descargarPdf(detalle)}
          descargando={descargandoId === detalle.id_factura}
        />
      )}
      {editando && <ModalEditarBorrador factura={editando} onClose={() => { setEditando(null); cargar({ silencioso: true }); }} />}
      {pagando  && <ModalPagar  factura={pagando}  onClose={() => { setPagando(null); cargar({ silencioso: true }); }} />}
      {anulando && <ModalAnular factura={anulando} onClose={() => { setAnulando(null); cargar({ silencioso: true }); }} />}
      {eliminando && (
        <ModalEliminar factura={eliminando}
          onConfirm={async () => { const ok = await handleEliminarConfirmado(eliminando); if (ok) setEliminando(null); }}
          onClose={() => setEliminando(null)} />
      )}
    </div>
  );
}

// =====================================================================
// MODAL: VER DETALLE
// =====================================================================
function ModalDetalle({ factura, onClose, onDescargar, descargando }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    facturaService.getItems(factura.id_factura)
      .then(data => setItems(data ?? []))
      .finally(() => setLoading(false));
  }, [factura.id_factura]);

  const st = estadoStyle(factura.estado);

  return (
    <Modal titulo={`Factura ${factura.numero_factura ?? '(borrador)'}`}
      subtitulo={`${factura.paciente_nombre} · ${factura.fecha_emision?.slice(0, 10) ?? 'sin emitir'}`}
      onClose={onClose} variant="emeraldDark" size="xl">
      <div className="space-y-4">
        {/* Estado destacado */}
        <div className={`p-3 rounded-xl border ${st.bg} text-center font-bold`}>
          Estado: {st.l.replace(/s$/, '').toUpperCase()}
          {factura.estado === 'anulada' && factura.motivo_anulacion && (
            <p className="text-xs font-normal mt-1">Motivo: {factura.motivo_anulacion}</p>
          )}
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Paciente"      value={factura.paciente_nombre} />
          <Campo label="Documento"     value={factura.paciente_documento} />
          <Campo label="Médico"        value={`Dr(a). ${factura.medico_nombre ?? '—'}`} />
          <Campo label="Especialidad"  value={factura.medico_especialidad} />
          <Campo label="Fecha emisión" value={factura.fecha_emision?.slice(0, 16).replace('T', ' ') ?? '—'} />
          <Campo label="Método pago"   value={factura.metodo_pago ?? '—'} />
          {factura.fecha_pago && <Campo label="Fecha pago" value={factura.fecha_pago?.slice(0, 16).replace('T', ' ')} />}
          {factura.fecha_anulacion && <Campo label="Fecha anulación" value={factura.fecha_anulacion?.slice(0, 16).replace('T', ' ')} />}
          {factura.observaciones && <div className="col-span-2"><Campo label="Observaciones" value={factura.observaciones} /></div>}
        </div>

        {/* Items */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 bg-gray-100 text-xs font-bold text-gray-700 uppercase">
            Detalle de líneas ({items.length})
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto" /></div>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-gray-400 italic">Sin líneas</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Descripción</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">Cantidad</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">Precio unit.</th>
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
        <Totales factura={factura} />

        {/* Botones */}
        <div className="flex gap-3 pt-3 border-t border-gray-200">
          <button onClick={onClose}
            className="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold">
            Cerrar
          </button>
          {factura.estado !== 'borrador' && onDescargar && (
            <button onClick={onDescargar} disabled={descargando}
              className="flex-1 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              {descargando ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {descargando ? 'Generando...' : 'Descargar PDF'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// =====================================================================
// MODAL: EDITAR BORRADOR
// =====================================================================
function ModalEditarBorrador({ factura: facturaInit, onClose }) {
  const [factura, setFactura] = useState(facturaInit);
  const [items, setItems]     = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const cargarItems = useCallback(async () => {
    const data = await facturaService.getItems(factura.id_factura);
    setItems(data ?? []);
  }, [factura.id_factura]);

  const refrescarFactura = useCallback(async () => {
    const data = await facturaService.getById(factura.id_factura);
    if (data) setFactura(data);
  }, [factura.id_factura]);

  useEffect(() => {
    Promise.all([
      cargarItems(),
      tipoConsultaService.getCatalogo().then(setCatalogo).catch(() => setCatalogo([])),
    ]).finally(() => setLoading(false));
  }, [cargarItems]);

  // Editar campos de la cabecera (descuento, tasa_impuesto, observaciones)
  const guardarCampoFactura = async (campo, valor) => {
    setError('');
    try {
      await facturaService.actualizarCampo(factura.id_factura, campo, valor);
      await refrescarFactura();
    } catch (err) {
      setError(err.message);
    }
  };

  // Items: agregar / actualizar / eliminar
  const agregarItem = async () => {
    setError('');
    const nuevoOrden = items.length > 0 ? Math.max(...items.map(i => i.orden)) + 1 : 1;
    try {
      // Sin descripción ni precio por defecto — el datalist guía la elección.
      await facturaService.agregarItem(factura.id_factura, {
        descripcion: '', cantidad: 1, precio_unitario: 0, orden: nuevoOrden,
      });
      await cargarItems();
      await refrescarFactura();
    } catch (err) {
      setError(err.message);
    }
  };

  const actualizarItem = async (id_item, campo, valor) => {
    setError('');
    try {
      await facturaService.actualizarItem(id_item, campo, valor);
      await cargarItems();
      await refrescarFactura();
    } catch (err) {
      setError(err.message);
    }
  };

  // Update multi-campo en una sola query — usado al aplicar una plantilla
  // del catálogo (descripcion + precio + id_tipo_consulta de golpe).
  const actualizarItemCampos = async (id_item, updates) => {
    setError('');
    try {
      await facturaService.actualizarItemCampos(id_item, updates);
      await cargarItems();
      await refrescarFactura();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminarItem = async (id_item) => {
    setError('');
    try {
      await facturaService.eliminarItem(id_item);
      await cargarItems();
      await refrescarFactura();
    } catch (err) {
      setError(err.message);
    }
  };

  // EMITIR FACTURA
  const emitir = async () => {
    if (items.length === 0) {
      setError('No se puede emitir una factura sin líneas.');
      return;
    }
    if (!window.confirm(`¿Emitir esta factura por ${fmtMoney(factura.total)}?\n\nUna vez emitida no se podrá editar.`)) return;
    setSaving(true);
    setError('');
    try {
      await facturaService.emitir(factura.id_factura);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal titulo="Editar borrador de factura"
      subtitulo={`${factura.paciente_nombre} · ${factura.id_consulta ? `Consulta #${factura.id_consulta}` : 'sin consulta'}`}
      onClose={onClose} variant="emeraldDark" size="xl">
      <div className="space-y-4">
        {/* Aviso */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-sm text-blue-800">
          <FileText size={16} className="flex-shrink-0 mt-0.5" />
          <p>
            Estás editando un <strong>borrador</strong>. Los totales se recalculan
            automáticamente. Al emitir, se asigna número definitivo y se bloquean
            los campos financieros.
          </p>
        </div>

        {/* Info read-only del paciente/medico */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl text-sm">
          <CampoReadOnly label="Paciente" value={factura.paciente_nombre} />
          <CampoReadOnly label="Médico" value={`Dr(a). ${factura.medico_nombre ?? '—'}`} />
          <CampoReadOnly label="Especialidad" value={factura.medico_especialidad} />
        </div>

        {/* Tabla de items editable */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700">Líneas ({items.length})</h3>
            <button onClick={agregarItem}
              className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-800 font-medium">
              <PlusCircle size={16} /> Agregar línea
            </button>
          </div>
          {loading ? (
            <div className="p-6 text-center"><Loader2 size={20} className="animate-spin mx-auto text-emerald-600" /></div>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-gray-400 italic text-center">
              Sin líneas. Agrega una para empezar.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 w-1/2">Descripción</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">Cantidad</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">Precio unit.</th>
                  <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">Subtotal</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(it => (
                  <ItemRow key={it.id_item} item={it}
                    catalogo={catalogo}
                    onUpdate={(campo, valor) => actualizarItem(it.id_item, campo, valor)}
                    onUpdateMulti={(updates) => actualizarItemCampos(it.id_item, updates)}
                    onDelete={() => eliminarItem(it.id_item)} />
                ))}
              </tbody>
            </table>
          )}
          {catalogo.length > 0 && (
            <p className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
              Tip: en la descripción escribe o elige una plantilla del catálogo — el precio se autocompleta.
            </p>
          )}
        </div>

        {/* Descuento + Tasa de impuesto */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <DollarSign size={12} /> Descuento (monto)
            </label>
            <input type="number" min="0" step="100" defaultValue={factura.descuento ?? 0}
              onBlur={e => guardarCampoFactura('descuento', Number(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Percent size={12} /> Tasa de impuesto (0–1; ej. 0.19 = 19%)
            </label>
            <input type="number" min="0" max="1" step="0.01" defaultValue={factura.tasa_impuesto ?? 0}
              onBlur={e => guardarCampoFactura('tasa_impuesto', Number(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono" />
          </div>
        </div>

        {/* Observaciones */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Observaciones</label>
          <textarea rows={2} defaultValue={factura.observaciones ?? ''}
            onBlur={e => guardarCampoFactura('observaciones', e.target.value || null)}
            placeholder="Notas internas o para mostrar al paciente..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
        </div>

        {/* Totales */}
        <Totales factura={factura} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-3 border-t border-gray-200">
          <button onClick={onClose}
            className="flex-1 px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold">
            Cerrar (los cambios ya se guardaron)
          </button>
          <button onClick={emitir} disabled={saving || items.length === 0}
            className="flex-1 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
            <Send size={16} /> {saving ? 'Emitiendo...' : 'Emitir factura'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Fila de item editable (descripción/cantidad/precio inline) ───────────────
// La descripción usa <datalist> contra el catálogo de tipo_consulta. Si el
// texto coincide exactamente con una plantilla, se autocompleta precio +
// id_tipo_consulta (un solo round-trip vía onUpdateMulti). Texto libre = el
// admin puede escribir lo que quiera.
function ItemRow({ item, catalogo = [], onUpdate, onUpdateMulti, onDelete }) {
  // listId único por fila evita conflicto si hay varias filas a la vez.
  const listId = `cat-servicios-${item.id_item}`;

  // defaultValue solo se aplica al montar; cuando el padre re-renderiza con
  // un item nuevo (ej: tras aplicar una plantilla del catálogo) el DOM del
  // input mantiene el valor viejo. Sincronizamos vía ref, pero solo si el
  // input no tiene foco — así no pisamos lo que el usuario está escribiendo.
  const descRef   = useRef(null);
  const cantRef   = useRef(null);
  const precioRef = useRef(null);

  useEffect(() => {
    if (descRef.current && document.activeElement !== descRef.current) {
      descRef.current.value = item.descripcion ?? '';
    }
  }, [item.descripcion]);

  useEffect(() => {
    if (cantRef.current && document.activeElement !== cantRef.current) {
      cantRef.current.value = item.cantidad ?? 1;
    }
  }, [item.cantidad]);

  useEffect(() => {
    if (precioRef.current && document.activeElement !== precioRef.current) {
      precioRef.current.value = item.precio_unitario ?? 0;
    }
  }, [item.precio_unitario]);

  // Match exacto, case-insensitive y trim — para que pequeñas variaciones
  // del usuario igual disparen la plantilla.
  const matchPlantilla = (texto) => {
    const t = (texto ?? '').trim().toLowerCase();
    if (!t) return null;
    return catalogo.find(c => c.nombre.toLowerCase() === t) ?? null;
  };

  const handleDescripcionBlur = (e) => {
    const nuevoTexto = e.target.value;
    if (nuevoTexto === item.descripcion) return;

    const plantilla = matchPlantilla(nuevoTexto);
    if (plantilla) {
      // Aplica la plantilla en bloque (descripcion + precio + FK).
      onUpdateMulti({
        descripcion:      plantilla.nombre,
        precio_unitario:  Number(plantilla.costo) || 0,
        id_tipo_consulta: plantilla.id_tipo_consulta,
      });
    } else {
      // Texto libre: solo actualiza descripcion. Si antes era una plantilla,
      // limpia el FK para que no quede inconsistente.
      const updates = { descripcion: nuevoTexto };
      if (item.id_tipo_consulta) updates.id_tipo_consulta = null;
      if (Object.keys(updates).length === 1) {
        onUpdate('descripcion', nuevoTexto);
      } else {
        onUpdateMulti(updates);
      }
    }
  };

  // Etiqueta visual sutil cuando el ítem está vinculado a una plantilla
  // del catálogo — ayuda al admin a saber que el precio vino de allí.
  const plantillaActiva = item.id_tipo_consulta
    ? catalogo.find(c => c.id_tipo_consulta === item.id_tipo_consulta)
    : null;

  return (
    <tr>
      <td className="px-3 py-2">
        <input
          ref={descRef}
          type="text"
          list={catalogo.length > 0 ? listId : undefined}
          defaultValue={item.descripcion}
          placeholder="Elige una plantilla o escribe libre…"
          onBlur={handleDescripcionBlur}
          className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-emerald-500 focus:bg-white rounded text-sm"
        />
        {catalogo.length > 0 && (
          <datalist id={listId}>
            {catalogo.map(c => (
              <option key={c.id_tipo_consulta} value={c.nombre}>
                {fmtMoney(c.costo)}{c.descripcion ? ` · ${c.descripcion}` : ''}
              </option>
            ))}
          </datalist>
        )}
        {plantillaActiva && (
          <p className="text-[10px] text-emerald-700 ml-2 mt-0.5">
            Plantilla: {plantillaActiva.nombre}
          </p>
        )}
        {item.notas && <p className="text-xs text-gray-500 italic ml-2">{item.notas}</p>}
      </td>
      <td className="px-3 py-2">
        <input ref={cantRef} type="number" min="0.01" step="0.5" defaultValue={item.cantidad}
          onBlur={e => { const v = Number(e.target.value); if (v !== Number(item.cantidad) && v > 0) onUpdate('cantidad', v); }}
          className="w-20 px-2 py-1 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded text-sm text-right font-mono" />
      </td>
      <td className="px-3 py-2">
        <input ref={precioRef} type="number" min="0" step="100" defaultValue={item.precio_unitario}
          onBlur={e => { const v = Number(e.target.value); if (v !== Number(item.precio_unitario) && v >= 0) onUpdate('precio_unitario', v); }}
          className="w-28 px-2 py-1 border border-gray-200 focus:border-emerald-500 focus:bg-white rounded text-sm text-right font-mono" />
      </td>
      <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
        {fmtMoney(item.subtotal)}
      </td>
      <td className="px-2 py-2">
        <button onClick={onDelete} title="Eliminar línea"
          className="p-1 text-red-500 hover:bg-red-50 rounded">
          <MinusCircle size={16} />
        </button>
      </td>
    </tr>
  );
}

// =====================================================================
// MODAL: MARCAR COMO PAGADA
// =====================================================================
function ModalPagar({ factura, onClose }) {
  const [metodo, setMetodo] = useState('Efectivo');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const confirmar = async () => {
    setSaving(true); setError('');
    try {
      await facturaService.marcarPagada(factura.id_factura, metodo);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center gap-3">
          <DollarSign size={24} />
          <div>
            <h2 className="text-lg font-bold">Registrar pago</h2>
            <p className="text-xs text-green-100">{factura.numero_factura}</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">Paciente</p>
            <p className="font-bold text-gray-900">{factura.paciente_nombre}</p>
            {metodo === 'EPS' ? (
              <div className="mt-2 text-right">
                <p className="text-xs text-gray-500 line-through font-mono">{fmtMoney(factura.total)}</p>
                <p className="text-2xl font-bold text-emerald-700 font-mono">{fmtMoney(0)}</p>
                <p className="text-[10px] text-emerald-700">Cubierto 100% por EPS</p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-green-700 mt-2 text-right font-mono">{fmtMoney(factura.total)}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Método de pago *</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {metodo === 'EPS' && (
              <p className="text-xs text-emerald-700 mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                La EPS cubre el 100% de esta factura. Se aplicará un descuento equivalente al subtotal y el paciente no paga nada.
              </p>
            )}
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={saving}
              className="flex-1 px-5 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold">Cancelar</button>
            <button onClick={confirmar} disabled={saving}
              className="flex-1 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              <CheckCircle size={16} /> {saving ? 'Registrando...' : 'Confirmar pago'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// MODAL: ANULAR
// =====================================================================
function ModalAnular({ factura, onClose }) {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const confirmar = async () => {
    setSaving(true); setError('');
    try {
      await facturaService.anular(factura.id_factura, motivo);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-4 flex items-center gap-3">
          <Ban size={24} />
          <div>
            <h2 className="text-lg font-bold">Anular factura</h2>
            <p className="text-xs text-orange-100">{factura.numero_factura}</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            La factura quedará marcada como <strong>anulada</strong>.
            Es equivalente a una nota crédito — no se puede revertir.
          </p>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">Total a anular</p>
            <p className="text-xl font-bold text-orange-700 font-mono">{fmtMoney(factura.total)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Motivo de anulación *</label>
            <textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: error en monto cobrado, paciente solicitó cancelación, datos incorrectos..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={saving}
              className="flex-1 px-5 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold">Cancelar</button>
            <button onClick={confirmar} disabled={saving}
              className="flex-1 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              <Ban size={16} /> {saving ? 'Anulando...' : 'Sí, anular'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// MODAL: ELIMINAR (soft-delete)
// =====================================================================
function ModalEliminar({ factura, onConfirm, onClose }) {
  const [trabajando, setTrabajando] = useState(false);
  const handle = async () => { setTrabajando(true); await onConfirm(); setTrabajando(false); };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-4 flex items-center gap-3">
          <Trash2 size={22} />
          <div>
            <h2 className="text-lg font-bold">Enviar a papelera</h2>
            <p className="text-xs text-red-100">Se puede restaurar desde la Papelera</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700">
            ¿Confirmas enviar a papelera la factura {factura.numero_factura
              ? <strong className="font-mono">{factura.numero_factura}</strong>
              : <strong>en borrador</strong>}?
          </p>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="font-bold text-gray-900">{factura.paciente_nombre}</p>
            <p className="text-xs text-gray-500">Total: <span className="font-mono">{fmtMoney(factura.total)}</span></p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={trabajando}
              className="flex-1 px-5 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold">Cancelar</button>
            <button onClick={handle} disabled={trabajando}
              className="flex-1 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition font-semibold shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              <Trash2 size={16} /> {trabajando ? 'Eliminando...' : 'Sí, enviar a papelera'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Totales({ factura }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5 text-sm">
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
      {Number(factura.tasa_impuesto) > 0 && (
        <div className="flex justify-between text-gray-700">
          <span>Impuesto ({(Number(factura.tasa_impuesto) * 100).toFixed(0)}%):</span>
          <span className="font-mono">{fmtMoney(factura.impuesto)}</span>
        </div>
      )}
      <div className="flex justify-between pt-2 border-t border-emerald-300 text-emerald-900 text-lg font-bold">
        <span>Total:</span>
        <span className="font-mono">{fmtMoney(factura.total)}</span>
      </div>
    </div>
  );
}

