import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  AuthShell, PageTitle, Field, PrimaryButton, ErrorBanner, SuccessBanner,
} from '../components/authUI';

/**
 * Pide el email del usuario y dispara supabase.auth.resetPasswordForEmail.
 * Supabase envía un magic link que apunta a /set-password, donde el usuario
 * define una contraseña nueva. Por privacidad, mostramos éxito siempre
 * (anti-enumeración de cuentas).
 */
export default function ForgotPassword() {
  const [email, setEmail]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [sent, setSent]             = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const correo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError('Ingresa un correo válido.');
      return;
    }

    setSubmitting(true);
    const { error: rpErr } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    setSubmitting(false);

    if (rpErr) {
      // No revelamos si el email existe; solo log para el dev.
      console.warn('[resetPasswordForEmail]', rpErr.message);
    }
    setSent(true);
  };

  return (
    <AuthShell>
      <PageTitle
        title="Recupera tu acceso."
        subtitle="Te enviamos un enlace seguro para definir una nueva contraseña."
      />

      {sent ? (
        <div className="space-y-6">
          <SuccessBanner title="Correo enviado">
            Si <strong className="font-medium">{email}</strong> corresponde a una cuenta
            registrada, recibirás un correo con instrucciones. Revisa también la carpeta
            de spam.
          </SuccessBanner>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[13px] text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Field
            id="forgot-email"
            label="Correo electrónico"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@centromedico.co"
            autoComplete="email"
            autoFocus
            required
          />

          <ErrorBanner message={error} />

          <PrimaryButton loading={submitting} loadingText="Enviando…" icon={ArrowRight}>
            Enviar enlace de recuperación
          </PrimaryButton>

          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-500 hover:text-ink-900 transition-colors"
            >
              <ArrowLeft size={13} strokeWidth={2} />
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      )}

      <div className="mt-9 pt-6 border-t border-line/80">
        <p className="text-[12.5px] text-ink-500 leading-relaxed">
          Por seguridad, no revelamos si un correo está registrado. Si no recibes el
          enlace en pocos minutos, contacta al administrador.
        </p>
      </div>
    </AuthShell>
  );
}
