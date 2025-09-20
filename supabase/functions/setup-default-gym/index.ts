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
      throw new Error('Authorization header missing');
    }
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { gymId } = await req.json();
    if (!gymId) throw new Error('gymId is required.');

    // 1. Verify user owns the gym
    const { data: gym, error: gymError } = await supabaseServiceRoleClient.from('gyms').select('id').eq('id', gymId).eq('user_id', user.id).single();
    if (gymError || !gym) throw new Error('Gym not found or user does not own it.');

    // 2. Get user's core programme type from their profile
    const { data: profile, error: profileError } = await supabaseServiceRoleClient.from('profiles').select('programme_type, preferred_session_length, primary_goal, preferred_muscles, health_notes').eq('id', user.id).single();
    if (profileError || !profile) throw new Error('User profile not found.');
    if (!profile.programme_type) throw new Error('User has no core programme type set.');

    // 3. Create a new main T-Path for the gym
    const tPathTemplateName = profile.programme_type === 'ulul' ? '4-Day Upper/Lower' : '3-Day Push/Pull/Legs';
    const { data: newTPath, error: newTPathError } = await supabaseServiceRoleClient
      .from('t_paths')
      .insert({ user_id: user.id, gym_id: gymId, template_name: tPathTemplateName, settings: { tPathType: profile.programme_type, experience: 'intermediate', goalFocus: profile.primary_goal, preferredMuscles: profile.preferred_muscles, constraints: profile.health_notes, equipmentMethod: 'skip' }, is_bonus: false, parent_t_path_id: null })
      .select('id').single();
    if (newTPathError) throw newTPathError;

    // 4. Invoke generate-t-path for the new T-Path using fetch with apikey
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-t-path`;

    const invokeResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'apikey': supabaseAnonKey, // This was the missing piece
      },
      body: JSON.stringify({ tPathId: newTPath.id, preferred_session_length: profile.preferred_session_length }),
    });

    if (!invokeResponse.ok) {
      const errorData = await invokeResponse.json();
      throw new Error(errorData.error || `Failed to invoke generate-t-path. Status: ${invokeResponse.status}`);
    }

    return new Response(JSON.stringify({ message: `Successfully initiated default workout plan generation for new gym.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in setup-default-gym edge function:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});