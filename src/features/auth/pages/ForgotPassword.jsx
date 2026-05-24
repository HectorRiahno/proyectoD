import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, CheckCircle, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

/**
 * Pide el email del usuario y dispara supabase.auth.resetPasswordForEmail.
 * Supabase manda un correo con un magic link que apunta a /set-password,
 * donde el usuario define una contraseña nueva (mismo componente que
 * usa el flujo de invitación — Supabase usa el mismo mecanismo).
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
      // Por privacidad NO revelamos si el email existe en la BD.
      // Solo errores de red/config se muestran.
      console.warn('[resetPasswordForEmail]', rpErr.message);
    }
    // Mostramos éxito siempre (anti-enumeración de cuentas).
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Recuperar contraseña</h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            Te enviaremos un enlace para definir una nueva contraseña.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 flex items-start gap-3">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Correo enviado</p>
                <p className="mt-1">
                  Si <strong>{email}</strong> corresponde a una cuenta registrada,
                  recibirás un correo con instrucciones para restablecer tu contraseña.
                  Revisa también la carpeta de spam.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <ArrowLeft size={16} /> Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Correo electrónico</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="tu@email.com"
                  autoFocus
                />
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg disabled:opacity-60"
            >
              <Send size={18} />
              {submitting ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition"
              >
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
