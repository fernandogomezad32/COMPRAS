import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Calendar, 
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  Filter,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { returnService } from '../services/returnService';
import { installmentService } from '../services/installmentService';
import { reportService } from '../services/reportService';
import { userService } from '../services/userService';
import { ReportForm } from './ReportForm';
import { InstallmentSalesReport } from './InstallmentSalesReport';
import type { Sale, Product, Customer, Return, InstallmentSale, Report } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export function Reports() {
  const [activeReport, setActiveReport] = useState('sales');
  const [dateFilter, setDateFilter] = useState('month');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [productsData, setProductsData] = useState<Product[]>([]);
  const [customersData, setCustomersData] = useState<Customer[]>([]);
  const [returnsData, setReturnsData] = useState<Return[]>([]);
  const [installmentSalesData, setInstallmentSalesData] = useState<InstallmentSale[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [userRole, setUserRole] = useState<string>('employee');

  useEffect(() => {
    loadData();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const role = await userService.getCurrentUserRole();
      setUserRole(role);
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole('employee');
    }
  };

  const loadData = async () => {
    try {
      const [sales, products, customers, returns, installmentSales, reportsData] = await Promise.all([
        saleService.getAll(),
        productService.getAll(),
        customerService.getAll(),
        returnService.getAll(),
        installmentService.getAll(),
        reportService.getAll()
      ]);

      setSalesData(sales);
      setProductsData(products);
      setCustomersData(customers);
      setReturnsData(returns);
      setInstallmentSalesData(installmentSales);
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        };
      case 'week':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'year':
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        };
      case 'custom':
        return {
          start: customDateStart ? new Date(customDateStart) : startOfMonth(now),
          end: customDateEnd ? new Date(customDateEnd) : endOfMonth(now)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  };

  const filterDataByDate = (data: any[], dateField: string = 'created_at') => {
    const { start, end } = getDateRange();
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= start && itemDate <= end;
    });
  };

  const exportToExcel = (data: any[], filename: string) => {
    if (userRole === 'employee') {
      alert('No tienes permisos para exportar reportes. Contacta a un administrador.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleEditReport = (report: Report) => {
    if (userRole === 'employee') {
      alert('No tienes permisos para editar reportes. Contacta a un administrador.');
      return;
    }
    setEditingReport(report);
    setShowReportForm(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (userRole === 'employee') {
      alert('No tienes permisos para eliminar reportes. Contacta a un administrador.');
      return;
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este reporte?')) return;

    try {
      await reportService.delete(reportId);
      await loadData();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Error al eliminar el reporte');
    }
  };

  const handleFormSubmit = async () => {
    setShowReportForm(false);
    setEditingReport(null);
    await loadData();
  };

  const canManageReports = userRole === 'admin' || userRole === 'super_admin';
  const canExportData = userRole === 'admin' || userRole === 'super_admin';

  const renderSalesReport = () => {
    const filteredSales = filterDataByDate(salesData);
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = filteredSales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    const salesByPaymentMethod = filteredSales.reduce((acc, sale) => {
      acc[sale.payment_method] = (acc[sale.payment_method] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ventas</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{totalSales}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-green-600 mt-2">${totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Venta Promedio</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">${averageSale.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Métodos de Pago</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">{Object.keys(salesByPaymentMethod).length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        {canExportData && (
          <div className="flex justify-end">
            <button
              onClick={() => exportToExcel(filteredSales, 'reporte_ventas')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>Exportar a Excel</span>
            </button>
          </div>
        )}

        {/* Sales Table */}
        <div className="bg-white rounded-xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Ventas Detalladas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método Pago</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((saleItem) => (
                  <tr key={saleItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {saleItem.customer?.name || saleItem.customer_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {saleItem.customer?.email || saleItem.customer_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${saleItem.total.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {saleItem.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(saleItem.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        saleItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                        saleItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {saleItem.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderInventoryReport = () => {
    const lowStockProducts = productsData.filter(product => 
      product.stock_quantity <= product.min_stock
    );
    const totalProducts = productsData.length;
    const totalValue = productsData.reduce((sum, product) => 
      sum + (product.price * product.stock_quantity), 0
    );

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{totalProducts}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-red-600 mt-2">{lowStockProducts.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-green-600 mt-2">${totalValue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        {canExportData && (
          <div className="flex justify-end">
            <button
              onClick={() => exportToExcel(productsData, 'reporte_inventario')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>Exportar a Excel</span>
            </button>
          </div>
        )}

        {/* Inventory Table */}
        <div className="bg-white rounded-xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Inventario Detallado</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productsData.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {product.category?.name || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.stock_quantity}</div>
                      <div className="text-sm text-gray-500">Mín: {product.min_stock}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">${product.price.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${(product.price * product.stock_quantity).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.stock_quantity <= product.min_stock ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Stock Bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Disponible
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomersReport = () => {
    const filteredCustomers = filterDataByDate(customersData);

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{customersData.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nuevos Clientes</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{filteredCustomers.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Empresas</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {customersData.filter(c => c.customer_type === 'business').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        {canExportData && (
          <div className="flex justify-end">
            <button
              onClick={() => exportToExcel(customersData, 'reporte_clientes')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>Exportar a Excel</span>
            </button>
          </div>
        )}

        {/* Customers Table */}
        <div className="bg-white rounded-xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Clientes Registrados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customersData.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.customer_type === 'business' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {customer.customer_type === 'business' ? 'Empresa' : 'Individual'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.email || customer.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.city || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderReturnsReport = () => {
    const filteredReturns = filterDataByDate(returnsData, 'return_date');
    const totalRefunds = filteredReturns.reduce((sum, ret) => sum + ret.refund_amount, 0);

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Devoluciones</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{filteredReturns.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reembolsado</p>
                <p className="text-2xl font-bold text-red-600 mt-2">${totalRefunds.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600 mt-2">
                  {filteredReturns.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Export Button */}
        {canExportData && (
          <div className="flex justify-end">
            <button
              onClick={() => exportToExcel(filteredReturns, 'reporte_devoluciones')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="h-5 w-5" />
              <span>Exportar a Excel</span>
            </button>
          </div>
        )}

        {/* Returns Table */}
        <div className="bg-white rounded-xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Devoluciones Detalladas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reembolso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReturns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {returnItem.product?.name || 'Producto eliminado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {returnItem.customer?.name || 'Cliente eliminado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{returnItem.quantity_returned}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{returnItem.reason}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">${returnItem.refund_amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        returnItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                        returnItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {returnItem.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(returnItem.return_date), 'dd/MM/yyyy', { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSavedReports = () => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Reportes Guardados</h2>
          {canManageReports && (
            <button
              onClick={() => setShowReportForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Reporte</span>
            </button>
          )}
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-xl shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporte</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                  {canManageReports && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{report.title}</div>
                        <div className="text-sm text-gray-500">{report.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {report.report_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.date_range_start && report.date_range_end ? (
                          `${format(new Date(report.date_range_start), 'dd/MM/yyyy')} - ${format(new Date(report.date_range_end), 'dd/MM/yyyy')}`
                        ) : (
                          'Sin período específico'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    {canManageReports && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditReport(report)}
                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {reports.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reportes guardados</h3>
              <p className="mt-1 text-sm text-gray-500">Crea tu primer reporte personalizado.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter available report types based on user role
  const getAvailableReportTabs = () => {
    const baseTabs = [
      { id: 'sales', name: 'Ventas', icon: ShoppingCart }
    ];

    const adminTabs = [
      { id: 'inventory', name: 'Inventario', icon: Package },
      { id: 'customers', name: 'Clientes', icon: Users },
      { id: 'returns', name: 'Devoluciones', icon: Package },
      { id: 'installments', name: 'Abonos', icon: Calendar },
      { id: 'saved', name: 'Reportes Guardados', icon: FileText }
    ];

    if (userRole === 'employee') {
      return baseTabs;
    }
    
    return [...baseTabs, ...adminTabs];
  };

  const availableReportTabs = getAvailableReportTabs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes y Análisis</h1>
        <p className="text-gray-600 mt-1">Analiza el rendimiento de tu negocio</p>
      </div>

      {/* Report Type Tabs */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {availableReportTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeReport === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filter */}
        {activeReport !== 'saved' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
                  <input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
                  <input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Report Content */}
      {activeReport === 'sales' && renderSalesReport()}
      {activeReport === 'inventory' && userRole !== 'employee' && renderInventoryReport()}
      {activeReport === 'customers' && userRole !== 'employee' && renderCustomersReport()}
      {activeReport === 'returns' && userRole !== 'employee' && renderReturnsReport()}
      {activeReport === 'installments' && userRole !== 'employee' && (
        <InstallmentSalesReport 
          dateFilter={dateFilter}
          onEditSale={() => {}}
          onDeleteSale={() => {}}
        />
      )}
      {activeReport === 'saved' && userRole !== 'employee' && renderSavedReports()}

      {/* Report Form Modal */}
      {showReportForm && canManageReports && (
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