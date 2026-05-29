import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Activity, LogOut, Menu } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../hooks";
import NotificacionesBell from "./NotificacionesBell";

const ROLE_LABEL = {
  admin:     "Administrador",
  asistente: "Asistente",
  medico:    "Médico",
  cliente:   "Paciente",
};

function EmployeeNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { usuarioLogueado, esAdmin } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const nombreUsuario =
    usuarioLogueado?.nombre_completo
    ?? [usuarioLogueado?.nombres, usuarioLogueado?.apellidos].filter(Boolean).join(" ")
    ?? usuarioLogueado?.nombre
    ?? usuarioLogueado?.email
    ?? "Usuario";
  const nombreCorto = nombreUsuario.split(' ')[0];
  const rolUsuario =
    ROLE_LABEL[usuarioLogueado?.rol_nombre] ?? usuarioLogueado?.rol_nombre ?? "—";

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      navigate('/login');
    }
  };

  return (
    <header className="w-full bg-gradient-to-r from-white via-blue-50 to-indigo-50 shadow-md border-b border-blue-100 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 h-full gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden inline-flex w-9 h-9 items-center justify-center rounded-lg text-blue-700 hover:bg-blue-100/60 transition-colors flex-shrink-0"
              aria-label="Abrir menú"
            >
              <Menu size={18} strokeWidth={1.75} />
            </button>
          )}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg flex-shrink-0">
            <Activity size={20} className="text-white" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight min-w-0">
            <span className="font-bold text-[14px] text-gray-900 truncate">HospitalIS Pro</span>
            <span className="text-[11px] font-medium text-blue-600">Panel de Gestión</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {esAdmin && <NotificacionesBell />}

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 sm:gap-3 text-gray-700 hover:bg-white px-2 sm:px-3 py-2 rounded-xl transition-all hover:shadow-md"
            >
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-1.5 sm:p-2 shadow-md flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
              <div className="hidden sm:flex flex-col leading-tight text-left min-w-0">
                <span className="text-[13px] font-bold text-gray-900 truncate max-w-[140px] lg:max-w-[200px]">
                  <span className="md:hidden">{nombreCorto}</span>
                  <span className="hidden md:inline">{nombreUsuario}</span>
                </span>
                <span className="text-[11px] text-blue-600 font-medium truncate">
                  {rolUsuario}
                </span>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition rounded-lg"
                >
                  <LogOut size={16} />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default EmployeeNavbar;
