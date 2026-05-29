import React from "react";
import { Outlet } from "react-router-dom";
import MedicoNavbar from "../components/navigation/MedicoNavbar";
import MedicoSidebar from "../components/navigation/MedicoSidebar";

export default function MedicoLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 z-50 h-16">
        <MedicoNavbar />
      </div>

      <div className="pt-16">
        <div className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto overflow-x-hidden z-40">
          <MedicoSidebar />
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
