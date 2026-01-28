// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get or create a main t-path for a user
async function getOrCreateMainTPath(
  supabaseClient: any,
  userId: string,
  programmeType: 'ppl' | 'ulul',
  profileSettings: { primary_goal?: string; preferred_muscles?: string; health_notes?: string }
): Promise<string> {
  // Check for existing main t-path (gym_id IS NULL, parent_t_path_id IS NULL)
  const { data: existingTPaths, error: fetchError } = await supabaseClient
    .from('t_paths')
    .select('id, template_name, settings')
    .eq('user_id', userId)
    .is('gym_id', null)
    .is('parent_t_path_id', null);
  
  if (fetchError) throw fetchError;
  
  // If exists, return it (ignore duplicate entries - should only be one)
  if (existingTPaths && existingTPaths.length > 0) {
    console.log(`[getOrCreateMainTPath] Found existing main t-path: ${existingTPaths[0].id}`);
    return existingTPaths[0].id;
  }
  
  // Create new main t-path with gym_id = NULL
  const templateName = programmeType === 'ulul' ? '4-Day Upper/Lower' : '3-Day Push/Pull/Legs';
  const { data: newTPath, error: insertError } = await supabaseClient
    .from('t_paths')
    .insert({
      user_id: userId,
      gym_id: null, // CRITICAL: Main t-path has no gym association
      template_name: templateName,
      is_bonus: false,
      parent_t_path_id: null,
      settings: {
        tPathType: programmeType,
        experience: 'intermediate',
        goalFocus: profileSettings.primary_goal,
        preferredMuscles: profileSettings.preferred_muscles,
        constraints: profileSettings.health_notes
      }
    })
    .select('id')
    .single();
  
  if (insertError) throw insertError;
  
  console.log(`[getOrCreateMainTPath] Created new main t-path: ${newTPath.id}`);
  return newTPath.id;
}

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

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'in_progress', t_path_generation_error: null }).eq('id', userId);

    const { sourceGymId, targetGymId } = await req.json();
    if (!sourceGymId || !targetGymId) throw new Error('sourceGymId and targetGymId are required.');

    // Get user profile to determine programme type
    const { data: profile, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('programme_type, primary_goal, preferred_muscles, health_notes, active_gym_id')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) throw new Error('User profile not found.');
    if (!profile.programme_type) throw new Error('User has no core programme type set.');

    // Get or create the SINGLE main t-path (gym_id = NULL)
    const mainTPathId = await getOrCreateMainTPath(
      supabaseServiceRoleClient,
      user.id,
      profile.programme_type,
      {
        primary_goal: profile.primary_goal,
        preferred_muscles: profile.preferred_muscles,
        health_notes: profile.health_notes
      }
    );

    // Find source gym's child workouts (workouts with parent_t_path_id = mainTPathId and gym_id = sourceGymId)
    const { data: sourceChildWorkouts, error: sourceWorkoutsError } = await supabaseServiceRoleClient
      .from('t_paths')
      .select('id, template_name, settings')
      .eq('parent_t_path_id', mainTPathId)
      .eq('gym_id', sourceGymId)
      .eq('user_id', user.id);

    if (sourceWorkoutsError) throw sourceWorkoutsError;

    if (!sourceChildWorkouts || sourceChildWorkouts.length === 0) {
      throw new Error("The source gym does not have any workouts to copy.");
    }

    // Copy each child workout to target gym
    for (const sourceWorkout of sourceChildWorkouts) {
      // Create new child workout for target gym
      const { data: newChildWorkout, error: createError } = await supabaseServiceRoleClient
        .from('t_paths')
        .insert({
          user_id: user.id,
          parent_t_path_id: mainTPathId,
          gym_id: targetGymId,
          template_name: sourceWorkout.template_name,
          is_bonus: true,
          settings: sourceWorkout.settings
        })
        .select('id')
        .single();

      if (createError) throw createError;

      // Copy exercises from source workout to target workout
      const { data: sourceExercises, error: exercisesError } = await supabaseServiceRoleClient
        .from('t_path_exercises')
        .select('exercise_id, order_index, is_bonus_exercise')
        .eq('template_id', sourceWorkout.id);

      if (exercisesError) throw exercisesError;

      if (sourceExercises && sourceExercises.length > 0) {
        const exercisesToInsert = sourceExercises.map((ex: any) => ({
          template_id: newChildWorkout.id,
          exercise_id: ex.exercise_id,
          order_index: ex.order_index,
          is_bonus_exercise: ex.is_bonus_exercise
        }));

        const { error: insertExercisesError } = await supabaseServiceRoleClient
          .from('t_path_exercises')
          .insert(exercisesToInsert);

        if (insertExercisesError) throw insertExercisesError;
      }
    }

    // After successful copy, check if we need to make the new gym active.
    // If no gym is active, OR if the target gym is the active gym, update the active_t_path_id
    if (profile.active_gym_id === null || profile.active_gym_id === targetGymId) {
      await supabaseServiceRoleClient.from('profiles').update({ 
        active_gym_id: targetGymId, // Also set active_gym_id in case it was null
        active_t_path_id: mainTPathId 
      }).eq('id', user.id);
    }

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'completed', t_path_generation_error: null }).eq('id', userId);

    return new Response(JSON.stringify({ message: `Successfully copied setup to new gym.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in copy-gym-setup edge function:", message);
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: message }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});