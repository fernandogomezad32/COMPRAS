import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'employee';
  status: 'active' | 'inactive';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to call edge functions
async function callUserManagementFunction(action: string, data?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Usuario no autenticado');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management/${action}`, {
    method: data ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error en la operación');
  }

  return await response.json();
}

// Helper function for PUT requests
async function callUserManagementFunctionPut(action: string, data: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Usuario no autenticado');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management/${action}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error en la operación');
  }

  return await response.json();
}

// Helper function for DELETE requests
async function callUserManagementFunctionDelete(action: string, data: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Usuario no autenticado');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management/${action}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Error en la operación');
  }

  return await response.json();
}

export const userService = {
  async getAll(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getCurrentUserRole(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');

    console.log('🔍 [userService] Getting role for user:', user.email);
    console.log('🔍 [userService] User metadata:', user.user_metadata);

    // Prioritize user metadata from JWT (faster and avoids RLS recursion)
    const metadataRole = user.user_metadata?.role;
    console.log('🔍 [userService] Metadata role:', metadataRole);
    
    if (metadataRole && ['super_admin', 'admin', 'employee'].includes(metadataRole)) {
      console.log('✅ [userService] Using metadata role:', metadataRole);
      return metadataRole;
    }

    // Fallback to database query if role not in metadata or invalid
    console.log('⚠️ [userService] Metadata role invalid, falling back to database query');
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role from DB:', error);
        console.log('🚨 [userService] Database query failed, defaulting to employee');
        return 'employee'; // Default role in case of error
      }
      
      console.log('🔍 [userService] Database role:', data?.role);
      console.log('✅ [userService] Using database role:', data?.role || 'employee');
      return data?.role || 'employee';
    } catch (error) {
      console.error('Error in getCurrentUserRole fallback:', error);
      console.log('🚨 [userService] Fallback failed, defaulting to employee');
      return 'employee';
    }
  },

  async createProfileForAuthUser(
    userId: string,
    email: string,
    fullName: string,
    role: 'super_admin' | 'admin' | 'employee' = 'employee'
  ): Promise<UserProfile> {
    // For new user registration, create profile directly (no admin operations needed)
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role,
        status: 'active',
        created_by: null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async ensureUserProfile(user: any): Promise<void> {
    try {
      // Check if profile already exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing user profile:', selectError);
        return;
      }

      // If profile already exists, skip creation
      if (existingProfile) {
        return;
      }

      // Create the profile for new users (no admin operations needed for self-registration)
      try {
        await this.createProfileForAuthUser(
          user.id,
          user.email,
          user.user_metadata?.full_name || user.email.split('@')[0],
          'employee'
        );
      } catch (profileError: any) {
        // Handle any remaining creation errors
        if (profileError?.code !== '23505') { // 23505 is unique constraint violation
          console.error('Error creating user profile:', profileError);
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
      // Don't throw to avoid breaking auth flow
    }
  },

  async create(userData: {
    email: string;
    password: string;
    full_name: string;
    role: 'super_admin' | 'admin' | 'employee';
    status: 'active' | 'inactive';
  }): Promise<UserProfile> {
    const result = await callUserManagementFunction('create-user', userData);
    return result.data;
  },

  async update(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const result = await callUserManagementFunctionPut('update-user', { userId: id, updates });
    return result.data;
  },

  async updateStatus(id: string, status: 'active' | 'inactive'): Promise<UserProfile> {
    const result = await callUserManagementFunctionPut('update-status', { userId: id, status });
    return result.data;
  },

  async updatePassword(id: string, password: string): Promise<void> {
    await callUserManagementFunctionPut('update-password', { userId: id, password });
  },

  async delete(id: string): Promise<void> {
    await callUserManagementFunctionDelete('delete-user', { userId: id });
  },

  async checkSuperAdminExists(): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
  },

  async createInitialSuperAdmin(userData: {
    email: string;
    password: string;
    full_name: string;
  }): Promise<void> {
    // Verificar que no exista ya un super admin
    const superAdminExists = await this.checkSuperAdminExists();
    if (superAdminExists) {
      throw new Error('Ya existe un super administrador en el sistema');
    }

    // Create initial super admin using edge function
    await callUserManagementFunction('create-user', {
      ...userData,
      role: 'super_admin',
      status: 'active'
    });
  }
};