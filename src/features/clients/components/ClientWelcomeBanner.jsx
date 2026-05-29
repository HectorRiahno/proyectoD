import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { PageHeader, KPI, Avatar } from '../../../shared/components/ui';

export default function ClientWelcomeBanner({ user }) {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Buenos días' : currentHour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const primer = user?.nombre?.split(' ')[0] ?? '';

  return (
    <PageHeader
      titulo={
        <span>
          {greeting}, <span className="text-ink-700 font-normal">{primer || 'paciente'}.</span>
        </span>
      }
      descripcion={
        <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1">
          {user?.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail size={11} strokeWidth={1.75} className="text-brand-600" />
              {user.email}
            </span>
          )}
          {user?.telefono && (
            <span className="inline-flex items-center gap-1.5">
              <Phone size={11} strokeWidth={1.75} className="text-brand-600" />
              {user.telefono}
            </span>
          )}
        </span>
      }
      eyebrow="Mi salud"
      variant="blue"
    >
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2">
        <Avatar name={user?.nombre} tone="brand" size="md" />
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.10em] text-ink-500 leading-none">Paciente</p>
          <p className="text-[12.5px] font-mono text-ink-900 mt-0.5">ID: {user?.documento ?? '—'}</p>
        </div>
      </div>
    </PageHeader>
  );
}
