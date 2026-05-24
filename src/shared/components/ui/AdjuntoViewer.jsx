import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { adjuntoService } from '../../../services';

/**
 * Modal full-screen para previsualizar un adjunto.
 * - Imágenes: muestra inline.
 * - PDF: incrusta con <iframe>.
 * - Otros: muestra un placeholder con botón de descarga.
 *
 *   {visor && <AdjuntoViewer adjunto={visor} onClose={() => setVisor(null)} />}
 */
export function AdjuntoViewer({ adjunto, onClose }) {
  const [url, setUrl]       = useState(null);
  const [error, setError]   = useState('');
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    if (!adjunto) return;
    let cancelado = false;
    setLoad(true);
    setError('');
    adjuntoService.getSignedUrl(adjunto.storage_path)
      .then(u => { if (!cancelado) setUrl(u); })
      .catch(err => { if (!cancelado) setError(err.message); })
      .finally(() => { if (!cancelado) setLoad(false); });
    return () => { cancelado = true; };
  }, [adjunto]);

  if (!adjunto) return null;

  const isImg = adjunto.tipo_mime?.startsWith('image/');
  const isPdf = adjunto.tipo_mime === 'application/pdf';

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate">{adjunto.nombre_archivo}</p>
            {adjunto.descripcion && (
              <p className="text-xs text-gray-500 truncate">{adjunto.descripcion}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {url && (
              <>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink size={14} /> Abrir
                </a>
                <button
                  onClick={() => adjuntoService.descargar(adjunto)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition"
                >
                  <Download size={14} /> Descargar
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
          {loading && (
            <div className="text-center text-gray-500">
              <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-sm">Cargando archivo...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2 max-w-md">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {!loading && !error && url && (
            <>
              {isImg && (
                <img
                  src={url}
                  alt={adjunto.nombre_archivo}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              )}
              {isPdf && (
                <iframe
                  src={url}
                  title={adjunto.nombre_archivo}
                  className="w-full h-full min-h-[70vh] bg-white rounded-lg"
                />
              )}
              {!isImg && !isPdf && (
                <div className="text-center bg-white rounded-xl p-8 shadow">
                  <p className="text-gray-600 mb-4">
                    Vista previa no disponible para este tipo de archivo.
                  </p>
                  <button
                    onClick={() => adjuntoService.descargar(adjunto)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
                  >
                    <Download size={16} /> Descargar archivo
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdjuntoViewer;
