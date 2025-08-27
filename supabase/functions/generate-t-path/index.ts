// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get max minutes from sessionLength string
function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90;
  }
}

// Helper function to initialize Supabase clients
const getSupabaseClients = (authHeader: string) => {
  // @ts-ignore
  const supabaseUrl = (Deno.env as any).get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseAnonKey = (Deno.env as any).get('SUPABASE_ANON_KEY') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = (Deno.env as any).get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const supabaseServiceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  return { supabaseAuthClient, supabaseServiceRoleClient };
};

// Helper function to clean up existing child workouts
const cleanupExistingChildWorkouts = async (supabaseServiceRoleClient: any, tPathId: string, userId: string) => {
  console.log(`Starting cleanup of existing child workouts for parent T-Path ID: ${tPathId} and user: ${userId}`);
  const { data: existingChildWorkouts, error: fetchChildWorkoutsError } = await supabaseServiceRoleClient
    .from('t_paths')
    .select('id')
    .eq('parent_t_path_id', tPathId)
    .eq('is_bonus', true)
    .eq('user_id', userId);

  if (fetchChildWorkoutsError) {
    console.error('Error fetching existing child workouts for cleanup:', fetchChildWorkoutsError.message);
    throw fetchChildWorkoutsError;
  }

  if (existingChildWorkouts && existingChildWorkouts.length > 0) {
    const childWorkoutIdsToDelete = existingChildWorkouts.map((w: { id: string }) => w.id);
    console.log(`Found existing child workouts to delete: ${childWorkoutIdsToDelete.join(', ')}`);

    const { error: deleteTPathExercisesError } = await supabaseServiceRoleClient
      .from('t_path_exercises')
      .delete()
      .in('template_id', childWorkoutIdsToDelete);
    if (deleteTPathExercisesError) throw deleteTPathExercisesError;
    console.log(`Deleted associated t_path_exercises.`);

    const { error: deleteWorkoutsError } = await supabaseServiceRoleClient
      .from('t_paths')
      .delete()
      .in('id', childWorkoutIdsToDelete);
    if (deleteWorkoutsError) throw deleteWorkoutsError;
    console.log(`Deleted existing child workouts.`);
  } else {
    console.log('No existing child workouts found for cleanup.');
  }
};

// Main serve function
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Edge Function: generate-t-path started.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');

    const { supabaseAuthClient, supabaseServiceRoleClient } = getSupabaseClients(authHeader);

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');
    console.log(`User authenticated: ${user.id}`);

    const { tPathId } = await req.json();
    if (!tPathId) throw new Error('tPathId is required');
    console.log(`Received tPathId (main T-Path ID): ${tPathId}`);

    // --- Step 1: Fetch T-Path details and user's preferred session length ---
    const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient
      .from('t_paths')
      .select('id, template_name, settings, user_id')
      .eq('id', tPathId)
      .eq('user_id', user.id)
      .single();
    if (tPathError) throw tPathError;
    if (!tPathData) throw new Error('Main T-Path not found or does not belong to user.');
    const tPath = tPathData;

    const { data: profileData, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('preferred_session_length')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    const preferredSessionLength = profileData?.preferred_session_length;

    const tPathSettings = tPath.settings as { tPathType?: string };
    if (!tPathSettings || !tPathSettings.tPathType) throw new Error('Invalid T-Path settings.');
    
    const workoutSplit = tPathSettings.tPathType;
    const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);
    console.log(`Workout split: ${workoutSplit}, Max Minutes: ${maxAllowedMinutes}`);

    let workoutNames: string[] = [];
    if (workoutSplit === 'ulul') workoutNames = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
    else if (workoutSplit === 'ppl') workoutNames = ['Push', 'Pull', 'Legs'];
    else throw new Error('Unknown workout split type.');

    // --- Step 2: Cleanup existing child workouts for this T-Path ---
    await cleanupExistingChildWorkouts(supabaseServiceRoleClient, tPath.id, user.id);

    // --- Step 3: Generate new workouts ---
    const generatedWorkouts = [];
    for (const workoutName of workoutNames) {
      console.log(`Processing workout: ${workoutName}`);
      const { data: structureEntries, error: structureError } = await supabaseServiceRoleClient
        .from('workout_exercise_structure')
        .select('exercise_library_id, min_session_minutes, bonus_for_time_group')
        .eq('workout_split', workoutSplit)
        .eq('workout_name', workoutName)
        .order('min_session_minutes', { ascending: true, nullsFirst: true })
        .order('bonus_for_time_group', { ascending: true, nullsFirst: true });
      if (structureError) throw structureError;

      const exercisesToInclude = [];
      for (const entry of structureEntries || []) {
        const { data: exerciseDefData, error: exerciseDefError } = await supabaseServiceRoleClient
          .from('exercise_definitions')
          .select('id, name')
          .eq('library_id', entry.exercise_library_id)
          .single();
        if (exerciseDefError || !exerciseDefData) {
          console.warn(`Could not find exercise for library_id: ${entry.exercise_library_id}`);
          continue;
        }

        const isIncludedAsMain = entry.min_session_minutes !== null && maxAllowedMinutes >= entry.min_session_minutes;
        const isIncludedAsBonus = entry.bonus_for_time_group !== null && maxAllowedMinutes >= entry.bonus_for_time_group;

        if (isIncludedAsMain || isIncludedAsBonus) {
          const isBonus = isIncludedAsBonus && !isIncludedAsMain;
          exercisesToInclude.push({
            exercise_id: exerciseDefData.id,
            is_bonus_exercise: isBonus,
            order_criteria: isBonus ? entry.bonus_for_time_group : entry.min_session_minutes,
          });
        }
      }

      exercisesToInclude.sort((a, b) => (a.order_criteria || 0) - (b.order_criteria || 0));

      if (exercisesToInclude.length === 0) {
        console.warn(`No exercises for workout ${workoutName} with session length ${maxAllowedMinutes}. Skipping.`);
        continue;
      }

      const { data: workout, error: workoutError } = await supabaseServiceRoleClient
        .from('t_paths')
        .insert({
          user_id: user.id,
          parent_t_path_id: tPath.id,
          template_name: workoutName,
          is_bonus: true,
          settings: tPathSettings
        })
        .select('id')
        .single();
      if (workoutError) throw workoutError;
      generatedWorkouts.push(workout);

      const tPathExercisesToInsert = exercisesToInclude.map((ex, i) => ({
        template_id: workout.id,
        exercise_id: ex.exercise_id,
        order_index: i,
        is_bonus_exercise: ex.is_bonus_exercise,
      }));

      const { error: insertTPathExercisesError } = await supabaseServiceRoleClient
        .from('t_path_exercises')
        .insert(tPathExercisesToInsert);
      if (insertTPathExercisesError) throw insertTPathExercisesError;
    }

    console.log('Edge Function: generate-t-path finished successfully.');
    return new Response(
      JSON.stringify({ message: 'T-Path generated successfully', workouts: generatedWorkouts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error('Unhandled error in generate-t-path edge function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});