import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Search, 
  CreditCard,
  Trash2,
  DollarSign,
  Users,
  Building,
  UserPlus
} from 'lucide-react';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { saleService } from '../services/saleService';
import type { Product, CartItem, Customer } from '../types';

export function SalesManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: ''
  });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm]);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data.filter(p => p.stock_quantity > 0));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const filterProducts = () => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.includes(searchTerm)
    );
    setFilteredProducts(filtered);
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

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerInfo({
      name: customer.name,
      email: customer.email || ''
    });
    setShowCustomerSearch(false);
    setCustomerSearch('');
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerInfo({ name: '', email: '' });
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const total = subtotal;
    
    return { subtotal, total };
  };

  const processSale = async () => {
    if (cart.length === 0) return;
    
    setLoading(true);
    setError(null);

    try {
      await saleService.create({
        items: cart,
        customer_id: selectedCustomer?.id,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        payment_method: paymentMethod
      });

      // Reset form
      setCart([]);
      setSelectedCustomer(null);
      setCustomerInfo({ name: '', email: '' });
      setSearchTerm('');
      await loadProducts(); // Recargar productos para actualizar stock
      
      alert('¡Venta procesada exitosamente!');
    } catch (err: any) {
      setError(err.message || 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, total } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Punto de Venta</h1>
        <p className="text-gray-600 mt-1">Procesa ventas y gestiona el carrito de compras</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Productos */}
        <div className="lg:col-span-2 space-y-6">
          {/* Búsqueda */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Grid de Productos */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos Disponibles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 text-sm">{product.name}</h3>
                    <span className="text-green-600 font-bold text-sm">${product.price.toLocaleString()}</span>
                  </div>
                  <p className="text-gray-600 text-xs mb-2 line-clamp-2">{product.description}</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Stock: {product.stock_quantity}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {product.category?.name || 'Sin categoría'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Carrito */}
        <div className="space-y-6">
          {/* Items del Carrito */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-2 mb-4">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Carrito</h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                {cart.length}
              </span>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h3>
                    <p className="text-sm text-gray-600">${item.product.price.toLocaleString()} c/u</p>
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
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>El carrito está vacío</p>
                </div>
              )}
            </div>
          </div>

          {/* Información del Cliente */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Cliente</h2>
            
            {selectedCustomer ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {selectedCustomer.customer_type === 'business' ? (
                        <Building className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Users className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{selectedCustomer.name}</div>
                      <div className="text-sm text-gray-600">
                        {selectedCustomer.email || selectedCustomer.phone || 'Sin contacto'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={clearCustomer}
                    className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Users className="h-5 w-5 text-gray-600" />
                    <span>Buscar Cliente</span>
                  </button>
                  <button
                    onClick={() => setShowCustomerSearch(false)}
                    className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <UserPlus className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                {showCustomerSearch && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar cliente existente..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {customerSearch && (
                      <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
                        {filteredCustomers.slice(0, 5).map(customer => (
                          <button
                            key={customer.id}
                            onClick={() => selectCustomer(customer)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-sm">{customer.name}</div>
                            <div className="text-xs text-gray-500">{customer.email || customer.phone}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Nombre del cliente"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email del cliente"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="mt-4">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Venta</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${subtotal.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">${total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={processSale}
              disabled={cart.length === 0 || loading}
              className="w-full mt-6 bg-green-600 text-white py-4 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <CreditCard className="h-5 w-5" />
              <span>{loading ? 'Procesando...' : 'Procesar Venta'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}