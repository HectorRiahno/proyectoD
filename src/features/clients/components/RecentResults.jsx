import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { IconButton, ActionGroup } from '../../../shared/components/ui';

const results = [
  { id: 1, tipo: 'Análisis de sangre',      fecha: '20 Oct 2024', medico: 'Dra. María González' },
  { id: 2, tipo: 'Radiografía de tórax',    fecha: '18 Oct 2024', medico: 'Dr. Juan Martínez' },
  { id: 3, tipo: 'Electrocardiograma',      fecha: '15 Oct 2024', medico: 'Dra. María González' },
];

export default function RecentResults() {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-[16px] font-semibold tracking-tight text-ink-900">Resultados recientes</h2>
        <button className="text-[12.5px] font-medium text-brand-600 hover:text-brand-700 transition-colors">
          Ver todos
        </button>
      </div>

      <ul className="space-y-2">
        {results.map(r => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-line hover:border-ink-100 hover:bg-surface/60 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex-shrink-0">
                <FileText size={15} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[13.5px] font-medium text-ink-900 truncate">{r.tipo}</h3>
                <p className="text-[11.5px] text-ink-500 truncate">{r.fecha} · {r.medico}</p>
              </div>
            </div>
            <ActionGroup>
              <IconButton icon={Eye}      tone="brand" title="Ver" />
              <IconButton icon={Download} tone="ink"   title="Descargar" />
            </ActionGroup>
          </li>
        ))}
      </ul>
    </section>
  );
}
