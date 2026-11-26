import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus, Clock, Stethoscope, MapPin, AlertCircle, CheckCircle,
} from 'lucide-react';
import { citaService, tipoConsultaService } from '../../../services';
import { useSlotsCita } from '../../../hooks';
import { PageHeader, ErrorBox, LoadingState, AccentButton } from '../../../shared/components/ui';
import { hoyLocalISO, fechaDesdeISO, sumarDiasISO } from '../../../shared/utils/fechas';

// Mismos nombres (sin tildes) que devuelve fn_medicos_agendables en `dias`.
const DIAS_JS    = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DIAS_CORTO = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' };

// Límite de anticipación del autoagendamiento (lo valida la BD en fn_agendar_cita).
const DIAS_ANTICIPACION = 60;
const FECHAS_VISIBLES   = 12;

const CHIP = 'px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all duration-150';
const CHIP_ON  = 'bg-sky-600 border-sky-600 text-white';
const CHIP_OFF = 'bg-white border-line text-ink-800 hover:border-sky-400 hover:bg-sky-50';

// ─── Página: el paciente aparta su propia cita ─────────────────────────────────
//
// Flujo: especialidad → médico → tipo de cita → día (sólo
// los días en que ese médico atiende) → hora (sólo las libres dentro de su
// horario). La disponibilidad y la validación final las hace la BD
// (fn_slots_disponibles / fn_agendar_mi_cita), así que dos personas no pueden
// apartar la misma hora.
//
export default function AgendarCita() {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]);
  const [tipos, setTipos]     = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData]     = useState('');

  const [especialidad, setEspecialidad] = useState('');
  const [idMedico, setIdMedico]         = useState('');
  const [idTipo, setIdTipo]             = useState('');
  const [fecha, setFecha]               = useState('');
  const [hora, setHora]                 = useState('');
  const [motivo, setMotivo]             = useState('');
  const [verMasFechas, setVerMasFechas] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [apartada, setApartada] = useState(null);   // resumen de la cita recién creada

  useEffect(() => {
    Promise.all([citaService.getMedicosAgendables(), tipoConsultaService.getAgendables()])
      .then(([m, t]) => {
        setMedicos(m);
        setTipos(t);
        if (t.length === 1) setIdTipo(String(t[0].id_tipo_consulta));
      })
      .catch(err => setErrorData(err.message ?? 'No se pudo cargar la agenda'))
      .finally(() => setLoadingData(false));
  }, []);

  const especialidades = useMemo(
    () => [...new Set(medicos.map(m => m.especialidad))].sort(),
    [medicos],
  );
  const medicosDeEspecialidad = medicos.filter(m => m.especialidad === especialidad);
  const medico = medicos.find(m => String(m.id_medico) === idMedico) ?? null;
  const tipo   = tipos.find(t => String(t.id_tipo_consulta) === idTipo) ?? null;
  // El paso "Tipo de cita" sólo se muestra si hay más de uno para elegir
  const off    = tipos.length > 1 ? 0 : -1;

  // Próximas fechas en que el médico atiende (según su horario semanal)
  const fechas = useMemo(() => {
    if (!medico) return [];
    const hoy = hoyLocalISO();
    const out = [];
    for (let i = 0; i <= DIAS_ANTICIPACION; i++) {
      const iso = sumarDiasISO(hoy, i);
      if (medico.dias.includes(DIAS_JS[fechaDesdeISO(iso).getDay()])) out.push(iso);
    }
    return out;
  }, [medico]);
  const fechasVisibles = verMasFechas ? fechas : fechas.slice(0, FECHAS_VISIBLES);

  const { slots, loading: loadingSlots, error: errorSlots } = useSlotsCita(idMedico, fecha, idTipo);
  const libres = slots.filter(s => s.disponible);

  // Cada elección invalida las que dependen de ella
  const elegirEspecialidad = (e) => { setEspecialidad(e); setIdMedico(''); setFecha(''); setHora(''); };
  const elegirMedico       = (id) => { setIdMedico(String(id)); setFecha(''); setHora(''); setVerMasFechas(false); };
  const elegirTipo         = (id) => { setIdTipo(id); setHora(''); };
  const elegirFecha        = (f) => { setFecha(f); setHora(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idMedico || !fecha || !hora) {
      setError('Elige médico, día y hora.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await citaService.agendarMiCita({
        id_medico:        Number(idMedico),
        id_tipo_consulta: idTipo ? Number(idTipo) : null,
        fecha, hora, motivo,
      });
      setApartada({ especialidad, medico: medico.nombre, consultorio: medico.consultorio, fecha, hora });
    } catch (err) {
      setError(err.message ?? 'No se pudo agendar la cita');
      // Si otra persona tomó la hora mientras tanto, hay que elegir otra
      if (err.code === 'CONFLICT') setHora('');
    } finally {
      setSaving(false);
    }
  };

  const fechaLarga = (iso) => fechaDesdeISO(iso).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const reiniciar = () => {
    setApartada(null);
    setEspecialidad(''); setIdMedico(''); setFecha(''); setHora(''); setMotivo('');
    setVerMasFechas(false); setError('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Agendar cita"
        descripcion="Elige especialidad, médico, día y hora"
        eyebrow="Citas"
        icon={<CalendarPlus size={11} strokeWidth={2.25} />}
        variant="sky"
      />

      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
        {loadingData ? (
          <LoadingState mensaje="Cargando agenda…" />
        ) : errorData ? (
          <ErrorBox msg={errorData} />
        ) : apartada ? (
          <div className="py-8 text-center max-w-md mx-auto">
            <span className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 mb-4">
              <CheckCircle size={28} strokeWidth={1.75} />
            </span>
            <h2 className="text-[18px] font-semibold tracking-tight text-ink-900">Tu cita quedó apartada</h2>
            <p className="mt-2 text-[13.5px] text-ink-700">
              {apartada.especialidad} con Dr(a). {apartada.medico} — {fechaLarga(apartada.fecha)} a las{' '}
              <strong className="font-semibold">{apartada.hora}</strong>
              {apartada.consultorio ? `, consultorio ${apartada.consultorio}` : ''}.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate('/cliente/citas')}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[13.5px] font-medium transition-colors">
                Ver mis citas
              </button>
              <button onClick={reiniciar}
                className="px-5 py-2.5 bg-white border border-line text-ink-800 rounded-xl hover:bg-surface text-[13.5px] font-medium transition-colors">
                Agendar otra cita
              </button>
            </div>
          </div>
        ) : medicos.length === 0 ? (
          <Aviso titulo="Aún no hay agenda disponible">
            Ningún médico tiene horario de atención configurado. Comunícate con la clínica para agendar tu cita.
          </Aviso>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Especialidad */}
            <Paso n={1} titulo="Especialidad">
              <div className="flex flex-wrap gap-2">
                {especialidades.map(e => (
                  <button key={e} type="button" onClick={() => elegirEspecialidad(e)}
                    className={`${CHIP} ${especialidad === e ? CHIP_ON : CHIP_OFF}`}>
                    {e}
                  </button>
                ))}
              </div>
            </Paso>

            {/* 2. Médico */}
            {especialidad && (
              <Paso n={2} titulo="Médico">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {medicosDeEspecialidad.map(m => {
                    const activo = String(m.id_medico) === idMedico;
                    return (
                      <button key={m.id_medico} type="button" onClick={() => elegirMedico(m.id_medico)}
                        className={`text-left p-3.5 rounded-xl border transition-all duration-150 ${
                          activo ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-500/20' : 'border-line bg-white hover:border-sky-300'
                        }`}>
                        <div className="flex items-start gap-3">
                          <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-sky-50 border border-sky-100 text-sky-700 flex-shrink-0">
                            <Stethoscope size={15} strokeWidth={1.75} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-semibold text-ink-900 truncate">Dr(a). {m.nombre}</p>
                            {m.consultorio && (
                              <p className="text-[11.5px] text-ink-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={11} strokeWidth={1.75} /> Consultorio {m.consultorio}
                              </p>
                            )}
                            <p className="text-[11.5px] text-sky-700 font-medium mt-1">
                              Atiende: {m.dias.map(d => DIAS_CORTO[d] ?? d).join(' · ')}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Paso>
            )}

            {/* 3. Tipo de cita */}
            {medico && tipos.length > 1 && (
              <Paso n={3} titulo="Tipo de cita">
                <select value={idTipo} onChange={e => elegirTipo(e.target.value)} required
                  className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all">
                  <option value="">— Selecciona —</option>
                  {tipos.map(t => (
                    <option key={t.id_tipo_consulta} value={t.id_tipo_consulta}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                {tipo?.descripcion && <p className="mt-1.5 text-[12px] text-ink-500">{tipo.descripcion}</p>}
              </Paso>
            )}

            {/* 4. Día */}
            {medico && (idTipo || tipos.length === 0) && (
              <Paso n={4 + off} titulo="Día">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {fechasVisibles.map(f => {
                    const d = fechaDesdeISO(f);
                    const activa = f === fecha;
                    return (
                      <button key={f} type="button" onClick={() => elegirFecha(f)}
                        className={`py-2.5 rounded-xl border text-center transition-all duration-150 ${activa ? CHIP_ON : CHIP_OFF}`}>
                        <p className={`text-[10.5px] uppercase tracking-[0.08em] ${activa ? 'text-white/80' : 'text-ink-500'}`}>
                          {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                        </p>
                        <p className="text-[17px] font-semibold tabular-nums leading-tight">{d.getDate()}</p>
                        <p className={`text-[10.5px] ${activa ? 'text-white/80' : 'text-ink-500'}`}>
                          {d.toLocaleDateString('es-ES', { month: 'short' })}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {!verMasFechas && fechas.length > FECHAS_VISIBLES && (
                  <button type="button" onClick={() => setVerMasFechas(true)}
                    className="mt-2.5 text-[12.5px] font-medium text-sky-700 hover:text-sky-800">
                    Ver más fechas
                  </button>
                )}
              </Paso>
            )}

            {/* 5. Hora */}
            {fecha && (
              <Paso n={5 + off} titulo={`Hora · ${fechaLarga(fecha)}`}>
                {loadingSlots ? (
                  <p className="text-[13px] text-ink-500">Verificando disponibilidad…</p>
                ) : errorSlots ? (
                  <ErrorBox msg={errorSlots} />
                ) : libres.length === 0 ? (
                  <Aviso titulo="Sin horas libres ese día">Prueba con otro día u otro médico.</Aviso>
                ) : (
                  <>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {slots.map(({ hora: h, disponible }) => (
                        <button key={h} type="button" disabled={!disponible} onClick={() => setHora(h)}
                          title={disponible ? `Elegir ${h}` : `${h} no disponible`}
                          className={[
                            'py-2.5 rounded-lg text-[13px] font-mono font-medium tabular-nums border transition-all duration-150',
                            !disponible
                              ? 'bg-surface border-line text-ink-300 cursor-not-allowed line-through'
                              : h === hora ? CHIP_ON : CHIP_OFF,
                          ].join(' ')}>
                          {h}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[11.5px] text-ink-500 flex items-center gap-1.5">
                      <Clock size={11} strokeWidth={1.75} />
                      {libres.length} horas libres
                    </p>
                  </>
                )}
              </Paso>
            )}

            {/* 6. Motivo + resumen */}
            {hora && (
              <>
                <Paso n={6 + off} titulo="Motivo de la consulta (opcional)">
                  <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} maxLength={300}
                    placeholder="Cuéntale al médico brevemente por qué consultas"
                    className="w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all" />
                </Paso>

                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 flex items-start gap-3">
                  <CheckCircle size={18} className="text-sky-600 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="text-[13px] text-sky-900">
                    <p className="font-semibold">Vas a apartar esta cita</p>
                    <p className="mt-0.5">
                      {especialidad} con Dr(a). {medico.nombre} — {fechaLarga(fecha)} a las <strong className="font-semibold">{hora}</strong>
                      {medico.consultorio ? `, consultorio ${medico.consultorio}` : ''}.
                    </p>
                  </div>
                </div>
              </>
            )}

            {error && <ErrorBox msg={error} />}
            <div className="flex justify-end pt-5 border-t border-line">
              <AccentButton variant="sky" icon={CalendarPlus} type="submit" disabled={!hora || saving}>
                {saving ? 'Apartando…' : 'Apartar cita'}
              </AccentButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Paso({ n, titulo, children }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink-900 mb-2.5">
        <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-sky-600 text-white text-[11px] font-semibold tabular-nums">{n}</span>
        <span className="first-letter:uppercase">{titulo}</span>
      </h3>
      {children}
    </section>
  );
}

function Aviso({ titulo, children }) {
  return (
    <div className="flex items-start gap-2.5 text-[13px] text-amber-800 bg-amber-50/70 border-l-2 border-amber-500 pl-3 pr-3 py-3 rounded-r-md">
      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
      <div>
        <p className="font-medium">{titulo}</p>
        <p className="mt-0.5 text-amber-700">{children}</p>
      </div>
    </div>
  );
}
