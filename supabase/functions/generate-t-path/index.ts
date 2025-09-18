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
  main_muscle: string; // Added for new logic
}

interface WorkoutStructure {
  exercise_library_id: string;
  workout_name: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
}

interface TPathData {
  id: string;
  settings: { tPathType?: string } | null;
  user_id: string;
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
function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90;
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  let userId: string | null = null;
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');
    userId = user.id;

    const { tPathId, preferred_session_length } = await req.json();
    if (!tPathId) throw new Error('tPathId is required');

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'in_progress', t_path_generation_error: null }).eq('id', userId);

    (async () => {
      try {
        // 1. Fetch Core Data
        const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient.from('t_paths').select('id, settings, user_id').eq('id', tPathId).eq('user_id', user.id).single();
        if (tPathError || !tPathData) throw new Error('Main T-Path not found.');

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

        const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient.from('exercise_definitions').select('id, name, user_id, library_id, movement_type, movement_pattern, main_muscle');
        if (fetchAllExercisesError) throw fetchAllExercisesError;

        const { data: allGymLinks, error: allGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id');
        if (allGymLinksError) throw allGymLinksError;
        const allLinkedExerciseIds = new Set((allGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));

        const { data: workoutStructure, error: structureError } = await supabaseServiceRoleClient.from('workout_exercise_structure').select('exercise_library_id, workout_name, min_session_minutes, bonus_for_time_group');
        if (structureError) throw structureError;

        const libraryIdToUuidMap = new Map<string, string>();
        (allExercises || []).forEach((ex: ExerciseDefinition) => { if (ex.library_id) libraryIdToUuidMap.set(ex.library_id, ex.id); });

        // 2. Cleanup Old Workouts
        const { data: oldChildWorkouts, error: fetchOldError } = await supabaseServiceRoleClient.from('t_paths').select('id').eq('parent_t_path_id', tPathId).eq('user_id', user.id);
        if (fetchOldError) throw fetchOldError;
        if (oldChildWorkouts && oldChildWorkouts.length > 0) {
          const oldChildIds = oldChildWorkouts.map((w: { id: string }) => w.id);
          await supabaseServiceRoleClient.from('t_path_exercises').delete().in('template_id', oldChildIds);
          await supabaseServiceRoleClient.from('t_paths').delete().in('id', oldChildIds);
        }

        // 3. Determine Parameters & Create Maps
        const tPathSettings = tPathData.settings as { tPathType?: string };
        if (!tPathSettings?.tPathType) throw new Error('Invalid T-Path settings.');
        const workoutSplit = tPathSettings.tPathType;
        const maxAllowedMinutes = getMaxMinutes(sessionLength);
        const workoutNames = getWorkoutNamesForSplit(workoutSplit);

        const workoutSpecificPools: Record<string, ExerciseDefinition[]> = {};

        if (workoutSplit === 'ulul') {
          const UPPER_BODY_MUSCLES = new Set(['Pectorals', 'Deltoids', 'Lats', 'Traps', 'Biceps', 'Triceps', 'Abdominals', 'Core']);
          const LOWER_BODY_MUSCLES = new Set(['Quadriceps', 'Hamstrings', 'Glutes', 'Calves']);

          const upperPool = (allExercises || []).filter((ex: any) => {
            if (!ex.main_muscle) return false;
            const muscles = ex.main_muscle.split(',').map((m: string) => m.trim());
            return muscles.some((m: string) => UPPER_BODY_MUSCLES.has(m));
          });
          const lowerPool = (allExercises || []).filter((ex: any) => {
            if (!ex.main_muscle) return false;
            const muscles = ex.main_muscle.split(',').map((m: string) => m.trim());
            return muscles.some((m: string) => LOWER_BODY_MUSCLES.has(m));
          });

          workoutSpecificPools['Upper Body A'] = [];
          workoutSpecificPools['Upper Body B'] = [];
          workoutSpecificPools['Lower Body A'] = [];
          workoutSpecificPools['Lower Body B'] = [];
          sortExercises(upperPool).forEach((ex, i) => {
            workoutSpecificPools[i % 2 === 0 ? 'Upper Body A' : 'Upper Body B'].push(ex);
          });
          sortExercises(lowerPool).forEach((ex, i) => {
            workoutSpecificPools[i % 2 === 0 ? 'Lower Body A' : 'Lower Body B'].push(ex);
          });
        } else { // ppl
          const pushPool = (allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Push');
          const pullPool = (allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Pull');
          const legsPool = (allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Legs');
          
          workoutSpecificPools['Push'] = sortExercises(pushPool);
          workoutSpecificPools['Pull'] = sortExercises(pullPool);
          workoutSpecificPools['Legs'] = sortExercises(legsPool);
        }

        for (const workoutName of workoutNames) {
          const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient
            .from('t_paths')
            .insert({ user_id: user.id, parent_t_path_id: tPathId, template_name: workoutName, is_bonus: true, settings: tPathData.settings })
            .select('id').single();
          if (createChildError) throw createChildError;
          const childWorkoutId = newChildWorkout.id;

          const candidatePool = workoutSpecificPools[workoutName] || [];
          
          let activeGymExerciseIds = new Set<string>();
          if (activeGymId) {
            const { data: activeGymLinks, error: activeGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id').eq('gym_id', activeGymId);
            if (activeGymLinksError) throw activeGymLinksError;
            activeGymExerciseIds = new Set((activeGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
          }

          const tier1Pool = candidatePool.filter(ex => ex.user_id === user.id && activeGymExerciseIds.has(ex.id));
          const tier2Pool = candidatePool.filter(ex => ex.user_id === user.id && !allLinkedExerciseIds.has(ex.id)); // User bodyweight
          const tier3Pool = candidatePool.filter(ex => ex.user_id === null && activeGymExerciseIds.has(ex.id)); // Global gym
          const tier4Pool = candidatePool.filter(ex => ex.user_id === null && !allLinkedExerciseIds.has(ex.id)); // Global bodyweight
          
          const commonGymLibraryIds = new Set((workoutStructure || []).filter((s: WorkoutStructure) => s.workout_name === workoutName && s.min_session_minutes !== null && maxAllowedMinutes >= s.min_session_minutes).map((s: WorkoutStructure) => s.exercise_library_id));
          const commonGymUuids = new Set(Array.from(commonGymLibraryIds).map((libId: any) => libraryIdToUuidMap.get(libId)).filter((uuid): uuid is string => !!uuid));
          const tier5Pool = candidatePool.filter(ex => commonGymUuids.has(ex.id));

          const finalPool = [...tier1Pool, ...tier2Pool, ...tier3Pool, ...tier4Pool, ...tier5Pool];
          const finalUniquePool = [...new Map(finalPool.map(item => [item.id, item])).values()];
          
          const mainExercisesForWorkout: ExerciseDefinition[] = [];
          const addedExerciseIds = new Set<string>();
          let currentDuration = 0;
          const exerciseDurationEstimate = 5;

          for (const ex of finalUniquePool) {
            if (currentDuration + exerciseDurationEstimate <= maxAllowedMinutes) {
              if (!addedExerciseIds.has(ex.id)) {
                mainExercisesForWorkout.push(ex);
                addedExerciseIds.add(ex.id);
                currentDuration += exerciseDurationEstimate;
              }
            } else {
              break;
            }
          }

          const bonusLibraryIds = new Set((workoutStructure || []).filter((s: WorkoutStructure) => s.workout_name === workoutName && s.bonus_for_time_group !== null && maxAllowedMinutes >= s.bonus_for_time_group).map((s: WorkoutStructure) => s.exercise_library_id));
          const bonusUuids = new Set(Array.from(bonusLibraryIds).map((libId: any) => libraryIdToUuidMap.get(libId)).filter((uuid): uuid is string => !!uuid));
          const bonusExercisesForWorkout = (allExercises || []).filter((ex: ExerciseDefinition) => bonusUuids.has(ex.id) && !addedExerciseIds.has(ex.id));

          const exercisesToInsertPayload = [
            ...mainExercisesForWorkout.map((ex, index) => ({ template_id: childWorkoutId, exercise_id: ex.id, order_index: index, is_bonus_exercise: false })),
            ...sortExercises(bonusExercisesForWorkout).map((ex, index) => ({ template_id: childWorkoutId, exercise_id: ex.id, order_index: mainExercisesForWorkout.length + index, is_bonus_exercise: true }))
          ];

          if (exercisesToInsertPayload.length > 0) {
            const { error: insertError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(exercisesToInsertPayload);
            if (insertError) throw insertError;
          }
        }

        await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'completed', t_path_generation_error: null }).eq('id', userId);
      } catch (backgroundError: any) {
        const errorMessage = backgroundError instanceof Error ? backgroundError.message : "An unknown error occurred.";
        await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: errorMessage }).eq('id', userId);
      }
    })();

    return new Response(JSON.stringify({ message: 'T-Path generation initiated.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
      errorMessage = (error as any).message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    console.error("Error in generate-t-path edge function:", JSON.stringify(error, null, 2));
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: errorMessage }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});