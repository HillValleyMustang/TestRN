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
    console.log(`[copy-gym-setup] Starting for user ${user.id}. Source: ${sourceGymId}, Target: ${targetGymId}`);

    // 1. Copy gym_exercises from source to target
    const { data: sourceExercises, error: sourceExError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id').eq('gym_id', sourceGymId);
    if (sourceExError) throw sourceExError;
    if (sourceExercises.length > 0) {
      const linksToCreate = sourceExercises.map((ex: { exercise_id: string }) => ({ gym_id: targetGymId, exercise_id: ex.exercise_id }));
      const { error: insertLinksError } = await supabaseServiceRoleClient.from('gym_exercises').insert(linksToCreate);
      if (insertLinksError) throw insertLinksError;
      console.log(`[copy-gym-setup] Copied ${sourceExercises.length} gym exercise links.`);
    }

    // 2. Find source main T-Path
    const { data: sourceMainTPath, error: sourceTPathError } = await supabaseServiceRoleClient.from('t_paths').select('*').eq('gym_id', sourceGymId).eq('user_id', user.id).is('parent_t_path_id', null).single();

    // If no source plan, we're done. Just copied exercises.
    if (sourceTPathError) {
      if (sourceTPathError.code === 'PGRST116') {
        await supabaseServiceRoleClient.from('profiles').update({ active_gym_id: targetGymId }).eq('id', user.id);
        return new Response(JSON.stringify({ message: `Copied exercises. Source gym had no workout plan.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw sourceTPathError;
    }
    console.log(`[copy-gym-setup] Found source main T-Path: ${sourceMainTPath.id}`);

    // 3. Create new main T-Path for target gym
    const { data: targetMainTPath, error: newTPathError } = await supabaseServiceRoleClient
      .from('t_paths')
      .insert({
        user_id: user.id,
        gym_id: targetGymId,
        template_name: sourceMainTPath.template_name,
        settings: sourceMainTPath.settings,
        is_bonus: false,
        parent_t_path_id: null,
      })
      .select('*')
      .single();
    if (newTPathError) throw newTPathError;
    console.log(`[copy-gym-setup] Created target main T-Path: ${targetMainTPath.id}`);

    // 4. Find source child workouts
    const { data: sourceChildWorkouts, error: sourceChildError } = await supabaseServiceRoleClient.from('t_paths').select('*').eq('parent_t_path_id', sourceMainTPath.id);
    if (sourceChildError) throw sourceChildError;
    console.log(`[copy-gym-setup] Found ${sourceChildWorkouts.length} source child workouts.`);

    // 5. Loop and copy child workouts and exercises
    if (sourceChildWorkouts.length > 0) {
      for (const sourceChild of sourceChildWorkouts) {
        console.log(`[copy-gym-setup] Copying child workout: ${sourceChild.template_name}`);
        const { data: newChild, error: newChildError } = await supabaseServiceRoleClient
          .from('t_paths')
          .insert({
            user_id: user.id,
            gym_id: targetGymId,
            template_name: sourceChild.template_name,
            settings: sourceChild.settings,
            is_bonus: true,
            parent_t_path_id: targetMainTPath.id,
          })
          .select('id')
          .single();
        if (newChildError) throw newChildError;
        console.log(`[copy-gym-setup] Created new child workout with ID: ${newChild.id}`);

        const { data: sourceTpeLinks, error: sourceTpeError } = await supabaseServiceRoleClient.from('t_path_exercises').select('*').eq('template_id', sourceChild.id);
        if (sourceTpeError) throw sourceTpeError;
        console.log(`[copy-gym-setup] Found ${sourceTpeLinks.length} exercises for source child ${sourceChild.id}`);

        if (sourceTpeLinks.length > 0) {
          const newTpeLinksToInsert = sourceTpeLinks.map((link: any) => ({
            template_id: newChild.id,
            exercise_id: link.exercise_id,
            order_index: link.order_index,
            is_bonus_exercise: link.is_bonus_exercise,
          }));
          const { error: insertTpeError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(newTpeLinksToInsert);
          if (insertTpeError) throw insertTpeError;
          console.log(`[copy-gym-setup] Inserted ${newTpeLinksToInsert.length} exercises for new child ${newChild.id}`);
        }
      }
    }

    // 6. Update profile to make the new gym and T-Path active
    await supabaseServiceRoleClient.from('profiles').update({ active_gym_id: targetGymId, active_t_path_id: targetMainTPath.id }).eq('id', user.id);
    console.log(`[copy-gym-setup] Updating profile to set active gym to ${targetGymId} and active T-Path to ${targetMainTPath.id}`);

    console.log(`[copy-gym-setup] Process completed successfully.`);
    return new Response(JSON.stringify({ message: `Successfully copied setup to new gym.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in copy-gym-setup edge function:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});