// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Type Definitions ---
interface TPathData {
  id: string;
  template_name: string;
  settings: { tPathType?: string } | null;
  user_id: string;
}

interface ProfileData {
  preferred_session_length: string | null;
  active_location_tag: string | null;
}

interface ExerciseDefinition {
  id: string;
  user_id: string | null;
  library_id: string | null;
  location_tags: string[] | null;
}

interface WorkoutStructureEntry {
  exercise_library_id: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
}

// --- Utility Functions ---
const getSupabaseServiceRoleClient = () => {
  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

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

// --- Main Workout Processing Logic ---
const processSingleChildWorkout = async (
  supabase: ReturnType<typeof createClient>,
  user: any,
  tPath: TPathData,
  workoutName: string,
  workoutSplit: string,
  maxAllowedMinutes: number,
  allExercises: ExerciseDefinition[],
  activeLocationTag: string | null
) => {
  console.log(`[Background] Processing workout: ${workoutName} for user ${user.id}`);

  // 1. Find or Create the child t_path
  let childWorkoutId: string;
  const { data: existingChildWorkout, error: fetchExistingChildError } = await supabase
    .from('t_paths')
    .select('id')
    .eq('user_id', user.id)
    .eq('parent_t_path_id', tPath.id)
    .eq('template_name', workoutName)
    .eq('is_bonus', true)
    .single();

  if (fetchExistingChildError && fetchExistingChildError.code !== 'PGRST116') throw fetchExistingChildError;

  if (existingChildWorkout) {
    childWorkoutId = existingChildWorkout.id;
  } else {
    const { data: newChildWorkout, error: createChildWorkoutError } = await supabase
      .from('t_paths')
      .insert({
        user_id: user.id,
        parent_t_path_id: tPath.id,
        template_name: workoutName,
        is_bonus: true,
        settings: tPath.settings
      })
      .select('id')
      .single();
    if (createChildWorkoutError) throw createChildWorkoutError;
    childWorkoutId = newChildWorkout.id;
  }

  // 2. Delete all existing exercise links for this child workout
  const { error: deleteError } = await supabase.from('t_path_exercises').delete().eq('template_id', childWorkoutId);
  if (deleteError) throw deleteError;

  // 3. Determine available exercises based on location tag
  const availableExerciseLibraryIds = new Set<string>();
  allExercises.forEach(ex => {
    const isAvailable = !activeLocationTag || !ex.location_tags || ex.location_tags.length === 0 || ex.location_tags.includes(activeLocationTag);
    if (isAvailable && ex.library_id) {
      availableExerciseLibraryIds.add(ex.library_id);
    }
  });

  // 4. Fetch workout structure and filter by available equipment
  const { data: structureEntries, error: structureError } = await supabase
    .from('workout_exercise_structure')
    .select('exercise_library_id, min_session_minutes, bonus_for_time_group')
    .eq('workout_split', workoutSplit)
    .eq('workout_name', workoutName)
    .in('exercise_library_id', Array.from(availableExerciseLibraryIds))
    .order('min_session_minutes', { ascending: true, nullsFirst: true });
  if (structureError) throw structureError;

  // 5. Select exercises based on duration
  const exercisesToInsertPayload: { template_id: string; exercise_id: string; order_index: number; is_bonus_exercise: boolean }[] = [];
  const userCustomExerciseMap = new Map<string, string>();
  allExercises.filter(ex => ex.user_id === user.id && ex.library_id).forEach(ex => userCustomExerciseMap.set(ex.library_id!, ex.id));

  for (const entry of structureEntries || []) {
    const isIncludedAsMain = entry.min_session_minutes !== null && maxAllowedMinutes >= entry.min_session_minutes;
    const isIncludedAsBonus = entry.bonus_for_time_group !== null && maxAllowedMinutes >= entry.bonus_for_time_group;

    if (isIncludedAsMain || isIncludedAsBonus) {
      const globalLibraryId = entry.exercise_library_id;
      let finalExerciseId: string;

      if (userCustomExerciseMap.has(globalLibraryId)) {
        finalExerciseId = userCustomExerciseMap.get(globalLibraryId)!;
      } else {
        const globalExercise = allExercises.find(ex => ex.library_id === globalLibraryId && ex.user_id === null);
        if (!globalExercise) continue;
        finalExerciseId = globalExercise.id;
      }

      const isBonus = isIncludedAsBonus && !isIncludedAsMain;
      exercisesToInsertPayload.push({
        template_id: childWorkoutId,
        exercise_id: finalExerciseId,
        order_index: isBonus ? (entry.bonus_for_time_group || 0) : (entry.min_session_minutes || 0),
        is_bonus_exercise: isBonus,
      });
    }
  }

  // 6. Sort, re-index, and bulk insert
  exercisesToInsertPayload.sort((a, b) => a.order_index - b.order_index);
  exercisesToInsertPayload.forEach((ex, i) => { ex.order_index = i; });

  if (exercisesToInsertPayload.length > 0) {
    const { error: insertError } = await supabase.from('t_path_exercises').insert(exercisesToInsertPayload);
    if (insertError) throw insertError;
  }
};

// --- Main Serve Function ---
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  let userId: string | null = null;

  try {
    const { tPathId } = await req.json();
    if (!tPathId) throw new Error('tPathId is required');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    
    const { data: { user }, error: userError } = await createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');
    userId = user.id;

    // --- IMMEDIATE RESPONSE ---
    const response = new Response(
      JSON.stringify({ message: 'T-Path generation initiated successfully.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // --- ASYNCHRONOUS BACKGROUND WORK ---
    (async () => {
      try {
        const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient
          .from('t_paths').select('id, template_name, settings, user_id').eq('id', tPathId).eq('user_id', userId).single();
        if (tPathError) throw tPathError;

        const { data: profileData, error: profileError } = await supabaseServiceRoleClient
          .from('profiles').select('preferred_session_length, active_location_tag').eq('id', userId).single();
        if (profileError) throw profileError;

        const tPathSettings = tPathData.settings as { tPathType?: string };
        if (!tPathSettings?.tPathType) throw new Error('Invalid T-Path settings.');

        const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient
          .from('exercise_definitions').select('id, library_id, user_id, location_tags');
        if (fetchAllExercisesError) throw fetchAllExercisesError;

        const workoutSplit = tPathSettings.tPathType;
        const maxAllowedMinutes = getMaxMinutes(profileData.preferred_session_length);
        const activeLocationTag = profileData.active_location_tag;
        const workoutNames = getWorkoutNamesForSplit(workoutSplit);

        for (const workoutName of workoutNames) {
          await processSingleChildWorkout(
            supabaseServiceRoleClient,
            user,
            tPathData,
            workoutName,
            workoutSplit,
            maxAllowedMinutes,
            allExercises as ExerciseDefinition[],
            activeLocationTag
          );
        }
        console.log(`[Background] Successfully generated all workouts for T-Path ${tPathId}`);
      } catch (backgroundError: any) {
        console.error(`[Background] T-Path generation failed for user ${userId}:`, backgroundError);
      }
    })();

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error('Error in generate-t-path edge function:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});