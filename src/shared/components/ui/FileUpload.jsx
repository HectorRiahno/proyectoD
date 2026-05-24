import React, { useState, useRef } from 'react';
import { Upload, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { adjuntoService } from '../../../services';

/**
 * Drop-zone + selector de archivo. Permite seleccionar uno o varios archivos,
 * los muestra como "pendientes" antes de subir, valida tipo/tamaño con el
 * service, y dispara `onUpload(file, descripcion)` cuando el usuario confirma.
 *
 *   <FileUpload
 *     accept={adjuntoService.acceptString}
 *     onUpload={(file, descripcion) => subir(file, descripcion)}
 *     disabled={!idConsulta}
 *     placeholder="Arrastra archivos aquí o haz clic para seleccionar"
 *   />
 */
export function FileUpload({
  onUpload,
  accept = adjuntoService.acceptString,
  maxSize,
  disabled = false,
  placeholder = 'Arrastra archivos aquí o haz clic para seleccionar (PDF, imágenes)',
}) {
  const [pendientes, setPendientes] = useState([]);   // [{ file, descripcion, status, error }]
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (files) => {
    if (disabled) return;
    const nuevos = Array.from(files).map(file => {
      let error = null;
      try {
        adjuntoService.validarArchivo(file);
        if (maxSize && file.size > maxSize) {
          error = `Excede el tamaño máximo permitido (${(maxSize / 1024 / 1024).toFixed(0)} MB).`;
        }
      } catch (err) {
        error = err.message;
      }
      return { file, descripcion: '', status: error ? 'invalid' : 'pendiente', error };
    });
    setPendientes(prev => [...prev, ...nuevos]);
  };

  const removePendiente = (idx) =>
    setPendientes(prev => prev.filter((_, i) => i !== idx));

  const setDescripcion = (idx, valor) =>
    setPendientes(prev => prev.map((p, i) => i === idx ? { ...p, descripcion: valor } : p));

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleSubirTodo = async () => {
    for (let i = 0; i < pendientes.length; i++) {
      const p = pendientes[i];
      if (p.status !== 'pendiente') continue;
      setPendientes(prev => prev.map((q, j) => j === i ? { ...q, status: 'subiendo' } : q));
      try {
        await onUpload(p.file, p.descripcion);
        setPendientes(prev => prev.map((q, j) => j === i ? { ...q, status: 'ok' } : q));
      } catch (err) {
        setPendientes(prev => prev.map((q, j) =>
          j === i ? { ...q, status: 'error', error: err.message } : q,
        ));
      }
    }
    // Limpiar los OK tras unos segundos
    setTimeout(() => {
      setPendientes(prev => prev.filter(p => p.status !== 'ok'));
    }, 1500);
  };

  const hayParaSubir = pendientes.some(p => p.status === 'pendiente');

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); !disabled && setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
          disabled
            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            : drag
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
        }`}
      >
        <Upload size={28} className={`mx-auto mb-2 ${drag ? 'text-blue-600' : 'text-gray-400'}`} />
        <p className="text-sm text-gray-600">{placeholder}</p>
        <p className="text-xs text-gray-400 mt-1">Máx 10 MB por archivo</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';   // reset para poder seleccionar el mismo archivo de nuevo
          }}
        />
      </div>

      {/* Lista de pendientes */}
      {pendientes.length > 0 && (
        <div className="mt-3 space-y-2">
          {pendientes.map((p, idx) => (
            <PendienteRow
              key={idx}
              pendiente={p}
              onRemove={() => removePendiente(idx)}
              onDescripcionChange={(v) => setDescripcion(idx, v)}
            />
          ))}

          {hayParaSubir && (
            <button
              type="button"
              onClick={handleSubirTodo}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-semibold flex items-center justify-center gap-2 text-sm"
            >
              <Upload size={16} /> Subir {pendientes.filter(p => p.status === 'pendiente').length} archivo(s)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PendienteRow({ pendiente, onRemove, onDescripcionChange }) {
  const { file, descripcion, status, error } = pendiente;
  const isImg = file.type.startsWith('image/');
  const Icon  = isImg ? ImageIcon : FileText;
  const sizeKb = (file.size / 1024).toFixed(0);

  const statusColor = {
    pendiente: 'border-gray-200 bg-white',
    subiendo:  'border-blue-300 bg-blue-50',
    ok:        'border-green-300 bg-green-50',
    error:     'border-red-300 bg-red-50',
    invalid:   'border-red-300 bg-red-50',
  }[status];

  return (
    <div className={`border rounded-lg p-3 ${statusColor}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className="text-gray-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">
            {sizeKb} KB · {file.type}
            {status === 'subiendo' && ' · Subiendo...'}
            {status === 'ok'       && ' · ✓ Subido'}
          </p>
          {error && <p className="text-xs text-red-700 mt-1">⚠ {error}</p>}

          {(status === 'pendiente' || status === 'error') && (
            <input
              type="text"
              value={descripcion}
              onChange={(e) => onDescripcionChange(e.target.value)}
              placeholder="Descripción (opcional, ej: Radiografía tórax PA)"
              className="w-full mt-2 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          )}
        </div>

        {status !== 'subiendo' && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-600 transition flex-shrink-0"
            aria-label="Quitar"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Versión "compacta" del FileUpload — solo un botón "Adjuntar archivo".
 * Útil cuando ya hay otro contenido visible y no quieres el dropzone grande.
 */
export function FileUploadCompact({ onUpload, disabled = false, label = 'Adjuntar archivo' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      adjuntoService.validarArchivo(file);
      setBusy(true);
      await onUpload(file, '');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || disabled}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
      >
        <Paperclip size={14} /> {busy ? 'Subiendo...' : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={adjuntoService.acceptString}
        disabled={busy || disabled}
        className="hidden"
        onChange={handleChange}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export default FileUpload;
