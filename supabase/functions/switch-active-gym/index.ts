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

    // Find the main T-Path associated with the target gym for this user
    // Using .limit(1) and checking the array is more robust than .single() in some edge cases.
    const { data: tPaths, error: tPathError } = await supabaseServiceRoleClient
      .from('t_paths')
      .select('id')
      .eq('gym_id', gymId)
      .eq('user_id', user.id)
      .is('parent_t_path_id', null) // Ensure it's a main plan
      .limit(1);

    if (tPathError) {
      console.error(`Error finding T-Path for gym ${gymId}:`, tPathError.message);
      throw tPathError;
    }
    
    const newActiveTPathId = (tPaths && tPaths.length > 0) ? tPaths[0].id : null;
    console.log(`[switch-active-gym] For gym ${gymId}, found new active T-Path ID: ${newActiveTPathId}`);


    // Perform a single, safe update on the user's profile
    const { error: updateProfileError } = await supabaseServiceRoleClient
      .from('profiles')
      .update({ 
        active_gym_id: gymId, 
        active_t_path_id: newActiveTPathId 
      })
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