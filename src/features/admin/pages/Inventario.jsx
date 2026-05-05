import React, { useState } from 'react';
import { Search, Plus, Filter, Package, AlertTriangle, TrendingUp, Download, Edit, Trash2, Eye } from 'lucide-react';
import { productos as productosData } from '../inventory/data/productos';
import { categorias } from '../inventory/data/categorias';
import ProductModal from '../inventory/components/ProductModal';
import StatsCard from '../inventory/components/StatsCard';

export default function Inventario() {
  const [productos, setProductos] = useState(productosData);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  const totalProductos = productos.length;
  const stockBajo = productos.filter(p => p.stock <= p.stockMinimo).length;
  const valorTotal = productos.reduce((acc, p) => acc + (p.stock * p.precio), 0);
  const categoriasTotales = new Set(productos.map(p => p.categoria)).size;

  const filteredProducts = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         producto.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || producto.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setModalOpen(true);
  };

  const handleEditProduct = (producto) => {
    setSelectedProduct(producto);
    setModalOpen(true);
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('¿Está seguro de eliminar este producto?')) {
      setProductos(productos.filter(p => p.id !== id));
    }
  };

  const exportToCSV = () => {
    alert('Exportando a CSV...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Inventario</h1>
          <p className="text-gray-500 mt-1">Administra productos, equipos e insumos médicos</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <Download size={18} />
            Exportar
          </button>
          <button
            onClick={handleAddProduct}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
          >
            <Plus size={18} />
            Agregar Producto
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          title="Total Productos"
          value={totalProductos}
          icon={Package}
          color="blue"
        />
        <StatsCard
          title="Stock Bajo"
          value={stockBajo}
          icon={AlertTriangle}
          color="red"
          highlight={stockBajo > 0}
        />
        <StatsCard
          title="Valor Total"
          value={`$${(valorTotal / 1000000).toFixed(1)}M`}
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="Categorías"
          value={categoriasTotales}
          icon={Filter}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
            ))}
          </select>

          <div className="flex gap-2 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Cuadrícula
            </button>
          </div>
        </div>
      </div>

      {/* Products Table/Grid */}
      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map(producto => (
                  <tr key={producto.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{producto.codigo}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                        <div className="text-sm text-gray-500">{producto.descripcion}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {producto.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-semibold ${producto.stock <= producto.stockMinimo ? 'text-red-600' : 'text-gray-900'}`}>
                          {producto.stock}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">/ {producto.stockMinimo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${producto.precio.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        producto.estado === 'Disponible' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {producto.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProduct(producto)}
                          className="text-blue-600 hover:text-blue-800 transition"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(producto.id)}
                          className="text-red-600 hover:text-red-800 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredProducts.map(producto => (
            <div key={producto.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{producto.nombre}</h3>
                  <p className="text-sm text-gray-500">{producto.codigo}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  producto.estado === 'Disponible' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {producto.estado}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{producto.descripcion}</p>
              
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-xs text-gray-500">Stock</p>
                  <p className={`text-lg font-bold ${producto.stock <= producto.stockMinimo ? 'text-red-600' : 'text-gray-900'}`}>
                    {producto.stock} {producto.unidad}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Precio</p>
                  <p className="text-lg font-bold text-gray-900">${producto.precio.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleEditProduct(producto)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
                >
                  <Edit size={14} /> Editar
                </button>
                <button
                  onClick={() => handleDeleteProduct(producto.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Modal */}
      {modalOpen && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setModalOpen(false)}
          onSave={(product) => {
            if (selectedProduct) {
              setProductos(productos.map(p => p.id === product.id ? product : p));
            } else {
              setProductos([...productos, { ...product, id: Date.now() }]);
            }
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
