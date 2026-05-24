import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

const clientSidebarItems = [
  { id: 1, title: 'Mi Panel',         icon: 'LayoutDashboard', path: '/cliente',              description: 'Vista general' },
  { id: 2, title: 'Mis Citas',        icon: 'Calendar',        path: '/cliente/citas',        description: 'Agendamientos' },
  { id: 3, title: 'Mi Historial',     icon: 'FileText',        path: '/cliente/historial',    description: 'Consultas' },
  { id: 4, title: 'Mis Medicamentos', icon: 'Pill',            path: '/cliente/medicamentos', description: 'Tratamiento' },
  { id: 5, title: 'Resultados',       icon: 'ClipboardList',   path: '/cliente/resultados',   description: 'Signos y diagnósticos' },
  { id: 8, title: 'Mis Facturas',     icon: 'Receipt',         path: '/cliente/facturas',     description: 'Cobros y pagos' },
  { id: 6, title: 'Documentos',       icon: 'FileDown',        path: '/cliente/documentos',   description: 'Archivos médicos' },
  { id: 7, title: 'Mi Perfil',        icon: 'User',            path: '/cliente/perfil',       description: 'Información personal' },
];

export default function ClientSidebar() {
  const location = useLocation();
  const { usuarioLogueado } = useAuth();

  const nombre = usuarioLogueado?.nombre_completo
    ?? usuarioLogueado?.nombres
    ?? usuarioLogueado?.username
    ?? 'Paciente';

  return (
    <aside className="w-64 bg-gradient-to-b from-sky-50 to-white h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-sky-50 to-cyan-50 rounded-xl border border-sky-100">
          <div className="bg-gradient-to-br from-sky-600 to-cyan-600 text-white w-11 h-11 flex items-center justify-center rounded-lg font-bold shadow-lg text-sm">
            <Icons.User size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{nombre}</p>
            <p className="text-xs text-gray-600">Paciente</p>
            <p className="text-xs text-sky-600 font-medium mt-0.5">Portal personal</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1.5">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
          Portal del Paciente
        </div>
        {clientSidebarItems.map(({ id, title, icon, path, description }) => {
          const Icon = Icons[icon];
          const isActive = location.pathname === path;
          return (
            <Link
              key={id}
              to={path}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-lg shadow-sky-200'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-sky-50 hover:to-cyan-50 hover:text-sky-700'
              }`}
            >
              {Icon && <Icon size={20} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />}
              <div className="min-w-0">
                <span className="font-medium text-sm block">{title}</span>
                {!isActive && (
                  <span className="text-xs text-gray-500 group-hover:text-sky-500">{description}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gradient-to-t from-sky-50 to-transparent">
        <div className="text-xs text-center text-gray-600">
          <p className="font-semibold">Modo: Paciente</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Icons.Eye size={12} className="text-sky-600" />
            <span className="text-xs text-sky-600 font-medium">Acceso de lectura</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
