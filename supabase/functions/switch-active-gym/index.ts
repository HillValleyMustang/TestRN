// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } );
    }

    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) {
      console.error('Unauthorized: No user session found or user fetch error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { gymId } = await req.json();
    if (!gymId) {
      return new Response(JSON.stringify({ error: 'gymId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // NOTE: T-paths are NOT gym-specific. Users have ONE workout plan regardless of which gym they're at.
    // We only update active_gym_id, but ensure active_t_path_id is set to the main T-path if it's null.

    // First, check if active_t_path_id is null
    const { data: profile, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('active_t_path_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError.message);
      throw profileError;
    }

    const updateData: { active_gym_id: string; active_t_path_id?: string } = {
      active_gym_id: gymId
    };

    // If active_t_path_id is null, find and set the main T-path
    if (!profile.active_t_path_id) {
      const { data: mainTPath, error: mainTPathError } = await supabaseServiceRoleClient
        .from('t_paths')
        .select('id')
        .eq('user_id', user.id)
        .is('gym_id', null)
        .is('parent_t_path_id', null)
        .single();

      if (!mainTPathError && mainTPath) {
        updateData.active_t_path_id = mainTPath.id;
        console.log(`[switch-active-gym] Setting active_t_path_id to main T-path: ${mainTPath.id}`);
      } else {
        console.warn('[switch-active-gym] Could not find main T-path for user');
      }
    }

    // Perform a single, safe update on the user's profile
    const { error: updateProfileError } = await supabaseServiceRoleClient
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Error updating user profile:', updateProfileError.message);
      throw updateProfileError;
    }

    return new Response(
      JSON.stringify({ message: 'Active gym switched successfully.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during active gym switch.";
    console.error('Unhandled error in switch-active-gym edge function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});