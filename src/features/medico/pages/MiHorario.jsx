import React from 'react';
import { Clock, CalendarDays, Info } from 'lucide-react';
import { useMiHorarioMedico } from '../../../hooks';
import {
  PageHeader, KPI, ErrorBanner, EmptyState, LoadingState,
} from '../../../shared/components/ui';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
// getDay(): 0 = domingo → índice en DIAS_SEMANA
const DIA_HOY = DIAS_SEMANA[(new Date().getDay() + 6) % 7];

const normalizar = (s) =>
  String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const fmtTime = (t) => (t ? t.slice(0, 5) : '—');
const minutos = (t) => {
  const [h, m] = (t ?? '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};
const fmtDuracion = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

export default function MiHorario() {
  const { horarios, loading, error } = useMiHorarioMedico();

  // La BD puede tener 'Miércoles' o 'miercoles': se agrupa normalizado.
  const porDia = DIAS_SEMANA.reduce((acc, dia) => {
    acc[dia] = horarios
      .filter(h => normalizar(h.dia_semana) === normalizar(dia))
      .sort((a, b) => minutos(a.hora_inicio) - minutos(b.hora_inicio));
    return acc;
  }, {});

  const activas = horarios.filter(h => h.disponible !== false);
  const diasAtencion = DIAS_SEMANA.filter(d => porDia[d].some(h => h.disponible !== false)).length;
  const minutosSemana = activas.reduce((t, h) => t + minutos(h.hora_fin) - minutos(h.hora_inicio), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Mi horario"
        descripcion="Franjas de atención que te asignó la administración"
        eyebrow="Horario"
        icon={<Clock size={11} strokeWidth={2.25} />}
        variant="teal"
      >
        <KPI label="Días de atención" value={loading ? '···' : diasAtencion} color="text-teal-700" />
        <KPI label="Horas / semana"   value={loading ? '···' : fmtDuracion(minutosSemana)} />
      </PageHeader>

      <ErrorBanner msg={error} />

      {loading ? (
        <LoadingState mensaje="Cargando horario…" />
      ) : horarios.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          titulo="Aún no tienes horario asignado"
          descripcion="Pide a la administración que configure tus franjas de atención."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {DIAS_SEMANA.map(dia => {
              const franjas = porDia[dia];
              const esHoy = dia === DIA_HOY;
              return (
                <section
                  key={dia}
                  className={[
                    'rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(11,18,32,0.04)]',
                    esHoy ? 'border-teal-300 ring-4 ring-teal-500/10' : 'border-line',
                  ].join(' ')}
                >
                  <header className="flex items-center justify-between gap-2 mb-3">
                    <h2 className="text-[14px] font-semibold tracking-tight text-ink-900">{dia}</h2>
                    {esHoy && (
                      <span className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-teal-700 bg-teal-50 border border-teal-100 rounded-md px-1.5 py-0.5">
                        Hoy
                      </span>
                    )}
                  </header>

                  {franjas.length === 0 ? (
                    <p className="text-[12.5px] text-ink-300">Sin atención</p>
                  ) : (
                    <ul className="space-y-2">
                      {franjas.map(h => {
                        const pausada = h.disponible === false;
                        return (
                          <li
                            key={h.id_horario}
                            className={[
                              'rounded-lg border px-3 py-2',
                              pausada ? 'bg-surface border-line' : 'bg-teal-50/60 border-teal-100',
                            ].join(' ')}
                          >
                            <p className={`text-[13px] font-mono font-medium tabular-nums ${pausada ? 'text-ink-500 line-through' : 'text-teal-900'}`}>
                              {fmtTime(h.hora_inicio)} – {fmtTime(h.hora_fin)}
                            </p>
                            <p className="text-[11px] text-ink-500 mt-0.5">
                              {pausada ? 'Pausada (no se agendan citas)' : fmtDuracion(minutos(h.hora_fin) - minutos(h.hora_inicio))}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <p className="flex items-start gap-2 text-[12px] text-ink-500">
            <Info size={13} className="flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            Las citas sólo se pueden agendar dentro de estas franjas. Para cambiarlas, contacta a la administración.
          </p>
        </>
      )}
    </div>
  );
}
