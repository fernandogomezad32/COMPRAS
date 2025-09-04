import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  DollarSign, 
  User, 
  CreditCard,
  Package,
  Plus,
  Minus,
  Trash2,
  Calculator
} from 'lucide-react';
import { installmentService } from '../services/installmentService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import type { Customer, Product, CartItem } from '../types';

interface InstallmentSalesFormProps {
  onSubmit: () => void;
  onCancel: () => void;
}

export function InstallmentSalesForm({ onSubmit, onCancel }: InstallmentSalesFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    installment_type: 'monthly' as 'daily' | 'weekly' | 'monthly',
    installment_count: 12,
    start_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [customersData, productsData] = await Promise.all([
        customerService.getAll(),
        productService.getAll()
      ]);
      setCustomers(customersData);
      setProducts(productsData.filter(p => p.stock_quantity > 0 && p.status === 'active'));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock_quantity) {
        setCart(cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId);
      return;
    }

    const product = cart.find(item => item.product.id === productId)?.product;
    if (product && quantity <= product.stock_quantity) {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const calculateTotals = () => {
    const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const installmentAmount = total / formData.installment_count;
    return { total, installmentAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }
    if (!formData.customer_id) {
      setError('Debe seleccionar un cliente');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await installmentService.create({
        customer_id: formData.customer_id,
        items: cart,
        installment_type: formData.installment_type,
        installment_count: formData.installment_count,
        start_date: formData.start_date,
        notes: formData.notes
      });

      onSubmit();
    } catch (err: any) {
      setError(err.message || 'Error al crear la venta por abonos');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'installment_count' ? parseInt(value) || 1 : value 
    }));
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.includes(searchTerm)
  );

  const { total, installmentAmount } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Nueva Venta por Abonos</span>
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Lado izquierdo: Productos */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Seleccionar Productos</h3>
                
                {/* Búsqueda de productos */}
                <div className="relative mb-4">
                  <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Lista de productos */}
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => addToCart(product)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">Stock: {product.stock_quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">${product.price.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{product.category?.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carrito */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Productos Seleccionados</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.product.name}</div>
                        <div className="text-sm text-gray-600">${item.product.price.toLocaleString()} c/u</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock_quantity}
                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No hay productos seleccionados</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lado derecho: Configuración */}
            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Cliente */}
                <div>
                  <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Cliente *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      id="customer_id"
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Seleccionar cliente</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} - {customer.email || customer.phone || 'Sin contacto'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Solo clientes registrados pueden acceder a ventas por abonos
                  </p>
                </div>

                {/* Tipo de abono */}
                <div>
                  <label htmlFor="installment_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Frecuencia de Pago *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      id="installment_type"
                      name="installment_type"
                      value={formData.installment_type}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="daily">📅 Diario</option>
                      <option value="weekly">📅 Semanal</option>
                      <option value="monthly">📅 Mensual</option>
                    </select>
                  </div>
                </div>

                {/* Número de abonos */}
                <div>
                  <label htmlFor="installment_count" className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Abonos *
                  </label>
                  <div className="relative">
                    <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      id="installment_count"
                      name="installment_count"
                      value={formData.installment_count}
                      onChange={handleChange}
                      min="2"
                      max="60"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Entre 2 y 60 abonos
                  </p>
                </div>

                {/* Fecha de inicio */}
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Notas */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notas
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Notas adicionales sobre el plan de abonos..."
                  />
                </div>

                {/* Resumen de cálculos */}
                {cart.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Resumen del Plan de Abonos
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Total de la venta:</span>
                        <span className="font-bold text-blue-900">${total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Número de abonos:</span>
                        <span className="font-medium text-blue-900">{formData.installment_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Frecuencia:</span>
                        <span className="font-medium text-blue-900">
                          {formData.installment_type === 'daily' ? 'Diario' :
                           formData.installment_type === 'weekly' ? 'Semanal' : 'Mensual'}
                        </span>
                      </div>
                      <div className="border-t border-blue-200 pt-2">
                        <div className="flex justify-between">
                          <span className="text-blue-700 font-medium">Monto por abono:</span>
                          <span className="font-bold text-green-600 text-lg">
                            ${installmentAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Productos en el carrito */}
                {cart.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Productos Incluidos</h4>
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {item.product.name} x{item.quantity}
                          </span>
                          <span className="font-medium text-gray-900">
                            ${(item.product.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || cart.length === 0 || !formData.customer_id}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? 'Creando...' : 'Crear Venta por Abonos'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}