import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { validarPasswordSegura } from '../../../services/adminService';
import { roleHomePath, normalizeRoleName } from '../../../config/roles';
import {
  AuthShell, PageTitle, PasswordField, PrimaryButton,
  ErrorBanner, PasswordStrength,
} from '../components/authUI';

/**
 * Página de definición de contraseña.
 * Estados:
 *   1. Verificando sesión (loading)
 *   2. Sin sesión activa (enlace inválido o expirado)
 *   3. Form normal (definir contraseña)
 *   4. Listo (redirigiendo a la home del rol)
 */
export default function SetPassword() {
  const navigate = useNavigate();
  const { usuarioLogueado, loading } = useAuth();

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [done, setDone]             = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const pwdErr = validarPasswordSegura(password);
    if (pwdErr)               { setError(pwdErr); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }

    setSubmitting(true);
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (upErr) {
      setError(upErr.message ?? 'No se pudo guardar la contraseña.');
      return;
    }
    setDone(true);
    setTimeout(() => {
      const rol = normalizeRoleName(usuarioLogueado?.rol_nombre);
      navigate(roleHomePath(rol), { replace: true });
    }, 1500);
  };

  /* ─── 1. Verificando sesión ─── */
  if (loading) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center text-center py-8">
          <Loader2 size={28} className="text-brand-600 animate-spin" strokeWidth={1.75} />
          <p className="mt-4 text-[13px] text-ink-500">Verificando enlace…</p>
        </div>
      </AuthShell>
    );
  }

  /* ─── 2. Enlace inválido ─── */
  if (!usuarioLogueado) {
    return (
      <AuthShell>
        <div className="space-y-6">
          <div className="inline-flex w-11 h-11 items-center justify-center rounded-xl bg-red-50 border border-red-100">
            <AlertTriangle size={20} className="text-red-600" strokeWidth={1.75} />
          </div>
          <PageTitle
            title="Enlace inválido."
            subtitle="El enlace de invitación ya fue usado, expiró o no es válido. Pídele al administrador que reenvíe la invitación."
            className="mb-0"
          />
          <PrimaryButton
            type="button"
            icon={ArrowRight}
            onClick={() => navigate('/login', { replace: true })}
          >
            Ir al inicio de sesión
          </PrimaryButton>
        </div>
      </AuthShell>
    );
  }

  /* ─── 4. Listo, redirigiendo ─── */
  if (done) {
    return (
      <AuthShell>
        <div className="space-y-6">
          <div className="inline-flex w-11 h-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 size={22} className="text-emerald-600" strokeWidth={1.75} />
          </div>
          <PageTitle
            title="Contraseña guardada."
            subtitle="Te estamos llevando a tu panel."
            className="mb-0"
          />
          <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
            <Loader2 size={14} className="animate-spin" strokeWidth={1.75} />
            Redirigiendo…
          </div>
        </div>
      </AuthShell>
    );
  }

  /* ─── 3. Form principal ─── */
  return (
    <AuthShell>
      <PageTitle
        title="Define tu contraseña."
        subtitle={
          <>
            Hola <span className="font-medium text-ink-800">{usuarioLogueado.nombre || usuarioLogueado.email}</span>,
            elige una contraseña segura para tu cuenta.
          </>
        }
      />

      {/* Email read-only (tarjetita sutil, no bloque grande) */}
      <div className="mb-5 flex items-center justify-between rounded-xl border border-line bg-white px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.10em] text-ink-500">Correo</p>
          <p className="text-[13.5px] font-medium text-ink-900 truncate">{usuarioLogueado.email}</p>
        </div>
        <span className="text-[10.5px] uppercase tracking-[0.10em] text-ink-300">Bloqueado</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <PasswordField
            id="new-password"
            label="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres con letras y números"
            hint={!password ? 'Recomendamos usar mayúsculas, números y un símbolo.' : null}
          />
          <PasswordStrength value={password} />
        </div>

        <PasswordField
          id="confirm-password"
          label="Confirmar contraseña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          error={confirm && password !== confirm ? 'Las contraseñas no coinciden.' : null}
        />

        <ErrorBanner message={error} />

        <PrimaryButton loading={submitting} loadingText="Guardando…" icon={ArrowRight}>
          Guardar contraseña y entrar
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
