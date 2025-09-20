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

  const supabaseServiceRoleClient = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let userId: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');
    userId = user.id;

    const { sourceGymId, targetGymId } = await req.json();
    if (!sourceGymId || !targetGymId) throw new Error('sourceGymId and targetGymId are required.');

    // 1. Copy gym_exercises from source to target
    const { data: sourceExercises, error: sourceError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id').eq('gym_id', sourceGymId);
    if (sourceError) throw sourceError;
    if (sourceExercises.length > 0) {
      const linksToCreate = sourceExercises.map((ex: { exercise_id: string }) => ({ gym_id: targetGymId, exercise_id: ex.exercise_id }));
      const { error: insertError } = await supabaseServiceRoleClient.from('gym_exercises').insert(linksToCreate);
      if (insertError) throw insertError;
    }

    // 2. Find source main T-Path
    const { data: sourceTPath, error: sourceTPathError } = await supabaseServiceRoleClient.from('t_paths').select('id').eq('gym_id', sourceGymId).eq('user_id', user.id).is('parent_t_path_id', null).single();

    // If no source plan, we're done. Just copied exercises.
    if (sourceTPathError) {
      if (sourceTPathError.code === 'PGRST116') {
        await supabaseServiceRoleClient.from('profiles').update({ active_gym_id: targetGymId }).eq('id', user.id);
        return new Response(JSON.stringify({ message: `Copied exercises. Source gym had no workout plan.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw sourceTPathError;
    }

    // 3. Call the RPC function to clone the entire T-Path structure
    const { data: newMainTPathId, error: rpcError } = await supabaseServiceRoleClient.rpc('clone_t_path_for_new_gym', {
      source_t_path_id: sourceTPath.id,
      new_user_id: user.id,
      new_gym_id: targetGymId
    });

    if (rpcError) throw rpcError;
    if (!newMainTPathId) throw new Error("Cloning the workout plan failed to return a new plan ID.");

    // 4. Update profile to make the new gym and T-Path active
    await supabaseServiceRoleClient.from('profiles').update({ active_gym_id: targetGymId, active_t_path_id: newMainTPathId }).eq('id', user.id);

    return new Response(JSON.stringify({ message: `Successfully copied setup to new gym.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in copy-gym-setup edge function:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});