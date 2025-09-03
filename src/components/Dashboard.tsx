import React from 'react';
import { BarChart3, Package, Users, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSales: number;
  lowStockItems: number;
  todayRevenue: number;
  monthlyRevenue: number;
}

interface DashboardProps {
  stats?: DashboardStats;
}

export default function Dashboard({ stats }: DashboardProps) {
  const defaultStats: DashboardStats = {
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    lowStockItems: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    ...stats
  };

  const statCards = [
    {
      title: 'Total Products',
      value: defaultStats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Customers',
      value: defaultStats.totalCustomers,
      icon: Users,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Total Sales',
      value: defaultStats.totalSales,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Low Stock Items',
      value: defaultStats.lowStockItems,
      icon: AlertTriangle,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <BarChart3 className="w-4 h-4" />
          <span>Business Overview</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Revenue</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            ${defaultStats.todayRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Revenue generated today</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue</h3>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">
            ${defaultStats.monthlyRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Revenue this month</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-lg transition-colors">
            <Package className="w-5 h-5" />
            <span>Add Product</span>
          </button>
          <button className="flex items-center justify-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-3 rounded-lg transition-colors">
            <Users className="w-5 h-5" />
            <span>Add Customer</span>
          </button>
          <button className="flex items-center justify-center space-x-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-3 rounded-lg transition-colors">
            <ShoppingCart className="w-5 h-5" />
            <span>New Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
}