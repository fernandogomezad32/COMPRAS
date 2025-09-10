import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Star,
  StarOff,
  Calendar,
  Filter,
  Download,
  Eye,
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { reportService } from '../services/reportService';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { supplierService } from '../services/supplierService';
import { ReportForm } from './ReportForm';
import type { Report } from '../types';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, typeFilter]);

  const loadReports = async () => {
    try {
      const data = await reportService.getAll();
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter) {
      filtered = filtered.filter(report => report.type === typeFilter);
    }

    setFilteredReports(filtered);
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setShowForm(true);
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este reporte?')) return;

    try {
      await reportService.delete(reportId);
      await loadReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Error al eliminar el reporte');
    }
  };

  const handleToggleFavorite = async (reportId: string, isFavorite: boolean) => {
    try {
      await reportService.toggleFavorite(reportId, !isFavorite);
      await loadReports();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setEditingReport(null);
    await loadReports();
  };

  const getDateRange = (report: Report) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (report.date_range.period) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
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
        startDate = report.date_range.start_date ? new Date(report.date_range.start_date) : startOfMonth(now);
        endDate = report.date_range.end_date ? new Date(report.date_range.end_date) : endOfMonth(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return { startDate, endDate };
  };

  const generateReportData = async (report: Report) => {
    setLoadingData(true);
    try {
      const { startDate, endDate } = getDateRange(report);
      
      switch (report.type) {
        case 'sales':
          return await generateSalesReport(startDate, endDate);
        case 'inventory':
          return await generateInventoryReport();
        case 'customers':
          return await generateCustomersReport();
        case 'suppliers':
          return await generateSuppliersReport();
        default:
          return await generateCustomReport(report, startDate, endDate);
      }
    } catch (error) {
      console.error('Error generating report data:', error);
      return null;
    } finally {
      setLoadingData(false);
    }
  };

  const generateSalesReport = async (startDate: Date, endDate: Date) => {
    const sales = await saleService.getAll();
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= startDate && saleDate <= endDate;
    });

    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Ventas por día
    const salesByDay = filteredSales.reduce((acc, sale) => {
      const day = format(new Date(sale.created_at), 'yyyy-MM-dd');
      acc[day] = (acc[day] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    // Productos más vendidos
    const productSales = filteredSales.flatMap(sale => sale.sale_items || [])
      .reduce((acc, item) => {
        const productName = item.product?.name || 'Producto eliminado';
        acc[productName] = (acc[productName] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>);

    const topProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    return {
      summary: {
        totalSales,
        totalRevenue,
        averageTicket,
        period: `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`
      },
      salesByDay,
      topProducts,
      sales: filteredSales
    };
  };

  const generateInventoryReport = async () => {
    const products = await productService.getAll();
    const lowStockProducts = await productService.getLowStock();

    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'active').length;
    const totalValue = products.reduce((sum, product) => sum + (product.price * product.stock_quantity), 0);
    const totalCost = products.reduce((sum, product) => sum + (product.cost * product.stock_quantity), 0);

    // Productos por categoría
    const productsByCategory = products.reduce((acc, product) => {
      const category = product.category?.name || 'Sin categoría';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalProducts,
        activeProducts,
        lowStockCount: lowStockProducts.length,
        totalValue,
        totalCost,
        potentialProfit: totalValue - totalCost
      },
      productsByCategory,
      lowStockProducts,
      products
    };
  };

  const generateCustomersReport = async () => {
    const customers = await customerService.getAll();
    const stats = await customerService.getStats();

    const totalCustomers = customers.length;
    const businessCustomers = customers.filter(c => c.customer_type === 'business').length;
    const individualCustomers = customers.filter(c => c.customer_type === 'individual').length;

    // Clientes por ciudad
    const customersByCity = customers.reduce((acc, customer) => {
      const city = customer.city || 'Sin especificar';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalCustomers,
        businessCustomers,
        individualCustomers,
        newThisMonth: stats.newCustomersThisMonth
      },
      customersByCity,
      topCustomers: stats.topCustomers,
      customers
    };
  };

  const generateSuppliersReport = async () => {
    const suppliers = await supplierService.getAll();
    const stats = await supplierService.getStats();

    // Proveedores por ciudad
    const suppliersByCity = suppliers.reduce((acc, supplier) => {
      const city = supplier.city || 'Sin especificar';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      summary: {
        totalSuppliers: stats.totalSuppliers,
        activeSuppliers: stats.activeSuppliers,
        inactiveSuppliers: stats.inactiveSuppliers
      },
      suppliersByCity,
      suppliers
    };
  };

  const generateCustomReport = async (report: Report, startDate: Date, endDate: Date) => {
    // Para reportes personalizados, combinar datos de diferentes fuentes
    const [sales, products, customers] = await Promise.all([
      saleService.getAll(),
      productService.getAll(),
      customerService.getAll()
    ]);

    return {
      summary: {
        reportName: report.name,
        period: `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
        generatedAt: new Date().toISOString()
      },
      sales: sales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= startDate && saleDate <= endDate;
      }),
      products,
      customers
    };
  };

  const handleViewReport = async (report: Report) => {
    setSelectedReport(report);
    const data = await generateReportData(report);
    setReportData(data);
  };

  const handleExportReport = async (report: Report, format: 'excel' | 'csv' = 'excel') => {
    const data = await generateReportData(report);
    if (!data) return;

    const workbook = XLSX.utils.book_new();

    // Hoja de resumen
    const summaryData = Object.entries(data.summary).map(([key, value]) => ({
      Campo: key,
      Valor: value
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Hojas específicas según el tipo de reporte
    if (report.type === 'sales' && data.sales) {
      const salesSheet = XLSX.utils.json_to_sheet(data.sales.map((sale: any) => ({
        'Número de Factura': sale.invoice_number,
        'Fecha': format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm'),
        'Cliente': sale.customer?.name || sale.customer_name,
        'Total': sale.total,
        'Método de Pago': sale.payment_method,
        'Estado': sale.status
      })));
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Ventas');
    }

    if (report.type === 'inventory' && data.products) {
      const inventorySheet = XLSX.utils.json_to_sheet(data.products.map((product: any) => ({
        'Nombre': product.name,
        'Categoría': product.category?.name || 'Sin categoría',
        'Precio': product.price,
        'Costo': product.cost,
        'Stock': product.stock_quantity,
        'Stock Mínimo': product.min_stock,
        'Estado': product.status
      })));
      XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventario');
    }

    if (report.type === 'customers' && data.customers) {
      const customersSheet = XLSX.utils.json_to_sheet(data.customers.map((customer: any) => ({
        'Nombre': customer.name,
        'Email': customer.email || '',
        'Teléfono': customer.phone || '',
        'Ciudad': customer.city || '',
        'Tipo': customer.customer_type === 'business' ? 'Empresa' : 'Persona Física',
        'Fecha de Registro': format(new Date(customer.created_at), 'dd/MM/yyyy')
      })));
      XLSX.utils.book_append_sheet(workbook, customersSheet, 'Clientes');
    }

    // Generar archivo
    const fileName = `${report.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const getTypeIcon = (type: Report['type']) => {
    switch (type) {
      case 'sales': return <ShoppingCart className="h-4 w-4" />;
      case 'inventory': return <Package className="h-4 w-4" />;
      case 'customers': return <Users className="h-4 w-4" />;
      case 'suppliers': return <TrendingUp className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: Report['type']) => {
    switch (type) {
      case 'sales': return 'Ventas';
      case 'inventory': return 'Inventario';
      case 'customers': return 'Clientes';
      case 'suppliers': return 'Proveedores';
      default: return 'Personalizado';
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600 mt-1">Genera y gestiona reportes de tu negocio</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nuevo Reporte</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reportes</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{reports.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Favoritos</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                {reports.filter(r => r.is_favorite).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reportes de Ventas</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {reports.filter(r => r.type === 'sales').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reportes de Inventario</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">
                {reports.filter(r => r.type === 'inventory').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar reportes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="">Todos los tipos</option>
              <option value="sales">Ventas</option>
              <option value="inventory">Inventario</option>
              <option value="customers">Clientes</option>
              <option value="suppliers">Proveedores</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <BarChart3 className="h-4 w-4" />
            <span>{filteredReports.length} reportes encontrados</span>
          </div>
        </div>
      </div>

      {/* Lista de Reportes */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Reporte
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Creado
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        {getTypeIcon(report.type)}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900">{report.name}</div>
                          {report.is_favorite && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{report.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getTypeIcon(report.type)}
                      <span>{getTypeLabel(report.type)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.date_range.period === 'custom' && report.date_range.start_date && report.date_range.end_date
                        ? `${format(new Date(report.date_range.start_date), 'dd/MM/yyyy')} - ${format(new Date(report.date_range.end_date), 'dd/MM/yyyy')}`
                        : report.date_range.period === 'today' ? 'Hoy'
                        : report.date_range.period === 'week' ? 'Esta semana'
                        : report.date_range.period === 'month' ? 'Este mes'
                        : report.date_range.period === 'year' ? 'Este año'
                        : 'Personalizado'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleToggleFavorite(report.id, report.is_favorite)}
                        className={`p-2 hover:bg-yellow-50 rounded-lg transition-colors ${
                          report.is_favorite ? 'text-yellow-600' : 'text-gray-400 hover:text-yellow-600'
                        }`}
                        title={report.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      >
                        {report.is_favorite ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleViewReport(report)}
                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver reporte"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleExportReport(report)}
                        className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                        title="Exportar a Excel"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(report)}
                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
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
        
        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reportes</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || typeFilter 
                ? 'No se encontraron reportes con los filtros aplicados.'
                : 'Comienza creando tu primer reporte.'
              }
            </p>
            {!searchTerm && !typeFilter && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Crear Primer Reporte
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de vista de reporte */}
      {selectedReport && reportData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                {getTypeIcon(selectedReport.type)}
                <span>{selectedReport.name}</span>
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExportReport(selectedReport)}
                  className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                  title="Exportar"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setReportData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {loadingData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Resumen */}
                  <div className="bg-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-blue-900 mb-4">Resumen</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(reportData.summary).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                          </div>
                          <div className="text-sm text-blue-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Datos específicos del reporte */}
                  {selectedReport.type === 'sales' && reportData.topProducts && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Productos Más Vendidos</h3>
                      <div className="space-y-2">
                        {reportData.topProducts.slice(0, 5).map(([product, quantity]: [string, number]) => (
                          <div key={product} className="flex justify-between items-center">
                            <span className="text-gray-700">{product}</span>
                            <span className="font-medium text-gray-900">{quantity} unidades</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedReport.type === 'inventory' && reportData.lowStockProducts && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Productos con Stock Bajo</h3>
                      <div className="space-y-2">
                        {reportData.lowStockProducts.slice(0, 10).map((product: any) => (
                          <div key={product.id} className="flex justify-between items-center">
                            <span className="text-gray-700">{product.name}</span>
                            <span className="text-red-600 font-medium">
                              {product.stock_quantity} / {product.min_stock}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal del formulario */}
      {showForm && (
        <ReportForm
          report={editingReport}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingReport(null);
          }}
        />
      )}
    </div>
  );
}