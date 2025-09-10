import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { AuthForm } from './components/AuthForm';
import { InitialSetup } from './components/InitialSetup';
import Dashboard from './components/Dashboard';
import { ProductManagement } from './components/ProductManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { SupplierManagement } from './components/SupplierManagement';
import { CategoryManagement } from './components/CategoryManagement';
import { SalesManagement } from './components/SalesManagement';
import { Reports } from './components/Reports';
import { ReturnsManagement } from './components/ReturnsManagement';
import { InvoiceSearch } from './components/InvoiceSearch';
import { InstallmentManagement } from './components/InstallmentManagement';
import { UserManagement } from './components/UserManagement';

function App() {
  const { user, needsInitialSetup, loading, error } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando aplicación...</p>
          <p className="text-sm text-gray-500 mt-2">Si esto toma mucho tiempo, recarga la página</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error de Conexión</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Recargar Página
          </button>
        </div>
      </div>
    );
  }

  if (needsInitialSetup) {
    return <InitialSetup onComplete={() => window.location.reload()} />;
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <ProductManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'customers':
        return <CustomerManagement />;
      case 'suppliers':
        return <SupplierManagement />;
      case 'sales':
        return <SalesManagement />;
      case 'reports':
        return <Reports />;
      case 'returns':
        return <ReturnsManagement />;
      case 'installments':
        return <InstallmentManagement />;
      case 'invoices':
        return <InvoiceSearch />;
      case 'users':
        return <UserManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;