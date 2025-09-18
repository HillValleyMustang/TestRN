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
}

interface WorkoutStructure {
  exercise_library_id: string;
  workout_name: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null; // Added bonus field
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

interface GymLink {
  gym_id: string;
  exercise_id: string;
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

    const body = await req.json();
    const tPathId = body.tPathId;
    const sessionLengthFromBody = body.preferred_session_length;
    const confirmedExerciseIds = body.confirmedExerciseIds; // NEW: Get confirmed IDs
    if (!tPathId) throw new Error('tPathId is required');

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'in_progress', t_path_generation_error: null }).eq('id', userId);

    (async () => {
      try {
        // 1. Fetch Core Data
        const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient.from('t_paths').select('id, settings, user_id').eq('id', tPathId).eq('user_id', user.id).single();
        if (tPathError || !tPathData) throw new Error('Main T-Path not found.');

        let preferredSessionLength = sessionLengthFromBody;
        
        // This logic is now simplified because we prioritize passed-in exercise IDs
        if (preferredSessionLength === undefined) {
          const { data: profileData, error: profileError } = await supabaseServiceRoleClient.from('profiles').select('preferred_session_length').eq('id', user.id).single();
          if (profileError) throw profileError;
          preferredSessionLength = (profileData as ProfileData)?.preferred_session_length;
        }

        const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient.from('exercise_definitions').select('id, name, user_id, library_id, movement_type, movement_pattern');
        if (fetchAllExercisesError) throw fetchAllExercisesError;

        const { data: allGymLinks, error: allGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id');
        if (allGymLinksError) throw allGymLinksError;
        const allLinkedExerciseIds = new Set((allGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));

        let activeGymExerciseIds = new Set<string>();

        // NEW LOGIC: Prioritize confirmedExerciseIds if provided (onboarding case)
        if (confirmedExerciseIds && Array.isArray(confirmedExerciseIds) && confirmedExerciseIds.length > 0) {
          console.log(`Using ${confirmedExerciseIds.length} confirmed exercise IDs from request body for Tier 1 pool.`);
          activeGymExerciseIds = new Set(confirmedExerciseIds);
        } else {
          // FALLBACK LOGIC: For non-onboarding cases (e.g., changing session length)
          console.log("No confirmed exercise IDs provided. Fetching active gym from profile.");
          const { data: profileData, error: profileError } = await supabaseServiceRoleClient.from('profiles').select('active_gym_id').eq('id', user.id).single();
          if (profileError) throw profileError;
          const activeGymId = (profileData as ProfileData)?.active_gym_id;

          if (activeGymId) {
            const { data: activeGymLinks, error: activeGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id').eq('gym_id', activeGymId);
            if (activeGymLinksError) throw activeGymLinksError;
            activeGymExerciseIds = new Set((activeGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
            console.log(`Found ${activeGymExerciseIds.size} exercises for active gym ${activeGymId}.`);
          } else {
            console.log("No active gym found in profile.");
          }
        }

        const { data: workoutStructure, error: structureError } = await supabaseServiceRoleClient.from('workout_exercise_structure').select('exercise_library_id, workout_name, min_session_minutes, bonus_for_time_group');
        if (structureError) throw structureError;

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
        const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);
        const workoutNames = getWorkoutNamesForSplit(workoutSplit);
        const libraryIdToUuidMap = new Map<string, string>();
        (allExercises || []).forEach((ex: ExerciseDefinition) => { if (ex.library_id) libraryIdToUuidMap.set(ex.library_id, ex.id); });

        // 4. Generate New Workouts
        for (const workoutName of workoutNames) {
          const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient
            .from('t_paths')
            .insert({ user_id: user.id, parent_t_path_id: tPathId, template_name: workoutName, is_bonus: true, settings: tPathData.settings })
            .select('id').single();
          if (createChildError) throw createChildError;
          const childWorkoutId = newChildWorkout.id;

          let movementPatterns: string[] = [];
          if (workoutName.includes('Upper')) {
              movementPatterns = ['Push', 'Pull'];
          } else if (workoutName.includes('Lower')) {
              movementPatterns = ['Legs', 'Core'];
          } else if (workoutName === 'Push') {
              movementPatterns = ['Push'];
          } else if (workoutName === 'Pull') {
              movementPatterns = ['Pull'];
          } else if (workoutName === 'Legs') {
              movementPatterns = ['Legs'];
          }

          // Build Exercise Pools
          const tier1Pool = (allExercises || []).filter((ex: ExerciseDefinition) => movementPatterns.includes(ex.movement_pattern || '') && activeGymExerciseIds.has(ex.id));
          const tier2Pool = (allExercises || []).filter((ex: ExerciseDefinition) => movementPatterns.includes(ex.movement_pattern || '') && !allLinkedExerciseIds.has(ex.id));
          const commonGymLibraryIds = new Set(
            (workoutStructure || []).filter((s: WorkoutStructure) => s.workout_name === workoutName && s.min_session_minutes !== null && maxAllowedMinutes >= s.min_session_minutes).map((s: WorkoutStructure) => s.exercise_library_id)
          );
          const commonGymUuids = new Set(
            Array.from(commonGymLibraryIds)
              .map((libId: any) => libraryIdToUuidMap.get(libId))
              .filter((uuid): uuid is string => !!uuid)
          );
          const tier3Pool = (allExercises || []).filter((ex: ExerciseDefinition) => commonGymUuids.has(ex.id));

          // Assemble Main Workout
          const mainExercisesForWorkout: ExerciseDefinition[] = [];
          const addedExerciseIds = new Set<string>();
          let currentDuration = 0;
          const exerciseDurationEstimate = 5;

          const addExercisesFromPool = (pool: ExerciseDefinition[]) => {
            for (const ex of pool) {
              if (currentDuration + exerciseDurationEstimate > maxAllowedMinutes) break;
              if (!addedExerciseIds.has(ex.id)) {
                mainExercisesForWorkout.push(ex);
                addedExerciseIds.add(ex.id);
                currentDuration += exerciseDurationEstimate;
              }
            }
          };

          addExercisesFromPool(sortExercises(tier1Pool as ExerciseDefinition[]));
          addExercisesFromPool(sortExercises(tier2Pool as ExerciseDefinition[]));
          addExercisesFromPool(sortExercises(tier3Pool as ExerciseDefinition[]));

          // Identify and Add Bonus Exercises
          const bonusExercisesForWorkout: ExerciseDefinition[] = [];
          const bonusLibraryIds = new Set(
            (workoutStructure || []).filter((s: WorkoutStructure) => s.workout_name === workoutName && s.bonus_for_time_group !== null && maxAllowedMinutes >= s.bonus_for_time_group).map((s: WorkoutStructure) => s.exercise_library_id)
          );
          const bonusUuids = new Set(
            Array.from(bonusLibraryIds)
              .map((libId: any) => libraryIdToUuidMap.get(libId))
              .filter((uuid): uuid is string => !!uuid)
          );
          (allExercises || []).forEach((ex: ExerciseDefinition) => {
            if (bonusUuids.has(ex.id) && !addedExerciseIds.has(ex.id)) {
              bonusExercisesForWorkout.push(ex);
              addedExerciseIds.add(ex.id); // Also add to main set to avoid duplicates if logic overlaps
            }
          });

          // Final Sort and Save
          const sortedMainExercises = sortExercises(mainExercisesForWorkout);
          const sortedBonusExercises = sortExercises(bonusExercisesForWorkout);

          const exercisesToInsertPayload = [
            ...sortedMainExercises.map((ex, index) => ({
              template_id: childWorkoutId,
              exercise_id: ex.id,
              order_index: index,
              is_bonus_exercise: false,
            })),
            ...sortedBonusExercises.map((ex, index) => ({
              template_id: childWorkoutId,
              exercise_id: ex.id,
              order_index: sortedMainExercises.length + index,
              is_bonus_exercise: true,
            }))
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
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: errorMessage }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});