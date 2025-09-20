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
    const { data: sourceTPath, error: sourceTPathError } = await supabaseServiceRoleClient.from('t_paths').select('*').eq('gym_id', sourceGymId).eq('user_id', user.id).is('parent_t_path_id', null).single();

    // If no source plan, we're done. Just copied exercises.
    if (sourceTPathError) {
      if (sourceTPathError.code === 'PGRST116') {
        await supabaseServiceRoleClient.from('profiles').update({ active_gym_id: targetGymId }).eq('id', user.id);
        return new Response(JSON.stringify({ message: `Copied exercises. Source gym had no workout plan.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw sourceTPathError;
    }

    // 3. Create new main T-Path for target gym
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
      .select('*')
      .single();
    if (newTPathError) throw newTPathError;

    // 4. Find source child workouts
    const { data: sourceChildWorkouts, error: sourceChildError } = await supabaseServiceRoleClient.from('t_paths').select('*').eq('parent_t_path_id', sourceTPath.id);
    if (sourceChildError) throw sourceChildError;

    if (sourceChildWorkouts.length > 0) {
      // 5. Create new child workouts and map old IDs to new IDs
      const newChildWorkoutsToInsert = sourceChildWorkouts.map((cw: any) => ({
        user_id: user.id,
        parent_t_path_id: newTargetTPath.id,
        template_name: cw.template_name,
        is_bonus: true,
        settings: cw.settings,
        gym_id: targetGymId,
      }));
      const { data: insertedNewChildWorkouts, error: insertChildError } = await supabaseServiceRoleClient.from('t_paths').insert(newChildWorkoutsToInsert).select('id, template_name');
      if (insertChildError) throw insertChildError;

      const oldToNewIdMap = new Map<string, string>();
      sourceChildWorkouts.forEach((oldCw: any) => {
        const newCw = insertedNewChildWorkouts.find((ncw: any) => ncw.template_name === oldCw.template_name);
        if (newCw) {
          oldToNewIdMap.set(oldCw.id, newCw.id);
        }
      });

      // 6. Find all t_path_exercises for the source child workouts
      const sourceChildWorkoutIds = sourceChildWorkouts.map((cw: any) => cw.id);
      const { data: sourceTpeLinks, error: sourceTpeError } = await supabaseServiceRoleClient.from('t_path_exercises').select('*').in('template_id', sourceChildWorkoutIds);
      if (sourceTpeError) throw sourceTpeError;

      // 7. Create new t_path_exercises links for the new child workouts
      if (sourceTpeLinks.length > 0) {
        const newTpeLinksToInsert = sourceTpeLinks.map((link: any) => ({
          template_id: oldToNewIdMap.get(link.template_id),
          exercise_id: link.exercise_id,
          order_index: link.order_index,
          is_bonus_exercise: link.is_bonus_exercise,
        })).filter((link: { template_id: string | undefined }) => link.template_id);

        if (newTpeLinksToInsert.length > 0) {
          const { error: insertTpeError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(newTpeLinksToInsert);
          if (insertTpeError) throw insertTpeError;
        }
      }
    }

    // 8. Update profile to make the new gym and T-Path active
    await supabaseServiceRoleClient.from('profiles').update({ active_gym_id: targetGymId, active_t_path_id: newTargetTPath.id }).eq('id', user.id);

    return new Response(JSON.stringify({ message: `Successfully copied setup to new gym.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in copy-gym-setup edge function:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});