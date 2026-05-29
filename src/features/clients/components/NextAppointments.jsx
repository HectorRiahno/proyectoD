import React from 'react';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';
import { Avatar } from '../../../shared/components/ui';

const appointments = [
  {
    id: 1,
    doctor: 'Dra. María González',
    especialidad: 'Cardiología',
    fecha: '25 Oct 2024',
    hora: '10:00 AM',
    ubicacion: 'Consultorio 301',
    tipo: 'Presencial',
    estado: 'Confirmada',
  },
  {
    id: 2,
    doctor: 'Dr. Carlos Méndez',
    especialidad: 'Medicina General',
    fecha: '28 Oct 2024',
    hora: '2:30 PM',
    ubicacion: 'Virtual',
    tipo: 'Telemedicina',
    estado: 'Pendiente',
  },
];

export default function NextAppointments() {
  return (
    <section className="rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-[16px] font-semibold tracking-tight text-ink-900">Próximas citas</h2>
        <button className="text-[12.5px] font-medium text-brand-600 hover:text-brand-700 transition-colors">
          Ver todas
        </button>
      </div>

      <div className="space-y-3">
        {appointments.map(a => (
          <article
            key={a.id}
            className="rounded-xl border border-line p-4 hover:border-ink-100 hover:shadow-[0_4px_14px_-8px_rgba(11,18,32,0.16)] transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar name={a.doctor} tone="brand" />
                <div>
                  <h3 className="text-[14px] font-semibold tracking-tight text-ink-900">{a.doctor}</h3>
                  <p className="text-[12px] text-ink-500">{a.especialidad}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                a.estado === 'Confirmada'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${a.estado === 'Confirmada' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {a.estado}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[12.5px]">
              <div className="flex items-center gap-1.5 text-ink-700">
                <Calendar size={12} className="text-brand-600 flex-shrink-0" strokeWidth={1.75} />
                <span>{a.fecha}</span>
              </div>
              <div className="flex items-center gap-1.5 text-ink-700">
                <Clock size={12} className="text-brand-600 flex-shrink-0" strokeWidth={1.75} />
                <span>{a.hora}</span>
              </div>
              <div className="flex items-center gap-1.5 text-ink-700">
                {a.tipo === 'Telemedicina'
                  ? <Video size={12} className="text-violet-600 flex-shrink-0" strokeWidth={1.75} />
                  : <MapPin size={12} className="text-brand-600 flex-shrink-0" strokeWidth={1.75} />}
                <span className="truncate">{a.ubicacion}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 bg-white border border-line text-ink-800 rounded-lg hover:bg-surface hover:border-ink-100 transition-colors text-[12.5px] font-medium">
                Reagendar
              </button>
              <button className="flex-1 py-2 bg-ink-900 hover:bg-ink-800 text-white rounded-lg text-[12.5px] font-medium shadow-[0_4px_14px_-6px_rgba(11,18,32,0.45)] active:scale-[0.99] transition-all duration-150">
                Ver detalles
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
