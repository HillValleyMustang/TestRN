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

    const { sourceGymId, targetGymId } = await req.json();
    if (!sourceGymId || !targetGymId) {
      throw new Error('sourceGymId and targetGymId are required.');
    }

    // Verify user owns both gyms
    const { data: gyms, error: gymError } = await supabaseServiceRoleClient
      .from('gyms')
      .select('id, user_id')
      .in('id', [sourceGymId, targetGymId]);

    if (gymError) throw gymError;
    if (gyms.length !== 2 || gyms.some((g: { user_id: string }) => g.user_id !== user.id)) {
      throw new Error('User does not own one or both gyms, or gyms not found.');
    }

    // 1. Copy exercises from source gym
    const { data: sourceExercises, error: sourceError } = await supabaseServiceRoleClient
      .from('gym_exercises')
      .select('exercise_id')
      .eq('gym_id', sourceGymId);

    if (sourceError) throw sourceError;

    if (sourceExercises.length > 0) {
      const linksToCreate = sourceExercises.map((ex: { exercise_id: string }) => ({
        gym_id: targetGymId,
        exercise_id: ex.exercise_id,
      }));
      const { error: insertError } = await supabaseServiceRoleClient
        .from('gym_exercises')
        .insert(linksToCreate);
      if (insertError) throw insertError;
    }

    // 2. Find the main T-Path for the source gym
    const { data: sourceTPath, error: sourceTPathError } = await supabaseServiceRoleClient
      .from('t_paths')
      .select('template_name, settings')
      .eq('gym_id', sourceGymId)
      .eq('user_id', user.id)
      .is('parent_t_path_id', null)
      .single();

    if (sourceTPathError) {
      if (sourceTPathError.code === 'PGRST116') { // No rows found
        // Update the user's active_gym_id even if no T-Path was copied
        const { error: updateProfileError } = await supabaseServiceRoleClient
          .from('profiles')
          .update({ active_gym_id: targetGymId })
          .eq('id', user.id);

        if (updateProfileError) {
          console.error("Failed to update user's active_gym_id after copying gym setup (no T-Path):", updateProfileError);
        }

        return new Response(JSON.stringify({ message: `Successfully copied ${sourceExercises.length} exercises. The source gym had no workout plan to copy.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw sourceTPathError;
    }
    
    // Fetch user's preferred session length
    const { data: profileData, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('preferred_session_length')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    const preferred_session_length = profileData?.preferred_session_length;


    // 3. Create a new main T-Path for the target gym, copying settings
    const { data: newTargetTPath, error: newTPathError } = await supabaseServiceRoleClient
      .from('t_paths')
      .insert({
        user_id: user.id,
        gym_id: targetGymId,
        template_name: sourceTPath.template_name,
        settings: sourceTPath.settings,
        is_bonus: false,
        parent_t_path_id: null,
      })
      .select('id')
      .single();

    if (newTPathError) throw newTPathError;

    // 4. Invoke the generate-t-path function for the new T-Path
    const { data: invokeData, error: invokeError } = await supabaseServiceRoleClient.functions.invoke('generate-t-path', {
      body: { 
        tPathId: newTargetTPath.id,
        preferred_session_length: preferred_session_length // Pass the session length
      },
    });

    if (invokeError) {
      console.error("Failed to trigger workout generation for new gym:", invokeError);
      // Log the full error object from the invocation
      console.error("generate-t-path invocation error details:", JSON.stringify(invokeError, null, 2));
    } else {
      console.log("generate-t-path invocation successful. Response:", JSON.stringify(invokeData, null, 2));
    }

    // Update the user's active_gym_id in their profile
    const { error: updateProfileError } = await supabaseServiceRoleClient
      .from('profiles')
      .update({ active_gym_id: targetGymId })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error("Failed to update user's active_gym_id after copying gym setup:", updateProfileError);
      // Do not throw, as the main operation (copying T-Path) succeeded.
      // Log an alert for the user if this is critical.
    }

    return new Response(JSON.stringify({ message: `Successfully copied setup and initiated workout plan generation for new gym.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in copy-gym-setup edge function:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});