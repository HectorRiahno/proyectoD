import React, { useState } from 'react';
import { User, Mail, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import {
  AuthShell, PageTitle, Field, PasswordField,
  PrimaryButton, ErrorBanner, PasswordStrength,
} from '../components/authUI';

export default function Register() {
  const navigate = useNavigate();
  const { registro, loading, error: authError } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    contrasena: '',
    confirmarContrasena: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre || !formData.email || !formData.contrasena || !formData.confirmarContrasena) {
      setError('Por favor completa todos los campos.');
      return;
    }
    if (formData.contrasena !== formData.confirmarContrasena) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (formData.contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      await registro(formData.email, formData.contrasena, formData.nombre, 'cliente');
      alert('Registro exitoso. Por favor verifica tu correo electrónico para confirmar tu cuenta.');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Error al registrar usuario.');
      console.error('Error de registro:', err);
    }
  };

  return (
    <AuthShell>
      <PageTitle
        title="Crea tu cuenta."
        subtitle="Regístrate como paciente para acceder a tu portal de salud."
      />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field
          id="reg-nombre"
          name="nombre"
          label="Nombre completo"
          icon={User}
          value={formData.nombre}
          onChange={handleChange}
          placeholder="Hector Riahno"
          autoComplete="name"
          autoFocus
          required
        />

        <Field
          id="reg-email"
          name="email"
          type="email"
          label="Correo electrónico"
          icon={Mail}
          value={formData.email}
          onChange={handleChange}
          placeholder="tu@correo.com"
          autoComplete="email"
          required
        />

        <div>
          <PasswordField
            id="reg-password"
            label="Contraseña"
            value={formData.contrasena}
            onChange={(e) => handleChange({ target: { name: 'contrasena', value: e.target.value } })}
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
          />
          <PasswordStrength value={formData.contrasena} />
        </div>

        <PasswordField
          id="reg-confirm"
          label="Confirmar contraseña"
          value={formData.confirmarContrasena}
          onChange={(e) => handleChange({ target: { name: 'confirmarContrasena', value: e.target.value } })}
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          error={
            formData.confirmarContrasena && formData.contrasena !== formData.confirmarContrasena
              ? 'Las contraseñas no coinciden.'
              : null
          }
        />

        <ErrorBanner message={error || authError} />

        <PrimaryButton loading={loading} loadingText="Registrando…" icon={ArrowRight}>
          Crear cuenta
        </PrimaryButton>
      </form>

      <div className="mt-9 pt-6 border-t border-line/80 text-[12.5px] text-ink-500">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 transition-colors">
          Inicia sesión
        </Link>
      </div>
    </AuthShell>
  );
}
