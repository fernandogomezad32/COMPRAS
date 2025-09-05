import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Search, 
  DollarSign, 
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  CreditCard,
  Eye,
  Filter
} from 'lucide-react';
import { installmentService } from '../services/installmentService';
import { InstallmentSalesForm } from './InstallmentSalesForm';
import { InstallmentPaymentForm } from './InstallmentPaymentForm';
import type { InstallmentSale } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function InstallmentManagement() {
  const [installmentSales, setInstallmentSales] = useState<InstallmentSale[]>([]);
  const [filteredSales, setFilteredSales] = useState<InstallmentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedSale, setSelectedSale] = useState<InstallmentSale | null>(null);
  const [stats, setStats] = useState({
    totalInstallmentSales: 0,
    activeInstallmentSales: 0,
    overdueInstallmentSales: 0,
    totalAmountFinanced: 0,
    totalAmountPaid: 0,
    totalAmountPending: 0,
    paymentsToday: 0,
    paymentsThisWeek: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterSales();
  }, [installmentSales, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const [salesData, statsData] = await Promise.all([
        installmentService.getAll(),
        installmentService.getStats()
      ]);
      setInstallmentSales(salesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading installment sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = installmentSales;

    if (searchTerm) {
      filtered = filtered.filter(sale =>
        sale.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.notes.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    setFilteredSales(filtered);
  };

  const handleAddPayment = (sale: InstallmentSale) => {
    setSelectedSale(sale);
    setShowPaymentForm(true);
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setShowPaymentForm(false);
    setSelectedSale(null);
    await loadData();
  };

  const getStatusIcon = (status: InstallmentSale['status']) => {
    switch (status) {
      case 'active': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: InstallmentSale['status']) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (sale: InstallmentSale) => {
    return (sale.paid_amount / sale.total_amount) * 100;
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
          <h1 className="text-3xl font-bold text-gray-900">Ventas por Abonos</h1>
          <p className="text-gray-600 mt-1">Gestiona ventas a crédito y pagos por cuotas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nueva Venta por Abonos</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ventas por Abonos</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalInstallmentSales}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Activas</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{stats.activeInstallmentSales}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vencidas</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{stats.overdueInstallmentSales}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monto Pendiente</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">${stats.totalAmountPending.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-orange-600" />
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
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="completed">Completadas</option>
              <option value="overdue">Vencidas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{filteredSales.length} ventas por abonos</span>
          </div>
        </div>
      </div>

      {/* Lista de Ventas por Abonos */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Plan de Abonos
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Montos
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Próximo Pago
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => {
                const progressPercentage = getProgressPercentage(sale);
                const isOverdue = new Date(sale.next_payment_date) < new Date() && sale.status === 'active';
                
                return (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {sale.customer?.name || 'Cliente eliminado'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sale.customer?.email || sale.customer?.phone || 'Sin contacto'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">
                          {sale.installment_count} abonos {
                            sale.installment_type === 'daily' ? 'diarios' :
                            sale.installment_type === 'weekly' ? 'semanales' : 'mensuales'
                          }
                        </div>
                        <div className="text-gray-500">
                          ${sale.installment_amount.toLocaleString()} por abono
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {sale.paid_installments} / {sale.installment_count}
                          </span>
                          <span className="font-medium">
                            {progressPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              progressPercentage === 100 ? 'bg-green-500' :
                              progressPercentage >= 75 ? 'bg-blue-500' :
                              progressPercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-gray-900 font-medium">
                          Total: ${sale.total_amount.toLocaleString()}
                        </div>
                        <div className="text-green-600">
                          Pagado: ${sale.paid_amount.toLocaleString()}
                        </div>
                        <div className="text-orange-600">
                          Pendiente: ${sale.remaining_amount.toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                          {format(new Date(sale.next_payment_date), 'dd/MM/yyyy', { locale: es })}
                        </div>
                        <div className="text-gray-500">
                          ${sale.installment_amount.toLocaleString()}
                        </div>
                        {isOverdue && (
                          <div className="text-red-500 text-xs font-medium">
                            ⚠️ Vencido
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                        {getStatusIcon(sale.status)}
                        <span className="capitalize">
                          {sale.status === 'active' ? 'Activa' :
                           sale.status === 'completed' ? 'Completada' :
                           sale.status === 'overdue' ? 'Vencida' : 'Cancelada'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {(sale.status === 'active' || sale.status === 'overdue') && (
                          <button
                            onClick={() => handleAddPayment(sale)}
                            className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                            title="Registrar pago"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredSales.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas por abonos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter 
                ? 'No se encontraron ventas con los filtros aplicados.'
                : 'Comienza creando tu primera venta por abonos.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal del formulario */}
      {showForm && (
        <InstallmentSalesForm
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Modal de pago */}
      {showPaymentForm && selectedSale && (
        <InstallmentPaymentForm
          installmentSale={selectedSale}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowPaymentForm(false);
            setSelectedSale(null);
          }}
        />
      )}
    </div>
  );
}