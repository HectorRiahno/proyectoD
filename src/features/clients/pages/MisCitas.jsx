import React, { useState } from 'react';
import { Calendar, Stethoscope, MapPin, FileText } from 'lucide-react';
import { useCitas } from '../../../hooks';
import {
  PageHeader, KPI, ErrorBanner, EmptyState, LoadingState,
  TabPills, EstadoBadge,
} from '../../../shared/components/ui';

const FILTROS = [
  { value: 'todas',    label: 'Todas' },
  { value: 'proximas', label: 'Próximas' },
  { value: 'pasadas',  label: 'Pasadas' },
];

export default function MisCitas() {
  const { citas, loading, error } = useCitas({ role: 'cliente' });
  const [filtro, setFiltro] = useState('todas');

  const hoy = new Date().toISOString().split('T')[0];
  // Una cita es "próxima" solo si su estado sigue abierto (programada / confirmada / en_curso)
  // y su fecha es de hoy en adelante. Si ya fue completada/cancelada/no_asistio cuenta como
  // pasada aunque su fecha sea futura — son citas históricas.
  const estaAbierta = (estado) => ['programada', 'confirmada', 'en_curso'].includes(estado);
  const esProxima = (c) => c.fecha >= hoy && estaAbierta(c.estado);

  const filtered = citas.filter((c) => {
    if (filtro === 'proximas') return esProxima(c);
    if (filtro === 'pasadas')  return !esProxima(c);
    return true;
  });

  const counts = {
    todas:    citas.length,
    proximas: citas.filter(esProxima).length,
    pasadas:  citas.filter((c) => !esProxima(c)).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Mis citas"
        descripcion="Tu agenda médica"
        eyebrow="Citas"
        icon={<Calendar size={11} strokeWidth={2.25} />}
        variant="sky"
      >
        <KPI label="Total" value={loading ? '···' : citas.length} color="text-sky-700" />
      </PageHeader>

      <ErrorBanner msg={error} />

      <TabPills
        value={filtro}
        onChange={setFiltro}
        accent="sky"
        options={FILTROS.map(f => ({ ...f, count: counts[f.value] }))}
      />

      {loading ? (
        <LoadingState mensaje="Cargando citas…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          titulo={`No tienes citas ${filtro !== 'todas' ? filtro : 'registradas'}`}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <article
              key={c.id_cita}
              className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:border-ink-100 hover:shadow-[0_8px_28px_-14px_rgba(11,18,32,0.18)] transition-all duration-200 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="bg-gradient-to-br from-sky-500 to-sky-700 text-white p-5 flex flex-col items-center justify-center min-w-[120px] sm:rounded-l-2xl">
                  <Calendar size={14} className="mb-1.5 opacity-80" strokeWidth={1.75} />
                  <p className="text-[11px] uppercase tracking-[0.10em] opacity-80">
                    {new Date(c.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-[20px] font-semibold tabular-nums mt-1">{c.hora?.slice(0, 5)}</p>
                </div>

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex w-10 h-10 items-center justify-center rounded-lg bg-sky-50 border border-sky-100 text-sky-700 flex-shrink-0">
                        <Stethoscope size={16} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold tracking-tight text-ink-900 truncate">{c.medico_nombre ?? 'Médico asignado'}</p>
                        <p className="text-[12px] text-ink-500 truncate">{c.medico_especialidad ?? 'Consulta general'}</p>
                      </div>
                    </div>
                    <EstadoBadge type="cita" estado={c.estado} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12.5px]">
                    {c.tipo_consulta && (
                      <div className="flex items-center gap-1.5 text-ink-700">
                        <FileText size={12} className="text-sky-600 flex-shrink-0" strokeWidth={1.75} />
                        {c.tipo_consulta}
                      </div>
                    )}
                    {c.medico_consultorio && (
                      <div className="flex items-center gap-1.5 text-ink-700">
                        <MapPin size={12} className="text-sky-600 flex-shrink-0" strokeWidth={1.75} />
                        Consultorio {c.medico_consultorio}
                      </div>
                    )}
                  </div>

                  {c.motivo && (
                    <div className="mt-3 rounded-lg border border-line bg-surface/60 px-3 py-2">
                      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500 mb-0.5">Motivo</p>
                      <p className="text-[12.5px] text-ink-800">{c.motivo}</p>
                    </div>
                  )}

                  {c.observaciones && (
                    <div className="mt-2 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2">
                      <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-sky-700 mb-0.5">Observaciones</p>
                      <p className="text-[12.5px] text-sky-900">{c.observaciones}</p>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
