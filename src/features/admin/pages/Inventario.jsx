import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Plus, Package, AlertTriangle,
  Filter, Edit, Trash2, Loader2, AlertCircle
} from 'lucide-react';
import { useInventario } from '../../../hooks';
import ProductModal from '../inventory/components/ProductModal';
import StatsCard from '../inventory/components/StatsCard';

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
  // Ese item se pone primero, se hace scroll y se destaca por unos segundos.
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = Number(searchParams.get('highlight')) || null;
  const highlightRef = useRef(null);

  // Auto-limpia el highlight de la URL después de 6s para que un F5
  // no lo mantenga destacado para siempre.
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

  // Scroll suave al item destacado en cuanto se renderice.
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
    // Si vino con highlight, ese item va arriba sin importar filtros.
    if (!highlightId) return list;
    const idx = list.findIndex(m => Number(m.id_medicamento) === highlightId);
    if (idx < 0) {
      // Filtros ocultan el destacado — lo inyectamos arriba si existe.
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
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Inventario de medicamentos</h1>
            <p className="text-emerald-100">Catálogo de medicamentos del sistema</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-100 mb-1">Total</p>
            <p className="text-4xl font-bold">{loading ? '···' : medicamentos.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatsCard title="Total medicamentos" value={medicamentos.length} icon={Package}       color="blue" />
        <StatsCard title="Stock bajo (≤10)"   value={stockBajo}           icon={AlertTriangle} color="red"  highlight={stockBajo > 0} />
        <StatsCard title="Categorías"         value={categorias.length}   icon={Filter}        color="purple" />
      </div>

      {/* Filtros + acciones */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, genérico o presentación..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => (
              <option key={c.id_categoria} value={String(c.id_categoria)}>{c.nombre}</option>
            ))}
          </select>

          <div className="flex gap-1 border border-gray-300 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'grid' ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Cuadrícula
            </button>
          </div>

          <button
            onClick={() => { setSelected(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition font-semibold shadow-md"
          >
            <Plus size={18} /> Agregar
          </button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-emerald-600" />
          <p className="text-gray-500">Cargando inventario...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No se encontraron medicamentos</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b-2 border-emerald-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Medicamento</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Categoría</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Presentación</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Vía</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Stock</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Precio</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((m, idx) => {
                  const destacado = highlightId && Number(m.id_medicamento) === highlightId;
                  return (
                  <tr
                    key={m.id_medicamento}
                    ref={destacado ? highlightRef : null}
                    className={`transition ${
                      destacado
                        ? 'bg-amber-50 ring-2 ring-amber-400 ring-inset animate-pulse'
                        : `hover:bg-emerald-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
                    }`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{m.nombre}</p>
                      {m.nombre_generico && <p className="text-xs text-gray-500">{m.nombre_generico}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                        {nombreCategoria(m)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {m.presentacion ?? '—'}
                      {m.concentracion && <span className="text-gray-500"> · {m.concentracion}</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{m.via_administracion ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold text-sm ${m.stock <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                        {m.stock}
                      </span>
                      {m.stock <= 10 && (
                        <AlertTriangle size={14} className="text-red-500 inline ml-1" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                      ${Number(m.precio).toLocaleString('es-CO')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        m.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setSelected(m); setModalOpen(true); }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleEliminar(m.id_medicamento)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
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
      ) : (
        /* Vista cuadrícula */
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(m => {
            const destacado = highlightId && Number(m.id_medicamento) === highlightId;
            return (
            <div
              key={m.id_medicamento}
              ref={destacado ? highlightRef : null}
              className={`bg-white rounded-xl shadow-md border p-5 hover:shadow-lg transition ${
                destacado ? 'border-amber-400 ring-2 ring-amber-300 animate-pulse' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{m.nombre}</p>
                  {m.nombre_generico && <p className="text-xs text-gray-500 truncate">{m.nombre_generico}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0 ${
                  m.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {m.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <p className="text-xs text-emerald-600 font-medium mb-3">{nombreCategoria(m)}</p>

              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Stock</p>
                  <p className={`font-bold ${m.stock <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                    {m.stock} {m.stock <= 10 && '⚠️'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-xs text-gray-500">Precio</p>
                  <p className="font-bold text-gray-900">${Number(m.precio).toLocaleString('es-CO')}</p>
                </div>
              </div>

              {m.presentacion && (
                <p className="text-xs text-gray-600 mb-3">
                  {m.presentacion}{m.concentracion && ` · ${m.concentracion}`}
                </p>
              )}

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => { setSelected(m); setModalOpen(true); }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition">
                  <Edit size={14} /> Editar
                </button>
                <button onClick={() => handleEliminar(m.id_medicamento)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition">
                  <Trash2 size={14} /> Eliminar
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
