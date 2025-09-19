import React, { useState } from 'react';
import { 
  Menu, 
  X, 
  Home, 
  Package, 
  Tag,
  ShoppingCart, 
  BarChart3, 
  Users,
  Building,
  LogOut,
  Store,
  RotateCcw,
  FileText,
  Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('employee');
  const { signOut, user } = useAuth();

  // Load user role on component mount
  React.useEffect(() => {
    const loadUserRole = async () => {
      try {
        const role = await userService.getCurrentUserRole();
        setUserRole(role);
      } catch (error) {
        console.error('Error loading user role:', error);
        setUserRole('employee'); // Default to employee on error
      }
    };

    if (user) {
      loadUserRole();
    }
  }, [user]);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'products', name: 'Productos', icon: Package },
    { id: 'categories', name: 'Categorías', icon: Tag },
    { id: 'customers', name: 'Clientes', icon: Users },
    { id: 'suppliers', name: 'Proveedores', icon: Building },
    { id: 'sales', name: 'Ventas', icon: ShoppingCart },
    { id: 'installments', name: 'Ventas por Abonos', icon: Calendar },
    { id: 'returns', name: 'Devoluciones', icon: RotateCcw },
    { id: 'invoices', name: 'Facturas', icon: FileText },
    { id: 'users', name: 'Usuarios', icon: Users },
    { id: 'reports', name: 'Reportes', icon: BarChart3 },
  ];

  // Filter navigation based on user role
  const getFilteredNavigation = () => {
    const baseNavigation = [
      { id: 'dashboard', name: 'Dashboard', icon: Home },
      { id: 'sales', name: 'Ventas', icon: ShoppingCart },
      { id: 'invoices', name: 'Facturas', icon: FileText },
    ];

    const adminNavigation = [
      { id: 'products', name: 'Productos', icon: Package },
      { id: 'categories', name: 'Categorías', icon: Tag },
      { id: 'customers', name: 'Clientes', icon: Users },
      { id: 'suppliers', name: 'Proveedores', icon: Building },
      { id: 'installments', name: 'Ventas por Abonos', icon: Calendar },
      { id: 'returns', name: 'Devoluciones', icon: RotateCcw },
      { id: 'reports', name: 'Reportes', icon: BarChart3 },
    ];

    const superAdminNavigation = [
      { id: 'users', name: 'Usuarios', icon: Users },
    ];

    switch (userRole) {
      case 'super_admin':
        return [...baseNavigation, ...adminNavigation, ...superAdminNavigation];
      case 'admin':
        return [...baseNavigation, ...adminNavigation];
      case 'employee':
      default:
        return baseNavigation;
    }
  };

  const filteredNavigation = getFilteredNavigation();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <SidebarContent 
              navigation={filteredNavigation}
              activeTab={activeTab}
              onTabChange={onTabChange}
              onSignOut={handleSignOut}
              user={user}
              userRole={userRole}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64 bg-white shadow-lg">
          <SidebarContent 
            navigation={filteredNavigation}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onSignOut={handleSignOut}
            user={user}
            userRole={userRole}
          />
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header móvil */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2">
              <Store className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">VentasPro</h1>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  navigation: Array<{
    id: string;
    name: string;
    icon: React.ComponentType<any>;
  }>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  user: any;
  userRole: string;
  onClose?: () => void;
}

function SidebarContent({ navigation, activeTab, onTabChange, onSignOut, user, userRole, onClose }: SidebarContentProps) {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Super Admin</span>;
      case 'admin':
        return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Admin</span>;
      case 'employee':
        return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Empleado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Store className="h-8 w-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">VentasPro</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                onClose?.();
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : ''}`} />
              <span className="font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* User info y logout */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email}
            </p>
            <div className="mt-1">
              {getRoleBadge(userRole)}
            </div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center space-x-3 px-4 py-2 text-left rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}