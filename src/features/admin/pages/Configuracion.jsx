import React, { useState } from 'react';
import { Settings, User, Bell, Lock, Database, Palette, Globe, Save } from 'lucide-react';

export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('perfil');
  const [notificaciones, setNotificaciones] = useState({
    email: true,
    sms: false,
    push: true,
    citas: true,
    inventario: true,
    reportes: false
  });

  const tabs = [
    { id: 'perfil', name: 'Perfil', icon: User },
    { id: 'notificaciones', name: 'Notificaciones', icon: Bell },
    { id: 'seguridad', name: 'Seguridad', icon: Lock },
    { id: 'sistema', name: 'Sistema', icon: Database },
    { id: 'apariencia', name: 'Apariencia', icon: Palette }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Configuración del Sistema</h1>
            <p className="text-gray-300">Personaliza y administra tu cuenta</p>
          </div>
          <Settings size={64} className="opacity-20" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar de Tabs */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Contenido */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100">
            {activeTab === 'perfil' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Información del Perfil</h2>
                
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    MG
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Dra. María González</h3>
                    <p className="text-gray-600">Administrador del Sistema</p>
                    <button className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Cambiar foto
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      defaultValue="María González Fernández"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Especialidad
                    </label>
                    <input
                      type="text"
                      defaultValue="Cardiología"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue="maria.gonzalez@hospital.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      defaultValue="+57 300 123 4567"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg flex items-center justify-center gap-2">
                  <Save size={20} />
                  Guardar Cambios
                </button>
              </div>
            )}

            {activeTab === 'notificaciones' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Preferencias de Notificaciones</h2>
                
                <div className="space-y-4">
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Canales de Notificación</h3>
                    {Object.entries({email: 'Email', sms: 'SMS', push: 'Push'}).map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <span className="text-gray-700">{label}</span>
                        <input
                          type="checkbox"
                          checked={notificaciones[key]}
                          onChange={(e) => setNotificaciones({...notificaciones, [key]: e.target.checked})}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Tipos de Notificaciones</h3>
                    {Object.entries({citas: 'Nuevas citas y recordatorios', inventario: 'Alertas de inventario', reportes: 'Reportes generados'}).map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <span className="text-gray-700">{label}</span>
                        <input
                          type="checkbox"
                          checked={notificaciones[key]}
                          onChange={(e) => setNotificaciones({...notificaciones, [key]: e.target.checked})}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg">
                  Guardar Preferencias
                </button>
              </div>
            )}

            {activeTab === 'seguridad' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Seguridad de la Cuenta</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Contraseña Actual
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Autenticación de Dos Factores</h3>
                  <label className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-900">Activar 2FA</p>
                      <p className="text-sm text-gray-600">Mayor seguridad para tu cuenta</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 text-green-600 rounded" />
                  </label>
                </div>

                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg">
                  Actualizar Seguridad
                </button>
              </div>
            )}

            {activeTab === 'sistema' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración del Sistema</h2>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 border border-gray-200 rounded-xl">
                    <Database className="text-blue-600 mb-3" size={32} />
                    <h3 className="font-bold text-gray-900 mb-2">Base de Datos</h3>
                    <p className="text-sm text-gray-600 mb-4">Estado: Conectado</p>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Ver detalles
                    </button>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-xl">
                    <Globe className="text-green-600 mb-3" size={32} />
                    <h3 className="font-bold text-gray-900 mb-2">Idioma</h3>
                    <select className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg">
                      <option>Español</option>
                      <option>English</option>
                      <option>Português</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'apariencia' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Personalización</h2>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Tema de Color</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {['Azul', 'Verde', 'Púrpura'].map(color => (
                      <div key={color} className="p-4 border-2 border-blue-500 rounded-xl cursor-pointer hover:shadow-md transition">
                        <div className="h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg mb-3"></div>
                        <p className="text-center font-medium text-gray-900">{color}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
