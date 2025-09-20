import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface UserData {
  email: string;
  password?: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'employee';
  status: 'active' | 'inactive';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Initialize regular client for auth verification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify user authentication and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get user profile to check permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Check if user has admin permissions
    if (userProfile.role !== 'super_admin' && userProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: corsHeaders }
      );
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    switch (req.method) {
      case 'POST':
        if (action === 'create-user') {
          return await createUser(req, supabaseAdmin, user.id, userProfile.role);
        }
        break;

      case 'PUT':
        if (action === 'update-user') {
          return await updateUser(req, supabaseAdmin, user.id, userProfile.role);
        }
        if (action === 'update-status') {
          return await updateUserStatus(req, supabaseAdmin, user.id, userProfile.role);
        }
        if (action === 'update-password') {
          return await updateUserPassword(req, supabaseAdmin, user.id, userProfile.role);
        }
        break;

      case 'DELETE':
        if (action === 'delete-user') {
          return await deleteUser(req, supabaseAdmin, user.id, userProfile.role);
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: corsHeaders }
        );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function createUser(req: Request, supabaseAdmin: any, currentUserId: string, currentUserRole: string) {
  try {
    const userData: UserData = await req.json();

    // Only super_admin can create other super_admins
    if (userData.role === 'super_admin' && currentUserRole !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can create super admin users' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Create user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role
      }
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        status: userData.status,
        created_by: currentUserId
      })
      .select()
      .single();

    if (profileError) {
      // If profile creation fails, clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ data: profile }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Create user error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create user' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function updateUser(req: Request, supabaseAdmin: any, currentUserId: string, currentUserRole: string) {
  try {
    const { userId, updates } = await req.json();

    if (!userId || !updates) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or updates' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get current user data to check permissions
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Only super_admin can update other super_admins or promote to super_admin
    if ((targetUser.role === 'super_admin' || updates.role === 'super_admin') && currentUserRole !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can manage super admin users' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Update user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Update user metadata in auth if role is being updated
    if (updates.role) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            role: updates.role,
            full_name: updates.full_name || profile.full_name
          }
        });
      } catch (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        // Don't fail the entire operation if metadata update fails
      }
    }

    return new Response(
      JSON.stringify({ data: profile }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Update user error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update user' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function updateUserStatus(req: Request, supabaseAdmin: any, currentUserId: string, currentUserRole: string) {
  try {
    const { userId, status } = await req.json();

    if (!userId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or status' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Prevent users from deactivating themselves
    if (userId === currentUserId) {
      return new Response(
        JSON.stringify({ error: 'Cannot change your own status' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get target user to check permissions
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Only super_admin can manage other super_admins
    if (targetUser.role === 'super_admin' && currentUserRole !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can manage super admin users' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Update user status
    const { data: profile, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ data: profile }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Update user status error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update user status' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function updateUserPassword(req: Request, supabaseAdmin: any, currentUserId: string, currentUserRole: string) {
  try {
    const { userId, password } = await req.json();

    if (!userId || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or password' }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get target user to check permissions
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Only super_admin can change passwords of other super_admins
    if (targetUser.role === 'super_admin' && currentUserRole !== 'super_admin' && userId !== currentUserId) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can change super admin passwords' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Update password
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: password
    });

    if (passwordError) {
      return new Response(
        JSON.stringify({ error: passwordError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Password updated successfully' }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Update password error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update password' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function deleteUser(req: Request, supabaseAdmin: any, currentUserId: string, currentUserRole: string) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Prevent users from deleting themselves
    if (userId === currentUserId) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete yourself' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get target user to check permissions
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Only super_admin can delete other super_admins
    if (targetUser.role === 'super_admin' && currentUserRole !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can delete super admin users' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Delete user profile first
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Delete user from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      // Profile is already deleted, so we'll consider this a partial success
    }

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Delete user error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete user' }),
      { status: 500, headers: corsHeaders }
    );
  }
}