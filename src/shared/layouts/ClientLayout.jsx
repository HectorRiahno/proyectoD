import React from 'react';
import { Outlet } from 'react-router-dom';
import ClientNavbar from '../components/ClientNavbar';
import ClientSidebar from '../components/ClientSidebar';

export default function ClientLayout({ user }) {
  return (
    <div className="min-h-screen bg-gray-50">

      <div className="fixed top-0 left-0 right-0 z-50 h-16">
        <ClientNavbar user={user} />
      </div>
      

      <div className="pt-16">
        {/* Sidebar Fixed debajo del navbar */}
        <div className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto z-40">
          <ClientSidebar />
        </div>

        <div className="ml-64 min-h-[calc(100vh-4rem)]">
          <main className="px-8 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
