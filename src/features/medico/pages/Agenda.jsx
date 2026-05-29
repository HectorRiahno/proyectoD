import React from 'react';
import { CalendarClock, Clock, Phone, Mail } from 'lucide-react';
import { useAgendaHoyMedico } from '../../../hooks';
import {
  PageHeader, KPI, ErrorBanner, EmptyState, LoadingState,
  EstadoBadge, Avatar,
} from '../../../shared/components/ui';

export default function Agenda() {
  const { citas, loading, error } = useAgendaHoyMedico();

  const hoyFmt = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Agenda de hoy"
        descripcion={hoyFmt}
        eyebrow="Agenda"
        icon={<CalendarClock size={11} strokeWidth={2.25} />}
        variant="teal"
      >
        <KPI label="Citas" value={loading ? '···' : citas.length} color="text-teal-700" />
      </PageHeader>

      <ErrorBanner msg={error} />

      {loading ? (
        <LoadingState mensaje="Cargando agenda…" />
      ) : citas.length === 0 ? (
        <EmptyState icon={CalendarClock} titulo="No tienes citas programadas para hoy" />
      ) : (
        <div className="space-y-3">
          {citas.map((c) => (
            <article
              key={c.id_cita}
              className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:border-ink-100 hover:shadow-[0_8px_28px_-14px_rgba(11,18,32,0.18)] transition-all duration-200 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Hora destacada */}
                <div className="bg-gradient-to-br from-teal-500 to-teal-700 text-white p-5 flex flex-col items-center justify-center min-w-[120px] sm:rounded-l-2xl">
                  <Clock size={16} className="mb-1 opacity-80" strokeWidth={1.75} />
                  <p className="text-[22px] font-semibold tabular-nums leading-none">
                    {c.hora?.slice(0, 5)}
                  </p>
                  <p className="text-[11px] opacity-80 mt-1.5 uppercase tracking-[0.10em]">
                    {c.tipo_consulta ?? 'Consulta'}
                  </p>
                </div>

                {/* Datos del paciente */}
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={c.paciente_nombre} tone="teal" />
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold tracking-tight text-ink-900">
                          {c.paciente_nombre ?? '—'}
                        </p>
                        <p className="text-[12px] text-ink-500 mt-0.5">
                          Doc {c.paciente_documento ?? '—'}
                          {c.paciente_edad != null && ` · ${c.paciente_edad} años`}
                          {c.numero_historia && (
                            <>
                              <span className="mx-1.5 text-ink-300">·</span>
                              <span className="font-mono text-ink-700">HC {c.numero_historia}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <EstadoBadge type="cita" estado={c.estado} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[12.5px]">
                    {c.motivo && (
                      <div className="sm:col-span-3 rounded-lg border border-line bg-surface/60 px-3 py-2">
                        <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500 mb-0.5">Motivo</p>
                        <p className="text-ink-800">{c.motivo}</p>
                      </div>
                    )}
                    {c.paciente_telefono && (
                      <div className="flex items-center gap-2 text-ink-700">
                        <Phone size={12} className="text-teal-600 flex-shrink-0" strokeWidth={1.75} />
                        {c.paciente_telefono}
                      </div>
                    )}
                    {c.paciente_email && (
                      <div className="flex items-center gap-2 text-ink-700 sm:col-span-2 truncate">
                        <Mail size={12} className="text-teal-600 flex-shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{c.paciente_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
