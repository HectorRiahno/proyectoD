import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Search, User, AlertCircle, Loader2,
  Stethoscope, CheckCircle2, ClipboardList, Hourglass,
} from 'lucide-react';
import citaService from '../../../services/citaService';
import { supabase } from '../../../lib/supabase';

// Las "programadas" son las que crea el admin tal cual.
// Las "confirmadas" son las que el admin marca cuando el paciente llegó al
// consultorio a tiempo — son las que el médico puede tomar. Las que ya
// están en_curso (médico abrió el modal pero no guardó) se muestran en el
// mismo cuadro de confirmadas para que pueda retomarlas.
const ESTADO_STYLES = {
  programada: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmada: 'bg-green-100 text-green-700 border-green-200',
  en_curso:   'bg-yellow-100 text-yellow-700 border-yellow-200',
};

export default function MisCitas() {
  const navigate = useNavigate();
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const mountedRef = useRef(true);

  // Carga (o recarga) las citas del médico autenticado.
  const cargarCitas = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setLoading(true);
    try {
      const data = await citaService.getMisCitasMedico();
      if (mountedRef.current) setCitas(data);
    } catch (err) {
      if (mountedRef.current) setError(err.message ?? 'Error cargando citas');
    } finally {
      if (mountedRef.current && !silencioso) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    cargarCitas();

    // ── Realtime: refrescar cuando el admin (u otro) cambie la tabla cita.
    // Requiere que la tabla 'cita' esté en la publicación supabase_realtime.
    const channel = supabase
      .channel('medico-mis-citas')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cita' },
        () => cargarCitas({ silencioso: true })
      )
      .subscribe();

    // ── Fallback: refrescar al volver el foco a la pestaña.
    const onVisible = () => {
      if (document.visibilityState === 'visible') cargarCitas({ silencioso: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [cargarCitas]);

  // Inicia la atención: marca la cita como 'en_curso' (para que el admin la
  // vea en proceso) y luego navega a consultas. Al guardar la consulta,
  // Consultas.jsx → ModalCrear pasa el estado a 'completada'.
  const tomarCita = async (cita) => {
    setError('');
    if (cita.estado !== 'en_curso') {
      const { error: upErr } = await supabase
        .from('cita')
        .update({ estado: 'en_curso' })
        .eq('id_cita', cita.id_cita);
      if (upErr) {
        setError(upErr.code === '42501'
          ? 'Sin permisos para iniciar la cita. Ejecuta supabase/rls-medico.sql.'
          : (upErr.message ?? 'No se pudo iniciar la cita'));
        return;
      }
      setCitas(prev => prev.map(c =>
        c.id_cita === cita.id_cita ? { ...c, estado: 'en_curso' } : c
      ));
    }
    navigate(`/medico/atender/${cita.id_cita}`);
  };

  const matchSearch = (c) => {
    const term = search.toLowerCase();
    return (
      (c.paciente_nombre    ?? '').toLowerCase().includes(term) ||
      (c.paciente_documento ?? '').includes(search) ||
      (c.motivo             ?? '').toLowerCase().includes(term)
    );
  };

  const programadas = citas.filter(c => c.estado === 'programada' && matchSearch(c));
  const confirmadas = citas.filter(c => ['confirmada', 'en_curso'].includes(c.estado) && matchSearch(c));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mis citas</h1>
            <p className="text-emerald-100">Citas pendientes asignadas a ti</p>
          </div>
          <div className="flex gap-6 text-center">
            <KPI label="Programadas" value={loading ? '···' : programadas.length} />
            <KPI label="Confirmadas" value={loading ? '···' : confirmadas.length} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Buscador (aplica a ambos cuadros) */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por paciente, documento o motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      {/* Dos cuadros lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Cuadro 1: Programadas ────────────────────────────────────────── */}
        <CuadroCitas
          titulo="Programadas"
          subtitulo="Citas asignadas por el administrador, aún sin confirmar"
          icono={<ClipboardList size={22} className="text-blue-600" />}
          color="blue"
          loading={loading}
          citas={programadas}
          vacioMsg="No hay citas programadas"
          renderAccion={() => (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 italic">
              <Hourglass size={12} /> Esperando confirmación
            </span>
          )}
        />

        {/* ── Cuadro 2: Confirmadas ────────────────────────────────────────── */}
        <CuadroCitas
          titulo="Confirmadas"
          subtitulo="El paciente ya llegó al consultorio — listas para atender"
          icono={<CheckCircle2 size={22} className="text-green-600" />}
          color="green"
          loading={loading}
          citas={confirmadas}
          vacioMsg="No hay citas confirmadas"
          renderAccion={(c) => (
            <button
              onClick={() => tomarCita(c)}
              title="Iniciar consulta médica para esta cita"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition text-xs font-semibold shadow-sm"
            >
              <Stethoscope size={14} />
              {c.estado === 'en_curso' ? 'Continuar' : 'Tomar cita'}
            </button>
          )}
        />
      </div>
    </div>
  );
}

// ─── Cuadro de lista de citas ──────────────────────────────────────────────────
function CuadroCitas({ titulo, subtitulo, icono, color, loading, citas, vacioMsg, renderAccion }) {
  const headerBg = {
    blue:  'from-blue-50 to-indigo-50 border-blue-200',
    green: 'from-green-50 to-emerald-50 border-green-200',
  }[color] ?? 'from-gray-50 to-gray-100 border-gray-200';

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
      <div className={`px-5 py-4 bg-gradient-to-r ${headerBg} border-b-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icono}
            <div>
              <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
              <p className="text-xs text-gray-600">{subtitulo}</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {loading ? '···' : citas.length}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-100 flex-1">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 size={28} className="mx-auto mb-2 animate-spin text-emerald-600" />
            <p className="text-gray-500 text-sm">Cargando...</p>
          </div>
        ) : citas.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-gray-400 text-sm">{vacioMsg}</p>
          </div>
        ) : (
          citas.map(c => (
            <div key={c.id_cita} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={15} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{c.paciente_nombre ?? '—'}</p>
                    <p className="text-xs text-gray-500 font-mono">{c.paciente_documento ?? ''}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-emerald-600" /> {c.fecha}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {c.hora?.slice(0, 5)}
                      </span>
                      {c.tipo_consulta && (
                        <span className="text-gray-500 truncate">· {c.tipo_consulta}</span>
                      )}
                    </div>
                    {c.motivo && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2" title={c.motivo}>
                        <span className="font-medium">Motivo:</span> {c.motivo}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${ESTADO_STYLES[c.estado] ?? 'bg-gray-100'}`}>
                    {c.estado === 'en_curso' ? 'En curso' : c.estado}
                  </span>
                  {renderAccion(c)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div>
      <p className="text-sm text-emerald-100">{label}</p>
      <p className="text-4xl font-bold">{value}</p>
    </div>
  );
}
