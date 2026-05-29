import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, LogOut, Stethoscope, Menu } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";

function MedicoNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { usuarioLogueado } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

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
    } finally {
      navigate('/login');
    }
  };

  const nombreFull = usuarioLogueado?.nombre_completo ?? usuarioLogueado?.nombres ?? 'Médico';
  const nombreCorto = nombreFull.split(' ')[0];

  return (
    <header className="w-full bg-gradient-to-r from-white via-emerald-50 to-teal-50 shadow-md border-b border-emerald-100 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 h-full gap-2">
        {/* Lado izquierdo: hamburger (mobile) + brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden inline-flex w-9 h-9 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-100/60 transition-colors flex-shrink-0"
              aria-label="Abrir menú"
            >
              <Menu size={18} strokeWidth={1.75} />
            </button>
          )}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2 rounded-xl shadow-lg flex-shrink-0">
            <Activity size={20} className="text-white" />
          </div>
          <div className="hidden sm:flex flex-col leading-tight min-w-0">
            <span className="font-bold text-[14px] text-gray-900 truncate">HospitalIS Pro</span>
            <span className="text-[11px] font-medium text-emerald-600">Portal médico</span>
          </div>
        </div>

        {/* Lado derecho: menú usuario */}
        <div className="relative flex-shrink-0" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 sm:gap-3 text-gray-700 hover:bg-white px-2 sm:px-3 py-2 rounded-xl transition-all hover:shadow-md"
          >
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg p-1.5 sm:p-2 shadow-md flex-shrink-0">
              <Stethoscope size={16} className="text-white" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight text-left min-w-0">
              <span className="text-[13px] font-bold text-gray-900 truncate max-w-[160px] lg:max-w-[220px]">
                Dr(a). <span className="md:hidden">{nombreCorto}</span><span className="hidden md:inline">{nombreFull}</span>
              </span>
              <span className="text-[11px] text-emerald-600 font-medium truncate max-w-[160px] lg:max-w-[220px]">
                {usuarioLogueado?.especialidad ?? 'Médico'}
              </span>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-3 border-b">
                <p className="text-sm font-semibold text-gray-900 truncate">{usuarioLogueado?.email}</p>
                <p className="text-xs text-gray-500">{usuarioLogueado?.rol_nombre}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-red-600 hover:bg-red-50 transition rounded-b-lg"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default MedicoNavbar;
