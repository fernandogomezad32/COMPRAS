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
        if (action === 'sync-metadata') {
          return await syncUserMetadata(req, supabaseAdmin, user.id, userProfile.role);
        }
        if (action === 'fix-missing-profiles') {
          return await fixMissingProfiles(req, supabaseAdmin, user.id, userProfile.role);
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

async function syncUserMetadata(req: Request, supabaseAdmin: any, currentUserId: string, currentUserRole: string) {
  try {
    const { userId, role } = await req.json();

    if (!userId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or role' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify the role exists in the database
    const { data: userProfile, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Check if user profile exists
    if (!userProfile) {
      console.log(`⚠️ User profile not found for userId: ${userId}, skipping sync`);
      return new Response(
        JSON.stringify({ 
          message: 'User profile not found, skipping sync',
          skipped: true,
          userId: userId
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Only super_admin can sync super_admin roles
    if ((userProfile.role === 'super_admin' || role === 'super_admin') && currentUserRole !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can manage super admin metadata' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Update user metadata in auth to match database role
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: userProfile.role, // Use the role from database as source of truth
        full_name: userProfile.full_name
      }
    });

    if (metadataError) {
      return new Response(
        JSON.stringify({ error: metadataError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'User metadata synchronized successfully',
        syncedRole: userProfile.role 
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Sync metadata error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync user metadata' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

async function fixMissingProfiles(req: Request, supabaseAdmin: any, currentUserId: string, currentUserRole: string) {
  try {
    // Only super_admin can fix missing profiles
    if (currentUserRole !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only super admins can fix missing profiles' }),
        { status: 403, headers: corsHeaders }
      );
    }

    console.log('🔧 Starting missing profiles fix...');

    // Get all users from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch auth users: ${authError.message}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get all existing profiles
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email');

    if (profilesError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch user profiles: ${profilesError.message}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    const existingProfileIds = new Set(existingProfiles?.map(p => p.id) || []);
    const missingProfiles = [];
    const syncedUsers = [];
    const errors = [];

    console.log(`🔍 Found ${authUsers.users?.length || 0} auth users and ${existingProfiles?.length || 0} existing profiles`);

    // Find users without profiles and create them
    for (const authUser of authUsers.users || []) {
      try {
        if (!existingProfileIds.has(authUser.id)) {
          console.log(`📝 Creating missing profile for user: ${authUser.email}`);
          
          // Extract data from user metadata or use defaults
          const fullName = authUser.user_metadata?.full_name || 
                          authUser.email?.split('@')[0] || 
                          'Usuario';
          const role = authUser.user_metadata?.role || 'employee';

          // Create the missing profile
          const { data: newProfile, error: createError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
              id: authUser.id,
              email: authUser.email,
              full_name: fullName,
              role: role,
              status: 'active',
              created_by: currentUserId
            })
            .select()
            .single();

          if (createError) {
            console.error(`❌ Failed to create profile for ${authUser.email}:`, createError);
            errors.push(`${authUser.email}: ${createError.message}`);
          } else {
            console.log(`✅ Created profile for ${authUser.email} with role ${role}`);
            missingProfiles.push(newProfile);
          }
        }

        // Sync metadata for all users (existing logic)
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('role, full_name')
          .eq('id', authUser.id)
          .maybeSingle();

        if (userProfile) {
          // Update user metadata to match database role
          const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            user_metadata: {
              role: userProfile.role,
              full_name: userProfile.full_name
            }
          });

          if (metadataError) {
            console.error(`❌ Failed to sync metadata for ${authUser.email}:`, metadataError);
            errors.push(`Metadata sync for ${authUser.email}: ${metadataError.message}`);
          } else {
            console.log(`✅ Synced metadata for ${authUser.email} with role ${userProfile.role}`);
            syncedUsers.push({
              email: authUser.email,
              role: userProfile.role
            });
          }
        }
      } catch (userError) {
        console.error(`❌ Error processing user ${authUser.email}:`, userError);
        errors.push(`${authUser.email}: ${userError.message}`);
      }
    }

    console.log('🎉 Missing profiles fix completed');
    console.log(`📊 Created ${missingProfiles.length} missing profiles`);
    console.log(`🔄 Synced ${syncedUsers.length} user metadata`);
    console.log(`❌ Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        message: 'Missing profiles fix completed successfully',
        createdProfiles: missingProfiles.length,
        syncedUsers: syncedUsers.length,
        errors: errors.length > 0 ? errors : undefined,
        details: {
          missingProfiles: missingProfiles.map(p => ({ email: p.email, role: p.role })),
          syncedUsers
        }
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Fix missing profiles error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fix missing profiles' }),
      { status: 500, headers: corsHeaders }
    );
  }
}