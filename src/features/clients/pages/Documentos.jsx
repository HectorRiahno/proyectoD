import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, ClipboardList, Activity, ArrowRight } from 'lucide-react';
import { useDashboardCliente } from '../../../hooks';
import {
  PageHeader, ErrorBanner, LoadingState,
} from '../../../shared/components/ui';

export default function Documentos() {
  const navigate = useNavigate();
  const { counts: full, loading, error } = useDashboardCliente();
  const counts = {
    consultas:    full.consultas,
    diagnosticos: full.diagnosticos,
    signos:       full.signos,
  };

  const docs = [
    { title: 'Historia clínica', description: 'Registro completo de todas tus consultas médicas',     icon: FileText,      tone: 'sky',     count: counts.consultas,    path: '/cliente/historial' },
    { title: 'Diagnósticos',     description: 'Diagnósticos con códigos CIE-10',                      icon: ClipboardList, tone: 'emerald', count: counts.diagnosticos, path: '/cliente/resultados' },
    { title: 'Signos vitales',   description: 'Registros de presión, temperatura, peso, etc.',        icon: Activity,      tone: 'indigo',  count: counts.signos,       path: '/cliente/resultados' },
  ];

  const TONES = {
    sky:     { tint: 'bg-sky-50',     border: 'border-sky-100',     text: 'text-sky-700',     link: 'text-sky-700' },
    emerald: { tint: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', link: 'text-emerald-700' },
    indigo:  { tint: 'bg-indigo-50',  border: 'border-indigo-100',  text: 'text-indigo-700',  link: 'text-indigo-700' },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Mis documentos"
        descripcion="Accede a toda tu información médica"
        eyebrow="Documentos"
        icon={<FileText size={11} strokeWidth={2.25} />}
        variant="sky"
      />

      <ErrorBanner msg={error} />

      {loading ? (
        <LoadingState mensaje="Cargando documentos…" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((d, i) => {
            const Icon = d.icon;
            const t = TONES[d.tone] ?? TONES.sky;
            return (
              <button
                key={i}
                onClick={() => navigate(d.path)}
                className="group text-left rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:border-ink-100 hover:shadow-[0_8px_28px_-14px_rgba(11,18,32,0.18)] transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <span className={`inline-flex w-11 h-11 items-center justify-center rounded-lg border ${t.tint} ${t.border} ${t.text} flex-shrink-0`}>
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-[14px] font-semibold tracking-tight text-ink-900">{d.title}</h3>
                      <span className={`inline-flex text-[11px] px-2 py-0.5 rounded-md font-medium border ${t.tint} ${t.border} ${t.text} tabular-nums`}>
                        {d.count}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-ink-500">{d.description}</p>
                    <p className={`inline-flex items-center gap-1 text-[12px] font-medium mt-3 ${t.link} transition-transform duration-200 group-hover:translate-x-0.5`}>
                      Ver documentos
                      <ArrowRight size={11} strokeWidth={2} />
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-5">
        <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 flex-shrink-0">
          <AlertCircle size={16} strokeWidth={1.75} />
        </span>
        <div className="text-[13px] text-sky-900">
          <p className="font-medium mb-1">Sobre tus documentos médicos</p>
          <p>
            Toda tu información médica está protegida y solo es accesible para ti y el personal médico autorizado.
            Si necesitas una copia física de algún documento, contacta a la administración del centro.
          </p>
        </div>
      </div>
    </div>
  );
}
