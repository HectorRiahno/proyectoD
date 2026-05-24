import React from 'react';
import { AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';

/**
 * Caja de error inline (formularios). Usar cuando el error vive junto
 * a la acción que falló (dentro del modal, debajo de los botones).
 *
 *   {error && <ErrorBox msg={error} />}
 */
export function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {msg}
    </div>
  );
}

/**
 * Banner de error de página completa (arriba del contenido).
 * Soporta botón de cerrar (onDismiss) y botón de reintentar (onRetry).
 *
 *   <ErrorBanner msg={error} onDismiss={() => setError('')} />
 */
export function ErrorBanner({ msg, onDismiss, onRetry }) {
  if (!msg) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
      <AlertCircle size={20} className="flex-shrink-0" />
      <span className="flex-1">{msg}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          <RefreshCw size={14} /> Reintentar
        </button>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600" aria-label="Cerrar">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/**
 * Banner de éxito (verde) — para confirmaciones que cierran tras unos segundos.
 *
 *   {okMsg && <SuccessBanner msg={okMsg} />}
 */
export function SuccessBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3">
      <CheckCircle size={20} className="flex-shrink-0" /> {msg}
    </div>
  );
}

export default ErrorBox;
