import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import usuarioService from '../services/usuarioService';
import { ROLE_CLIENTE, normalizeRoleName } from '../config/roles';

export const AuthContext = createContext(null);

// ─── Construir usuario mínimo desde metadata de sesión (fallback) ──────────────
const buildUserFromSession = (session) => {
  const user = session?.user;
  if (!user) return null;
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    nombre: metadata.nombre || metadata.name || user.email?.split('@')[0] || '',
    correo: user.email,
    email:  user.email,
    id_rol: metadata.id_rol || null,
    rol_nombre: normalizeRoleName(metadata.role || metadata.rol || metadata.id_rol),
    ...metadata,
  };
};

// ─── Detectar si el error indica JWT expirado / inválido ─────────────────────
// IMPORTANTE: NO incluir status 400 genérico — muchos errores devuelven 400
// sin ser de sesión (RLS, queries, etc.) y activarían el modal incorrectamente.
const esErrorSesion = (err) => {
  if (!err) return false;
  const msg  = (err.message ?? '').toLowerCase();
  const code = (err.code    ?? '');
  return (
    err.status === 401              ||
    code === 'PGRST301'             ||   // JWT expired (PostgREST)
    code === 'invalid_jwt'          ||
    msg.includes('jwt expired')     ||
    msg.includes('jwt invalid')     ||
    msg.includes('token is expired')||
    msg.includes('not authenticated')
  );
};

