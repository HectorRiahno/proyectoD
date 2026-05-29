import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ClientNavbar from '../components/navigation/ClientNavbar';
import ClientSidebar from '../components/navigation/ClientSidebar';

export default function ClientLayout({ user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Cerrar el drawer al navegar a otra ruta (UX típica de drawers móviles).
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 z-50 h-16">
        <ClientNavbar user={user} onMenuClick={() => setSidebarOpen(o => !o)} />
      </div>

      {/* Backdrop solo en mobile cuando el drawer está abierto */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden fixed inset-0 top-16 z-30 bg-ink-900/40 backdrop-blur-[2px] motion-safe:animate-[hp-fade-up_0.15s_ease-out]"
        />
      )}

      <div className="pt-16">
        <div
          className={[
            'fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto overflow-x-hidden z-40',
            'transition-transform duration-200 ease-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            'lg:translate-x-0',
          ].join(' ')}
        >
          <ClientSidebar />
        </div>

        <div className="lg:ml-64 min-h-[calc(100vh-4rem)]">
          <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
