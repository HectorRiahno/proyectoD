import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { validarPasswordSegura } from '../../../services/adminService';
import { roleHomePath, normalizeRoleName } from '../../../config/roles';

/**
 * Página que se abre cuando el usuario invitado hace click en el correo.
 * Supabase activa la sesión via `detectSessionInUrl` y luego este componente
 * le pide que defina su contraseña con supabase.auth.updateUser({ password }).
 *
 * Si el usuario llega aquí sin sesión activa, le mostramos un mensaje claro
 * (el link expiró o ya fue usado).
 */
export default function SetPassword() {
  const navigate = useNavigate();
  const { usuarioLogueado, loading } = useAuth();

  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const [done, setDone]                 = useState(false);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const pwdErr = validarPasswordSegura(password);
    if (pwdErr) { setError(pwdErr); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }

    setSubmitting(true);
    const { error: upErr } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (upErr) {
      setError(upErr.message ?? 'No se pudo guardar la contraseña');
      return;
    }
    setDone(true);
    // Redirigir tras 1.5s a la home del rol
    setTimeout(() => {
      const rol = normalizeRoleName(usuarioLogueado?.rol_nombre);
      navigate(roleHomePath(rol), { replace: true });
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 size={36} className="animate-spin text-blue-600" />
      </div>
    );
  }

  // Sin sesión activa = link inválido / expirado
  if (!usuarioLogueado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Enlace inválido</h1>
          <p className="text-gray-600 text-sm">
            El enlace de invitación ya fue usado, expiró o no es válido.
            Pídele al administrador que reenvíe la invitación.
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={36} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">¡Contraseña creada!</h1>
          <p className="text-gray-600 text-sm">Te estamos redirigiendo a tu panel...</p>
          <Loader2 size={20} className="animate-spin text-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6 space-y-2">
          <div className="w-14 h-14 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Define tu contraseña</h1>
          <p className="text-sm text-gray-600">
            Hola <strong>{usuarioLogueado.nombre || usuarioLogueado.email}</strong>, elige una
            contraseña segura para tu cuenta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email read-only */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">
            <p className="text-xs text-gray-500 mb-0.5">Correo</p>
            <p className="font-medium text-gray-800">{usuarioLogueado.email}</p>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <Lock size={16} /> Nueva contraseña *
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Mínimo 8 caracteres, con letras y números"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {password && (
              <>
                <div className="flex gap-1 h-1.5 mt-2">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className={`flex-1 rounded-full transition-all ${
                      n <= strength
                        ? strength <= 2 ? 'bg-red-400' : strength <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                        : 'bg-gray-200'
                    }`} />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Fortaleza: <span className="font-medium">{['','Muy débil','Débil','Regular','Fuerte','Muy fuerte'][strength]}</span>
                </p>
              </>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Confirmar contraseña *
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="Repite la contraseña"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {confirm && password !== confirm && (
              <p className="text-xs text-red-600 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg disabled:opacity-60"
          >
            {submitting ? 'Guardando...' : 'Guardar contraseña y entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
