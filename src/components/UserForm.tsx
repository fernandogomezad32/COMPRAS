import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Eye, EyeOff } from 'lucide-react';
import { userService } from '../services/userService';
import type { UserProfile } from '../types';

interface UserFormProps {
  user: UserProfile | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'employee' as 'admin' | 'employee',
    status: 'active' as 'active' | 'inactive'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: '', // No mostrar contraseña existente
        full_name: user.full_name,
        role: user.role === 'super_admin' ? 'admin' : user.role, // No permitir cambiar a super_admin
        status: user.status
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (user) {
        // Actualizar usuario existente
        await userService.updateUser(user.id, {
          full_name: formData.full_name,
          role: formData.role,
          status: formData.status
        });
      } else {
        // Crear nuevo usuario
        if (!formData.password || formData.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        await userService.createUser({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role
        });
      }

      onSubmit();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>{user ? 'Editar Usuario' : 'Nuevo Usuario'}</span>
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="Nombre completo del usuario"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!!user} // No permitir cambiar email en edición
                placeholder="usuario@empresa.com"
              />
            </div>
            {user && (
              <p className="text-xs text-gray-500 mt-1">
                El email no se puede modificar después de crear el usuario
              </p>
            )}
          </div>

          {!user && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña *
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Rol del Usuario *
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="employee">👤 Empleado</option>
              <option value="admin">🛡️ Administrador</option>
            </select>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p><strong>Empleado:</strong> Acceso básico a ventas e inventario</p>
              <p><strong>Administrador:</strong> Acceso completo excepto gestión de usuarios</p>
            </div>
          </div>

          {user && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Estado del Usuario
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">✅ Activo</option>
                <option value="inactive">❌ Inactivo</option>
              </select>
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
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Guardando...' : user ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}