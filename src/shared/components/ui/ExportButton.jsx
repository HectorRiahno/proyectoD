import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';

/**
 * Botón dropdown para exportar un reporte a PDF o Excel.
 *
 *   <ExportButton
 *     disabled={!data}
 *     onPdf={() => exportarReportePacientesPdf(data)}
 *     onExcel={() => exportarReportePacientesExcel(data)}
 *   />
 *
 * Soporta async — muestra spinner mientras se genera el archivo.
 */
export function ExportButton({ onPdf, onExcel, disabled = false, label = 'Exportar' }) {
  const [open, setOpen]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handle = async (fn) => {
    setBusy(true);
    setError('');
    setOpen(false);
    try {
      await fn();
    } catch (err) {
      setError(err.message ?? 'Error al exportar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && !busy && setOpen(o => !o)}
        disabled={disabled || busy}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy
          ? <Loader2 size={16} className="animate-spin" />
          : <Download size={16} />}
        {label}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
          {onPdf && (
            <button
              onClick={() => handle(onPdf)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <FileText size={16} className="text-red-600" /> Exportar como PDF
            </button>
          )}
          {onExcel && (
            <button
              onClick={() => handle(onExcel)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-100"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" /> Exportar como Excel
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="absolute right-0 mt-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded">
          {error}
        </p>
      )}
    </div>
  );
}

export default ExportButton;
