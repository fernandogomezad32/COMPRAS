import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Shield,
  ShieldCheck,
  Crown,
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Key,
  Filter
} from 'lucide-react';
import { userService } from '../services/userService';
import { UserForm } from './UserForm';
import { PasswordChangeForm } from './PasswordChangeForm';
import type { UserProfile } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState({
    canCreateUsers: false,
    canManageUsers: false,
    userRole: null as string | null
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    superAdmins: 0,
    admins: 0,
    employees: 0,
    activeUsers: 0,
    inactiveUsers: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadData = async () => {
    try {
      const [usersData, currentUserData, permissionsData, statsData] = await Promise.all([
        userService.getAll(),
        userService.getCurrentUserProfile(),
        userService.checkPermissions(),
        userService.getStats()
      ]);
      
      setUsers(usersData);
      setCurrentUser(currentUserData);
      setPermissions(permissionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleChangePassword = (user: UserProfile) => {
    setEditingUser(user);
    setShowPasswordForm(true);
  };

  const handleDelete = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;

    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${userToDelete.full_name}"?`)) return;

    try {
      await userService.deleteUser(userId);
      await loadData();
      alert('Usuario eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario: ' + error.message);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      await userService.updateUser(userId, { status: newStatus });
      await loadData();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      alert('Error al actualizar estado: ' + error.message);
    }
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setShowPasswordForm(false);
    setEditingUser(null);
    await loadData();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Crown className="h-4 w-4" />;
      case 'admin': return <ShieldCheck className="h-4 w-4" />;
      case 'employee': return <User className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Administrador';
      case 'admin': return 'Administrador';
      case 'employee': return 'Empleado';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si no es super_admin, mostrar mensaje de acceso denegado
  if (!permissions.canManageUsers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-4">
            Solo los super administradores pueden acceder a la gestión de usuarios.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Tu rol actual:</strong> {getRoleLabel(permissions.userRole || 'employee')}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Contacta a un super administrador si necesitas acceso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600 mt-1">Administra usuarios del sistema y sus roles</p>
        </div>
        {permissions.canCreateUsers && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo Usuario</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Super Admins</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">{stats.superAdmins}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Crown className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Administradores</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{stats.admins}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Empleados</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{stats.employees}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <User className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{stats.activeUsers}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactivos</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{stats.inactiveUsers}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Información del usuario actual */}
      {currentUser && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sesión Actual</h3>
              <p className="text-gray-600">
                <strong>{currentUser.full_name}</strong> - {getRoleLabel(currentUser.role)}
              </p>
              <p className="text-sm text-gray-500">{currentUser.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="">Todos los roles</option>
              <option value="super_admin">Super Administrador</option>
              <option value="admin">Administrador</option>
              <option value="employee">Empleado</option>
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{filteredUsers.length} usuarios encontrados</span>
          </div>
        </div>
      </div>

      {/* Lista de Usuarios */}
      <div className="bg-white rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Creado Por
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Registro
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user.role === 'super_admin' ? 'bg-purple-100' :
                        user.role === 'admin' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                          <span>{user.full_name}</span>
                          {user.id === currentUser?.id && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                              Tú
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span>{getRoleLabel(user.role)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>{user.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                      </span>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleStatusToggle(user.id, user.status)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            user.status === 'active' 
                              ? 'text-red-600 hover:bg-red-50' 
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {user.status === 'active' ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.created_by_profile?.full_name || 'Sistema'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.created_by_profile?.role ? getRoleLabel(user.created_by_profile.role) : 'Automático'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(new Date(user.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {user.role !== 'super_admin' && (
                        <>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar usuario"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleChangePassword(user)}
                            className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-lg transition-colors"
                            title="Cambiar contraseña"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                      {user.role === 'super_admin' && user.id !== currentUser?.id && (
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          Protegido
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || roleFilter || statusFilter 
                ? 'No se encontraron usuarios con los filtros aplicados.'
                : 'Comienza creando tu primer usuario.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal del formulario */}
      {showForm && (
        <UserForm
          user={editingUser}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Modal de cambio de contraseña */}
      {showPasswordForm && editingUser && (
        <PasswordChangeForm
          user={editingUser}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowPasswordForm(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}