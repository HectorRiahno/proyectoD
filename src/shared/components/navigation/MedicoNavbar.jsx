import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, User, LogOut, Stethoscope } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";

function MedicoNavbar() {
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

  return (
    <header className="w-full bg-gradient-to-r from-white via-emerald-50 to-teal-50 shadow-md border-b border-emerald-100 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="flex items-center justify-between px-6 py-3 h-full">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2 rounded-xl shadow-lg">
            <Activity size={24} className="text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-base text-gray-900">HospitalIS Pro</span>
            <span className="text-xs font-medium text-emerald-600">Portal médico</span>
          </div>
        </div>

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 text-gray-700 hover:bg-white px-3 py-2 rounded-xl transition-all hover:shadow-md"
          >
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg p-2 shadow-md">
              <Stethoscope size={18} className="text-white" />
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="text-sm font-bold text-gray-900">
                Dr(a). {usuarioLogueado?.nombre_completo ?? usuarioLogueado?.nombres ?? 'Médico'}
              </span>
              <span className="text-xs text-emerald-600 font-medium">
                {usuarioLogueado?.especialidad ?? 'Médico'}
              </span>
            </div>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-3 border-b">
                <p className="text-sm font-semibold text-gray-900">{usuarioLogueado?.email}</p>
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
