import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  DollarSign, 
  Package, 
  Users,
  TrendingUp,
  Filter,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Star,
  StarOff
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { reportService } from '../services/reportService';
import { InstallmentSalesReport } from './InstallmentSalesReport';
import { ReportForm } from './ReportForm';
import type { Sale, Product, Customer, Report } from '../types';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export function Reports() {
  const [activeTab, setActiveTab] = useState('sales');
  const [dateFilter, setDateFilter] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
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

  const getFilteredSales = () => {
    const { start, end } = getDateRange();
    return sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= start && saleDate <= end;
    });
  };

  const calculateSalesStats = () => {
    const filteredSales = getFilteredSales();
    
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    // Ventas por método de pago
    const paymentMethods = filteredSales.reduce((acc, sale) => {
      acc[sale.payment_method] = (acc[sale.payment_method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top productos vendidos
    const productSales = filteredSales.flatMap(sale => sale.sale_items || []);
    const productStats = productSales.reduce((acc, item) => {
      const productId = item.product_id;
      if (!acc[productId]) {
        acc[productId] = {
          product: item.product,
          quantity: 0,
          revenue: 0
        };
      }
      acc[productId].quantity += item.quantity;
      acc[productId].revenue += item.total_price;
      return acc;
    }, {} as Record<string, any>);

    const topProducts = Object.values(productStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalSales,
      totalRevenue,
      averageSale,
      paymentMethods,
      topProducts
    };
  };

  const calculateInventoryStats = () => {
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock).length;
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.cost * p.stock_quantity), 0);
    const totalRetailValue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);

    // Productos por categoría
    const categoryStats = products.reduce((acc, product) => {
      const categoryName = product.category?.name || 'Sin categoría';
      if (!acc[categoryName]) {
        acc[categoryName] = { count: 0, value: 0 };
      }
      acc[categoryName].count += 1;
      acc[categoryName].value += product.price * product.stock_quantity;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalInventoryValue,
      totalRetailValue,
      categoryStats
    };
  };

  const exportToExcel = (data: any[], filename: string, sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportSalesReport = () => {
    const filteredSales = getFilteredSales();
    const exportData = filteredSales.map(sale => ({
      'Número de Factura': sale.invoice_number,
      'Fecha': format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: es }),
      'Cliente': sale.customer?.name || sale.customer_name,
      'Email': sale.customer?.email || sale.customer_email || '',
      'Método de Pago': sale.payment_method,
      'Subtotal': sale.subtotal,
      'Descuento': sale.discount_amount,
      'Total': sale.total,
      'Estado': sale.status
    }));
    
    exportToExcel(exportData, 'reporte_ventas', 'Ventas');
  };

  const exportInventoryReport = () => {
    const exportData = products.map(product => ({
      'Nombre': product.name,
      'Descripción': product.description,
      'Categoría': product.category?.name || 'Sin categoría',
      'Proveedor': product.supplier?.name || 'Sin proveedor',
      'Precio': product.price,
      'Costo': product.cost,
      'Stock Actual': product.stock_quantity,
      'Stock Mínimo': product.min_stock,
      'Valor Inventario': product.cost * product.stock_quantity,
      'Valor Retail': product.price * product.stock_quantity,
      'Estado': product.status,
      'Código de Barras': product.barcode || ''
    }));
    
    exportToExcel(exportData, 'reporte_inventario', 'Inventario');
  };

  const exportCustomersReport = () => {
    const exportData = customers.map(customer => ({
      'Nombre': customer.name,
      'Email': customer.email || '',
      'Teléfono': customer.phone || '',
      'Tipo': customer.customer_type === 'business' ? 'Empresa' : 'Persona Física',
      'Ciudad': customer.city || '',
      'Dirección': customer.address || '',
      'Fecha de Registro': format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: es }),
      'Notas': customer.notes
    }));
    
    exportToExcel(exportData, 'reporte_clientes', 'Clientes');
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
      alert('Error al eliminar el reporte');
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

  // Fix for the undefined sale error - these handlers need to accept sale parameter
  const handleEditSale = (sale: Sale) => {
    // Implementation for editing sale
    console.log('Edit sale:', sale);
  };

  const handleDeleteSale = (saleId: string) => {
    // Implementation for deleting sale
    console.log('Delete sale:', saleId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const salesStats = calculateSalesStats();
  const inventoryStats = calculateInventoryStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="text-gray-600 mt-1">Analiza el rendimiento de tu negocio</p>
        </div>
        <button
          onClick={() => setShowReportForm(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nuevo Reporte</span>
        </button>
      </div>

      {/* Filtros de Fecha */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="today">Hoy</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="year">Este Año</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          
          {dateFilter === 'custom' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'sales', name: 'Ventas', icon: BarChart3 },
              { id: 'inventory', name: 'Inventario', icon: Package },
              { id: 'customers', name: 'Clientes', icon: Users },
              { id: 'installments', name: 'Ventas por Abonos', icon: Calendar },
              { id: 'custom', name: 'Reportes Personalizados', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
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

        <div className="p-6">
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Ventas</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">{salesStats.totalSales}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Ingresos Totales</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">${salesStats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Venta Promedio</p>
                      <p className="text-2xl font-bold text-purple-900 mt-2">${salesStats.averageSale.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-orange-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Productos Vendidos</p>
                      <p className="text-2xl font-bold text-orange-900 mt-2">
                        {getFilteredSales().flatMap(s => s.sale_items || []).reduce((sum, item) => sum + item.quantity, 0)}
                      </p>
                    </div>
                    <Package className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Productos Más Vendidos</h3>
                  <button
                    onClick={exportSalesReport}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Exportar</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {salesStats.topProducts.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {item.product?.name || 'Producto eliminado'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            ${item.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Inventory Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Productos</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">{inventoryStats.totalProducts}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Productos Activos</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">{inventoryStats.activeProducts}</p>
                    </div>
                    <Package className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-red-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600">Stock Bajo</p>
                      <p className="text-2xl font-bold text-red-900 mt-2">{inventoryStats.lowStockProducts}</p>
                    </div>
                    <Package className="h-8 w-8 text-red-600" />
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Valor Inventario</p>
                      <p className="text-2xl font-bold text-purple-900 mt-2">${inventoryStats.totalInventoryValue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <button
                  onClick={exportInventoryReport}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="h-5 w-5" />
                  <span>Exportar Inventario</span>
                </button>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos por Categoría</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Productos</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(inventoryStats.categoryStats).map(([category, stats]) => (
                        <tr key={category}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{category}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-900">{stats.count}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                            ${stats.value.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-6">
              {/* Customer Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Clientes</p>
                      <p className="text-2xl font-bold text-blue-900 mt-2">{customers.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Personas Físicas</p>
                      <p className="text-2xl font-bold text-green-900 mt-2">
                        {customers.filter(c => c.customer_type === 'individual').length}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Empresas</p>
                      <p className="text-2xl font-bold text-purple-900 mt-2">
                        {customers.filter(c => c.customer_type === 'business').length}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <button
                  onClick={exportCustomersReport}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="h-5 w-5" />
                  <span>Exportar Clientes</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'installments' && (
            <InstallmentSalesReport 
              dateFilter={dateFilter}
              onEditSale={handleEditSale}
              onDeleteSale={handleDeleteSale}
            />
          )}

          {activeTab === 'custom' && (
            <div className="space-y-6">
              {/* Reportes Guardados */}
              <div className="bg-white border border-gray-200 rounded-xl">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Reportes Personalizados</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium text-gray-900">{report.name}</div>
                              {report.is_favorite && (
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {report.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {report.description}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: es })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleToggleFavorite(report.id, report.is_favorite)}
                                className={`p-2 rounded-lg transition-colors ${
                                  report.is_favorite
                                    ? 'text-yellow-600 hover:bg-yellow-50'
                                    : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                                }`}
                                title={report.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                              >
                                {report.is_favorite ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleEditReport(report)}
                                className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReport(report.id)}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {reports.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reportes personalizados</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Crea tu primer reporte personalizado para analizar datos específicos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal del formulario */}
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