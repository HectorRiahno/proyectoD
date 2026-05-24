import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Activity, LogOut } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../hooks";

const ROLE_LABEL = {
  admin:     "Administrador",
  asistente: "Asistente",
  medico:    "Médico",
  cliente:   "Paciente",
};

function EmployeeNavbar() {
  const navigate = useNavigate();
  const { usuarioLogueado } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Nombre y rol mostrado vienen del usuario realmente logueado.
  const nombreUsuario =
    usuarioLogueado?.nombre_completo
    ?? [usuarioLogueado?.nombres, usuarioLogueado?.apellidos].filter(Boolean).join(" ")
    ?? usuarioLogueado?.nombre
    ?? usuarioLogueado?.email
    ?? "Usuario";
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
      <div className="flex items-center justify-between px-6 py-3 h-full">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg">
            <Activity size={24} className="text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-base text-gray-900">
              HospitalIS Pro
            </span>
            <span className="text-xs font-medium text-blue-600">
              Panel de Gestión
            </span>
          </div>
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 text-gray-700 hover:bg-white px-3 py-2 rounded-xl transition-all hover:shadow-md"
          >
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-2 shadow-md">
              <User size={18} className="text-white" />
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-sm font-bold text-gray-900 max-w-[200px] truncate">
                {nombreUsuario}
              </span>
              <span className="text-xs text-blue-600 font-medium">
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
    </header>
  );
}

export default EmployeeNavbar;
