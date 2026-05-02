import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';


const clientSidebarItems = [
  { 
    id: 1, 
    title: "Mi Panel", 
    icon: "LayoutDashboard", 
    path: "/cliente",
    description: "Vista general"
  },
  { 
    id: 2, 
    title: "Mis Citas", 
    icon: "Calendar", 
    path: "/cliente/citas",
    badge: "Ver",
    description: "Consultar citas"
  },
  { 
    id: 3, 
    title: "Mi Historial", 
    icon: "FileText", 
    path: "/cliente/historial",
    badge: "Ver",
    description: "Historia clínica"
  },
  { 
    id: 4, 
    title: "Mis Medicamentos", 
    icon: "Pill", 
    path: "/cliente/medicamentos",
    badge: "Ver",
    description: "Tratamiento actual"
  },
  { 
    id: 5, 
    title: "Resultados", 
    icon: "ClipboardList", 
    path: "/cliente/resultados",
    badge: "Imprimir",
    description: "Exámenes y análisis"
  },
  { 
    id: 6, 
    title: "Documentos", 
    icon: "FileDown", 
    path: "/cliente/documentos",
    badge: "Descargar",
    description: "Mis archivos médicos"
  },
  { 
    id: 7, 
    title: "Mi Perfil", 
    icon: "User", 
    path: "/cliente/perfil",
    description: "Información personal"
  }
];

export default function ClientSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-gradient-to-b from-emerald-50 to-white h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white w-11 h-11 flex items-center justify-center rounded-lg font-bold shadow-lg text-sm">
            <Icons.User size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Paciente</p>
            <p className="text-xs text-gray-600">Carlos López</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Solo Lectura</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1.5">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
          Portal del Paciente
        </div>
        {clientSidebarItems.map(({ id, title, icon, path, badge, description }) => {
          const Icon = Icons[icon];
          const isActive = location.pathname === path;
          
          return (
            <Link
              key={id}
              to={path}
              className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-200"
                  : "text-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:text-emerald-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className={isActive ? "" : "group-hover:scale-110 transition-transform"} />
                <div>
                  <span className="font-medium text-sm block">{title}</span>
                  {!isActive && (
                    <span className="text-xs text-gray-500 group-hover:text-emerald-500">{description}</span>
                  )}
                </div>
              </div>
              {badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive 
                    ? "bg-white/30 text-white" 
                    : "bg-blue-100 text-blue-700 group-hover:bg-blue-200"
                }`}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-t from-emerald-50 to-transparent">
        <div className="text-xs text-center text-gray-600">
          <p className="font-semibold">Modo: Paciente</p>
          <p className="text-gray-500 mt-1">Consulta de Información</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Icons.Eye size={12} className="text-emerald-600" />
            <span className="text-xs text-emerald-600 font-medium">Acceso de Lectura</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
