import { Link, useLocation } from "react-router-dom";
import * as Icons from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

// Sidebar para EMPLEADOS - con acceso CRUD completo
const employeeSidebarItems = [
  {
    id: 0,
    title: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard"
  },
  {
    id: 1,
    title: "Gestión de Citas",
    icon: "Calendar",
    path: "/dashboard/citas",
    badge: "CRUD"
  },
  {
    id: 2,
    title: "Pacientes",
    icon: "Users",
    path: "/dashboard/pacientes",
    badge: "CRUD"
  },
  {
    id: 3,
    title: "Usuarios",
    icon: "UserPlus",
    path: "/dashboard/usuarios",
    badge: "ADMIN"
  },
  {
    id: 35,
    title: "Médicos",
    icon: "Stethoscope",
    path: "/dashboard/medicos",
    badge: "CRUD"
  },
  {
    id: 36,
    title: "Horarios",
    icon: "Clock",
    path: "/dashboard/horarios",
    badge: "ADMIN"
  },
  {
    id: 4,
    title: "Inventario",
    icon: "Package",
    path: "/dashboard/inventario",
    badge: "CRUD"
  },
  {
    id: 9,
    title: "Facturación",
    icon: "Receipt",
    path: "/dashboard/facturacion",
    badge: "CRUD"
  },
  {
    id: 5,
    title: "Reportes",
    icon: "BarChart3",
    path: "/dashboard/reportes"
  },
  {
    id: 7,
    title: "Auditoría",
    icon: "ShieldCheck",
    path: "/dashboard/auditoria",
    badge: "ADMIN"
  },
  {
    id: 8,
    title: "Papelera",
    icon: "Trash2",
    path: "/dashboard/papelera",
    badge: "ADMIN"
  },
  {
    id: 6,
    title: "Configuración",
    icon: "Settings",
    path: "/dashboard/configuracion"
  }
];

function EmployeeSidebar() {
  const location = useLocation();
  const { usuarioLogueado } = useAuth();

  const nombre = usuarioLogueado?.nombre_completo ?? usuarioLogueado?.nombres ?? 'Administrador';
  const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const rol = usuarioLogueado?.rol_nombre === 'asistente' ? 'Asistente' : 'Administrador';

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-50 to-white h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-11 h-11 flex items-center justify-center rounded-lg font-bold shadow-lg text-sm">
            {iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{nombre}</p>
            <p className="text-xs text-gray-600">{rol}</p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">Acceso Completo</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1.5">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
          Panel de Gestión
        </div>
        {employeeSidebarItems.map(({ id, title, icon, path, badge }) => {
          const Icon = Icons[icon];
          const isActive = location.pathname === path;
          
          return (
            <Link
              key={id}
              to={path}
              className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"
                  : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className={isActive ? "" : "group-hover:scale-110 transition-transform"} />
                <span className="font-medium text-sm">{title}</span>
              </div>
              {badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive 
                    ? "bg-white/30 text-white" 
                    : "bg-green-100 text-green-700 group-hover:bg-green-200"
                }`}>
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-t from-blue-50 to-transparent">
        <div className="text-xs text-center text-gray-600">
          <p className="font-semibold">Modo: Empleado</p>
          <p className="text-gray-500 mt-1">Control Total del Sistema</p>
        </div>
      </div>
    </aside>
  );
}

export default EmployeeSidebar;
