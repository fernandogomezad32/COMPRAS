import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  Clock,
  DollarSign,
  Package,
  AlertTriangle,
  Filter,
  Eye
} from 'lucide-react';
import { returnService } from '../services/returnService';
import { saleService } from '../services/saleService';
import type { Return, Sale } from '../types';
import { ReturnForm } from './ReturnForm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function ReturnsManagement() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<Return[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showSaleSelector, setShowSaleSelector] = useState(false);
  const [editingReturn, setEditingReturn] = useState<Return | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [stats, setStats] = useState({
    totalReturns: 0,
    pendingReturns: 0,
    completedReturns: 0,
    totalRefundAmount: 0,
    returnsByType: {} as Record<string, number>,
    returnsByReason: {} as Record<string, number>
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterReturns();
  }, [returns, searchTerm, statusFilter, typeFilter]);

  const loadData = async () => {
    try {
      const [returnsData, salesData, statsData] = await Promise.all([
        returnService.getAll(),
        saleService.getAll(),
        returnService.getStats()
      ]);
      setReturns(returnsData);
      setSales(salesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading returns data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReturns = () => {
    let filtered = returns;

    if (searchTerm) {
      filtered = filtered.filter(returnItem =>
        returnItem.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        returnItem.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        returnItem.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(returnItem => returnItem.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(returnItem => returnItem.return_type === typeFilter);
    }

    setFilteredReturns(filtered);
  };

  const handleEdit = (returnItem: Return) => {
    setEditingReturn(returnItem);
    setSelectedSale(returnItem.sale || null);
    setShowForm(true);
  };

  const handleDelete = async (returnId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta devolución?')) return;

    try {
      await returnService.delete(returnId);
      await loadData();
    } catch (error) {
      console.error('Error deleting return:', error);
      alert('Error al eliminar la devolución');
    }
  };

  const handleStatusUpdate = async (returnId: string, status: Return['status']) => {
    try {
      await returnService.updateStatus(returnId, status);
      await loadData();
    } catch (error) {
      console.error('Error updating return status:', error);
      alert('Error al actualizar el estado de la devolución');
    }
  };

  const handleNewReturn = () => {
    setShowSaleSelector(true);
  };

  const handleSaleSelect = (sale: Sale) => {
    setSelectedSale(sale);
    setShowSaleSelector(false);
    setShowForm(true);
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setShowSaleSelector(false);
    setEditingReturn(null);
    setSelectedSale(null);
    await loadData();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setShowSaleSelector(false);
    setEditingReturn(null);
    setSelectedSale(null);
  };

  const getStatusIcon = (status: Return['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <Check className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      case 'completed': return <Check className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Return['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: Return['return_type']) => {
    switch (type) {
      case 'refund': return '💰';
      case 'exchange': return '🔄';
      case 'warranty': return '🛡️';
      default: return '📦';
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
          <h1 className="text-3xl font-bold text-gray-900">Devoluciones y Garantías</h1>
          <p className="text-gray-600 mt-1">Gestiona devoluciones, intercambios y garantías</p>
        </div>
        <button
          onClick={handleNewReturn}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nueva Devolución</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Devoluciones</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalReturns}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <RotateCcw className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.pendingReturns}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{stats.completedReturns}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reembolsado</p>
              <p className="text-2xl font-bold text-red-600 mt-2">${stats.totalRefundAmount.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar devoluciones..."
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
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobada</option>
              <option value="rejected">Rechazada</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>
          <div className="relative">
            <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="">Todos los tipos</option>
              <option value="refund">Reembolso</option>
              <option value="exchange">Intercambio</option>
              <option value="warranty">Garantía</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <RotateCcw className="h-4 w-4" />
            <span>{filteredReturns.length} devoluciones encontradas</span>
          </div>
        </div>
      </div>

      {/* Lista de Devoluciones */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Motivo
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Reembolso
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReturns.map((returnItem) => (
                <tr key={returnItem.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {returnItem.product?.name || 'Producto eliminado'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Condición: {returnItem.condition}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {returnItem.customer?.name || 'Cliente eliminado'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {returnItem.customer?.email || returnItem.customer?.phone || 'Sin contacto'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <span>{getTypeIcon(returnItem.return_type)}</span>
                      <span className="capitalize">{returnItem.return_type}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {returnItem.quantity_returned} unidades
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {returnItem.reason}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                      {getStatusIcon(returnItem.status)}
                      <span className="capitalize">{returnItem.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ${returnItem.refund_amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(returnItem.return_date), 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {returnItem.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(returnItem.id, 'approved')}
                            className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                            title="Aprobar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(returnItem.id, 'rejected')}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rechazar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {returnItem.status === 'approved' && (
                        <button
                          onClick={() => handleStatusUpdate(returnItem.id, 'completed')}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Completar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(returnItem)}
                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(returnItem.id)}
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
        
        {filteredReturns.length === 0 && (
          <div className="text-center py-12">
            <RotateCcw className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay devoluciones</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter || typeFilter 
                ? 'No se encontraron devoluciones con los filtros aplicados.'
                : 'No se han registrado devoluciones aún.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal selector de venta */}
      {showSaleSelector && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Seleccionar Venta</h2>
              <button
                onClick={() => setShowSaleSelector(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {sales.slice(0, 20).map((sale) => (
                  <div
                    key={sale.id}
                    onClick={() => handleSaleSelect(sale)}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {sale.customer?.name || sale.customer_name || 'Cliente anónimo'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {sale.sale_items?.length || 0} productos - Total: ${sale.total.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-blue-600">
                          Ver detalles
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal del formulario */}
      {showForm && (
        <ReturnForm
          returnItem={editingReturn}
          sale={selectedSale}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}