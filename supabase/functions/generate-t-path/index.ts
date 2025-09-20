// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Type Definitions ---
interface ExerciseDefinition {
  id: string;
  name: string;
  user_id: string | null;
  library_id: string | null;
  movement_type: string | null;
  movement_pattern: string | null;
  main_muscle: string;
}

interface ProfileData {
  preferred_session_length: string | null;
  active_gym_id: string | null;
}

// Helper function to initialize Supabase client with service role key
const getSupabaseServiceRoleClient = () => {
  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

// --- Utility Functions ---
function getExerciseCounts(sessionLength: string | null | undefined): { main: number; bonus: number } {
  switch (sessionLength) {
    case '15-30': return { main: 3, bonus: 3 };
    case '30-45': return { main: 5, bonus: 3 };
    case '45-60': return { main: 7, bonus: 2 };
    case '60-90': return { main: 10, bonus: 2 };
    default: return { main: 5, bonus: 3 }; // Default to 30-45 mins
  }
}

function getWorkoutNamesForSplit(workoutSplit: string): string[] {
  if (workoutSplit === 'ulul') return ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
  if (workoutSplit === 'ppl') return ['Push', 'Pull', 'Legs'];
  throw new Error('Unknown workout split type.');
}

const sortExercises = (exercises: ExerciseDefinition[]) => {
  return exercises.sort((a, b) => {
    if (a.movement_type === 'compound' && b.movement_type !== 'compound') return -1;
    if (a.movement_type !== 'compound' && b.movement_type === 'compound') return 1;
    return a.name.localeCompare(b.name);
  });
};

// --- Main Serve Function ---
serve(async (req: Request) => {
  console.log("[generate-t-path] Edge Function started.");
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let userId: string | null = null;
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');
    userId = user.id;

    const { tPathId, preferred_session_length, confirmedExerciseIds } = await req.json();
    if (!tPathId) throw new Error('tPathId is required');

    console.log(`[generate-t-path] User ${userId}: Initiating T-Path generation for tPathId: ${tPathId}`);
    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'in_progress', t_path_generation_error: null }).eq('id', userId);

    // Main logic is now awaited directly
    const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient.from('t_paths').select('id, settings, user_id').eq('id', tPathId).eq('user_id', user.id).single();
    if (tPathError || !tPathData) throw new Error('Main T-Path not found.');
    console.log(`[generate-t-path] Fetched main T-Path data: ${JSON.stringify(tPathData)}`);

    let sessionLength = preferred_session_length;
    let activeGymId: string | null = null;

    if (!sessionLength) {
      const { data: profileData, error: profileError } = await supabaseServiceRoleClient.from('profiles').select('preferred_session_length, active_gym_id').eq('id', user.id).single();
      if (profileError) throw profileError;
      sessionLength = (profileData as ProfileData)?.preferred_session_length;
      activeGymId = (profileData as ProfileData)?.active_gym_id;
    } else {
      const { data: profileData, error: profileError } = await supabaseServiceRoleClient.from('profiles').select('active_gym_id').eq('id', user.id).single();
      if (profileError) throw profileError;
      activeGymId = (profileData as ProfileData)?.active_gym_id;
    }
    console.log(`[generate-t-path] Session Length: ${sessionLength}, Active Gym ID: ${activeGymId}`);

    const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient.from('exercise_definitions').select('*');
    if (fetchAllExercisesError) throw fetchAllExercisesError;
    console.log(`[generate-t-path] Fetched ${allExercises?.length || 0} total exercise definitions.`);

    const { data: allGymLinks, error: allGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id');
    if (allGymLinksError) throw allGymLinksError;
    const allLinkedExerciseIds = new Set((allGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
    console.log(`[generate-t-path] Total exercises linked to any gym (allLinkedExerciseIds): ${allLinkedExerciseIds.size}`);

    console.log(`[generate-t-path] Deleting old child workouts and their exercises for parent T-Path ${tPathId}`);
    const { data: oldChildWorkouts, error: fetchOldError } = await supabaseServiceRoleClient.from('t_paths').select('id').eq('parent_t_path_id', tPathId).eq('user_id', user.id);
    if (fetchOldError) throw fetchOldError;
    if (oldChildWorkouts && oldChildWorkouts.length > 0) {
      const oldChildIds = oldChildWorkouts.map((w: { id: string }) => w.id);
      console.log(`[generate-t-path] Found ${oldChildIds.length} old child workouts: ${oldChildIds.join(', ')}`);
      await supabaseServiceRoleClient.from('t_path_exercises').delete().in('template_id', oldChildIds);
      await supabaseServiceRoleClient.from('t_paths').delete().in('id', oldChildIds);
      console.log(`[generate-t-path] Successfully deleted old child workouts and their exercises.`);
    } else {
      console.log(`[generate-t-path] No old child workouts found to delete.`);
    }

    const tPathSettings = tPathData.settings as { tPathType?: string };
    if (!tPathSettings?.tPathType) throw new Error('Invalid T-Path settings.');
    const workoutSplit = tPathSettings.tPathType;
    const { main: maxMainExercises, bonus: maxBonusExercises } = getExerciseCounts(sessionLength);
    const workoutNames = getWorkoutNamesForSplit(workoutSplit);
    console.log(`[generate-t-path] Workout Split: ${workoutSplit}, Workout Names: ${workoutNames.join(', ')}`);
    console.log(`[generate-t-path] Max Main Exercises: ${maxMainExercises}, Max Bonus Exercises: ${maxBonusExercises}`);

    const workoutSpecificPools: Record<string, ExerciseDefinition[]> = {};
    if (workoutSplit === 'ulul') {
      const UPPER_BODY_MUSCLES = new Set(['Pectorals', 'Deltoids', 'Lats', 'Traps', 'Biceps', 'Triceps', 'Abdominals', 'Core']);
      const LOWER_BODY_MUSCLES = new Set(['Quadriceps', 'Hamstrings', 'Glutes', 'Calves']);
      const upperPool = (allExercises || []).filter((ex: any) => musclesIntersect(ex.main_muscle, UPPER_BODY_MUSCLES));
      const lowerPool = (allExercises || []).filter((ex: any) => musclesIntersect(ex.main_muscle, LOWER_BODY_MUSCLES));
      workoutSpecificPools['Upper Body A'] = []; workoutSpecificPools['Upper Body B'] = [];
      workoutSpecificPools['Lower Body A'] = []; workoutSpecificPools['Lower Body B'] = [];
      sortExercises(upperPool).forEach((ex, i) => workoutSpecificPools[i % 2 === 0 ? 'Upper Body A' : 'Upper Body B'].push(ex));
      sortExercises(lowerPool).forEach((ex, i) => workoutSpecificPools[i % 2 === 0 ? 'Lower Body A' : 'Lower Body B'].push(ex));
      console.log(`[generate-t-path] ULUL Pools - Upper A: ${workoutSpecificPools['Upper Body A'].length}, Upper B: ${workoutSpecificPools['Upper Body B'].length}, Lower A: ${workoutSpecificPools['Lower Body A'].length}, Lower B: ${workoutSpecificPools['Lower Body B'].length}`);
    } else { // ppl
      workoutSpecificPools['Push'] = sortExercises((allExercises || []).filter((ex: any) => ex.movement_pattern === 'Push'));
      workoutSpecificPools['Pull'] = sortExercises((allExercises || []).filter((ex: any) => ex.movement_pattern === 'Pull'));
      workoutSpecificPools['Legs'] = sortExercises((allExercises || []).filter((ex: any) => ex.movement_pattern === 'Legs'));
      console.log(`[generate-t-path] PPL Pools - Push: ${workoutSpecificPools['Push'].length}, Pull: ${workoutSpecificPools['Pull'].length}, Legs: ${workoutSpecificPools['Legs'].length}`);
    }

    for (const workoutName of workoutNames) {
      console.log(`[generate-t-path] Processing workout: ${workoutName}`);
      const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient
        .from('t_paths')
        .insert({ user_id: user.id, parent_t_path_id: tPathId, template_name: workoutName, is_bonus: true, settings: tPathData.settings })
        .select('id').single();
      if (createChildError) throw createChildError;
      const childWorkoutId = newChildWorkout.id;
      console.log(`[generate-t-path] Created child workout ${workoutName} with ID: ${childWorkoutId}`);

      const candidatePool = workoutSpecificPools[workoutName] || [];
      console.log(`[generate-t-path] Candidate pool for ${workoutName}: ${candidatePool.length} exercises`);
      
      let activeGymExerciseIds = new Set<string>();
      if (activeGymId) {
        const { data: activeGymLinks, error: activeGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id').eq('gym_id', activeGymId);
        if (activeGymLinksError) throw activeGymLinksError;
        activeGymExerciseIds = new Set((activeGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
        console.log(`[generate-t-path] Active gym ${activeGymId} has ${activeGymExerciseIds.size} linked exercises.`);
      }

      const tier1Pool = candidatePool.filter(ex => ex.user_id === user.id);
      const tier2Pool = candidatePool.filter(ex => ex.user_id === null && !allLinkedExerciseIds.has(ex.id));
      const tier3Pool = candidatePool.filter(ex => ex.user_id === null && activeGymExerciseIds.has(ex.id));

      console.log(`[generate-t-path] Tier 1 (User Custom) for ${workoutName}: ${tier1Pool.length} exercises`);
      console.log(`[generate-t-path] Tier 2 (Global Bodyweight) for ${workoutName}: ${tier2Pool.length} exercises`);
      console.log(`[generate-t-path] Tier 3 (Global Gym-Specific) for ${workoutName}: ${tier3Pool.length} exercises`);

      const finalPool = [...tier1Pool, ...tier2Pool, ...tier3Pool];
      const finalUniquePool = [...new Map(finalPool.map(item => [item.id, item])).values()];
      console.log(`[generate-t-path] Final unique pool for ${workoutName}: ${finalUniquePool.length} exercises`);
      
      const mainExercisesForWorkout = finalUniquePool.slice(0, maxMainExercises);
      const bonusExercisesForWorkout = finalUniquePool.slice(maxMainExercises, maxMainExercises + maxBonusExercises);
      console.log(`[generate-t-path] Selected ${mainExercisesForWorkout.length} main and ${bonusExercisesForWorkout.length} bonus exercises for ${workoutName}.`);

      const exercisesToInsertPayload = [
        ...mainExercisesForWorkout.map((ex, index) => ({ template_id: childWorkoutId, exercise_id: ex.id, order_index: index, is_bonus_exercise: false })),
        ...bonusExercisesForWorkout.map((ex, index) => ({ template_id: childWorkoutId, exercise_id: ex.id, order_index: mainExercisesForWorkout.length + index, is_bonus_exercise: true }))
      ];

      if (exercisesToInsertPayload.length > 0) {
        const { error: insertError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(exercisesToInsertPayload);
        if (insertError) throw insertError;
        console.log(`[generate-t-path] Successfully inserted ${exercisesToInsertPayload.length} exercises into t_path_exercises for ${workoutName}.`);
      } else {
        console.log(`[generate-t-path] No exercises to insert for ${workoutName}.`);
      }
    }

    console.log(`[generate-t-path] T-Path generation completed for tPathId: ${tPathId}. Updating profile status.`);
    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'completed', t_path_generation_error: null }).eq('id', userId);

    // Moved the success response to the end of the try block
    return new Response(JSON.stringify({ message: 'T-Path generation completed successfully.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) errorMessage = error.message;
    else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') errorMessage = (error as any).message;
    else if (typeof error === 'string') errorMessage = error;
    console.error("Error in generate-t-path edge function:", JSON.stringify(error, null, 2));
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: errorMessage }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function musclesIntersect(muscleString: string, muscleSet: Set<string>): boolean {
    if (!muscleString) return false;
    const muscles = muscleString.split(',').map(m => m.trim());
    return muscles.some(m => muscleSet.has(m));
}