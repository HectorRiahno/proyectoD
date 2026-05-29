import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Plus, Package, AlertTriangle,
  Filter, Edit, Trash2, LayoutGrid, List,
} from 'lucide-react';
import { useInventario } from '../../../hooks';
import ProductModal from '../inventory/components/ProductModal';
import StatsCard from '../inventory/components/StatsCard';
import {
  PageHeader, KPI, ErrorBanner,
  Toolbar, AccentButton, SearchBar,
  TableShell, Thead, Tbody, Tr,
  IconButton, ActionGroup,
  EmptyState, LoadingState,
} from '../../../shared/components/ui';

export default function Inventario() {
  const {
    medicamentos, categorias, loading, error,
    eliminar: eliminarHook, guardar: guardarHook,
  } = useInventario();
  const [searchTerm, setSearchTerm]     = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [viewMode, setViewMode]         = useState('list');
  const [modalOpen, setModalOpen]       = useState(false);
  const [selected, setSelected]         = useState(null);

  // ?highlight=<id_medicamento> — viene de la campana de notificaciones.
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = Number(searchParams.get('highlight')) || null;
  const highlightRef = useRef(null);

  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('highlight');
        return next;
      }, { replace: true });
    }, 6000);
    return () => clearTimeout(t);
  }, [highlightId, setSearchParams]);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId, loading, viewMode]);

  const filtered = useMemo(() => {
    const list = medicamentos.filter(m => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        (m.nombre ?? '').toLowerCase().includes(term) ||
        (m.nombre_generico ?? '').toLowerCase().includes(term) ||
        (m.presentacion ?? '').toLowerCase().includes(term);
      const matchCat = !filtroCategoria || String(m.id_categoria) === filtroCategoria;
      return matchSearch && matchCat;
    });
    if (!highlightId) return list;
    const idx = list.findIndex(m => Number(m.id_medicamento) === highlightId);
    if (idx < 0) {
      const m = medicamentos.find(x => Number(x.id_medicamento) === highlightId);
      return m ? [m, ...list] : list;
    }
    return [list[idx], ...list.slice(0, idx), ...list.slice(idx + 1)];
  }, [medicamentos, searchTerm, filtroCategoria, highlightId]);

  const stockBajo = medicamentos.filter(m => m.stock <= 10).length;
  const nombreCategoria = (m) => m.categoria_medicamento?.nombre ?? '—';

  const handleGuardar = async (formData) => {
    try {
      await guardarHook(selected, formData);
      setModalOpen(false);
      setSelected(null);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este medicamento?')) return;
    try { await eliminarHook(id); }
    catch (err) { alert('Error: ' + err.message); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Inventario de medicamentos"
        descripcion="Catálogo de medicamentos del sistema"
        eyebrow="Inventario"
        icon={<Package size={11} strokeWidth={2.25} />}
        variant="amber"
      >
        <KPI label="Total"      value={loading ? '···' : medicamentos.length} />
        <KPI label="Stock bajo" value={loading ? '···' : stockBajo} color={stockBajo > 0 ? 'text-red-600' : 'text-ink-900'} />
        <KPI label="Categorías" value={loading ? '···' : categorias.length} color="text-amber-700" />
      </PageHeader>

      <ErrorBanner msg={error} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Total medicamentos" value={medicamentos.length} icon={Package}       color="blue" />
        <StatsCard title="Stock bajo (≤10)"   value={stockBajo}           icon={AlertTriangle} color="red"  highlight={stockBajo > 0} />
        <StatsCard title="Categorías"         value={categorias.length}   icon={Filter}        color="purple" />
      </div>

      <Toolbar>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nombre, genérico o presentación…"
        />

        <select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          className="px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c.id_categoria} value={String(c.id_categoria)}>{c.nombre}</option>
          ))}
        </select>

        <div className="inline-flex p-1 border border-line rounded-xl bg-white">
          {[
            ['list', 'Lista', List],
            ['grid', 'Cuadrícula', LayoutGrid],
          ].map(([v, l, Icon]) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all ${
                viewMode === v
                  ? 'bg-amber-600 text-white shadow-[0_4px_14px_-6px_rgba(11,18,32,0.35)]'
                  : 'text-ink-700 hover:bg-surface'
              }`}
            >
              {Icon && <Icon size={13} strokeWidth={1.75} />}
              {l}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <AccentButton variant="amber" icon={Plus} onClick={() => { setSelected(null); setModalOpen(true); }}>
          Agregar
        </AccentButton>
      </Toolbar>

      {/* Contenido */}
      {loading ? (
        <LoadingState mensaje="Cargando inventario…" color="amber" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} titulo="No se encontraron medicamentos" descripcion="Ajusta los filtros o agrega un medicamento nuevo." />
      ) : viewMode === 'list' ? (
        <TableShell>
          <Thead columnas={[
            'Medicamento', 'Categoría', 'Presentación', 'Vía',
            { label: 'Stock',  align: 'right' },
            { label: 'Precio', align: 'right' },
            { label: 'Estado', align: 'center' },
            { label: 'Acciones', align: 'center' },
          ]} />
          <Tbody>
            {filtered.map((m) => {
              const destacado = highlightId && Number(m.id_medicamento) === highlightId;
              return (
                <tr
                  key={m.id_medicamento}
                  ref={destacado ? highlightRef : null}
                  className={[
                    'transition-colors',
                    destacado
                      ? 'bg-amber-50 ring-2 ring-amber-400 ring-inset'
                      : 'hover:bg-surface/70',
                  ].join(' ')}
                >
                  <td className="px-5 py-3.5">
                    <p className="text-[13.5px] font-medium text-ink-900">{m.nombre}</p>
                    {m.nombre_generico && <p className="text-[11.5px] text-ink-500 mt-0.5">{m.nombre_generico}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex text-[11.5px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md font-medium">
                      {nombreCategoria(m)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12.5px] text-ink-700">
                    {m.presentacion ?? '—'}
                    {m.concentracion && <span className="text-ink-500"> · {m.concentracion}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-[12.5px] text-ink-700">{m.via_administracion ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-[13.5px] font-semibold tabular-nums ${m.stock <= 10 ? 'text-red-600' : 'text-ink-900'}`}>
                      {m.stock}
                    </span>
                    {m.stock <= 10 && (
                      <AlertTriangle size={12} className="text-red-500 inline ml-1" strokeWidth={2} />
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right text-[13.5px] font-semibold text-ink-900 tabular-nums">
                    ${Number(m.precio).toLocaleString('es-CO')}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                      m.activo
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-surface text-ink-700 border-line'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.activo ? 'bg-emerald-500' : 'bg-ink-300'}`} />
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <ActionGroup>
                      <IconButton icon={Edit}   tone="amber" title="Editar"   onClick={() => { setSelected(m); setModalOpen(true); }} />
                      <IconButton icon={Trash2} tone="red"   title="Eliminar" onClick={() => handleEliminar(m.id_medicamento)} />
                    </ActionGroup>
                  </td>
                </tr>
              );
            })}
          </Tbody>
        </TableShell>
      ) : (
        /* Vista cuadrícula */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => {
            const destacado = highlightId && Number(m.id_medicamento) === highlightId;
            return (
              <div
                key={m.id_medicamento}
                ref={destacado ? highlightRef : null}
                className={[
                  'rounded-2xl border bg-white p-5 transition-all duration-200',
                  'shadow-[0_1px_2px_rgba(11,18,32,0.04)]',
                  destacado
                    ? 'border-amber-400 ring-4 ring-amber-500/15'
                    : 'border-line hover:border-ink-100 hover:shadow-[0_8px_24px_-14px_rgba(11,18,32,0.16)]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold tracking-tight text-ink-900 truncate">{m.nombre}</p>
                    {m.nombre_generico && <p className="text-[11.5px] text-ink-500 truncate mt-0.5">{m.nombre_generico}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md font-medium border flex-shrink-0 ${
                    m.activo
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-surface text-ink-700 border-line'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${m.activo ? 'bg-emerald-500' : 'bg-ink-300'}`} />
                    {m.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <span className="inline-flex text-[11px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-md font-medium mb-3">
                  {nombreCategoria(m)}
                </span>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-lg border border-line bg-surface/60 px-3 py-2">
                    <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">Stock</p>
                    <p className={`mt-0.5 text-[15px] font-semibold tabular-nums ${m.stock <= 10 ? 'text-red-600' : 'text-ink-900'}`}>
                      {m.stock}
                      {m.stock <= 10 && <AlertTriangle size={12} className="inline ml-1 text-red-500" strokeWidth={2} />}
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface/60 px-3 py-2">
                    <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">Precio</p>
                    <p className="mt-0.5 text-[15px] font-semibold text-ink-900 tabular-nums">
                      ${Number(m.precio).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>

                {m.presentacion && (
                  <p className="text-[12px] text-ink-500 mb-3">
                    {m.presentacion}{m.concentracion && ` · ${m.concentracion}`}
                  </p>
                )}

                <div className="flex gap-2 pt-3 border-t border-line">
                  <button onClick={() => { setSelected(m); setModalOpen(true); }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-lg transition-colors">
                    <Edit size={13} strokeWidth={1.75} /> Editar
                  </button>
                  <button onClick={() => handleEliminar(m.id_medicamento)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[12.5px] font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors">
                    <Trash2 size={13} strokeWidth={1.75} /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <ProductModal
          product={selected}
          categorias={categorias}
          onClose={() => { setModalOpen(false); setSelected(null); }}
          onSave={handleGuardar}
        />
      )}
    </div>
  );
}
