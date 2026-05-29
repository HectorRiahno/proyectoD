import React from 'react';
import { AlertCircle, CheckCircle2, X, RefreshCw } from 'lucide-react';

/* =====================================================================
   Feedback banners — refinados con barra-acento lateral en lugar de
   "caja completa de color" saturada. Mantienen las APIs anteriores.
   ===================================================================== */

/** Caja de error inline para formularios. */
export function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 text-[13px] text-red-700 bg-red-50/70 border-l-2 border-red-500 pl-3 pr-3 py-2.5 rounded-r-md motion-safe:[animation:hp-fade-up_0.25s_ease-out]"
    >
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
      <span>{msg}</span>
    </div>
  );
}

/** Banner de página completa. Soporta dismiss y retry. */
export function ErrorBanner({ msg, onDismiss, onRetry }) {
  if (!msg) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 text-[13px] text-red-700 bg-red-50/70 border-l-2 border-red-500 pl-3 pr-3 py-3 rounded-r-md"
    >
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
      <span className="flex-1">{msg}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[12px] font-medium transition-colors"
        >
          <RefreshCw size={12} strokeWidth={2} /> Reintentar
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-700 p-0.5 rounded transition-colors"
          aria-label="Cerrar"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

/** Banner de éxito. */
export function SuccessBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="flex items-start gap-2.5 text-[13px] text-emerald-800 bg-emerald-50/70 border-l-2 border-emerald-500 pl-3 pr-3 py-3 rounded-r-md motion-safe:[animation:hp-fade-up_0.25s_ease-out]">
      <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5 text-emerald-600" strokeWidth={2} />
      <span>{msg}</span>
    </div>
  );
}

export default ErrorBox;
