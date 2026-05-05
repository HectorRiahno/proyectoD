import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Activity, Bell, User, LogOut, Trash } from 'lucide-react';

const clientNavItems = [
  { id: 1, title: "Dashboard", path: "/dashboard", icon: "LayoutDashboard" },
  { id: 2, title: "Mis Citas", path: "/citas", icon: "Calendar" },
  { id: 3, title: "Mi Historial", path: "/historial", icon: "FileText" }
];

export default function ClientNavbar({ user }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([
    { id: 1, message: "Recordatorio: Cita mañana a las 10:00 AM", read: false, date: "Hoy" },
    { id: 2, message: "Nuevos resultados disponibles", read: false, date: "Ayer" }
  ]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    navigate('/');
    window.location.reload();
  };

  const handleDeleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <header className="w-full bg-gradient-to-r from-white via-emerald-50 to-teal-50 shadow-md border-b border-emerald-100 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="flex items-center justify-between px-6 py-3 h-full">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-2 rounded-xl shadow-lg">
            <Activity size={24} className="text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-base text-gray-900">Portal del Paciente</span>
            <span className="text-xs font-medium text-emerald-600">HospitalIS Pro</span>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          {clientNavItems.map(({ id, title, path }) => (
            <NavLink
              key={id}
              to={path}
              className={({ isActive }) =>
                `text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-200"
                    : "text-gray-700 hover:bg-white hover:shadow-md"
                }`
              }
            >
              {title}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 hover:bg-white rounded-xl transition-all hover:shadow-md"
            >
              <Bell
                size={22}
                className={`${unreadCount > 0 ? "text-emerald-600" : "text-gray-500"} cursor-pointer`}
              />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-3 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                <div className="p-3 font-semibold text-gray-700 border-b text-sm">
                  Notificaciones
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-gray-500 text-sm text-center">
                    No hay notificaciones
                  </div>
                ) : (
                  <ul className="max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`flex justify-between items-start p-3 border-b text-sm ${
                          n.read ? "bg-gray-50 text-gray-500" : "bg-white text-gray-800"
                        } hover:bg-blue-50 transition`}
                      >
                        <div>
                          <p>{n.message}</p>
                          <span className="text-xs text-gray-400">{n.date}</span>
                        </div>
                        <Trash
                          size={16}
                          className="text-gray-400 hover:text-red-500 transition cursor-pointer"
                          onClick={() => handleDeleteNotification(n.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 text-gray-700 hover:bg-white px-3 py-2 rounded-xl transition-all hover:shadow-md"
            >
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg p-2 shadow-md">
                <User size={18} className="text-white" />
              </div>
              <div className="flex flex-col leading-tight text-left">
                <span className="text-sm font-bold text-gray-900">
                  {user?.nombre?.split(' ')[0] || 'Usuario'}
                </span>
                <span className="text-xs text-emerald-600 font-medium">Paciente</span>
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
