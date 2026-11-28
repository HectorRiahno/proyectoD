import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarPlus, Stethoscope, MapPin, FileText, XCircle } from 'lucide-react';
import { useCitas, useDatosTeleconsulta } from '../../../hooks';
import { BotonTeleconsulta, EtiquetaTeleconsulta } from '../../../shared/components/Teleconsulta';
import { citaService } from '../../../services';
import {
  PageHeader, KPI, ErrorBanner, SuccessBanner, EmptyState, LoadingState,
  TabPills, EstadoBadge, AccentButton, Modal, ErrorBox, BotonesForm,
} from '../../../shared/components/ui';
import { hoyLocalISO, fechaDesdeISO, yaLlegoLocal } from '../../../shared/utils/fechas';

const FILTROS = [
  { value: 'todas',    label: 'Todas' },
  { value: 'proximas', label: 'Próximas' },
  { value: 'pasadas',  label: 'Pasadas' },
];

export default function MisCitas() {
  const { citas, loading, error, reload } = useCitas({ role: 'cliente' });
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('todas');
  const [cancelando, setCancelando] = useState(null);
  const [aviso, setAviso]           = useState('');
  const tele = useDatosTeleconsulta(citas);

  const hoy = hoyLocalISO();
  // Una cita es "próxima" solo si su estado sigue abierto (programada / confirmada / en_curso)
  // y su fecha es de hoy en adelante. Si ya fue completada/cancelada/no_asistio cuenta como
  // pasada aunque su fecha sea futura — son citas históricas.
  const estaAbierta = (estado) => ['programada', 'confirmada', 'en_curso'].includes(estado);
  const esProxima = (c) => c.fecha >= hoy && estaAbierta(c.estado);
  // El paciente puede cancelar mientras la cita no haya empezado
  // (la BD lo valida en fn_cancelar_cita).
  const puedeCancelar = (c) =>
    ['programada', 'confirmada'].includes(c.estado) && !yaLlegoLocal(c.fecha, c.hora);

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
      {aviso && <SuccessBanner msg={aviso} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabPills
          value={filtro}
          onChange={setFiltro}
          accent="sky"
          options={FILTROS.map(f => ({ ...f, count: counts[f.value] }))}
        />
        <AccentButton variant="sky" icon={CalendarPlus} onClick={() => navigate('/cliente/agendar')}>
          Agendar cita
        </AccentButton>
      </div>

      {loading ? (
        <LoadingState mensaje="Cargando citas…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          titulo={`No tienes citas ${filtro !== 'todas' ? filtro : 'registradas'}`}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const enlace = tele[c.id_cita]?.enlace_teleconsulta;
            return (
            <article
              key={c.id_cita}
              className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] hover:border-ink-100 hover:shadow-[0_8px_28px_-14px_rgba(11,18,32,0.18)] transition-all duration-200 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="bg-gradient-to-br from-sky-500 to-sky-700 text-white p-5 flex flex-col items-center justify-center min-w-[120px] sm:rounded-l-2xl">
                  <Calendar size={14} className="mb-1.5 opacity-80" strokeWidth={1.75} />
                  <p className="text-[11px] uppercase tracking-[0.10em] opacity-80">
                    {fechaDesdeISO(c.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
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
                    {enlace ? (
                      <div><EtiquetaTeleconsulta /></div>
                    ) : c.medico_consultorio && (
                      <div className="flex items-center gap-1.5 text-ink-700">
                        <MapPin size={12} className="text-sky-600 flex-shrink-0" strokeWidth={1.75} />
                        Consultorio {c.medico_consultorio}
                      </div>
                    )}
                  </div>

                  {enlace && estaAbierta(c.estado) && (
                    <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-[12px] text-violet-900">
                        Entra unos minutos antes y permite el uso de cámara y micrófono.
                      </p>
                      <BotonTeleconsulta enlace={enlace} />
                    </div>
                  )}

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

                  {puedeCancelar(c) && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => { setAviso(''); setCancelando(c); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors"
                      >
                        <XCircle size={13} strokeWidth={1.75} /> Cancelar cita
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
            );
          })}
        </div>
      )}

      {cancelando && (
        <ModalCancelar
          cita={cancelando}
          onClose={() => setCancelando(null)}
          onDone={() => { setAviso('La cita fue cancelada.'); reload({ silencioso: true }); }}
        />
      )}
    </div>
  );
}

// ─── Modal: cancelar una cita propia ──────────────────────────────────────────
function ModalCancelar({ cita, onClose, onDone }) {
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await citaService.cancelar(cita.id_cita, motivo.trim());
      onDone();
      onClose();
    } catch (err) {
      setError(err.message ?? 'No se pudo cancelar la cita');
    } finally {
      setSaving(false);
    }
  };

  const cuando = `${fechaDesdeISO(cita.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${cita.hora?.slice(0, 5)}`;

  return (
    <Modal titulo="Cancelar cita" subtitulo={`${cita.medico_nombre ?? 'Médico'} · ${cuando}`} variant="red" size="sm" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-ink-700 mb-1.5">Motivo de la cancelación *</label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            required
            rows={3}
            maxLength={300}
            placeholder="Ej: no puedo asistir ese día"
            className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
          />
          <p className="mt-1.5 text-[12px] text-ink-500">La hora quedará libre para otro paciente.</p>
        </div>
        {error && <ErrorBox msg={error} />}
        <BotonesForm onCancel={onClose} saving={saving} labelSave="Cancelar cita" labelCancel="Volver" variant="red" disabled={!motivo.trim()} />
      </form>
    </Modal>
  );
}
