import React, { useState } from 'react';
import { TrendingUp, Users, Calendar, Package, DollarSign, Activity, AlertCircle, CheckCircle, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import NuevaCitaModal from '../components/NuevaCitaModal';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const [showCitaModal, setShowCitaModal] = useState(false);
  // Datos simulados de gestión hospitalaria
  const stats = [
    {
      title: 'Pacientes Atendidos',
      value: '1,234',
      change: '+12.5%',
      trending: 'up',
      icon: Users,
      color: 'blue',
      description: 'vs mes anterior'
    },
    {
      title: 'Citas del Día',
      value: '48',
      change: '+5',
      trending: 'up',
      icon: Calendar,
      color: 'purple',
      description: 'Confirmadas'
    },
    {
      title: 'Ingresos Mensuales',
      value: '$125.4K',
      change: '+8.2%',
      trending: 'up',
      icon: DollarSign,
      color: 'green',
      description: 'vs mes anterior'
    },
    {
      title: 'Inventario Crítico',
      value: '23',
      change: '-3',
      trending: 'down',
      icon: AlertCircle,
      color: 'red',
      description: 'Productos con stock bajo'
    },
  ];

  const recentActivities = [
    { id: 1, type: 'cita', description: 'Nueva cita agendada - Dr. Martínez', time: 'Hace 5 min', status: 'success' },
    { id: 2, type: 'inventario', description: 'Stock bajo: Paracetamol 500mg', time: 'Hace 15 min', status: 'warning' },
    { id: 3, type: 'paciente', description: 'Nuevo paciente registrado - Ana Torres', time: 'Hace 1 hora', status: 'info' },
    { id: 4, type: 'cita', description: 'Cita completada - Dra. González', time: 'Hace 2 horas', status: 'success' },
  ];

  const departmentStats = [
    { name: 'Consulta Externa', patients: 45, capacity: 60, percentage: 75 },
    { name: 'Urgencias', patients: 12, capacity: 20, percentage: 60 },
    { name: 'Hospitalización', patients: 38, capacity: 50, percentage: 76 },
    { name: 'Cirugía', patients: 8, capacity: 10, percentage: 80 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Panel de Gestión Hospitalaria</h1>
            <p className="text-blue-100 text-lg">Bienvenido, Dr. María González</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-blue-100">
              <span>📅 {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>•</span>
              <span>🏥 HospitalIS Pro</span>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
            <Activity size={40} className="mx-auto mb-2" />
            <p className="text-sm font-medium">Sistema Activo</p>
            <p className="text-2xl font-bold">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'from-blue-500 to-blue-600',
            purple: 'from-purple-500 to-purple-600',
            green: 'from-green-500 to-green-600',
            red: 'from-red-500 to-red-600'
          };

          return (
            <div key={index} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClasses[stat.color]} flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" size={28} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${
                  stat.trending === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {stat.trending === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {stat.change}
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-2">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Actividad Reciente */}
        <div className="col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Actividad Reciente</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Ver todo</button>
          </div>
          
          <div className="space-y-4">
            {recentActivities.map(activity => {
              const statusColors = {
                success: 'bg-green-100 text-green-800',
                warning: 'bg-yellow-100 text-yellow-800',
                info: 'bg-blue-100 text-blue-800'
              };

              return (
                <div key={activity.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition border border-gray-100">
                  <div className={`w-2 h-2 rounded-full ${statusColors[activity.status].replace('text', 'bg')}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock size={12} />
                      {activity.time}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[activity.status]}`}>
                    {activity.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Acciones Rápidas</h2>
          <div className="space-y-3">
            <button 
              onClick={() => setShowCitaModal(true)}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
            >
              <Calendar size={20} />
              <span className="font-medium">Nueva Cita</span>
            </button>
            <button 
              onClick={() => navigate('/pacientes')}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-md"
            >
              <Users size={20} />
              <span className="font-medium">Registrar Paciente</span>
            </button>
            <button 
              onClick={() => navigate('/inventario')}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-md"
            >
              <Package size={20} />
              <span className="font-medium">Gestionar Inventario</span>
            </button>
            <button 
              onClick={() => navigate('/reportes')}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition shadow-md"
            >
              <Activity size={20} />
              <span className="font-medium">Reportes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Nueva Cita */}
      <NuevaCitaModal
        isOpen={showCitaModal}
        onClose={() => setShowCitaModal(false)}
        onSave={(cita) => {
          console.log('Nueva cita:', cita);
          alert('Cita agendada exitosamente');
        }}
      />

      {/* Ocupación por Departamento */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Ocupación por Departamento</h2>
        <div className="grid grid-cols-4 gap-6">
          {departmentStats.map((dept, index) => (
            <div key={index} className="relative">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{dept.name}</span>
                  <span className="text-sm font-bold text-gray-900">{dept.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full transition-all ${
                      dept.percentage >= 80 ? 'bg-red-500' :
                      dept.percentage >= 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${dept.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {dept.patients} de {dept.capacity} pacientes
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
