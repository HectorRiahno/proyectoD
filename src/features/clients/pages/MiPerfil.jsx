import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Calendar, Heart, AlertCircle,
  Loader2, FileText, Briefcase, Users, IdCard
} from 'lucide-react';
import pacienteService from '../../../services/pacienteService';

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

  const initials = (n) => (n ?? '?').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
        <Loader2 size={32} className="mx-auto mb-2 animate-spin text-sky-600" />
        <p className="text-gray-500">Cargando perfil...</p>
      </div>
    );
  }

  if (error || !perfil) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl flex items-center gap-3">
        <AlertCircle size={20} />
        {error || 'No se pudo cargar tu perfil'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-cyan-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-xl">
            {initials(perfil.nombre_completo)}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">{perfil.nombre_completo}</h1>
            <p className="text-sky-100">
              {perfil.tipo_documento} {perfil.documento}
              {perfil.edad != null && ` · ${perfil.edad} años`}
              {perfil.genero && ` · ${perfil.genero}`}
            </p>
            <p className="text-sm text-sky-100 mt-2 flex items-center gap-2">
              <FileText size={14} />
              Historia clínica: <span className="font-mono font-semibold">{perfil.numero_historia}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Información personal" icon={<User size={20} />}>
          <Field icon={<IdCard size={16} />} label="Documento" value={`${perfil.tipo_documento ?? ''} ${perfil.documento}`} />
          <Field icon={<Calendar size={16} />} label="Fecha de nacimiento" value={perfil.fecha_nacimiento} />
          <Field icon={<User size={16} />} label="Género" value={perfil.genero} />
          <Field icon={<Users size={16} />} label="Estado civil" value={perfil.estado_civil} />
          <Field icon={<Briefcase size={16} />} label="Ocupación" value={perfil.ocupacion} />
        </Card>

        <Card title="Contacto" icon={<Phone size={20} />}>
          <Field icon={<Mail size={16} />} label="Correo electrónico" value={perfil.email} />
          <Field icon={<Phone size={16} />} label="Teléfono" value={perfil.telefono} />
          <Field icon={<MapPin size={16} />} label="Dirección" value={perfil.direccion} />
          <Field icon={<Phone size={16} />} label="Contacto de emergencia" value={perfil.contacto_emergencia} />
        </Card>

        <Card title="Información médica" icon={<Heart size={20} />} className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-xs font-bold text-red-700 uppercase mb-1 flex items-center gap-1">
                <Heart size={14} /> Tipo de sangre
              </p>
              <p className="text-2xl font-bold text-red-900">{perfil.tipo_sangre ?? '—'}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-xs font-bold text-orange-700 uppercase mb-1 flex items-center gap-1">
                <AlertCircle size={14} /> Alergias conocidas
              </p>
              <p className="text-sm text-orange-900 whitespace-pre-wrap">{perfil.alergias || 'Ninguna registrada'}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-800 flex items-start gap-3">
        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
        <p>
          Si alguno de estos datos está desactualizado, comunícate con la administración del centro para que sea corregido.
          Por seguridad, los datos personales solo pueden ser modificados por el personal autorizado.
        </p>
      </div>
    </div>
  );
}

function Card({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 border border-gray-100 ${className}`}>
      <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
        <span className="text-sky-600">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="text-sky-600 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}
