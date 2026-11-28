import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, AlertCircle, Loader2, User, Stethoscope,
  CheckCircle, FileText,
} from 'lucide-react';
import { citaService, tipoConsultaService, pacienteService } from '../../../services';
import { OpcionWhatsapp } from '../../../shared/components/Teleconsulta';
import { telefonoWhatsappValido } from '../../../shared/utils/whatsapp';
import { usePacientesCatalogo, useMedicosActivos, useSlotsCita } from '../../../hooks';
import { Modal, ErrorBox, BotonesForm, ComboBuscador, estadoLabel } from '../../../shared/components/ui';
import { hoyLocalISO, fechaDesdeISO } from '../../../shared/utils/fechas';

const INPUT_CLS = 'w-full px-3.5 py-2.5 text-[13.5px] bg-white border border-line rounded-xl text-ink-900 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all';

// ─── Modal: Agendar cita ──────────────────────────────────────────────────────
//
// Flujo: paciente → tipo de consulta → médico → fecha →
// "Elegir hora". La disponibilidad y la validación final las hace la BD
// (fn_slots_disponibles / fn_agendar_cita), así que dos agendamientos
// simultáneos no pueden tomar el mismo horario.
//
export default function AgendarCitaModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    id_paciente: '', id_medico: '', id_tipo_consulta: '',
    fecha: '', hora: '', estado: 'programada', motivo: '', observaciones: '',
  });
  const { pacientes } = usePacientesCatalogo();
  const { medicos }   = useMedicosActivos();
  const [tiposConsulta, setTiposConsulta] = useState([]);
  const [loadingData, setLoadingData]     = useState(true);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  // Avisos por WhatsApp (confirmación, recordatorios y enlace de teleconsulta)
  const [whatsapp, setWhatsapp]   = useState(false);
  const [telefonoWa, setTelefonoWa] = useState('');
  const [aviso, setAviso]         = useState('');

  const { slots, loading: loadingSlots, error: errorSlots } =
    useSlotsCita(form.id_medico, form.fecha, form.id_tipo_consulta);

  useEffect(() => {
    tipoConsultaService.getAgendables()
      .then(setTiposConsulta)
      .catch(() => setTiposConsulta([]))
      .finally(() => setLoadingData(false));
  }, []);

  // Cambiar médico, fecha o tipo invalida la hora elegida.
  const setCampo = (name, value) => setForm(p => ({
    ...p,
    [name]: value,
    ...(['id_medico', 'fecha', 'id_tipo_consulta'].includes(name) ? { hora: '' } : {}),
  }));
  const handleChange = e => setCampo(e.target.name, e.target.value);

  // Al elegir paciente, proponer su teléfono registrado para WhatsApp.
  useEffect(() => {
    if (!form.id_paciente) return;
    let vigente = true;
    pacienteService.getById(form.id_paciente)
      .then(p => {
        if (!vigente) return;
        const tel = p?.telefono ?? '';
        setTelefonoWa(tel);
        setWhatsapp(telefonoWhatsappValido(tel));
      })
      .catch(() => {});
    return () => { vigente = false; };
  }, [form.id_paciente]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.id_paciente || !form.id_medico || !form.fecha || !form.hora) {
      setError('Completa paciente, médico, fecha y hora.');
      return;
    }
    if (whatsapp && !telefonoWhatsappValido(telefonoWa)) {
      setError('Revisa el número de WhatsApp o desmarca los avisos por WhatsApp.');
      return;
    }
    setSaving(true);
    setError('');
    let idCita;
    try {
      idCita = await citaService.crear({
        id_paciente:      Number(form.id_paciente),
        id_medico:        Number(form.id_medico),
        id_tipo_consulta: form.id_tipo_consulta ? Number(form.id_tipo_consulta) : null,
        fecha:            form.fecha,
        hora:             form.hora,
        estado:           form.estado,
        motivo:           form.motivo,
        observaciones:    form.observaciones,
      });
    } catch (err) {
      console.error('[AgendarCitaModal]', err);
      // Si alguien tomó el slot entretanto, se limpia la hora para que se re-elija.
      if (err.code === 'CONFLICT') setForm(p => ({ ...p, hora: '' }));
      setError(err.message ?? 'Error al agendar la cita');
      setSaving(false);
      return;
    }

    // La cita ya existe: un problema con WhatsApp no la deshace.
    if (whatsapp) {
      try {
        await citaService.configurarWhatsapp(idCita, telefonoWa, true);
        citaService.notificarWhatsapp(idCita);       // sin esperar
      } catch (err) {
        setSaving(false);
        onSaved?.();
        setAviso(`La cita quedó agendada, pero no se activaron los avisos por WhatsApp: ${err.message}`);
        return;
      }
    }
    setSaving(false);
    onSaved?.();
    onClose();
  };

  const opcionesPaciente = pacientes.map(p => ({
    value: p.id_paciente, label: p.nombre_completo, detalle: p.documento,
  }));
  const opcionesMedico = medicos.map(m => ({
    value: m.id_medico, label: `Dr(a). ${m.nombre_completo}`, detalle: m.especialidad ?? 'General',
  }));

  const medicoSel = medicos.find(m => String(m.id_medico) === String(form.id_medico)) ?? null;
  const tipoSel   = tiposConsulta.find(t => String(t.id_tipo_consulta) === String(form.id_tipo_consulta)) ?? null;
  const esTele    = !!tipoSel?.es_teleconsulta;

  if (loadingData) {
    return (
      <Modal titulo="Nueva cita" onClose={onClose}>
        <div className="py-12 text-center">
          <Loader2 size={24} className="mx-auto mb-2 animate-spin text-brand-600" strokeWidth={1.75} />
          <p className="text-[13px] text-ink-500">Cargando datos…</p>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal titulo="Nueva cita" subtitulo="Agendar una cita médica" onClose={onClose} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Paciente */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-ink-500" /> Paciente *
            </label>
            <ComboBuscador
              opciones={opcionesPaciente}
              value={form.id_paciente}
              onChange={v => setCampo('id_paciente', v)}
              placeholder="Buscar por nombre o documento…"
              vacio="Ningún paciente coincide"
            />
            {pacientes.length === 0 && (
              <p className="text-[11.5px] text-amber-700 mt-1.5">No hay pacientes registrados aún.</p>
            )}
          </div>

          {/* Tipo de cita (su duración, interna, define el espacio que reserva) */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-ink-500" /> Tipo de cita *
            </label>
            <select name="id_tipo_consulta" value={form.id_tipo_consulta} onChange={handleChange} required className={INPUT_CLS}>
              <option value="">— Selecciona —</option>
              {tiposConsulta.map(t => (
                <option key={t.id_tipo_consulta} value={t.id_tipo_consulta}>
                  {t.nombre}
                </option>
              ))}
            </select>
            {esTele && (
              <p className="text-[11.5px] text-violet-700 mt-1.5">
                Videollamada: el sistema crea el enlace automáticamente al agendar.
              </p>
            )}
          </div>

          {/* Médico */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
              <Stethoscope size={14} className="text-ink-500" /> Médico *
            </label>
            <ComboBuscador
              opciones={opcionesMedico}
              value={form.id_medico}
              onChange={v => setCampo('id_medico', v)}
              placeholder="Buscar por nombre o especialidad…"
              vacio="Ningún médico coincide"
            />
            {medicos.length === 0 && (
              <p className="text-[11.5px] text-amber-700 mt-1.5">No hay médicos activos registrados aún.</p>
            )}
          </div>

          {/* Fecha + Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-ink-500" /> Fecha *
              </label>
              <input
                name="fecha" type="date" value={form.fecha}
                onChange={handleChange} required
                min={hoyLocalISO()}
                className={INPUT_CLS}
              />
              {form.fecha && (
                <p className="text-[11.5px] text-ink-500 mt-1.5 capitalize">
                  {fechaDesdeISO(form.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
            <CampoHora
              hora={form.hora}
              habilitado={!!(form.fecha && form.id_medico)}
              loading={loadingSlots}
              onAbrir={() => setSlotPickerOpen(true)}
            />
          </div>

          {/* Estado inicial */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 block">Estado inicial</label>
            <select name="estado" value={form.estado} onChange={handleChange} className={INPUT_CLS}>
              {['programada', 'confirmada'].map(e => (
                <option key={e} value={e}>{estadoLabel('cita', e)}</option>
              ))}
            </select>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-ink-500" /> Motivo de consulta
            </label>
            <textarea
              name="motivo" value={form.motivo} onChange={handleChange} rows={3}
              placeholder="Describa brevemente el motivo de la cita…"
              className={`${INPUT_CLS} placeholder:text-ink-300 resize-none`}
            />
          </div>

          {/* Avisos por WhatsApp */}
          <OpcionWhatsapp
            activo={whatsapp} onActivo={setWhatsapp}
            telefono={telefonoWa} onTelefono={setTelefonoWa}
            teleconsulta={esTele}
          />

          {aviso ? (
            <div className="space-y-3">
              <div role="alert" className="text-[13px] text-amber-800 bg-amber-50/70 border-l-2 border-amber-500 pl-3 pr-3 py-2.5 rounded-r-md">{aviso}</div>
              <div className="flex justify-end">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 rounded-xl text-[13.5px] font-medium bg-brand-700 hover:bg-brand-800 text-white">Cerrar</button>
              </div>
            </div>
          ) : (
            <>
              {error && <ErrorBox msg={error} />}
              <BotonesForm onCancel={onClose} saving={saving} labelSave="Agendar cita" />
            </>
          )}
        </form>
      </Modal>

      {slotPickerOpen && medicoSel && form.fecha && (
        <SlotPickerModal
          medico={medicoSel}
          fecha={form.fecha}
          slots={slots}
          loading={loadingSlots}
          error={errorSlots}
          seleccionada={form.hora}
          onPick={(hora) => {
            setForm(p => ({ ...p, hora }));
            setSlotPickerOpen(false);
          }}
          onClose={() => setSlotPickerOpen(false)}
        />
      )}
    </>
  );
}

// ─── Botón "Hora" que abre el selector de slots ───────────────────────────────
export function CampoHora({ hora, habilitado, loading, onAbrir }) {
  return (
    <div>
      <label className="text-[13px] font-medium text-ink-700 mb-1.5 flex items-center gap-1.5">
        <Clock size={14} className="text-ink-500" /> Hora *
      </label>
      <button
        type="button"
        onClick={onAbrir}
        disabled={!habilitado}
        className={[
          'w-full inline-flex items-center justify-between gap-2 px-3.5 py-2.5 text-[13.5px] rounded-xl border transition-all duration-150',
          !habilitado
            ? 'bg-surface border-line text-ink-300 cursor-not-allowed'
            : hora
              ? 'bg-brand-50 border-brand-200 text-brand-800 hover:border-brand-500 hover:bg-brand-50'
              : 'bg-white border-line text-ink-700 hover:border-brand-500 hover:bg-brand-50/40',
        ].join(' ')}
      >
        <span className="inline-flex items-center gap-2">
          <Clock size={14} strokeWidth={1.75} />
          {!habilitado
            ? 'Primero elige médico y fecha'
            : hora
              ? <span className="font-mono font-medium tabular-nums">{hora}</span>
              : 'Elegir hora disponible…'}
        </span>
        {habilitado && (
          loading
            ? <Loader2 size={13} className="animate-spin text-brand-700" strokeWidth={2} />
            : <span className="text-[11.5px] font-medium text-brand-700">{hora ? 'Cambiar' : 'Ver horas'} →</span>
        )}
      </button>
      {hora && (
        <p className="text-[11.5px] text-emerald-700 mt-1.5 flex items-center gap-1">
          <CheckCircle size={11} strokeWidth={2} /> Hora libre · se confirma al guardar
        </p>
      )}
    </div>
  );
}

// ─── Selector de hora: grid de slots ──────────────────────────────────────────
export function SlotPickerModal({ medico, fecha, slots, loading, error, seleccionada, onPick, onClose }) {
  const libres = slots.filter(s => s.disponible).length;
  const fechaFmt = fechaDesdeISO(fecha).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <Modal
      titulo="Elegir hora disponible"
      subtitulo={`Dr(a). ${medico.nombre_completo} · ${fechaFmt}`}
      onClose={onClose}
      size="md"
    >
      {loading ? (
        <div className="py-10 text-center">
          <Loader2 size={22} className="mx-auto mb-2 animate-spin text-brand-600" strokeWidth={1.75} />
          <p className="text-[13px] text-ink-500">Verificando disponibilidad…</p>
        </div>
      ) : error ? (
        <ErrorBox msg={error} />
      ) : slots.length === 0 ? (
        <div className="flex items-start gap-2.5 text-[13px] text-amber-800 bg-amber-50/70 border-l-2 border-amber-500 pl-3 pr-3 py-3 rounded-r-md">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="font-medium">Sin horario de atención ese día</p>
            <p className="mt-0.5 text-amber-700">
              El médico no tiene horario de atención configurado para el {fechaFmt.split(',')[0]}.
              Revisa <strong className="font-medium">Horarios</strong> o elige otra fecha.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-[12.5px] text-ink-500">
              <span className="font-semibold text-ink-900 tabular-nums">{libres}</span>
              <span> de </span>
              <span className="tabular-nums">{slots.length}</span>
              <span> horas libres</span>
            </p>
            <div className="flex items-center gap-3 text-[11.5px]">
              <span className="inline-flex items-center gap-1 text-ink-700">
                <span className="w-2.5 h-2.5 rounded-sm border border-line bg-white" /> Libre
              </span>
              <span className="inline-flex items-center gap-1 text-ink-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-surface border border-line" /> No disponible
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {slots.map(({ hora, disponible }) => {
              const activa = hora === seleccionada;
              return (
                <button
                  key={hora}
                  type="button"
                  disabled={!disponible}
                  onClick={() => onPick(hora)}
                  className={[
                    'inline-flex items-center justify-center py-2.5 rounded-lg text-[13px] font-mono font-medium tabular-nums border transition-all duration-150',
                    !disponible
                      ? 'bg-surface border-line text-ink-300 cursor-not-allowed line-through'
                      : activa
                        ? 'bg-brand-600 border-brand-600 text-white'
                        : 'bg-white border-line text-ink-900 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.97]',
                  ].join(' ')}
                  title={disponible ? `Seleccionar ${hora}` : `${hora} no disponible`}
                >
                  {hora}
                </button>
              );
            })}
          </div>

          {libres === 0 && (
            <div className="mt-4 flex items-start gap-2.5 text-[12.5px] text-amber-800 bg-amber-50/70 border-l-2 border-amber-500 pl-3 pr-3 py-2.5 rounded-r-md">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p>No quedan horas libres para esta fecha. Prueba con otra fecha u otro médico.</p>
            </div>
          )}

          <p className="mt-4 text-[11px] text-ink-500 italic text-center">
            Las horas ocupadas o ya pasadas no se pueden elegir.
          </p>
        </>
      )}
    </Modal>
  );
}
