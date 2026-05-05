import React, { useState } from 'react';
import { BarChart3, TrendingUp, Download, Calendar, Filter, FileText, PieChart, Users, DollarSign } from 'lucide-react';

export default function Reportes() {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [selectedReport, setSelectedReport] = useState('general');

  const reportTypes = [
    { id: 'general', name: 'Reporte General', icon: BarChart3, color: 'blue' },
    { id: 'pacientes', name: 'Pacientes', icon: Users, color: 'purple' },
    { id: 'financiero', name: 'Financiero', icon: DollarSign, color: 'green' },
    { id: 'inventario', name: 'Inventario', icon: PieChart, color: 'orange' }
  ];

  const recentReports = [
    { id: 1, name: 'Reporte Mensual Octubre 2024', type: 'General', date: '2024-10-23', size: '2.4 MB' },
    { id: 2, name: 'Análisis de Pacientes Q3', type: 'Pacientes', date: '2024-10-20', size: '1.8 MB' },
    { id: 3, name: 'Estado Financiero Septiembre', type: 'Financiero', date: '2024-10-15', size: '3.1 MB' },
    { id: 4, name: 'Inventario Crítico', type: 'Inventario', date: '2024-10-10', size: '890 KB' }
  ];

  const stats = [
    { label: 'Reportes Generados', value: '156', change: '+12%', color: 'blue' },
    { label: 'Descargas Totales', value: '892', change: '+8%', color: 'green' },
    { label: 'Reportes Pendientes', value: '3', change: '-2', color: 'orange' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Reportes y Análisis</h1>
            <p className="text-blue-100">Genera y descarga reportes del sistema</p>
          </div>
          <BarChart3 size={64} className="opacity-20" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Generador de Reportes */}
      <div className="grid grid-cols-3 gap-6">
        {/* Selector de Reporte */}
        <div className="col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Generar Nuevo Reporte</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tipo de Reporte
              </label>
              <div className="grid grid-cols-2 gap-3">
                {reportTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedReport(type.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                        selectedReport === type.id
                          ? `border-${type.color}-500 bg-${type.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={24} className={`text-${type.color}-600`} />
                      <span className="font-medium text-gray-900">{type.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Período
              </label>
              <div className="flex gap-3">
                {['semana', 'mes', 'trimestre', 'año'].map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition ${
                      selectedPeriod === period
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition font-semibold shadow-lg flex items-center justify-center gap-2">
              <Download size={20} />
              Generar y Descargar Reporte
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Vista Previa</h3>
          <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <p className="text-sm text-gray-600 mb-2">Reporte seleccionado:</p>
            <p className="font-bold text-gray-900 capitalize">{selectedReport}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
            <p className="text-sm text-gray-600 mb-2">Período:</p>
            <p className="font-bold text-gray-900 capitalize">{selectedPeriod}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-2">Formato:</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">PDF</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Excel</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reportes Recientes */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Reportes Recientes</h2>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Ver todos
          </button>
        </div>

        <div className="grid gap-3">
          {recentReports.map(report => (
            <div key={report.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-md transition">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <FileText className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{report.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span>{report.type}</span>
                    <span>•</span>
                    <span>{report.date}</span>
                    <span>•</span>
                    <span>{report.size}</span>
                  </div>
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium flex items-center gap-2">
                <Download size={16} />
                Descargar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
