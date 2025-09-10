import React, { useState } from 'react';
import { Crown, Mail, Lock, User, Eye, EyeOff, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InitialSetupProps {
  onComplete: () => void;
}

export function InitialSetup({ onComplete }: InitialSetupProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      if (formData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      // Crear el super admin usando signUp normal y luego actualizar el rol
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Error al crear el usuario');

      // Crear el perfil de super admin directamente
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: 'super_admin',
          status: 'active'
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Intentar eliminar el usuario de auth si falló crear el perfil
        await supabase.auth.admin.deleteUser(data.user.id);
        throw new Error('Error al crear el perfil de usuario');
      }

      // Hacer login automático
      const { error: signInError } = await supabase.auth.signInWithPassword({
        formData.email,
        password: formData.password
      });

      if (signInError) {
        console.error('Error signing in after creation:', signInError);
        // No lanzar error aquí, el usuario puede hacer login manualmente
      }

      alert('Super administrador creado exitosamente. Ahora puedes iniciar sesión.');
      onComplete();
    } catch (err: any) {
      console.error('Error in initial setup:', err);
      setError(err.message || 'Error al crear el super administrador');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración Inicial</h1>
          <p className="text-gray-600">Crea el primer Super Administrador del sistema</p>
        </div>

        {/* Info Box */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-purple-900">¿Qué es un Super Administrador?</h3>
              <p className="text-sm text-purple-700 mt-1">
                El Super Administrador tiene control total del sistema y es el único que puede crear, editar y eliminar otros usuarios.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                placeholder="Tu nombre completo"
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                placeholder="admin@empresa.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                minLength={6}
                placeholder="Repetir contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Password validation */}
          {formData.password && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Seguridad de la contraseña:</div>
              <div className="space-y-1">
                <div className={`text-xs flex items-center space-x-2 ${
                  formData.password.length >= 6 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span>{formData.password.length >= 6 ? '✓' : '✗'}</span>
                  <span>Al menos 6 caracteres</span>
                </div>
                <div className={`text-xs flex items-center space-x-2 ${
                  formData.password === formData.confirmPassword && formData.confirmPassword ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <span>{formData.password === formData.confirmPassword && formData.confirmPassword ? '✓' : '○'}</span>
                  <span>Las contraseñas coinciden</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || formData.password !== formData.confirmPassword}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? 'Creando Super Administrador...' : 'Crear Super Administrador'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Este usuario tendrá acceso completo al sistema y podrá crear otros usuarios.
          </p>
        </div>
      </div>
    </div>
  );
}