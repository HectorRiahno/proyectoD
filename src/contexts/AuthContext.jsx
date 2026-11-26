import React, { createContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import usuarioService from '../services/usuarioService';
import { ROLE_CLIENTE, normalizeRoleName } from '../config/roles';

export const AuthContext = createContext(null);

// ─── Borra del navegador todo rastro de la sesión ──────────────────────────────
// Token de Supabase (storageKey 'hospitalis-session' y cualquier clave sb-*),
// y sessionStorage. Lo usan el logout, la sesión expirada y la sesión zombi.
const borrarCredencialesLocales = () => {
  try {
    localStorage.removeItem('hospitalis-session');
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('sb-') || k.includes('supabase')) localStorage.removeItem(k);
    });
    sessionStorage.clear();
  } catch { /* almacenamiento bloqueado: nada que borrar */ }
};

// ─── Usuario mínimo para una cuenta sin fila en `usuario` ───────────────────────
const buildUserFromSession = (session) => {
  const user = session?.user;
  if (!user) return null;
  const metadata = user.user_metadata || {};
  // user_metadata lo puede editar el propio usuario (auth.updateUser): sirve
  // para mostrar el nombre, nunca para decidir el rol. Sin perfil en BD no
  // hay rol → la app lo manda a /sin-rol.
  return {
    nombre: metadata.nombre || metadata.name || user.email?.split('@')[0] || '',
    id: user.id,
    correo: user.email,
    email:  user.email,
    id_rol: null,
    rol_nombre: null,
  };
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

  // ─── Inicialización y listener de cambios de sesión ─────────────────────────
  //
  // ⚠️ El callback de onAuthStateChange NO puede hacer `await` de llamadas a
  // Supabase: supabase-js entrega el evento mientras tiene tomado su candado
  // interno de auth, y cualquier consulta (que necesita leer el token) se
  // queda esperando ese mismo candado → bloqueo mutuo. Era lo que pasaba al
  // recargar la página: INITIAL_SESSION consultaba el perfil, todo se
  // congelaba 6 s y un timeout terminaba borrando la sesión.
  //
  // Por eso el callback es síncrono y la carga del perfil se agenda fuera de
  // él con setTimeout(0). Y un perfil que tarda o falla NUNCA cierra la
  // sesión: se reintenta. La sesión sólo termina con SIGNED_OUT real.
  useEffect(() => {
    let mounted = true;
    let reintento = null;

    // Perfil (con rol) desde la BD. Reintenta con espera creciente ante
    // errores de red / BD; mientras tanto la app muestra "Cargando…" (y tras
    // 5 s, la pantalla de carga ofrece volver al login como vía de escape).
    const cargarPerfil = async (session, intento = 0) => {
      clearTimeout(reintento);
      const authUid = session.user.id;
      try {
        const usuario = await usuarioService.getByAuthUserId(authUid);
        if (!mounted || currentAuthUidRef.current !== authUid) return;   // ya cambió la sesión
        // Sin fila en `usuario` → cuenta sin perfil: la app lo manda a /sin-rol
        setUsuarioLogueado(usuario ?? buildUserFromSession(session));
        setError(null);
        setLoading(false);
      } catch (err) {
        if (!mounted || currentAuthUidRef.current !== authUid) return;
        const espera = Math.min(1000 * 2 ** intento, 10000);   // 1, 2, 4, 8, 10, 10… s
        console.warn(`No se pudo cargar el perfil (intento ${intento + 1}); reintento en ${espera / 1000}s:`,
          err.message ?? err);
        reintento = setTimeout(() => cargarPerfil(session, intento + 1), espera);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      // ── Hay sesión: carga inicial (recarga de página), login o refresco ────
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          setSesionExpirada(false);
          explicitLogoutRef.current = false;
        }
        if (event === 'TOKEN_REFRESHED') setSesionExpirada(false);

        // Mismo usuario ya cargado (SIGNED_IN se re-emite al volver a la
        // pestaña; TOKEN_REFRESHED cada hora) → nada que recargar.
        if (currentAuthUidRef.current === session.user.id) {
          setLoading(false);
          return;
        }
        currentAuthUidRef.current = session.user.id;
        setLoading(true);
        setTimeout(() => cargarPerfil(session), 0);   // fuera del candado de auth
        return;
      }

      // ── Sin sesión ──────────────────────────────────────────────────────────
      // INITIAL_SESSION sin usuario = nadie había iniciado sesión.
      clearTimeout(reintento);
      currentAuthUidRef.current = null;
      setUsuarioLogueado(null);
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        // Sólo es "expirada" si había alguien dentro y no pulsó "Cerrar sesión"
        setSesionExpirada(wasLoggedInRef.current && !explicitLogoutRef.current);
        wasLoggedInRef.current    = false;
        explicitLogoutRef.current = false;
      }
    });

    return () => {
      mounted = false;
      clearTimeout(reintento);
      subscription.unsubscribe();
    };
  }, []);

  // ─── Login ───────────────────────────────────────────────────────────────────
  // `identificador` puede ser el correo o el número de documento. Con
  // documento, fn_login_documento verifica la clave y sólo entonces
  // devuelve el correo de la cuenta para el signIn normal de Supabase.
  const login = async (identificador, password) => {
    try {
      setLoading(true);
      setError(null);
      setSesionExpirada(false);

      let email = identificador.toLowerCase().trim();
      if (!email.includes('@')) {
        const { data: res, error: rpcError } = await supabase.rpc('fn_login_documento', {
          p_documento: identificador,
          p_password:  password,
        });
        if (rpcError) {
          throw new Error(rpcError.code === 'PGRST202'
            ? 'El ingreso con documento no está habilitado. Ejecuta supabase/migration-login-documento.sql.'
            : rpcError.message);
        }
        if (res?.bloqueado_hasta) {
          const hora = new Date(res.bloqueado_hasta).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
          throw new Error(`Demasiados intentos fallidos. Intenta de nuevo después de las ${hora}.`);
        }
        if (!res?.ok) throw new Error('Invalid login credentials');
        email = res.email;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      return data;
    } catch (err) {
      const msg = err.message ?? '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('Documento/correo o contraseña incorrectos.');
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

  // ─── Login del paciente: documento + fecha de nacimiento ─────────────────────
  // Sin correo ni contraseña. La Edge Function `login-paciente` valida los
  // datos (con bloqueo por intentos) y devuelve una sesión normal de
  // Supabase; desde ahí todo sigue igual que un login con contraseña.
  const loginPaciente = async (documento, fechaNacimiento) => {
    try {
      setLoading(true);
      setError(null);
      setSesionExpirada(false);

      const { data, error: fnError } = await supabase.functions.invoke('login-paciente', {
        body: { documento, fecha_nacimiento: fechaNacimiento },
      });

      if (fnError) {
        let info = {};
        try { info = await fnError.context?.json?.() ?? {}; } catch { /* sin cuerpo */ }
        if (info.bloqueado_hasta) {
          const hora = new Date(info.bloqueado_hasta).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
          throw new Error(`Demasiados intentos fallidos. Intenta de nuevo después de las ${hora}.`);
        }
        if (fnError.name === 'FunctionsFetchError' || fnError.name === 'FunctionsRelayError') {
          throw new Error('El ingreso de pacientes no está disponible. Comunícate con recepción.');
        }
        throw new Error(info.error || 'No pudimos iniciar tu sesión. Intenta de nuevo.');
      }

      const { error: sesError } = await supabase.auth.setSession({
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sesError) throw sesError;
      return data;
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─── Logout ──────────────────────────────────────────────────────────────────
  // Cierre voluntario (botón "Cerrar sesión"):
  //   1. Marca el cierre como explícito ANTES de signOut, para que el evento
  //      SIGNED_OUT no lo confunda con una expiración y no muestre el modal.
  //   2. Revoca en el servidor el refresh token de ESTA sesión (scope 'local':
  //      las sesiones del mismo usuario en otros equipos siguen abiertas).
  //   3. Borra el token y cualquier dato de sesión del navegador, aunque el
  //      paso 2 falle (sin red, token ya vencido).
  //   4. Recarga en /login: no queda en memoria nada del usuario anterior
  //      (importante en equipos compartidos de recepción o consultorio).
  const logout = async () => {
    explicitLogoutRef.current = true;
    wasLoggedInRef.current    = false;
    currentAuthUidRef.current = null;
    setSesionExpirada(false);
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('signOut remoto falló; se cierra igual en este equipo:', err.message ?? err);
    } finally {
      borrarCredencialesLocales();
      setUsuarioLogueado(null);
      window.location.replace('/login');   // replace: "atrás" no vuelve al panel
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
    loginPaciente,
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
    } catch {
      // Si falla el signOut remoto, igual limpiamos localmente
    } finally {
      borrarCredencialesLocales();

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
