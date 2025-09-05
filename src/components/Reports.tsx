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
  Building,
  RotateCcw,
  CreditCard,
  Eye,
  FileText
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { returnService } from '../services/returnService';
import { installmentService } from '../services/installmentService';
import { format, startOfMonth, startOfWeek, startOfYear, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface ReportStats {
  sales: {
    totalSales: number;
    totalRevenue: number;
    todayRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    averageOrderValue: number;
    topSellingProducts: Array<{
      product_name: string;
      total_quantity: number;
      total_revenue: number;
    }>;
  };
  inventory: {
    totalProducts: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalInventoryValue: number;
    topCategories: Array<{
      category_name: string;
      product_count: number;
      total_value: number;
    }>;
  };
  customers: {
    totalCustomers: number;
    newCustomersThisMonth: number;
    topCustomers: Array<{
      customer_name: string;
      total_purchases: number;
      total_spent: number;
    }>;
  };
  suppliers: {
    totalSuppliers: number;
    activeSuppliers: number;
  };
  returns: {
    totalReturns: number;
    totalRefundAmount: number;
    returnRate: number;
  };
  installments: {
    totalInstallmentSales: number;
    activeInstallmentSales: number;
    totalAmountFinanced: number;
    totalAmountPending: number;
  };
}

export function Reports() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // Cargar datos de todas las fuentes
      const [
        sales,
        products,
        customers,
        suppliers,
        returns,
        installmentStats,
        salesStats,
        customerStats,
        supplierStats,
        returnStats
      ] = await Promise.all([
        saleService.getAll(),
        productService.getAll(),
        customerService.getAll(),
        supplierService.getAll(),
        returnService.getAll(),
        installmentService.getStats(),
        saleService.getStats(),
        customerService.getStats(),
        supplierService.getStats(),
        returnService.getStats()
      ]);

      // Calcular fechas según el período seleccionado
      const now = new Date();
      let startDate: Date;
      
      switch (selectedPeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = startOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'year':
          startDate = startOfYear(now);
          break;
        default:
          startDate = startOfMonth(now);
      }

      // Filtrar ventas por período
      const periodSales = sales.filter(sale => 
        new Date(sale.created_at) >= startDate
      );

      // Calcular estadísticas de ventas
      const totalRevenue = periodSales.reduce((sum, sale) => sum + sale.total, 0);
      const averageOrderValue = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

      // Calcular revenue semanal
      const weekStart = startOfWeek(now);
      const weeklyRevenue = sales
        .filter(sale => new Date(sale.created_at) >= weekStart)
        .reduce((sum, sale) => sum + sale.total, 0);

      // Productos más vendidos
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      
      periodSales.forEach(sale => {
        sale.sale_items?.forEach(item => {
          const productId = item.product_id;
          const productName = item.product?.name || 'Producto eliminado';
          
          if (!productSales[productId]) {
            productSales[productId] = { name: productName, quantity: 0, revenue: 0 };
          }
          
          productSales[productId].quantity += item.quantity;
          productSales[productId].revenue += item.total_price;
        });
      });

      const topSellingProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map(product => ({
          product_name: product.name,
          total_quantity: product.quantity,
          total_revenue: product.revenue
        }));

      // Estadísticas de inventario
      const lowStockItems = products.filter(p => p.stock_quantity <= p.min_stock).length;
      const outOfStockItems = products.filter(p => p.stock_quantity === 0).length;
      const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);

      // Top categorías
      const categoryStats: Record<string, { count: number; value: number }> = {};
      products.forEach(product => {
        const categoryName = product.category?.name || 'Sin categoría';
        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = { count: 0, value: 0 };
        }
        categoryStats[categoryName].count++;
        categoryStats[categoryName].value += product.price * product.stock_quantity;
      });

      const topCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 5)
        .map(([name, stats]) => ({
          category_name: name,
          product_count: stats.count,
          total_value: stats.value
        }));

      // Top clientes
      const customerSales: Record<string, { name: string; purchases: number; spent: number }> = {};
      
      sales.forEach(sale => {
        const customerId = sale.customer_id || 'anonymous';
        const customerName = sale.customer?.name || sale.customer_name || 'Cliente Anónimo';
        
        if (!customerSales[customerId]) {
          customerSales[customerId] = { name: customerName, purchases: 0, spent: 0 };
        }
        
        customerSales[customerId].purchases++;
        customerSales[customerId].spent += sale.total;
      });

      const topCustomers = Object.values(customerSales)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 5)
        .map(customer => ({
          customer_name: customer.name,
          total_purchases: customer.purchases,
          total_spent: customer.spent
        }));

      // Calcular tasa de devoluciones
      const returnRate = sales.length > 0 ? (returns.length / sales.length) * 100 : 0;

      setStats({
        sales: {
          totalSales: periodSales.length,
          totalRevenue,
          todayRevenue: salesStats.todayRevenue,
          weeklyRevenue,
          monthlyRevenue: totalRevenue,
          averageOrderValue,
          topSellingProducts
        },
        inventory: {
          totalProducts: products.length,
          lowStockItems,
          outOfStockItems,
          totalInventoryValue,
          topCategories
        },
        customers: {
          totalCustomers: customers.length,
          newCustomersThisMonth: customerStats.newCustomersThisMonth,
          topCustomers
        },
        suppliers: {
          totalSuppliers: suppliers.length,
          activeSuppliers: supplierStats.activeSuppliers
        },
        returns: {
          totalReturns: returns.length,
          totalRefundAmount: returnStats.totalRefundAmount,
          returnRate
        },
        installments: {
          totalInstallmentSales: installmentStats.totalInstallmentSales,
          activeInstallmentSales: installmentStats.activeInstallmentSales,
          totalAmountFinanced: installmentStats.totalAmountFinanced,
          totalAmountPending: installmentStats.totalAmountPending
        }
      });

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const exportToExcel = () => {
    if (!stats) return;

    const workbook = XLSX.utils.book_new();

    // Hoja de resumen
    const summaryData = [
      ['REPORTE DE VENTAS E INVENTARIO'],
      ['Período:', getPeriodLabel()],
      ['Generado:', new Date().toLocaleString('es-ES')],
      [],
      ['VENTAS'],
      ['Total de ventas:', stats.sales.totalSales],
      ['Ingresos totales:', `$${stats.sales.totalRevenue.toLocaleString()}`],
      ['Valor promedio por venta:', `$${stats.sales.averageOrderValue.toLocaleString()}`],
      [],
      ['INVENTARIO'],
      ['Total de productos:', stats.inventory.totalProducts],
      ['Productos con stock bajo:', stats.inventory.lowStockItems],
      ['Productos agotados:', stats.inventory.outOfStockItems],
      ['Valor total del inventario:', `$${stats.inventory.totalInventoryValue.toLocaleString()}`],
      [],
      ['CLIENTES'],
      ['Total de clientes:', stats.customers.totalCustomers],
      ['Nuevos clientes este mes:', stats.customers.newCustomersThisMonth],
      [],
      ['DEVOLUCIONES'],
      ['Total de devoluciones:', stats.returns.totalReturns],
      ['Monto total reembolsado:', `$${stats.returns.totalRefundAmount.toLocaleString()}`],
      ['Tasa de devolución:', `${stats.returns.returnRate.toFixed(2)}%`]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Hoja de productos más vendidos
    if (stats.sales.topSellingProducts.length > 0) {
      const productsData = [
        ['PRODUCTOS MÁS VENDIDOS'],
        ['Producto', 'Cantidad Vendida', 'Ingresos'],
        ...stats.sales.topSellingProducts.map(p => [
          p.product_name,
          p.total_quantity,
          `$${p.total_revenue.toLocaleString()}`
        ])
      ];
      const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Productos Top');
    }

    // Hoja de mejores clientes
    if (stats.customers.topCustomers.length > 0) {
      const customersData = [
        ['MEJORES CLIENTES'],
        ['Cliente', 'Compras', 'Total Gastado'],
        ...stats.customers.topCustomers.map(c => [
          c.customer_name,
          c.total_purchases,
          `$${c.total_spent.toLocaleString()}`
        ])
      ];
      const customersSheet = XLSX.utils.aoa_to_sheet(customersData);
      XLSX.utils.book_append_sheet(workbook, customersSheet, 'Mejores Clientes');
    }

    const fileName = `Reporte_${getPeriodLabel()}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Hoy';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mes';
      case 'year': return 'Este Año';
      default: return 'Este Mes';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar reportes</h3>
        <p className="mt-1 text-sm text-gray-500">No se pudieron cargar los datos del reporte.</p>
        <button
          onClick={handleRefresh}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="text-gray-600 mt-1">Análisis detallado del rendimiento del negocio</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="today">Hoy</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
            <option value="year">Este Año</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Período seleccionado */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span className="text-blue-800 font-medium">Mostrando datos de: {getPeriodLabel()}</span>
        </div>
      </div>

      {/* Cards de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.sales.totalSales}</p>
              <p className="text-sm text-green-600 mt-1">
                ${stats.sales.totalRevenue.toLocaleString()} en ingresos
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Productos en Inventario</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.inventory.totalProducts}</p>
              <p className="text-sm text-orange-600 mt-1">
                {stats.inventory.lowStockItems} con stock bajo
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Registrados</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.customers.totalCustomers}</p>
              <p className="text-sm text-blue-600 mt-1">
                +{stats.customers.newCustomersThisMonth} este mes
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valor Promedio</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${stats.sales.averageOrderValue.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">por venta</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Sección de ingresos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Ingresos Hoy
          </h3>
          <p className="text-3xl font-bold text-green-600">${stats.sales.todayRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
            Ingresos Semanales
          </h3>
          <p className="text-3xl font-bold text-blue-600">${stats.sales.weeklyRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-purple-600" />
            Valor del Inventario
          </h3>
          <p className="text-3xl font-bold text-purple-600">${stats.inventory.totalInventoryValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Productos más vendidos */}
      {stats.sales.topSellingProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Productos Más Vendidos ({getPeriodLabel()})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Producto</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Cantidad</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.sales.topSellingProducts.map((product, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.product_name}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">{product.total_quantity}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      ${product.total_revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mejores clientes */}
      {stats.customers.topCustomers.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-purple-600" />
            Mejores Clientes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Cliente</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Compras</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total Gastado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.customers.topCustomers.map((customer, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">{customer.total_purchases}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                      ${customer.total_spent.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alertas y notificaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de inventario */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Alertas de Inventario
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm text-orange-800">Productos con stock bajo</span>
              <span className="font-bold text-orange-600">{stats.inventory.lowStockItems}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-red-800">Productos agotados</span>
              <span className="font-bold text-red-600">{stats.inventory.outOfStockItems}</span>
            </div>
          </div>
        </div>

        {/* Estadísticas adicionales */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Estadísticas Adicionales
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-800">Proveedores activos</span>
              <span className="font-bold text-blue-600">{stats.suppliers.activeSuppliers}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-purple-800">Tasa de devolución</span>
              <span className="font-bold text-purple-600">{stats.returns.returnRate.toFixed(2)}%</span>
            </div>
            {stats.installments.totalInstallmentSales > 0 && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-800">Ventas por abonos activas</span>
                <span className="font-bold text-green-600">{stats.installments.activeInstallmentSales}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información de ventas por abonos si existen */}
      {stats.installments.totalInstallmentSales > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-indigo-600" />
            Ventas por Abonos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-600">Total Financiado</p>
              <p className="text-2xl font-bold text-indigo-800">
                ${stats.installments.totalAmountFinanced.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Ventas Activas</p>
              <p className="text-2xl font-bold text-green-800">
                {stats.installments.activeInstallmentSales}
              </p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600">Monto Pendiente</p>
              <p className="text-2xl font-bold text-orange-800">
                ${stats.installments.totalAmountPending.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer con información de actualización */}
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">
          Última actualización: {new Date().toLocaleString('es-ES')}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Los datos se actualizan automáticamente cada vez que cambias el período o refrescas la página
        </p>
      </div>
    </div>
  );
}