export function AuthProvider({ children }) {
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [sesionExpirada, setSesionExpirada]   = useState(false);

  // Refs para distinguir entre "nunca hubo sesión", "logout explícito" y "expiración"
  const wasLoggedInRef     = useRef(false);  // ¿el usuario estaba logueado antes?
  const explicitLogoutRef  = useRef(false);  // ¿el logout fue explícito (botón)?
  const currentAuthUidRef  = useRef(null);   // UID auth ya cargado (evita re-fetch en SIGNED_IN duplicado)

  // Mantener wasLoggedInRef sincronizado con el estado
  useEffect(() => {
    if (usuarioLogueado) wasLoggedInRef.current = true;
  }, [usuarioLogueado]);

  // Función para cerrar sesión sin marcarla como expirada (uso interno)
  const cerrarSesionLocal = useCallback(() => {
    setUsuarioLogueado(null);
  }, []);

  // ─── Cargar perfil del usuario desde la BD ───────────────────────────────────
  // Nunca lanza — siempre hace fallback al buildUserFromSession.
  // La detección de sesión expirada ocurre en onAuthStateChange, no aquí.
  const fetchUsuario = useCallback(async (session) => {
    const authUid = session?.user?.id;
    if (!authUid) return buildUserFromSession(session);

    try {
      const usuario = await usuarioService.getByAuthUserId(authUid);
      return usuario ?? buildUserFromSession(session);
    } catch (err) {
      console.warn('fetchUsuario falló, usando metadata de sesión:', err.message ?? err);
      return buildUserFromSession(session);
    }
  }, []);

  // ─── Inicialización y listener de cambios de sesión ─────────────────────────
  useEffect(() => {
    let mounted = true;
    // Flag para indicar que la sesión está rota y debemos ignorar eventos
    // residuales del listener (evita race con SIGNED_IN tras un timeout).
    let sesionRota = false;

    // Helper: race contra un timeout. Devuelve `Promise.race`.
    const withTimeout = (promise, ms, label) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(
        () => reject(new Error(`Timeout en ${label} tras ${ms}ms`)),
        ms
      )),
    ]);

    // Limpieza nuclear + redirección dura. Al detectar sesión zombi tras
    // AFK largo (token vencido, supabase client wedged, etc.) borramos
    // todas las claves de auth y forzamos navegación a /login, lo que
    // remonta toda la app con un cliente Supabase fresco.
    const limpiarYRedirigir = async () => {
      if (sesionRota) return;
      sesionRota = true;
      try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) {}
      try {
        localStorage.removeItem('hospitalis-session');
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k);
        });
        sessionStorage.clear();
      } catch (_) {}
      // replace evita que el usuario vuelva con back a la pantalla zombi
      window.location.replace('/login');
    };

    // Carga el perfil con timeout; si falla, intenta el fallback de metadata
    // de sesión. Si TODO falla → limpiar.
    const cargarUsuarioConTimeout = async (session, label) => {
      try {
        return await withTimeout(fetchUsuario(session), 6000, label);
      } catch (eFetch) {
        console.warn(`${label} timeout/fallo; usando metadata:`, eFetch.message);
        return buildUserFromSession(session);
      }
    };

    const loadSession = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { session }, error: sessErr } =
          await withTimeout(supabase.auth.getSession(), 6000, 'getSession');
        if (sessErr) throw sessErr;

        if (session?.user) {
          currentAuthUidRef.current = session.user.id;
          const usuario = await cargarUsuarioConTimeout(session, 'fetchUsuario(loadSession)');
          if (mounted && !sesionRota) setUsuarioLogueado(usuario);
        }
      } catch (err) {
        console.error('Error verificando sesión:', err);
        const esTimeout = (err?.message ?? '').toLowerCase().includes('timeout');
        if (esTimeout) {
          await limpiarYRedirigir();
          return; // ya se va a recargar; no tocar más estado
        }
        if (mounted) setError(err.message ?? 'Error verificando sesión');
      } finally {
        if (mounted && !sesionRota) setLoading(false);
      }
    };

    loadSession();

    // ── Escuchar eventos de Auth ──────────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted || sesionRota) return;
        console.info('[Auth event]', event, '— wasLoggedIn:', wasLoggedInRef.current,
          '— explicitLogout:', explicitLogoutRef.current);

        // ── INITIAL_SESSION: carga inicial, no cuenta como cambio de estado ──
        if (event === 'INITIAL_SESSION') {
          if (session?.user && currentAuthUidRef.current !== session.user.id) {
            currentAuthUidRef.current = session.user.id;
            const usuario = await cargarUsuarioConTimeout(session, 'fetchUsuario(INITIAL_SESSION)');
            if (mounted && !sesionRota) setUsuarioLogueado(usuario);
          }
          if (mounted && !sesionRota) setLoading(false);
          return;
        }

        // ── Nuevo login (o re-emisión al recuperar foco) ──────────────────────
        if (event === 'SIGNED_IN' && session?.user) {
          setSesionExpirada(false);
          explicitLogoutRef.current = false;

          // Mismo UID ya cargado → ignorar (Supabase v2 emite duplicados).
          if (currentAuthUidRef.current === session.user.id) {
            if (mounted) setLoading(false);
            return;
          }

          currentAuthUidRef.current = session.user.id;
          const usuario = await cargarUsuarioConTimeout(session, 'fetchUsuario(SIGNED_IN)');
          if (mounted && !sesionRota) {
            setUsuarioLogueado(usuario);
            setLoading(false);
          }
          return;
        }

        // ── Token renovado silenciosamente ────────────────────────────────────
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setSesionExpirada(false);
          if (currentAuthUidRef.current === session.user.id) return;
          currentAuthUidRef.current = session.user.id;
          const usuario = await cargarUsuarioConTimeout(session, 'fetchUsuario(TOKEN_REFRESHED)');
          if (mounted && !sesionRota) setUsuarioLogueado(usuario);
          return;
        }

        // ── Sesión terminada ──────────────────────────────────────────────────
        if (event === 'SIGNED_OUT' || !session?.user) {
          if (!mounted) return;
          currentAuthUidRef.current = null;
          setUsuarioLogueado(null);
          setLoading(false);

          if (wasLoggedInRef.current && !explicitLogoutRef.current) {
            setSesionExpirada(true);
          } else {
            setSesionExpirada(false);
          }
          wasLoggedInRef.current    = false;
          explicitLogoutRef.current = false;
          return;
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUsuario, cerrarSesionLocal]);

  // ─── Login ───────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      setSesionExpirada(false);

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email:    email.toLowerCase().trim(),
        password,
      });
      if (authError) throw authError;
      return data;
    } catch (err) {
      const msg = err.message ?? '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Email o contraseña incorrectos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Correo no confirmado. Pide al administrador que confirme la cuenta.');
      } else {
        setError(msg || 'Error al iniciar sesión.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    explicitLogoutRef.current = true;   // marca para que SIGNED_OUT no active el modal
    currentAuthUidRef.current = null;
    try {
      setLoading(true);
      setError(null);
      await supabase.auth.signOut();
      setUsuarioLogueado(null);
      setSesionExpirada(false);
    } catch (err) {
      setError(err.message ?? 'Error al cerrar sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─── Helpers internos ────────────────────────────────────────────────────────
  const getRoleIdByName = async (rolNombre) => {
    const { data, error } = await supabase
      .from('rol').select('id_rol').eq('nombre', rolNombre).single();
    if (error) throw error;
    return data?.id_rol;
  };

  const validarPassword = (password) => {
    if (!password || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[A-Za-z]/.test(password)) return 'Debe contener al menos una letra';
    if (!/\d/.test(password))        return 'Debe contener al menos un número';
    return null;
  };

  const registro = async (email, password, nombre, rolNombre = ROLE_CLIENTE) => {
    try {
      setLoading(true);
      setError(null);

      const pwdError = validarPassword(password);
      if (pwdError) throw new Error(pwdError);

      const rolNormalizado = normalizeRoleName(rolNombre);
      const rol_id = await getRoleIdByName(rolNormalizado);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { nombre, rol: rolNormalizado, id_rol: rol_id } },
      });
      if (signUpError) throw signUpError;
      return data;
    } catch (err) {
      setError(err.message ?? 'Error al registrar usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const actualizarUsuario = async (id, updates) => {
    try {
      setLoading(true);
      setError(null);
      await usuarioService.update(id, updates);
      const u = await usuarioService.getById(id);
      setUsuarioLogueado(u);
      return u;
    } catch (err) {
      setError(err.message ?? 'Error actualizando usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    usuarioLogueado,
    loading,
    error,
    sesionExpirada,
    login,
    registro,
    logout,
    actualizarUsuario,
    estaLogueado: !!usuarioLogueado,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Modal de sesión expirada — se muestra sobre cualquier ruta */}
      {sesionExpirada && <ModalSesionExpirada onLogin={() => { setSesionExpirada(false); }} />}
      {children}
    </AuthContext.Provider>
  );
}

// ─── Modal: Sesión expirada ────────────────────────────────────────────────────
function ModalSesionExpirada({ onLogin }) {
  const [cerrando, setCerrando] = React.useState(false);

  const handleLogin = async () => {
    setCerrando(true);
    try {
      // Limpiar token viejo de localStorage y Supabase antes de redirigir
      await supabase.auth.signOut({ scope: 'local' });
    } catch (_) {
      // Si falla el signOut remoto, igual limpiamos localmente
    } finally {
      // Limpiar la clave de sesión en localStorage manualmente como respaldo
      try {
        localStorage.removeItem('hospitalis-session');
        // También limpiar cualquier clave supabase residual
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k);
        });
      } catch (_) {}

      onLogin();
      window.location.replace('/login'); // replace evita volver con el botón atrás
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8 space-y-5">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sesión expirada</h2>
          <p className="text-gray-600 mt-2">
            Tu sesión ha expirado por inactividad. Inicia sesión nuevamente para continuar.
          </p>
        </div>
        <button
          onClick={handleLogin}
          disabled={cerrando}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg disabled:opacity-60"
        >
          {cerrando ? 'Redirigiendo...' : 'Volver al login'}
        </button>
      </div>
    </div>
  );
}
