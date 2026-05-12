import React, { useState, useEffect } from 'react';
import {
  Search, Users, Eye, AlertCircle, Loader2, Phone, Mail,
  Heart, FileText, ClipboardList, Activity, Pill, X,
  Calendar, ChevronDown, ChevronUp, Stethoscope
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function MisPacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [historial, setHistorial] = useState(null);

  useEffect(() => {
    let mounted = true;
    supabase.from('vw_medico_mis_pacientes').select('*')
      .then(({ data, error }) => {
        if (error) throw error;
        if (mounted) setPacientes(data ?? []);
      })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando pacientes'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const filtered = pacientes.filter((p) => {
    const term = search.toLowerCase();
    return (
      (p.nombre_completo ?? '').toLowerCase().includes(term) ||
      (p.documento ?? '').includes(search) ||
      (p.numero_historia ?? '').toLowerCase().includes(term)
    );
  });

  const initials = (n) => (n ?? '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Mis pacientes</h1>
            <p className="text-emerald-100">Pacientes que has atendido</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-100 mb-1">Total</p>
            <p className="text-4xl font-bold">{loading ? '···' : pacientes.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o número de historia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Loader2 size={32} className="mx-auto mb-2 animate-spin text-emerald-600" />
          <p className="text-gray-500">Cargando pacientes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
          <Users size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No tienes pacientes registrados aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div
              key={p.id_paciente}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition p-5 border border-gray-100"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                  {initials(p.nombre_completo)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{p.nombre_completo}</p>
                  <p className="text-xs text-gray-500 font-mono">{p.documento}</p>
                  <p className="text-xs text-emerald-600 font-medium mt-1">HC {p.numero_historia}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm mb-4">
                {p.edad != null && (
                  <p className="text-gray-600">Edad: {p.edad} años</p>
                )}
                {p.tipo_sangre && (
                  <p className="text-gray-600 flex items-center gap-2">
                    <Heart size={12} className="text-red-500" /> {p.tipo_sangre}
                  </p>
                )}
                {p.ultima_cita_conmigo && (
                  <p className="text-xs text-gray-500 pt-2 border-t border-gray-100 mt-2">
                    Última visita: {new Date(p.ultima_cita_conmigo).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>
              {/* Botones de acción */}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setSelected(p)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition font-medium"
                >
                  <Eye size={15} /> Perfil
                </button>
                <button
                  onClick={() => setHistorial(p)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition font-medium"
                >
                  <ClipboardList size={15} /> Historial
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected  && <DetallePaciente paciente={selected}  onClose={() => setSelected(null)} />}
      {historial && <ModalHistorial  paciente={historial} onClose={() => setHistorial(null)} />}
    </div>
  );
}

function DetallePaciente({ paciente, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">{paciente.nombre_completo}</h2>
            <p className="text-emerald-100 text-sm">HC {paciente.numero_historia}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Info label="Documento" value={paciente.documento} />
            <Info label="Edad" value={paciente.edad ? `${paciente.edad} años` : '—'} />
            <Info label="Tipo de sangre" value={paciente.tipo_sangre} icon={<Heart size={14} className="text-red-500" />} />
            <Info label="Fecha de nacimiento" value={paciente.fecha_nacimiento} />
            <Info label="Email" value={paciente.email} icon={<Mail size={14} />} className="col-span-2" />
            <Info label="Teléfono" value={paciente.telefono} icon={<Phone size={14} />} />
            <Info label="Estado civil" value={paciente.estado_civil} />
            <Info label="Ocupación" value={paciente.ocupacion} className="col-span-2" />
            <Info label="Contacto emergencia" value={paciente.contacto_emergencia} className="col-span-2" />
          </div>

          {paciente.alergias && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-bold text-red-700 uppercase mb-1 flex items-center gap-1">
                <AlertCircle size={14} /> Alergias
              </p>
              <p className="text-sm text-red-900">{paciente.alergias}</p>
            </div>
          )}

          {paciente.ultima_cita_conmigo && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
              <FileText size={20} className="text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase">Última visita conmigo</p>
                <p className="text-sm text-emerald-900">
                  {new Date(paciente.ultima_cita_conmigo).toLocaleDateString('es-ES', { dateStyle: 'long' })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, icon, className = '' }) {
  return (
    <div className={`p-3 bg-gray-50 rounded-lg ${className}`}>
      <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="font-semibold text-gray-900 break-words">{value || '—'}</p>
    </div>
  );
}

// ─── Modal de historial clínico completo ───────────────────────────────────────
function ModalHistorial({ paciente, onClose }) {
  const [consultas, setConsultas]   = useState([]);
  const [signos, setSignos]         = useState([]);
  const [diagnosticos, setDiag]     = useState([]);
  const [ordenes, setOrdenes]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [abierto, setAbierto]       = useState({ consultas: true, signos: false, diagnosticos: false, recetas: false });

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const [rC, rS, rD, rO] = await Promise.all([
        supabase.from('consulta_medica')
          .select('id_consulta, fecha_consulta, motivo_consulta, impresion_diagnostica, plan_tratamiento, observaciones')
          .eq('id_paciente', paciente.id_paciente)
          .order('fecha_consulta', { ascending: false }),
        supabase.from('signos_vitales')
          .select('*')
          .eq('id_paciente', paciente.id_paciente)
          .order('fecha_registro', { ascending: false })
          .limit(10),
        supabase.from('diagnostico')
          .select('id_diagnostico, codigo_cie10, descripcion, es_principal, fecha, id_consulta, tipo_diagnostico(nombre)')
          .in('id_consulta',
            (await supabase.from('consulta_medica').select('id_consulta').eq('id_paciente', paciente.id_paciente)).data?.map(c => c.id_consulta) ?? []
          )
          .order('fecha', { ascending: false }),
        supabase.from('orden_medica')
          .select('id_orden, dosis, frecuencia, duracion, indicaciones, fecha_emision, medicamento(nombre, presentacion)')
          .in('id_consulta',
            (await supabase.from('consulta_medica').select('id_consulta').eq('id_paciente', paciente.id_paciente)).data?.map(c => c.id_consulta) ?? []
          )
          .order('fecha_emision', { ascending: false }),
      ]);
      setConsultas(rC.data ?? []);
      setSignos(rS.data ?? []);
      setDiag(rD.data ?? []);
      setOrdenes(rO.data ?? []);
      setLoading(false);
    };
    cargar();
  }, [paciente.id_paciente]);

  const toggle = (key) => setAbierto(p => ({ ...p, [key]: !p[key] }));

  const secciones = [
    { key: 'consultas',    label: `Consultas (${consultas.length})`,   icon: <Stethoscope size={16} /> },
    { key: 'diagnosticos', label: `Diagnósticos (${diagnosticos.length})`, icon: <ClipboardList size={16} /> },
    { key: 'recetas',      label: `Recetas (${ordenes.length})`,        icon: <Pill size={16} /> },
    { key: 'signos',       label: `Signos vitales (${signos.length})`,  icon: <Activity size={16} /> },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold">Historia clínica</h2>
            <p className="text-blue-100 text-sm">{paciente.nombre_completo} · HC {paciente.numero_historia}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-3">
          {/* Resumen del paciente */}
          <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="text-center"><p className="text-xs text-gray-500">Edad</p><p className="font-bold">{paciente.edad ?? '—'} años</p></div>
            <div className="text-center"><p className="text-xs text-gray-500">Sangre</p><p className="font-bold text-red-600">{paciente.tipo_sangre ?? '—'}</p></div>
            <div className="text-center"><p className="text-xs text-gray-500">Consultas</p><p className="font-bold">{consultas.length}</p></div>
            <div className="text-center"><p className="text-xs text-gray-500">Diagnósticos</p><p className="font-bold">{diagnosticos.length}</p></div>
          </div>

          {paciente.alergias && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-sm text-red-800">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <p><strong>Alergias:</strong> {paciente.alergias}</p>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center">
              <Loader2 size={28} className="mx-auto mb-2 animate-spin text-blue-600" />
              <p className="text-gray-500 text-sm">Cargando historial...</p>
            </div>
          ) : (
            <>
              {/* Secciones colapsables */}
              {secciones.map(s => (
                <div key={s.key} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggle(s.key)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <span className="flex items-center gap-2 font-semibold text-gray-800">
                      {s.icon} {s.label}
                    </span>
                    {abierto[s.key] ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </button>

                  {abierto[s.key] && (
                    <div className="p-4 space-y-3">
                      {/* Consultas */}
                      {s.key === 'consultas' && (
                        consultas.length === 0 ? <p className="text-sm text-gray-400">Sin consultas registradas</p> :
                        consultas.map(c => (
                          <div key={c.id_consulta} className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <p className="text-xs text-blue-600 font-bold flex items-center gap-1 mb-2">
                              <Calendar size={12} /> {c.fecha_consulta?.slice(0, 10)}
                            </p>
                            {c.motivo_consulta && <p className="text-sm text-gray-800 mb-1"><strong>Motivo:</strong> {c.motivo_consulta}</p>}
                            {c.impresion_diagnostica && (
                              <p className="text-sm text-emerald-800 mb-1"><strong>Diagnóstico:</strong> {c.impresion_diagnostica}</p>
                            )}
                            {c.plan_tratamiento && <p className="text-sm text-gray-600"><strong>Tratamiento:</strong> {c.plan_tratamiento}</p>}
                          </div>
                        ))
                      )}

                      {/* Diagnósticos */}
                      {s.key === 'diagnosticos' && (
                        diagnosticos.length === 0 ? <p className="text-sm text-gray-400">Sin diagnósticos</p> :
                        diagnosticos.map(d => (
                          <div key={d.id_diagnostico} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            {d.es_principal && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold whitespace-nowrap">Principal</span>}
                            {d.codigo_cie10 && <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded whitespace-nowrap">{d.codigo_cie10}</span>}
                            <p className="text-sm text-gray-800 flex-1">{d.descripcion}</p>
                            <p className="text-xs text-gray-400">{d.fecha?.slice(0, 10)}</p>
                          </div>
                        ))
                      )}

                      {/* Recetas */}
                      {s.key === 'recetas' && (
                        ordenes.length === 0 ? <p className="text-sm text-gray-400">Sin recetas</p> :
                        ordenes.map(o => (
                          <div key={o.id_orden} className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <p className="font-semibold text-gray-900 text-sm">{o.medicamento?.nombre ?? '—'}</p>
                            <p className="text-xs text-gray-500">{o.medicamento?.presentacion}</p>
                            <p className="text-sm text-gray-700 mt-1">
                              {o.dosis && `${o.dosis} · `}{o.frecuencia && `${o.frecuencia} · `}{o.duracion}
                            </p>
                            {o.indicaciones && <p className="text-xs text-gray-600 mt-1">{o.indicaciones}</p>}
                          </div>
                        ))
                      )}

                      {/* Signos vitales */}
                      {s.key === 'signos' && (
                        signos.length === 0 ? <p className="text-sm text-gray-400">Sin signos registrados</p> :
                        signos.map(s => (
                          <div key={s.id_signos} className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                              <Calendar size={12} /> {new Date(s.fecha_registro).toLocaleString('es-ES')}
                            </p>
                            <div className="grid grid-cols-4 gap-2 text-sm">
                              {s.presion_sistolica  && <Signo l="Presión" v={`${s.presion_sistolica}/${s.presion_diastolica}`} />}
                              {s.frecuencia_cardiaca && <Signo l="FC" v={`${s.frecuencia_cardiaca} bpm`} />}
                              {s.temperatura        && <Signo l="Temp." v={`${s.temperatura}°C`} />}
                              {s.peso               && <Signo l="Peso" v={`${s.peso} kg`} />}
                              {s.saturacion_oxigeno && <Signo l="SpO₂" v={`${s.saturacion_oxigeno}%`} />}
                              {s.talla              && <Signo l="Talla" v={`${s.talla} m`} />}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Signo({ l, v }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
      <p className="text-xs text-gray-500">{l}</p>
      <p className="font-semibold text-gray-900 text-xs">{v}</p>
    </div>
  );
}
