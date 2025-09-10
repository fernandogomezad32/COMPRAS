import React, { useState } from 'react';
import { X, Key, Shield, Eye, EyeOff } from 'lucide-react';
import { userService } from '../services/userService';
import type { UserProfile } from '../types';

interface PasswordChangeFormProps {
  user: UserProfile;
  onSubmit: () => void;
  onCancel: () => void;
}

export function PasswordChangeForm({ user, onSubmit, onCancel }: PasswordChangeFormProps) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      if (formData.newPassword.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      await userService.changePassword(user.id, formData.newPassword);
      onSubmit();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Key className="h-5 w-5 text-blue-600" />
            <span>Cambiar Contraseña</span>
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{user.full_name}</div>
              <div className="text-sm text-gray-600">{user.email}</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña *
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPasswords.new ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Contraseña *
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={6}
                placeholder="Repetir la nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Password strength indicator */}
          {formData.newPassword && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Seguridad de la contraseña:</div>
              <div className="space-y-1">
                <div className={`text-xs flex items-center space-x-2 ${
                  formData.newPassword.length >= 6 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span>{formData.newPassword.length >= 6 ? '✓' : '✗'}</span>
                  <span>Al menos 6 caracteres</span>
                </div>
                <div className={`text-xs flex items-center space-x-2 ${
                  /[A-Z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <span>{/[A-Z]/.test(formData.newPassword) ? '✓' : '○'}</span>
                  <span>Una letra mayúscula (recomendado)</span>
                </div>
                <div className={`text-xs flex items-center space-x-2 ${
                  /[0-9]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <span>{/[0-9]/.test(formData.newPassword) ? '✓' : '○'}</span>
                  <span>Un número (recomendado)</span>
                </div>
              </div>
            </div>
          )}

          {/* Password match indicator */}
          {formData.confirmPassword && (
            <div className={`text-sm flex items-center space-x-2 ${
              formData.newPassword === formData.confirmPassword ? 'text-green-600' : 'text-red-600'
            }`}>
              <span>{formData.newPassword === formData.confirmPassword ? '✓' : '✗'}</span>
              <span>Las contraseñas coinciden</span>
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
              disabled={loading || formData.newPassword !== formData.confirmPassword}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}