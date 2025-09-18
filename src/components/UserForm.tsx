import React, { useState, useEffect } from 'react';
import { X, User, Mail, Shield, Crown, Eye, EyeOff } from 'lucide-react';
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
    full_name: '',
    role: 'employee' as 'super_admin' | 'admin' | 'employee',
    status: 'active' as 'active' | 'inactive',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        password: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validaciones
      if (!user && formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      if (!user && formData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      const userData = {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        status: formData.status
      };

      if (user) {
        // Actualizar usuario existente
        try {
          await userService.update(user.id, userData);
        } catch (updateError: any) {
          throw new Error(updateError.message || 'Error al actualizar el usuario');
        }
        
        // Si se proporcionó nueva contraseña, actualizarla
        if (formData.password) {
          try {
            await userService.updatePassword(user.id, formData.password);
          } catch (passwordError: any) {
            throw new Error(passwordError.message || 'Error al actualizar la contraseña');
          }
        }
      } else {
        // Crear nuevo usuario
        try {
          await userService.create({
            ...userData,
            password: formData.password
          });
        } catch (createError: any) {
          throw new Error(createError.message || 'Error al crear el usuario');
        }
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {user ? 'Editar Usuario' : 'Nuevo Usuario'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  placeholder="usuario@empresa.com"
                  disabled={!!user} // No permitir cambiar email en edición
                />
              </div>
              {user && (
                <p className="text-xs text-gray-500 mt-1">
                  El email no se puede modificar una vez creado el usuario
                </p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Rol del Usuario *
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="employee">👤 Empleado</option>
                  <option value="admin">🛡️ Administrador</option>
                  <option value="super_admin">👑 Super Administrador</option>
                </select>
              </div>
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                <p>• <strong>Empleado:</strong> Acceso básico al sistema</p>
                <p>• <strong>Administrador:</strong> Gestión completa excepto usuarios</p>
                <p>• <strong>Super Admin:</strong> Control total del sistema</p>
              </div>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Estado *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="active">✅ Activo</option>
                <option value="inactive">❌ Inactivo</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {user ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
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
                  required={!user}
                  minLength={6}
                  placeholder={user ? 'Dejar vacío para mantener actual' : 'Mínimo 6 caracteres'}
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {user ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña *'}
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={!user || !!formData.password}
                  placeholder="Confirmar contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>
          </div>

          {/* Información de permisos */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Permisos del Rol Seleccionado</h3>
            <div className="text-xs text-blue-800 space-y-1">
              {formData.role === 'super_admin' && (
                <>
                  <p>• Gestión completa de usuarios (crear, editar, eliminar)</p>
                  <p>• Acceso total a todas las funciones del sistema</p>
                  <p>• Configuración del sistema</p>
                </>
              )}
              {formData.role === 'admin' && (
                <>
                  <p>• Gestión de productos, ventas, clientes y proveedores</p>
                  <p>• Acceso a reportes y análisis</p>
                  <p>• No puede gestionar usuarios</p>
                </>
              )}
              {formData.role === 'employee' && (
                <>
                  <p>• Procesamiento de ventas</p>
                  <p>• Consulta de productos y clientes</p>
                  <p>• Acceso limitado a reportes</p>
                </>
              )}
            </div>
          </div>

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
              disabled={loading || (!user && formData.password !== formData.confirmPassword)}
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