import React, { useState, useEffect } from 'react';
import { BarChart3, Package, Users, ShoppingCart, TrendingUp, AlertTriangle, DollarSign, FileText } from 'lucide-react';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { saleService } from '../services/saleService';
import { userService } from '../services/userService';
import type { Product } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    lowStockItems: 0,
    todayRevenue: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('employee');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadDashboardData();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const role = await userService.getCurrentUserRole();
      console.log('🔍 [Dashboard] User role loaded:', role);
      setUserRole(role);
    } catch (error) {
      console.error('Error loading user role:', error);
      console.log('🚨 [Dashboard] Defaulting to employee role due to error');
      setUserRole('employee');
    }
  };
  const loadDashboardData = async () => {
    try {
      const [products, customers, salesStats, lowStockProducts] = await Promise.all([
        productService.getAll(),
        customerService.getAll(),
        saleService.getStats(),
        productService.getLowStock()
      ]);

      // Calcular revenue mensual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const sales = await saleService.getAll();

      const monthlyRevenue = sales
        .filter(sale => new Date(sale.created_at) >= startOfMonth)
        .reduce((sum, sale) => sum + sale.total, 0);

      setStats({
        totalProducts: products.length,
        totalCustomers: customers.length,
        totalSales: salesStats.totalSales,
        lowStockItems: lowStockProducts.length,
        todayRevenue: salesStats.todayRevenue,
        monthlyRevenue
      });

      const activeProducts = products.filter(p => p.status === 'active' && p.stock_quantity > 0);
      setAvailableProducts(activeProducts.slice(0, 6));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatCards = () => {
    const baseCards = [
      {
        title: 'Total Sales',
        value: stats.totalSales,
        icon: ShoppingCart,
        color: 'bg-purple-500',
        textColor: 'text-purple-600'
      }
    ];

    const adminCards = [
      {
        title: 'Total Products',
        value: stats.totalProducts,
        icon: Package,
        color: 'bg-blue-500',
        textColor: 'text-blue-600'
      },
      {
        title: 'Total Customers',
        value: stats.totalCustomers,
        icon: Users,
        color: 'bg-green-500',
        textColor: 'text-green-600'
      },
      {
        title: 'Low Stock Items',
        value: stats.lowStockItems,
        icon: AlertTriangle,
        color: 'bg-red-500',
        textColor: 'text-red-600'
      }
    ];

    if (userRole === 'employee') {
      return baseCards;
    }
    
    return [...baseCards, ...adminCards];
  };

  const statCards = getStatCards();
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
            ${stats.todayRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Revenue generated today</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue</h3>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">
            ${stats.monthlyRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Revenue this month</p>
        </div>
      </div>

      {/* Quick Actions */}
      {userRole !== 'employee' && (
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
      )}

      {/* Employee-specific quick actions */}
      {userRole === 'employee' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center space-x-2 bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-3 rounded-lg transition-colors">
              <ShoppingCart className="w-5 h-5" />
              <span>Nueva Venta</span>
            </button>
            <button className="flex items-center justify-center space-x-2 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-3 rounded-lg transition-colors">
              <FileText className="w-5 h-5" />
              <span>Buscar Facturas</span>
            </button>
            <button className="flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-lg transition-colors">
              <Package className="w-5 h-5" />
              <span>Ver Productos</span>
            </button>
          </div>
        </div>
      )}

      {/* Available Products Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Productos Disponibles</h3>
              <Package className="w-6 h-6 text-blue-600" />
            </div>

            {availableProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No hay productos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableProducts.map((product) => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                        {product.name}
                      </h4>
                      {product.stock_quantity <= product.min_stock && (
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 ml-1" />
                      )}
                    </div>

                    {product.category && (
                      <p className="text-xs text-gray-500 mb-2">{product.category.name}</p>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Precio:</span>
                        <span className="text-sm font-semibold text-green-600">
                          ${product.price.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Stock:</span>
                        <span className={`text-sm font-medium ${
                          product.stock_quantity <= product.min_stock
                            ? 'text-orange-600'
                            : 'text-gray-700'
                        }`}>
                          {product.stock_quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}