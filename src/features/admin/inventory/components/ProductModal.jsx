import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// categorias se recibe como prop desde Inventario.jsx (ya cargadas de Supabase)
export default function ProductModal({ product, categorias = [], onClose, onSave }) {
  const [formData, setFormData] = useState({
    id_categoria:       '',
    nombre:             '',
    nombre_generico:    '',
    presentacion:       '',
    concentracion:      '',
    via_administracion: '',
    stock:              0,
    precio:             0,
    activo:             true,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        id_categoria:       product.id_categoria       ?? '',
        nombre:             product.nombre              ?? '',
        nombre_generico:    product.nombre_generico     ?? '',
        presentacion:       product.presentacion        ?? '',
        concentracion:      product.concentracion       ?? '',
        via_administracion: product.via_administracion  ?? '',
        stock:              product.stock               ?? 0,
        precio:             product.precio              ?? 0,
        activo:             product.activo              ?? true,
      });
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      id_categoria: formData.id_categoria ? Number(formData.id_categoria) : null,
      stock:  Number(formData.stock),
      precio: Number(formData.precio),
    });
  };

  const Field = ({ label, name, type = 'text', placeholder = '', required = false, children }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}{required && ' *'}</label>
      {children ?? (
        <input
          name={name}
          type={type}
          value={formData[name]}
          onChange={handleChange}
          required={required}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {product ? 'Editar medicamento' : 'Agregar medicamento'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre" name="nombre" required placeholder="Ej: Amoxicilina" />
            <Field label="Nombre genérico" name="nombre_generico" placeholder="Ej: Amoxicilina trihidratada" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Categoría" name="id_categoria">
              <select
                name="id_categoria"
                value={formData.id_categoria}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Sin categoría</option>
                {categorias.map(c => (
                  <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                ))}
              </select>
            </Field>

            <Field label="Vía de administración" name="via_administracion" placeholder="Oral, IV, IM..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Presentación" name="presentacion" placeholder="Tabletas, Cápsulas, Jarabe..." />
            <Field label="Concentración" name="concentracion" placeholder="500 mg, 250 mg/5 ml..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Stock actual" name="stock" type="number" required />
            <Field label="Precio unitario ($)" name="precio" type="number" required />
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              name="activo"
              id="activo"
              checked={formData.activo}
              onChange={handleChange}
              className="w-5 h-5 rounded text-blue-600"
            />
            <label htmlFor="activo" className="text-sm font-medium text-gray-700">
              Medicamento activo (disponible para prescribir)
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-medium shadow-md"
            >
              {product ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
