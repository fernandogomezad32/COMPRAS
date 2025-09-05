import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  ShoppingCart,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { installmentService } from '../services/installmentService';
import { returnService } from '../services/returnService';
import type { Sale, Product, Customer } from '../types';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export function Reports() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    lowStockItems: 0,
    avgOrderValue: 0,
    topProducts: [] as Array<{ product: Product; totalSold: number; revenue: number }>,
    topCustomers: [] as Array<{ customer: Customer; totalPurchases: number; totalSpent: number }>,
    salesByPaymentMethod: {} as Record<string, number>,
    salesByDay: [] as Array<{ date: string; sales: number; revenue: number }>,
    installmentStats: {
      totalInstallmentSales: 0,
      activeInstallmentSales: 0,
      overdueInstallmentSales: 0,
      totalAmountFinanced: 0,
      totalAmountPaid: 0,
      totalAmountPending: 0
    },
    returnStats: {
      totalReturns: 0,
      pendingReturns: 0,
      completedReturns: 0,
      totalRefundAmount: 0
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [sales, products, customers, dateFilter, customStartDate, customEndDate]);

  const loadData = async () => {
    try {
      const [salesData, productsData, customersData, installmentStats, returnStats] = await Promise.all([
        saleService.getAll(),
        productService.getAll(),
        customerService.getAll(),
        installmentService.getStats(),
        returnService.getStats()
      ]);
      
      setSales(salesData);
      setProducts(productsData);
      setCustomers(customersData);
      
      setStats(prev => ({
        ...prev,
        installmentStats,
        returnStats
      }));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        return { 
          start: customStartDate ? new Date(customStartDate) : startOfMonth(now),
          end: customEndDate ? new Date(customEndDate) : endOfMonth(now)
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const calculateStats = () => {
    const { start, end } = getDateRange();
    
    // Filtrar ventas por rango de fechas
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= start && saleDate <= end;
    });

    // Estadísticas básicas
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const lowStockItems = products.filter(p => p.stock_quantity <= p.min_stock).length;

    // Productos más vendidos
    const productSales: Record<string, { quantity: number; revenue: number }> = {};
    
    filteredSales.forEach(sale => {
      sale.sale_items?.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = { quantity: 0, revenue: 0 };
        }
        productSales[item.product_id].quantity += item.quantity;
        productSales[item.product_id].revenue += item.total_price;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([productId, data]) => {
        const product = products.find(p => p.id === productId);
        return product ? {
          product,
          totalSold: data.quantity,
          revenue: data.revenue
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.totalSold - a!.totalSold)
      .slice(0, 5) as Array<{ product: Product; totalSold: number; revenue: number }>;

    // Clientes top
    const customerSales: Record<string, { purchases: number; spent: number }> = {};
    
    filteredSales.forEach(sale => {
      const customerId = sale.customer_id || 'anonymous';
      if (!customerSales[customerId]) {
        customerSales[customerId] = { purchases: 0, spent: 0 };
      }
      customerSales[customerId].purchases += 1;
      customerSales[customerId].spent += sale.total;
    });

    const topCustomers = Object.entries(customerSales)
      .map(([customerId, data]) => {
        if (customerId === 'anonymous') return null;
        const customer = customers.find(c => c.id === customerId);
        return customer ? {
          customer,
          totalPurchases: data.purchases,
          totalSpent: data.spent
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.totalSpent - a!.totalSpent)
      .slice(0, 5) as Array<{ customer: Customer; totalPurchases: number; totalSpent: number }>;

    // Ventas por método de pago
    const salesByPaymentMethod: Record<string, number> = {};
    filteredSales.forEach(sale => {
      salesByPaymentMethod[sale.payment_method] = (salesByPaymentMethod[sale.payment_method] || 0) + 1;
    });

    // Ventas por día (últimos 7 días)
    const salesByDay: Array<{ date: string; sales: number; revenue: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const daySales = sales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= dayStart && saleDate <= dayEnd;
      });
      
      salesByDay.push({
        date: format(date, 'dd/MM', { locale: es }),
        sales: daySales.length,
        revenue: daySales.reduce((sum, sale) => sum + sale.total, 0)
      });
    }

    setStats(prev => ({
      ...prev,
      totalSales,
      totalRevenue,
      totalProducts: products.length,
      totalCustomers: customers.length,
      lowStockItems,
      avgOrderValue,
      topProducts,
      topCustomers,
      salesByPaymentMethod,
      salesByDay
    }));
  };

  const exportToExcel = () => {
    const { start, end } = getDateRange();
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= start && saleDate <= end;
    });

    // Preparar datos para Excel
    const salesData = filteredSales.map(sale => ({
      'Fecha': format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
      'Factura': sale.invoice_number,
      'Cliente': sale.customer?.name || sale.customer_name,
      'Email': sale.customer?.email || sale.customer_email,
      'Método de Pago': sale.payment_method,
      'Subtotal': sale.subtotal,
      'Descuento': sale.discount_amount,
      'Total': sale.total,
      'Estado': sale.status
    }));

    const productData = stats.topProducts.map(item => ({
      'Producto': item.product.name,
      'Categoría': item.product.category?.name || 'Sin categoría',
      'Cantidad Vendida': item.totalSold,
      'Ingresos': item.revenue,
      'Stock Actual': item.product.stock_quantity
    }));

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Hoja de ventas
    const salesWs = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, salesWs, 'Ventas');
    
    // Hoja de productos
    const productsWs = XLSX.utils.json_to_sheet(productData);
    XLSX.utils.book_append_sheet(wb, productsWs, 'Productos Top');

    // Descargar archivo
    const fileName = `Reporte_${format(start, 'yyyy-MM-dd', { locale: es })}_${format(end, 'yyyy-MM-dd', { locale: es })}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const refreshData = async () => {
    setLoading(true);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="text-gray-600 mt-1">Analiza el rendimiento de tu negocio</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={refreshData}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Actualizar</span>
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="dateFilter" className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="dateFilter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="today">Hoy</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mes</option>
                <option value="year">Este Año</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>

          {dateFilter === 'custom' && (
            <>
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Resumen General', icon: BarChart3 },
              { id: 'sales', name: 'Ventas', icon: ShoppingCart },
              { id: 'products', name: 'Productos', icon: Package },
              { id: 'customers', name: 'Clientes', icon: Users },
              { id: 'installments', name: 'Abonos', icon: Calendar },
              { id: 'returns', name: 'Devoluciones', icon: RefreshCw }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab stats={stats} />}
          {activeTab === 'sales' && <SalesTab stats={stats} />}
          {activeTab === 'products' && <ProductsTab stats={stats} />}
          {activeTab === 'customers' && <CustomersTab stats={stats} />}
          {activeTab === 'installments' && <InstallmentsTab stats={stats} />}
          {activeTab === 'returns' && <ReturnsTab stats={stats} />}
        </div>
      </div>
    </div>
  );
}

// Componente de Resumen General
function OverviewTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Ventas</p>
              <p className="text-3xl font-bold mt-2">{stats.totalSales}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Ingresos Totales</p>
              <p className="text-3xl font-bold mt-2">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Valor Promedio</p>
              <p className="text-3xl font-bold mt-2">${stats.avgOrderValue.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Stock Bajo</p>
              <p className="text-3xl font-bold mt-2">{stats.lowStockItems}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Gráfico de ventas por día */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas de los Últimos 7 Días</h3>
        <div className="grid grid-cols-7 gap-2">
          {stats.salesByDay.map((day, index) => {
            const maxRevenue = Math.max(...stats.salesByDay.map(d => d.revenue));
            const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
            
            return (
              <div key={index} className="text-center">
                <div className="h-32 flex items-end justify-center mb-2">
                  <div 
                    className="bg-blue-500 rounded-t-lg w-8 transition-all hover:bg-blue-600"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${day.sales} ventas - $${day.revenue.toLocaleString()}`}
                  />
                </div>
                <div className="text-xs text-gray-600">{day.date}</div>
                <div className="text-xs font-medium text-gray-900">{day.sales}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Métodos de pago */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Método de Pago</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(stats.salesByPaymentMethod).map(([method, count]) => {
            const methodLabels: Record<string, string> = {
              cash: '💵 Efectivo',
              card: '💳 Tarjeta',
              nequi: '📱 NEQUI',
              daviplata: '📱 DAVIPLATA',
              bancolombia: '📱 BANCOLOMBIA',
              transfer: '📱 Transferencia'
            };
            
            return (
              <div key={method} className="bg-white rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600">{methodLabels[method] || method}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Componente de Ventas
function SalesTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Regulares</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalSales}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas por Abonos</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.installmentStats.totalInstallmentSales}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Devoluciones</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.returnStats.totalReturns}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Detalles de ingresos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingresos por Tipo</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ventas Regulares:</span>
              <span className="font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Abonos Recibidos:</span>
              <span className="font-bold text-blue-600">${stats.installmentStats.totalAmountPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Reembolsos:</span>
              <span className="font-bold text-red-600">-${stats.returnStats.totalRefundAmount.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-medium">Total Neto:</span>
                <span className="font-bold text-gray-900 text-xl">
                  ${(stats.totalRevenue + stats.installmentStats.totalAmountPaid - stats.returnStats.totalRefundAmount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Rendimiento</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Valor Promedio por Venta:</span>
              <span className="font-medium text-gray-900">${stats.avgOrderValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tasa de Devolución:</span>
              <span className="font-medium text-gray-900">
                {stats.totalSales > 0 ? ((stats.returnStats.totalReturns / stats.totalSales) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ventas por Día:</span>
              <span className="font-medium text-gray-900">
                {(stats.totalSales / 30).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de Productos
function ProductsTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Productos más vendidos */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Vendidos</h3>
          <div className="space-y-4">
            {stats.topProducts.length > 0 ? (
              stats.topProducts.map((item: any, index: number) => (
                <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.product.name}</div>
                      <div className="text-sm text-gray-500">{item.product.category?.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{item.totalSold} unidades</div>
                    <div className="text-sm text-green-600">${item.revenue.toLocaleString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No hay datos de productos vendidos</p>
              </div>
            )}
          </div>
        </div>

        {/* Productos con stock bajo */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
            Productos con Stock Bajo
          </h3>
          <div className="space-y-3">
            {stats.lowStockItems > 0 ? (
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-orange-600">{stats.lowStockItems}</div>
                <div className="text-sm text-gray-600">productos requieren restock</div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-green-600">Todos los productos tienen stock suficiente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de Ventas
function SalesTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de Pago</h3>
          <div className="space-y-3">
            {Object.entries(stats.salesByPaymentMethod).map(([method, count]) => {
              const methodLabels: Record<string, string> = {
                cash: '💵 Efectivo',
                card: '💳 Tarjeta',
                nequi: '📱 NEQUI',
                daviplata: '📱 DAVIPLATA',
                bancolombia: '📱 BANCOLOMBIA',
                transfer: '📱 Transferencia'
              };
              
              const percentage = stats.totalSales > 0 ? ((count as number) / stats.totalSales * 100).toFixed(1) : 0;
              
              return (
                <div key={method} className="flex items-center justify-between">
                  <span className="text-gray-700">{methodLabels[method] || method}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{count as number}</span>
                    <span className="text-sm text-gray-500">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Ventas</h3>
          <div className="space-y-4">
            {stats.salesByDay.map((day: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700">{day.date}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{day.sales} ventas</span>
                  <span className="text-sm text-green-600">${day.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de Productos
function ProductsTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Productos Más Vendidos</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendidos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.topProducts.length > 0 ? (
                stats.topProducts.map((item: any, index: number) => (
                  <tr key={item.product.id}>
                    <td className="px-4 py-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.product.name}</div>
                      <div className="text-sm text-gray-500">${item.product.price.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {item.product.category?.name || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {item.totalSold}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      ${item.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${
                        item.product.stock_quantity <= item.product.min_stock 
                          ? 'text-red-600' 
                          : 'text-gray-900'
                      }`}>
                        {item.product.stock_quantity}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No hay datos de productos vendidos en el período seleccionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Componente de Clientes
function CustomersTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Mejores Clientes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Compras</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Gastado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.topCustomers.length > 0 ? (
                stats.topCustomers.map((item: any, index: number) => (
                  <tr key={item.customer.id}>
                    <td className="px-4 py-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-xs">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          {item.customer.customer_type === 'business' ? (
                            <Building className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Users className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{item.customer.name}</div>
                          <div className="text-sm text-gray-500">{item.customer.email || item.customer.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.customer.customer_type === 'business'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.customer.customer_type === 'business' ? 'Empresa' : 'Persona'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {item.totalPurchases}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      ${item.totalSpent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ${(item.totalSpent / item.totalPurchases).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No hay datos de clientes en el período seleccionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Componente de Abonos
function InstallmentsTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Activas</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{stats.installmentStats.activeInstallmentSales}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Vencidas</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{stats.installmentStats.overdueInstallmentSales}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monto Pendiente</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">${stats.installmentStats.totalAmountPending.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Abonos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Financiado:</span>
              <span className="font-bold text-blue-600">${stats.installmentStats.totalAmountFinanced.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Recaudado:</span>
              <span className="font-bold text-green-600">${stats.installmentStats.totalAmountPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pendiente de Cobro:</span>
              <span className="font-bold text-orange-600">${stats.installmentStats.totalAmountPending.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tasa de Recuperación:</span>
              <span className="font-medium text-gray-900">
                {stats.installmentStats.totalAmountFinanced > 0 
                  ? ((stats.installmentStats.totalAmountPaid / stats.installmentStats.totalAmountFinanced) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Ventas Completadas:</span>
              <span className="font-medium text-gray-900">
                {stats.installmentStats.totalInstallmentSales - stats.installmentStats.activeInstallmentSales - stats.installmentStats.overdueInstallmentSales}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de Devoluciones
function ReturnsTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Devoluciones Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.returnStats.pendingReturns}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Devoluciones Completadas</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{stats.returnStats.completedReturns}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reembolsado</p>
              <p className="text-2xl font-bold text-red-600 mt-2">${stats.returnStats.totalRefundAmount.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis de Devoluciones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Métricas Clave</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tasa de Devolución:</span>
                <span className="font-medium text-gray-900">
                  {stats.totalSales > 0 ? ((stats.returnStats.totalReturns / stats.totalSales) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Promedio por Devolución:</span>
                <span className="font-medium text-gray-900">
                  ${stats.returnStats.totalReturns > 0 ? (stats.returnStats.totalRefundAmount / stats.returnStats.totalReturns).toLocaleString() : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Impacto en Ingresos:</span>
                <span className="font-medium text-red-600">
                  {stats.totalRevenue > 0 ? ((stats.returnStats.totalRefundAmount / stats.totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}