import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Calendar,
  Download,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Star,
  StarOff,
  Plus,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { reportService } from '../services/reportService';
import { installmentService } from '../services/installmentService';
import { ReportForm } from './ReportForm';
import { InstallmentSalesReport } from './InstallmentSalesReport';
import type { Sale, Product, Customer, Report } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export function Reports() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('month');
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [showReportForm, setShowReportForm] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salesData, productsData, customersData, reportsData] = await Promise.all([
        saleService.getAll(),
        productService.getAll(),
        customerService.getAll(),
        reportService.getAll()
      ]);
      
      setSales(salesData);
      setProducts(productsData);
      setCustomers(customersData);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSales = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'custom':
        if (!customDateRange.start || !customDateRange.end) return sales;
        startDate = new Date(customDateRange.start);
        endDate = new Date(customDateRange.end);
        endDate.setHours(23, 59, 59);
        break;
      default:
        return sales;
    }

    return sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });
  };

  const filteredSales = getFilteredSales();

  const calculateStats = () => {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Productos más vendidos
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filteredSales.forEach(sale => {
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

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Clientes más frecuentes
    const customerPurchases: Record<string, { name: string; purchases: number; totalSpent: number }> = {};
    filteredSales.forEach(sale => {
      const customerId = sale.customer_id || 'anonymous';
      const customerName = sale.customer?.name || sale.customer_name || 'Cliente Anónimo';
      if (!customerPurchases[customerId]) {
        customerPurchases[customerId] = { name: customerName, purchases: 0, totalSpent: 0 };
      }
      customerPurchases[customerId].purchases += 1;
      customerPurchases[customerId].totalSpent += sale.total;
    });

    const topCustomers = Object.entries(customerPurchases)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return {
      totalSales,
      totalRevenue,
      averageOrderValue,
      topProducts,
      topCustomers
    };
  };

  const stats = calculateStats();

  const exportToExcel = () => {
    const salesData = filteredSales.map(sale => ({
      'Número de Factura': sale.invoice_number,
      'Fecha': format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
      'Cliente': sale.customer?.name || sale.customer_name || 'Cliente Anónimo',
      'Email': sale.customer?.email || sale.customer_email || '',
      'Método de Pago': sale.payment_method,
      'Subtotal': sale.subtotal,
      'Descuento': sale.discount_amount,
      'Total': sale.total,
      'Estado': sale.status
    }));

    const ws = XLSX.utils.json_to_sheet(salesData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    
    const fileName = `reporte_ventas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    setShowReportForm(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este reporte?')) return;

    try {
      await reportService.delete(reportId);
      await loadData();
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  const handleToggleFavorite = async (reportId: string, isFavorite: boolean) => {
    try {
      await reportService.toggleFavorite(reportId, !isFavorite);
      await loadData();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleFormSubmit = async () => {
    setShowReportForm(false);
    setEditingReport(null);
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
        <div className="flex space-x-3">
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>
          <button
            onClick={() => setShowReportForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Reporte</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Resumen General', icon: BarChart3 },
              { id: 'sales', name: 'Análisis Detallado de Ventas', icon: ShoppingCart },
              { id: 'products', name: 'Análisis de Productos', icon: Package },
              { id: 'customers', name: 'Análisis de Clientes', icon: Users },
              { id: 'installments', name: 'Ventas por Abonos', icon: Calendar },
              { id: 'custom', name: 'Reportes Personalizados', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filtros de fecha */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Período:</span>
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="today">Hoy</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="year">Este Año</option>
              <option value="custom">Personalizado</option>
            </select>
            
            {dateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-gray-500">hasta</span>
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </>
            )}
            
            <div className="text-sm text-gray-600">
              {filteredSales.length} ventas encontradas
            </div>
          </div>
        </div>

        {/* Contenido de las pestañas */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">Total Ventas</p>
                      <p className="text-2xl font-bold mt-2">{stats.totalSales}</p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Ingresos Totales</p>
                      <p className="text-2xl font-bold mt-2">${stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Ticket Promedio</p>
                      <p className="text-2xl font-bold mt-2">${stats.averageOrderValue.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100">Productos Activos</p>
                      <p className="text-2xl font-bold mt-2">{products.filter(p => p.status === 'active').length}</p>
                    </div>
                    <Package className="h-8 w-8 text-orange-200" />
                  </div>
                </div>
              </div>

              {/* Top Products y Top Customers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos Más Vendidos</h3>
                  <div className="space-y-3">
                    {stats.topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.quantity} unidades vendidas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${product.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Mejores Clientes</h3>
                  <div className="space-y-3">
                    {stats.topCustomers.map((customer, index) => (
                      <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold text-sm">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.purchases} compras</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${customer.totalSpent.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Análisis Detallado de Ventas</h2>
              
              {/* Tabla de ventas */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Factura
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Productos
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Método de Pago
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Subtotal
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Descuento
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{sale.invoice_number}</div>
                            <div className="text-sm text-gray-500 font-mono">{sale.invoice_barcode}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {format(new Date(sale.created_at), 'dd/MM/yyyy', { locale: es })}
                            </div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(sale.created_at), 'HH:mm', { locale: es })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {sale.customer?.name || sale.customer_name || 'Cliente Anónimo'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {sale.customer?.email || sale.customer_email || 'Sin email'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {sale.sale_items?.length || 0} productos
                            </div>
                            <div className="text-sm text-gray-500">
                              {sale.sale_items?.reduce((sum, item) => sum + item.quantity, 0) || 0} unidades
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {sale.payment_method === 'cash' ? '💵 Efectivo' :
                               sale.payment_method === 'card' ? '💳 Tarjeta' :
                               sale.payment_method === 'nequi' ? '📱 NEQUI' :
                               sale.payment_method === 'daviplata' ? '📱 DAVIPLATA' :
                               sale.payment_method === 'bancolombia' ? '📱 BANCOLOMBIA' :
                               sale.payment_method === 'transfer' ? '📱 Transferencia' :
                               sale.payment_method}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              ${sale.subtotal.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {sale.discount_amount > 0 ? (
                              <div className="text-sm font-medium text-red-600">
                                -${sale.discount_amount.toLocaleString()}
                                {sale.discount_type === 'percentage' && (
                                  <div className="text-xs text-red-500">
                                    ({sale.discount_percentage}%)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">-</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-green-600">
                              ${sale.total.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                              sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {sale.status === 'completed' ? 'Completada' :
                               sale.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filteredSales.length === 0 && (
                  <div className="text-center py-12">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No se encontraron ventas en el período seleccionado.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Análisis de Productos</h2>
              
              {/* Productos con bajo stock */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Productos con Stock Bajo</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products
                    .filter(product => product.stock_quantity <= product.min_stock)
                    .map(product => (
                      <div key={product.id} className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-sm text-orange-600">
                            Stock: {product.stock_quantity} / Mín: {product.min_stock}
                          </span>
                          <span className="text-sm font-medium text-green-600">
                            ${product.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
                {products.filter(product => product.stock_quantity <= product.min_stock).length === 0 && (
                  <p className="text-gray-500 text-center py-4">Todos los productos tienen stock suficiente</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Análisis de Clientes</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Tipo</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Personas Físicas:</span>
                      <span className="font-bold text-blue-600">
                        {customers.filter(c => c.customer_type === 'individual').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Empresas:</span>
                      <span className="font-bold text-purple-600">
                        {customers.filter(c => c.customer_type === 'business').length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas Generales</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Clientes:</span>
                      <span className="font-bold text-green-600">{customers.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Con Email:</span>
                      <span className="font-bold text-blue-600">
                        {customers.filter(c => c.email).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Con Teléfono:</span>
                      <span className="font-bold text-orange-600">
                        {customers.filter(c => c.phone).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'installments' && (
            <InstallmentSalesReport 
              dateFilter={dateFilter}
              onEditSale={() => {}}
              onDeleteSale={() => {}}
            />
          )}

          {activeTab === 'custom' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Reportes Personalizados</h2>
                <button
                  onClick={() => setShowReportForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear Reporte</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map(report => (
                  <div key={report.id} className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                      </div>
                      <button
                        onClick={() => handleToggleFavorite(report.id, report.is_favorite)}
                        className="text-gray-400 hover:text-yellow-500 transition-colors"
                      >
                        {report.is_favorite ? (
                          <Star className="h-5 w-5 text-yellow-500 fill-current" />
                        ) : (
                          <StarOff className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tipo:</span>
                        <span className="font-medium capitalize">{report.type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Creado:</span>
                        <span className="font-medium">
                          {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: es })}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditReport(report)}
                        className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg font-medium hover:bg-blue-100 transition-colors flex items-center justify-center space-x-1"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center space-x-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {reports.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reportes personalizados</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Crea tu primer reporte personalizado para analizar datos específicos.
                  </p>
                  <button
                    onClick={() => setShowReportForm(true)}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Crear Primer Reporte
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal del formulario de reporte */}
      {showReportForm && (
        <ReportForm
          report={editingReport}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowReportForm(false);
            setEditingReport(null);
          }}
        />
      )}
    </div>
  );
}