import { navbarItems } from "../../data/navbarItems";
import { useState, useEffect, useRef } from "react";
import * as Icons from "lucide-react";
import { Bell, User, Activity, Search, Trash, LogOut, Eye, CheckCircle } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { notifications as mockNotifications } from "../../data/notifications";
import { pacientesList } from "../../data/pacientesList";
import { supabase } from "../../lib/supabase";
import React from "react";

function Navbar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    setNotifications(mockNotifications);
  }, []);


  useEffect(() => {
    if (query.trim().length > 0) {
      const results = pacientesList.filter(p => 
        p.nombre.toLowerCase().includes(query.toLowerCase()) ||
        p.documento.includes(query) ||
        p.email.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleDeleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAsRead = (id) => {
    setNotifications((prev) => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Forzar redirección aunque haya error
      navigate('/login');
    }
  };

  return (
    <header className="w-full bg-gradient-to-r from-white via-blue-50 to-indigo-50 shadow-md border-b border-blue-100 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="flex items-center justify-between px-6 py-3 h-full">
        <div className="flex items-center gap-3 w-[220px]">
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

        <nav className="flex items-center gap-2 flex-1 justify-center">
          {navbarItems.map(({ id, title, path, icon }) => {
            const Icon = Icons[icon];
            return (
              <NavLink
                key={id}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200"
                      : "text-gray-700 hover:bg-white hover:shadow-md"
                  }`
                }
              >
                {Icon && <Icon size={18} />}
                {title}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 w-[400px] justify-end">
          <div className="relative" ref={searchRef}>
            <div className="flex items-center bg-white border border-gray-300 rounded-xl px-4 py-2 w-[240px] focus-within:ring-2 focus-within:ring-blue-500 shadow-sm">
              <Search className="text-gray-400" size={18} />
              <input
                placeholder="Buscar paciente..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 ml-2 focus:outline-none text-sm bg-transparent"
              />
            </div>
            
            {showSearchResults && (
              <div className="absolute top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <p className="text-sm font-semibold text-gray-700">
                    {searchResults.length} resultado(s) encontrado(s)
                  </p>
                </div>
                {searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map(paciente => (
                      <li 
                        key={paciente.id}
                        onClick={() => {
                          navigate('/pacientes');
                          setQuery('');
                          setShowSearchResults(false);
                        }}
                        className="p-4 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                            {paciente.nombre.split(' ')[0][0]}{paciente.nombre.split(' ')[1]?.[0]}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{paciente.nombre}</p>
                            <p className="text-xs text-gray-600">Doc: {paciente.documento}</p>
                            <p className="text-xs text-gray-500">{paciente.diagnostico}</p>
                          </div>
                          <Eye size={16} className="text-blue-600" />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Search size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No se encontraron pacientes</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(!open)}
              className="relative p-2 hover:bg-white rounded-xl transition-all hover:shadow-md"
            >
              <Bell
                size={22}
                className={`${
                  unreadCount > 0 ? "text-blue-600" : "text-gray-500"
                } cursor-pointer`}
              />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                  {unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-3 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50">
                <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <CheckCircle size={14} />
                      Marcar todas como leídas
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No hay notificaciones</p>
                  </div>
                ) : (
                  <ul className="max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`flex items-start gap-3 p-4 border-b text-sm ${
                          n.read
                            ? "bg-gray-50"
                            : "bg-white"
                        } hover:bg-blue-50 transition group`}
                      >
                        <div 
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            n.read ? "bg-gray-300" : "bg-blue-600"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`${n.read ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                            {n.message}
                          </p>
                          <span className="text-xs text-gray-400 mt-1 block">
                            {n.date}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                          {!n.read && (
                            <button
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-blue-600 hover:text-blue-800 transition"
                              title="Marcar como leída"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(n.id)}
                            className="text-gray-400 hover:text-red-500 transition"
                            title="Eliminar"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
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
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-2 shadow-md">
                <User size={18} className="text-white" />
              </div>
              <div className="flex flex-col leading-tight text-left">
                <span className="text-sm font-bold text-gray-900">
                  Dra. María Gómez
                </span>
                <span className="text-xs text-blue-600 font-medium">
                  Administrador
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

export default Navbar;
