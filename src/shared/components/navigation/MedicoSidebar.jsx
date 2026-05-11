import { Link, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

const medicoSidebarItems = [
  { id: 0, title: "Dashboard",     icon: "LayoutDashboard", path: "/medico" },
  { id: 1, title: "Agenda de hoy", icon: "CalendarClock",   path: "/medico/agenda" },
  { id: 2, title: "Mis citas",     icon: "Calendar",        path: "/medico/citas" },
  { id: 3, title: "Mis pacientes", icon: "Users",           path: "/medico/pacientes" },
  { id: 4, title: "Consultas",     icon: "Stethoscope",     path: "/medico/consultas" },
  { id: 5, title: "Diagnósticos",  icon: "ClipboardList",   path: "/medico/diagnosticos" },
  { id: 6, title: "Recetas",       icon: "Pill",            path: "/medico/recetas" },
];

function MedicoSidebar() {
  const location = useLocation();
  const { usuarioLogueado } = useAuth();

  const iniciales = (usuarioLogueado?.nombre_completo ?? usuarioLogueado?.nombres ?? 'MD')
    .split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-50 to-white h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white w-11 h-11 flex items-center justify-center rounded-lg font-bold shadow-lg text-sm">
            {iniciales}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              Dr(a). {usuarioLogueado?.nombres ?? 'Médico'}
            </p>
            <p className="text-xs text-gray-600">
              {usuarioLogueado?.especialidad ?? 'Profesional médico'}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Médico activo</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1.5">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
          Mi trabajo
        </div>
        {medicoSidebarItems.map(({ id, title, icon, path }) => {
          const Icon = Icons[icon];
          const isActive = location.pathname === path;

          return (
            <Link
              key={id}
              to={path}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-200"
                  : "text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:text-emerald-700"
              }`}
            >
              {Icon && (
                <Icon size={20} className={isActive ? "" : "group-hover:scale-110 transition-transform"} />
              )}
              <span className="font-medium text-sm">{title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-t from-emerald-50 to-transparent">
        <div className="text-xs text-center text-gray-600">
          <p className="font-semibold">Modo: Médico</p>
          <p className="text-gray-500 mt-1">Acceso a tus pacientes</p>
        </div>
      </div>
    </aside>
  );
}

export default MedicoSidebar;
