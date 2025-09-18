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
  bonus_for_time_group: number | null;
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

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');

    const {
      tPathType, experience, goalFocus, preferredMuscles, constraints,
      sessionLength, equipmentMethod, gymName, confirmedExercises,
      fullName, heightCm, weightKg, bodyFatPct
    } = await req.json();

    if (!tPathType || !experience || !sessionLength || !fullName || !heightCm || !weightKg) {
      throw new Error("Missing required onboarding data.");
    }

    // --- Start Transactional Onboarding Process ---

    // 1. Create Gym
    const { data: insertedGym, error: insertGymError } = await supabaseServiceRoleClient
      .from('gyms')
      .insert({ user_id: user.id, name: gymName || "My Gym" })
      .select('id')
      .single();
    if (insertGymError) throw insertGymError;
    const newGymId = insertedGym.id;

    // 2. Create main T-Paths
    const tPathsToInsert = [
      { user_id: user.id, template_name: '4-Day Upper/Lower', is_bonus: false, parent_t_path_id: null, settings: { tPathType: 'ulul', experience, goalFocus, preferredMuscles, constraints, equipmentMethod } },
      { user_id: user.id, template_name: '3-Day Push/Pull/Legs', is_bonus: false, parent_t_path_id: null, settings: { tPathType: 'ppl', experience, goalFocus, preferredMuscles, constraints, equipmentMethod } }
    ];
    const { data: insertedTPaths, error: insertTPathsError } = await supabaseServiceRoleClient
      .from('t_paths')
      .insert(tPathsToInsert)
      .select('id, template_name, settings');
    if (insertTPathsError) throw insertTPathsError;

    const activeTPath = insertedTPaths.find((tp: { id: string; template_name: string }) =>
      (tPathType === 'ulul' && tp.template_name === '4-Day Upper/Lower') ||
      (tPathType === 'ppl' && tp.template_name === '3-Day Push/Pull/Legs')
    );
    if (!activeTPath) throw new Error("Could not determine active T-Path after creation.");

    // 3. Process and save confirmed exercises
    const exerciseIdsToLinkToGym = new Set<string>();
    const newExercisesToCreate = [];
    const confirmedExercisesDataForPlan: ExerciseDefinition[] = [];

    for (const ex of (confirmedExercises || [])) {
      if (ex.existing_id) {
        exerciseIdsToLinkToGym.add(ex.existing_id);
        // FIX: Construct a valid object for the plan with the correct ID
        confirmedExercisesDataForPlan.push({
          id: ex.existing_id,
          name: ex.name!,
          user_id: null, // Not needed for sorting/planning logic
          library_id: null, // Not needed for sorting/planning logic
          movement_type: ex.movement_type || null,
          movement_pattern: ex.movement_pattern || null,
        });
      } else {
        newExercisesToCreate.push({
          name: ex.name!, main_muscle: ex.main_muscle!, type: ex.type!,
          category: ex.category, description: ex.description, pro_tip: ex.pro_tip,
          video_url: ex.video_url, icon_url: ex.icon_url, user_id: user.id,
          library_id: null, is_favorite: false, created_at: new Date().toISOString(),
          movement_type: ex.movement_type, movement_pattern: ex.movement_pattern,
        });
      }
    }

    if (newExercisesToCreate.length > 0) {
      const { data: insertedExercises, error: insertExError } = await supabaseServiceRoleClient
        .from('exercise_definitions')
        .insert(newExercisesToCreate)
        .select('*');
      if (insertExError) throw insertExError;
      insertedExercises.forEach((ex: any) => {
        exerciseIdsToLinkToGym.add(ex.id);
        confirmedExercisesDataForPlan.push(ex);
      });
    }

    // 4. Link exercises to the new gym
    if (exerciseIdsToLinkToGym.size > 0) {
      const gymLinks = Array.from(exerciseIdsToLinkToGym).map(exId => ({ gym_id: newGymId, exercise_id: exId }));
      const { error: gymLinkError } = await supabaseServiceRoleClient.from('gym_exercises').insert(gymLinks);
      if (gymLinkError) throw gymLinkError;
    }

    // 5. Create the user profile
    const nameParts = fullName.split(' ');
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ') || '';
    const profileData = {
      id: user.id, first_name: firstName, last_name: lastName, full_name: fullName,
      height_cm: heightCm, weight_kg: weightKg, body_fat_pct: bodyFatPct,
      preferred_muscles: preferredMuscles, primary_goal: goalFocus, health_notes: constraints,
      default_rest_time_seconds: 60, preferred_session_length: sessionLength,
      active_t_path_id: activeTPath.id, active_gym_id: newGymId,
    };
    const { error: profileError } = await supabaseServiceRoleClient.from('profiles').upsert(profileData);
    if (profileError) throw profileError;

    // 6. Now, generate the workouts for BOTH T-Paths
    const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient.from('exercise_definitions').select('id, name, user_id, library_id, movement_type, movement_pattern');
    if (fetchAllExercisesError) throw fetchAllExercisesError;
    const { data: allGymLinks, error: allGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id');
    if (allGymLinksError) throw allGymLinksError;
    const allLinkedExerciseIds = new Set((allGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
    const { data: workoutStructure, error: structureError } = await supabaseServiceRoleClient.from('workout_exercise_structure').select('exercise_library_id, workout_name, min_session_minutes, bonus_for_time_group');
    if (structureError) throw structureError;
    const libraryIdToUuidMap = new Map<string, string>();
    (allExercises || []).forEach((ex: ExerciseDefinition) => { if (ex.library_id) libraryIdToUuidMap.set(ex.library_id, ex.id); });

    for (const tPath of insertedTPaths) {
      const tPathSettings = (tPath as any).settings as { tPathType?: string };
      if (!tPathSettings?.tPathType) {
        console.error("T-Path is missing settings.tPathType", tPath);
        continue;
      }
      const workoutSplit = tPathSettings.tPathType;
      const maxAllowedMinutes = getMaxMinutes(sessionLength);
      const workoutNames = getWorkoutNamesForSplit(workoutSplit);

      for (const workoutName of workoutNames) {
        const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient
          .from('t_paths')
          .insert({ user_id: user.id, parent_t_path_id: tPath.id, template_name: workoutName, is_bonus: true, settings: (tPath as any).settings })
          .select('id').single();
        if (createChildError) throw createChildError;
        const childWorkoutId = newChildWorkout.id;

        let movementPatterns: string[] = [];
        if (workoutName.includes('Upper')) movementPatterns = ['Push', 'Pull'];
        else if (workoutName.includes('Lower')) movementPatterns = ['Legs', 'Core'];
        else if (workoutName === 'Push') movementPatterns = ['Push'];
        else if (workoutName === 'Pull') movementPatterns = ['Pull'];
        else if (workoutName === 'Legs') movementPatterns = ['Legs'];

        // --- NEW TIERED LOGIC ---
        const tier1Pool = confirmedExercisesDataForPlan.filter(ex => movementPatterns.includes(ex.movement_pattern || ''));
        const tier2Pool = (allExercises || []).filter((ex: ExerciseDefinition) => movementPatterns.includes(ex.movement_pattern || '') && !allLinkedExerciseIds.has(ex.id));
        const commonGymLibraryIds = new Set((workoutStructure || []).filter((s: WorkoutStructure) => s.workout_name === workoutName && s.min_session_minutes !== null && maxAllowedMinutes >= s.min_session_minutes).map((s: WorkoutStructure) => s.exercise_library_id));
        const commonGymUuids = new Set(Array.from(commonGymLibraryIds).map((libId: any) => libraryIdToUuidMap.get(libId)).filter((uuid): uuid is string => !!uuid));
        const tier3Pool = (allExercises || []).filter((ex: ExerciseDefinition) => commonGymUuids.has(ex.id));

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

        const bonusLibraryIds = new Set((workoutStructure || []).filter((s: WorkoutStructure) => s.workout_name === workoutName && s.bonus_for_time_group !== null && maxAllowedMinutes >= s.bonus_for_time_group).map((s: WorkoutStructure) => s.exercise_library_id));
        const bonusUuids = new Set(Array.from(bonusLibraryIds).map((libId: any) => libraryIdToUuidMap.get(libId)).filter((uuid): uuid is string => !!uuid));
        const bonusExercisesForWorkout = (allExercises || []).filter((ex: ExerciseDefinition) => bonusUuids.has(ex.id) && !addedExerciseIds.has(ex.id));

        const exercisesToInsertPayload = [
          ...sortExercises(mainExercisesForWorkout).map((ex, index) => ({ template_id: childWorkoutId, exercise_id: ex.id, order_index: index, is_bonus_exercise: false })),
          ...sortExercises(bonusExercisesForWorkout).map((ex, index) => ({ template_id: childWorkoutId, exercise_id: ex.id, order_index: mainExercisesForWorkout.length + index, is_bonus_exercise: true }))
        ];

        if (exercisesToInsertPayload.length > 0) {
          const { error: insertError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(exercisesToInsertPayload);
          if (insertError) throw insertError;
        }
      }
    }

    return new Response(JSON.stringify({ message: 'Onboarding completed successfully.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    let message = "An unknown error occurred";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
      message = (error as any).message;
    } else if (typeof error === 'string') {
      message = error;
    }
    console.error("Error in complete-onboarding edge function:", JSON.stringify(error, null, 2));
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});