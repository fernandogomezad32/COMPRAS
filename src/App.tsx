import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { userService } from './services/userService';
import { Layout } from './components/Layout';
import { AuthForm } from './components/AuthForm';
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
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<string>('employee');

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      if (user) {
        try {
          const role = await userService.getCurrentUserRole();
          console.log('🔍 [App.tsx] User role loaded:', role, 'for user:', user.email);
          setUserRole(role);
        } catch (error) {
          console.error('Error loading user role:', error);
          console.log('🚨 [App.tsx] Defaulting to employee role due to error');
          setUserRole('employee');
        }
      }
    };

    loadUserRole();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">VentasPro</h2>
          <p className="text-gray-600">Cargando sistema...</p>
          <div className="mt-4 text-xs text-gray-500">
            Si la carga toma mucho tiempo, verifica tu conexión a internet
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderContent = () => {
    console.log('🎯 [App.tsx] Rendering content for tab:', activeTab, 'with role:', userRole);
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <ProductManagement />;
      case 'categories':
        const canAccessCategories = userRole === 'admin' || userRole === 'super_admin';
        console.log('🔐 [App.tsx] Categories access check:', canAccessCategories, 'for role:', userRole);
        return canAccessCategories ? <CategoryManagement /> : <Dashboard />;
      case 'customers':
        return <CustomerManagement />;
      case 'suppliers':
        const canAccessSuppliers = userRole === 'admin' || userRole === 'super_admin';
        console.log('🔐 [App.tsx] Suppliers access check:', canAccessSuppliers, 'for role:', userRole);
        return canAccessSuppliers ? <SupplierManagement /> : <Dashboard />;
      case 'sales':
        return <SalesManagement />;
      case 'reports':
        return <Reports />;
      case 'returns':
        const canAccessReturns = userRole === 'admin' || userRole === 'super_admin';
        console.log('🔐 [App.tsx] Returns access check:', canAccessReturns, 'for role:', userRole);
        return canAccessReturns ? <ReturnsManagement /> : <Dashboard />;
      case 'installments':
        const canAccessInstallments = userRole === 'admin' || userRole === 'super_admin';
        console.log('🔐 [App.tsx] Installments access check:', canAccessInstallments, 'for role:', userRole);
        return canAccessInstallments ? <InstallmentManagement /> : <Dashboard />;
      case 'invoices':
        return <InvoiceSearch />;
      case 'users':
        const canAccessUsers = userRole === 'super_admin';
        console.log('🔐 [App.tsx] Users access check:', canAccessUsers, 'for role:', userRole);
        // Allow admin users to access user repair functionality
        return (canAccessUsers || userRole === 'admin') ? <UserManagement /> : <Dashboard />;
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