import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Calendar, Heart, AlertCircle,
  FileText, Briefcase, Users, IdCard,
} from 'lucide-react';
import pacienteService from '../../../services/pacienteService';
import {
  PageHeader, ErrorBanner, LoadingState, Avatar,
} from '../../../shared/components/ui';

export default function MiPerfil() {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    pacienteService.getMiPerfil()
      .then((data) => { if (mounted) setPerfil(data); })
      .catch((err) => { if (mounted) setError(err.message ?? 'Error cargando perfil'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) return <LoadingState mensaje="Cargando perfil…" />;
  if (error || !perfil) return <ErrorBanner msg={error || 'No se pudo cargar tu perfil'} />;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={perfil.nombre_completo}
        descripcion={
          <span>
            {perfil.tipo_documento} {perfil.documento}
            {perfil.edad != null && ` · ${perfil.edad} años`}
            {perfil.genero && ` · ${perfil.genero}`}
          </span>
        }
        eyebrow="Mi perfil"
        icon={<User size={11} strokeWidth={2.25} />}
        variant="sky"
      >
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface/60 px-3 py-2">
          <FileText size={15} className="text-sky-600" strokeWidth={1.75} />
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.10em] text-ink-500 leading-none">Historia clínica</p>
            <p className="text-[13.5px] font-semibold font-mono text-ink-900 mt-0.5">{perfil.numero_historia}</p>
          </div>
        </div>
      </PageHeader>

      <div className="flex items-center gap-5 rounded-2xl border border-line bg-white px-6 py-5 shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
        <Avatar name={perfil.nombre_completo} tone="sky" size="xl" />
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold tracking-tight text-ink-900 truncate">{perfil.nombre_completo}</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">Bienvenido a tu portal de salud.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Información personal" icon={User}>
          <Field icon={IdCard}     label="Documento" value={`${perfil.tipo_documento ?? ''} ${perfil.documento}`} />
          <Field icon={Calendar}   label="Fecha de nacimiento" value={perfil.fecha_nacimiento} />
          <Field icon={User}       label="Género" value={perfil.genero} />
          <Field icon={Users}      label="Estado civil" value={perfil.estado_civil} />
          <Field icon={Briefcase}  label="Ocupación" value={perfil.ocupacion} />
        </Card>

        <Card title="Contacto" icon={Phone}>
          <Field icon={Mail}   label="Correo electrónico"      value={perfil.email} />
          <Field icon={Phone}  label="Teléfono"                 value={perfil.telefono} />
          <Field icon={MapPin} label="Dirección"                value={perfil.direccion} />
          <Field icon={Phone}  label="Contacto de emergencia"   value={perfil.contacto_emergencia} />
        </Card>

        <Card title="Información médica" icon={Heart} className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-4 py-3">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.10em] text-rose-700 mb-1 flex items-center gap-1.5">
                <Heart size={11} strokeWidth={2} /> Tipo de sangre
              </p>
              <p className="text-[24px] font-semibold text-rose-900 tabular-nums">{perfil.tipo_sangre ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.10em] text-amber-700 mb-1 flex items-center gap-1.5">
                <AlertCircle size={11} strokeWidth={2} /> Alergias conocidas
              </p>
              <p className="text-[13px] text-amber-900 whitespace-pre-wrap">{perfil.alergias || 'Ninguna registrada'}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-start gap-2.5 text-[13px] text-sky-800 bg-sky-50/70 border-l-2 border-sky-500 pl-3 pr-3 py-2.5 rounded-r-md">
        <AlertCircle size={15} className="flex-shrink-0 mt-0.5" strokeWidth={2} />
        <p>
          Si alguno de estos datos está desactualizado, comunícate con la administración del centro para que sea corregido.
          Por seguridad, los datos personales solo pueden ser modificados por el personal autorizado.
        </p>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(11,18,32,0.04)] p-5 ${className}`}>
      <h2 className="text-[15px] font-semibold tracking-tight text-ink-900 mb-4 flex items-center gap-2">
        <span className="inline-flex w-8 h-8 items-center justify-center rounded-md bg-sky-50 border border-sky-100 text-sky-700">
          {Icon && <Icon size={15} strokeWidth={1.75} />}
        </span>
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-lg border border-line bg-surface/60">
      <span className="text-ink-500 mt-0.5 flex-shrink-0">
        {Icon && <Icon size={13} strokeWidth={1.75} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] uppercase tracking-[0.10em] font-medium text-ink-500">{label}</p>
        <p className="mt-0.5 text-[13px] font-medium text-ink-900 break-words">{value || <span className="text-ink-300 font-normal">—</span>}</p>
      </div>
    </div>
  );
}
