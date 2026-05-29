import React, { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import {
  AuthShell, PageTitle, Field, PasswordField,
  PrimaryButton, ErrorBanner,
} from '../components/authUI';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error: authError } = useAuth();
  const [email, setEmail]           = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError]           = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !contrasena) {
      setError('Por favor completa todos los campos.');
      return;
    }

    try {
      await login(email, contrasena);
      navigate('/');
    } catch (err) {
      const msg = err.message ?? '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Email o contraseña incorrectos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Tu correo no está confirmado. Pide al administrador que lo active.');
      } else {
        setError(msg || 'No pudimos iniciar sesión. Intenta de nuevo.');
      }
      console.error('Error de login:', err);
    }
  };

  return (
    <AuthShell>
      <PageTitle
        title="Bienvenido de nuevo."
        subtitle="Ingresa para continuar al panel de tu centro médico."
      />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          id="email"
          label="Correo electrónico"
          type="email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@centromedico.co"
          autoComplete="email"
          autoFocus
        />

        <PasswordField
          id="password"
          label="Contraseña"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          rightSlot={
            <Link
              to="/forgot-password"
              className="text-[12.5px] text-brand-600 hover:text-brand-700 font-medium transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          }
        />

        <ErrorBanner message={error || authError} />

        <PrimaryButton loading={loading} loadingText="Verificando…" icon={ArrowRight}>
          Iniciar sesión
        </PrimaryButton>
      </form>

      <div className="mt-9 pt-6 border-t border-line/80">
        <p className="text-[12.5px] text-ink-500 leading-relaxed">
          <span className="font-medium text-ink-700">¿Necesitas una cuenta?</span>{' '}
          Las cuentas las crea el administrador del centro médico — contacta con él para
          solicitar acceso.
        </p>
      </div>
    </AuthShell>
  );
}
