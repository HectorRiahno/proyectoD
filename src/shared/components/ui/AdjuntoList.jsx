import React, { useState } from 'react';
import {
  Paperclip, FileText, Image as ImageIcon, Download, Eye, Trash2, Loader2, AlertCircle,
} from 'lucide-react';
import { adjuntoService } from '../../../services';

const fmtSize = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const fmtFecha = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'short', timeStyle: 'short',
  });
};

/**
 * Lista de adjuntos con botones de ver/descargar/eliminar.
 *
 *   <AdjuntoList
 *     adjuntos={adjuntos}
 *     onPreview={setVisor}           // recibe el adjunto a previsualizar
 *     onDelete={eliminar}            // opcional: si se pasa, muestra el ícono trash
 *     loading={loading}
 *     emptyMessage="Sin adjuntos en esta consulta"
 *   />
 *
 * Si `onDelete` se omite, no se muestra el botón (caso paciente, solo descarga).
 */
export function AdjuntoList({ adjuntos = [], loading = false, onPreview, onDelete, emptyMessage }) {
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');

  const handleDescargar = async (adjunto) => {
    setDownloading(adjunto.id_adjunto);
    setError('');
    try {
      await adjuntoService.descargar(adjunto);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-500">
        <Loader2 size={18} className="animate-spin mr-2" /> Cargando adjuntos...
      </div>
    );
  }

  if (adjuntos.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic py-2">
        {emptyMessage ?? 'Sin adjuntos'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-xs flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {adjuntos.map(a => {
        const isImg = a.tipo_mime?.startsWith('image/');
        const Icon  = isImg ? ImageIcon : FileText;
        const colorIcon = isImg ? 'text-purple-600' : 'text-red-600';

        return (
          <div
            key={a.id_adjunto}
            className="flex items-start gap-3 p-2.5 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition"
          >
            <Icon size={20} className={`flex-shrink-0 mt-0.5 ${colorIcon}`} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate" title={a.nombre_archivo}>
                {a.nombre_archivo}
              </p>
              <p className="text-xs text-gray-500">
                {fmtSize(a.tamanio_bytes)} · {fmtFecha(a.fecha_subida)}
              </p>
              {a.descripcion && (
                <p className="text-xs text-gray-600 italic mt-0.5">{a.descripcion}</p>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {onPreview && (
                <button
                  onClick={() => onPreview(a)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Previsualizar"
                >
                  <Eye size={15} />
                </button>
              )}
              <button
                onClick={() => handleDescargar(a)}
                disabled={downloading === a.id_adjunto}
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-60"
                title="Descargar"
              >
                {downloading === a.id_adjunto
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Download size={15} />}
              </button>
              {onDelete && (
                <button
                  onClick={() => onDelete(a)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Versión "agrupada por consulta" — útil cuando se listan adjuntos de TODAS
 * las consultas de un paciente. Cada grupo es un panel pequeño.
 */
export function AdjuntoListPorConsulta({ adjuntos = [], onPreview }) {
  // Agrupar por id_consulta
  const grupos = {};
  for (const a of adjuntos) {
    const key = a.id_consulta;
    (grupos[key] ??= { items: [], info: a }).items.push(a);
  }

  const orden = Object.values(grupos).sort((a, b) => {
    const fa = a.info.fecha_consulta ?? '';
    const fb = b.info.fecha_consulta ?? '';
    return fb.localeCompare(fa);
  });

  if (orden.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic flex items-center gap-2">
        <Paperclip size={12} /> Sin adjuntos en consultas previas
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {orden.map(({ items, info }) => (
        <div key={info.id_consulta} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-700 mb-2">
            Consulta del {fmtFecha(info.fecha_consulta)}
            {info.motivo_consulta && <span className="text-gray-500 font-normal"> · {info.motivo_consulta}</span>}
          </p>
          <AdjuntoList adjuntos={items} onPreview={onPreview} />
        </div>
      ))}
    </div>
  );
}

export default AdjuntoList;
