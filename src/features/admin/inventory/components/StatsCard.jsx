import React from 'react';

export default function StatsCard({ title, value, icon: Icon, color, highlight }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    red: 'from-red-500 to-red-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600'
  };

  const bgColorClasses = {
    blue: 'bg-blue-50',
    red: 'bg-red-50',
    green: 'bg-green-50',
    purple: 'bg-purple-50'
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${highlight ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'} p-5 hover:shadow-md transition`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  );
}
