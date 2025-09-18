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
    if (!tPathId) throw new Error('tPathId is required');

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'in_progress', t_path_generation_error: null }).eq('id', userId);

    (async () => {
      try {
        // 1. Fetch Core Data
        const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient.from('t_paths').select('id, settings, user_id').eq('id', tPathId).eq('user_id', user.id).single();
        if (tPathError || !tPathData) throw new Error('Main T-Path not found.');

        let preferredSessionLength = sessionLengthFromBody;
        if (preferredSessionLength === undefined) {
          const { data: profileData, error: profileError } = await supabaseServiceRoleClient.from('profiles').select('preferred_session_length, active_gym_id').eq('id', user.id).single();
          if (profileError) throw profileError;
          preferredSessionLength = (profileData as ProfileData)?.preferred_session_length;
        }
        const { data: profileData } = await supabaseServiceRoleClient.from('profiles').select('active_gym_id').eq('id', user.id).single();
        const activeGymId = (profileData as ProfileData)?.active_gym_id;

        const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient.from('exercise_definitions').select('id, name, user_id, library_id, movement_type, movement_pattern');
        if (fetchAllExercisesError) throw fetchAllExercisesError;

        const { data: allGymLinks, error: gymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('gym_id, exercise_id');
        if (gymLinksError) throw gymLinksError;

        // 2. Cleanup Old Workouts
        const { data: oldChildWorkouts, error: fetchOldError } = await supabaseServiceRoleClient.from('t_paths').select('id').eq('parent_t_path_id', tPathId).eq('user_id', user.id);
        if (fetchOldError) throw fetchOldError;
        if (oldChildWorkouts && oldChildWorkouts.length > 0) {
          const oldChildIds = oldChildWorkouts.map((w: { id: string }) => w.id);
          await supabaseServiceRoleClient.from('t_path_exercises').delete().in('template_id', oldChildIds);
          await supabaseServiceRoleClient.from('t_paths').delete().in('id', oldChildIds);
        }

        // 3. Determine Parameters
        const tPathSettings = tPathData.settings as { tPathType?: string };
        if (!tPathSettings?.tPathType) throw new Error('Invalid T-Path settings.');
        const workoutSplit = tPathSettings.tPathType;
        const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);
        const workoutNames = getWorkoutNamesForSplit(workoutSplit);
        const allLinkedExerciseIds = new Set((allGymLinks || []).map((l: GymLink) => l.exercise_id));
        const activeGymExerciseIds = new Set(activeGymId ? (allGymLinks || []).filter((l: GymLink) => l.gym_id === activeGymId).map((l: GymLink) => l.exercise_id) : []);

        // 4. Generate New Workouts
        for (const workoutName of workoutNames) {
          const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient
            .from('t_paths')
            .insert({ user_id: user.id, parent_t_path_id: tPathId, template_name: workoutName, is_bonus: true, settings: tPathData.settings })
            .select('id').single();
          if (createChildError) throw createChildError;
          const childWorkoutId = newChildWorkout.id;

          const movementPattern = workoutName.split(' ')[0]; // "Push", "Pull", "Legs", "Upper", "Lower"

          // Build Exercise Pools
          const gymExercises = (allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === movementPattern && activeGymExerciseIds.has(ex.id));
          const bodyweightExercises = (allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === movementPattern && !allLinkedExerciseIds.has(ex.id));

          // Sort Pools
          const sortedGymExercises = sortExercises(gymExercises as ExerciseDefinition[]);
          const sortedBodyweightExercises = sortExercises(bodyweightExercises as ExerciseDefinition[]);

          // Assemble Workout
          const finalExercisesForWorkout: ExerciseDefinition[] = [];
          let currentDuration = 0;
          const exerciseDurationEstimate = 5; // 5 minutes per exercise

          for (const ex of sortedGymExercises) {
            if (currentDuration + exerciseDurationEstimate <= maxAllowedMinutes) {
              finalExercisesForWorkout.push(ex);
              currentDuration += exerciseDurationEstimate;
            } else break;
          }
          for (const ex of sortedBodyweightExercises) {
            if (currentDuration + exerciseDurationEstimate <= maxAllowedMinutes) {
              finalExercisesForWorkout.push(ex);
              currentDuration += exerciseDurationEstimate;
            } else break;
          }

          // Save Workout
          if (finalExercisesForWorkout.length > 0) {
            const exercisesToInsertPayload = finalExercisesForWorkout.map((ex, index) => ({
              template_id: childWorkoutId,
              exercise_id: ex.id,
              order_index: index,
              is_bonus_exercise: false, // Bonus logic can be added here if needed
            }));
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