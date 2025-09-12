// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.1';

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
  name: string;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  icon_url: string | null;
}

interface WorkoutStructureEntry {
  exercise_library_id: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
}

// --- Constants ---
const MIN_EXERCISES_PER_WORKOUT = 3; // Minimum number of exercises to aim for
const BONUS_EXERCISES_TO_ADD = 2; // Number of bonus exercises to add if space allows
const DEFAULT_EXERCISE_DURATION_MINUTES = 5; // Estimated duration per exercise for calculation

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

// Helper to log user-specific alerts
const logUserAlert = async (supabase: ReturnType<typeof createClient>, userId: string, title: string, message: string, type: string = 'system_error') => {
  const { error: insertAlertError } = await supabase.from('user_alerts').insert({
    id: uuidv4(),
    user_id: userId,
    title: title,
    message: message,
    type: type,
    created_at: new Date().toISOString(),
    is_read: false,
  });
  if (insertAlertError) {
    console.error(`Failed to log user alert for user ${userId}:`, insertAlertError.message);
  }
};

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
): Promise<{ omittedCount: number; addedToUserLibraryCount: number }> => { // Return type updated
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

  // 3. Prepare exercise lookup maps
  const globalExerciseMap = new Map<string, ExerciseDefinition>(); // library_id -> global_exercise
  const userOwnedCopiesMap = new Map<string, ExerciseDefinition>(); // library_id -> user_owned_copy_of_global_exercise
  const userCustomExercises = new Map<string, ExerciseDefinition[]>(); // main_muscle_type_key -> [user_custom_exercise]

  allExercises.forEach(ex => {
    if (ex.user_id === null && ex.library_id) {
      globalExerciseMap.set(ex.library_id, ex);
    } else if (ex.user_id === user.id) {
      if (ex.library_id) {
        userOwnedCopiesMap.set(ex.library_id, ex);
      } else { // Purely custom user exercise (AI-identified new, or manually created)
        const key = `${ex.main_muscle}-${ex.type}`;
        if (!userCustomExercises.has(key)) {
          userCustomExercises.set(key, []);
        }
        userCustomExercises.get(key)?.push(ex);
      }
    }
  });

  // 4. Fetch workout structure entries
  const { data: structureEntries, error: structureError } = await supabase
    .from('workout_exercise_structure')
    .select('exercise_library_id, min_session_minutes, bonus_for_time_group')
    .eq('workout_split', workoutSplit)
    .eq('workout_name', workoutName)
    .order('min_session_minutes', { ascending: true, nullsFirst: true });
  if (structureError) throw structureError;

  // 5. Select exercises based on duration and user preferences
  const exercisesToInsertPayload: { template_id: string; exercise_id: string; order_index: number; is_bonus_exercise: boolean }[] = [];
  const selectedExerciseIds = new Set<string>(); // To prevent duplicates in the workout

  let currentEstimatedMinutes = 0;
  const potentialBonusExercises: { exercise: ExerciseDefinition; order_index: number }[] = [];
  const omittedExercisesForUserLibrary: ExerciseDefinition[] = [];
  let omittedCount = 0;

  for (const entry of structureEntries || []) {
    const globalLibraryId = entry.exercise_library_id;
    const globalExercise = globalExerciseMap.get(globalLibraryId);
    if (!globalExercise) continue;

    // Check if user has a custom copy of this global exercise
    let finalExercise: ExerciseDefinition | null = userOwnedCopiesMap.get(globalLibraryId) || globalExercise;

    // Check for purely custom user exercises that could substitute
    if (finalExercise === globalExercise) { // Only try to substitute if we're currently using the global one
      const customKey = `${globalExercise.main_muscle}-${globalExercise.type}`;
      const matchingCustomExercises = userCustomExercises.get(customKey);
      if (matchingCustomExercises && matchingCustomExercises.length > 0) {
        // Prioritize custom exercises with matching location tag, then any custom
        const taggedCustom = matchingCustomExercises.find(ex => activeLocationTag && ex.location_tags?.includes(activeLocationTag));
        if (taggedCustom) {
          finalExercise = taggedCustom;
        } else {
          finalExercise = matchingCustomExercises[0]; // Take the first available custom exercise
        }
      }
    }

    // Filter by active location tag
    const isAvailableAtLocation = !activeLocationTag || !finalExercise.location_tags || finalExercise.location_tags.length === 0 || finalExercise.location_tags.includes(activeLocationTag);
    if (!isAvailableAtLocation) {
      // If the exercise is not available at the active location, and it's a user-owned exercise,
      // ensure it's in the user's library but don't add to this workout.
      if (finalExercise.user_id === user.id) {
        omittedExercisesForUserLibrary.push(finalExercise);
      }
      omittedCount++;
      continue; // Skip this exercise for the current workout
    }

    const isCoreExercise = entry.min_session_minutes !== null && maxAllowedMinutes >= entry.min_session_minutes;
    const isPotentialBonus = entry.bonus_for_time_group !== null && maxAllowedMinutes >= entry.bonus_for_time_group;

    if (isCoreExercise && !selectedExerciseIds.has(finalExercise.id)) {
      exercisesToInsertPayload.push({
        template_id: childWorkoutId,
        exercise_id: finalExercise.id,
        order_index: entry.min_session_minutes || 0, // Use min_session_minutes for core order
        is_bonus_exercise: false,
      });
      selectedExerciseIds.add(finalExercise.id);
      currentEstimatedMinutes += DEFAULT_EXERCISE_DURATION_MINUTES;
    } else if (isPotentialBonus && !selectedExerciseIds.has(finalExercise.id)) {
      potentialBonusExercises.push({ exercise: finalExercise, order_index: entry.bonus_for_time_group || 0 });
    }
  }

  // Add bonus exercises if there's room and we haven't hit min exercises
  let addedBonusCount = 0;
  potentialBonusExercises.sort((a, b) => a.order_index - b.order_index); // Sort bonuses by their suggested order
  for (const bonus of potentialBonusExercises) {
    if (exercisesToInsertPayload.length < MIN_EXERCISES_PER_WORKOUT || addedBonusCount < BONUS_EXERCISES_TO_ADD) {
      if (!selectedExerciseIds.has(bonus.exercise.id) && (currentEstimatedMinutes + DEFAULT_EXERCISE_DURATION_MINUTES) <= maxAllowedMinutes) {
        exercisesToInsertPayload.push({
          template_id: childWorkoutId,
          exercise_id: bonus.exercise.id,
          order_index: bonus.order_index,
          is_bonus_exercise: true,
        });
        selectedExerciseIds.add(bonus.exercise.id);
        currentEstimatedMinutes += DEFAULT_EXERCISE_DURATION_MINUTES;
        addedBonusCount++;
      }
    }
  }

  // If still below minimum exercises, add more non-bonus global exercises if available and fit
  if (exercisesToInsertPayload.length < MIN_EXERCISES_PER_WORKOUT) {
    const remainingSlots = MIN_EXERCISES_PER_WORKOUT - exercisesToInsertPayload.length;
    const additionalExercises = structureEntries
      .filter((entry: WorkoutStructureEntry) => {
        const globalExercise = globalExerciseMap.get(entry.exercise_library_id);
        return globalExercise && !selectedExerciseIds.has(globalExercise.id);
      })
      .slice(0, remainingSlots);

    for (const entry of additionalExercises) {
      const globalExercise = globalExerciseMap.get(entry.exercise_library_id);
      if (globalExercise && (currentEstimatedMinutes + DEFAULT_EXERCISE_DURATION_MINUTES) <= maxAllowedMinutes) {
        // Check if user has a custom copy or purely custom exercise for this global one
        let finalExercise: ExerciseDefinition | null = userOwnedCopiesMap.get(globalExercise.library_id!) || globalExercise;
        const customKey = `${globalExercise.main_muscle}-${globalExercise.type}`;
        const matchingCustomExercises = userCustomExercises.get(customKey);
        if (finalExercise === globalExercise && matchingCustomExercises && matchingCustomExercises.length > 0) {
          const taggedCustom = matchingCustomExercises.find(ex => activeLocationTag && ex.location_tags?.includes(activeLocationTag));
          finalExercise = taggedCustom || matchingCustomExercises[0];
        }

        const isAvailableAtLocation = !activeLocationTag || !finalExercise.location_tags || finalExercise.location_tags.length === 0 || finalExercise.location_tags.includes(activeLocationTag);
        if (isAvailableAtLocation && !selectedExerciseIds.has(finalExercise.id)) {
          exercisesToInsertPayload.push({
            template_id: childWorkoutId,
            exercise_id: finalExercise.id,
            order_index: exercisesToInsertPayload.length, // Add to end
            is_bonus_exercise: false,
          });
          selectedExerciseIds.add(finalExercise.id);
          currentEstimatedMinutes += DEFAULT_EXERCISE_DURATION_MINUTES;
        }
      }
    }
  }

  // 6. Sort, re-index, and bulk insert
  exercisesToInsertPayload.sort((a, b) => a.order_index - b.order_index);
  exercisesToInsertPayload.forEach((ex, i) => { ex.order_index = i; });

  if (exercisesToInsertPayload.length > 0) {
    const { error: insertError } = await supabase.from('t_path_exercises').insert(exercisesToInsertPayload);
    if (insertError) throw insertError;
  }

  // 7. Add omitted user-owned exercises to user's library if they aren't already there
  let addedToUserLibraryCount = 0;
  for (const omittedEx of omittedExercisesForUserLibrary) {
    const { data: existingUserExercise, error: fetchExistingError } = await supabase
      .from('exercise_definitions')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', omittedEx.name)
      .single();

    if (fetchExistingError && fetchExistingError.code !== 'PGRST116') throw fetchExistingError;

    if (!existingUserExercise) {
      // If it's a global exercise that was omitted, create a user-owned copy
      const { error: insertOmittedError } = await supabase
        .from('exercise_definitions')
        .insert({
          name: omittedEx.name,
          main_muscle: omittedEx.main_muscle,
          type: omittedEx.type,
          category: omittedEx.category,
          description: omittedEx.description,
          pro_tip: omittedEx.pro_tip,
          video_url: omittedEx.video_url,
          user_id: user.id,
          library_id: omittedEx.library_id, // Keep the library_id if it was a global exercise
          location_tags: omittedEx.location_tags,
          icon_url: omittedEx.icon_url,
        });
      if (insertOmittedError) console.error(`Failed to add omitted exercise ${omittedEx.name} to user library:`, insertOmittedError.message);
      else addedToUserLibraryCount++;
    }
  }
  return { omittedCount, addedToUserLibraryCount };
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
      let totalOmittedCount = 0;
      let totalAddedToUserLibraryCount = 0;
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
          .from('exercise_definitions').select('id, library_id, user_id, location_tags, name, main_muscle, type, category, description, pro_tip, video_url, icon_url');
        if (fetchAllExercisesError) throw fetchAllExercisesError;

        const workoutSplit = tPathSettings.tPathType;
        const maxAllowedMinutes = getMaxMinutes(profileData.preferred_session_length);
        const activeLocationTag = profileData.active_location_tag;
        const workoutNames = getWorkoutNamesForSplit(workoutSplit);

        for (const workoutName of workoutNames) {
          const { omittedCount, addedToUserLibraryCount } = await processSingleChildWorkout(
            supabaseServiceRoleClient,
            user,
            tPathData,
            workoutName,
            workoutSplit,
            maxAllowedMinutes,
            allExercises as ExerciseDefinition[],
            activeLocationTag
          );
          totalOmittedCount += omittedCount;
          totalAddedToUserLibraryCount += addedToUserLibraryCount;
        }
        console.log(`[Background] Successfully generated all workouts for T-Path ${tPathId}`);
        
        let feedbackMessage = `Your workout plan for '${tPathData.template_name ?? 'Unknown T-Path'}' has been successfully updated!`;
        if (totalOmittedCount > 0) {
          feedbackMessage += ` ${totalOmittedCount} exercises were omitted due to gym availability or session length.`;
        }
        if (totalAddedToUserLibraryCount > 0) {
          feedbackMessage += ` ${totalAddedToUserLibraryCount} exercises were added to 'My Exercises' for future use.`;
        }

        await logUserAlert(supabaseServiceRoleClient, userId!, "Workout Plan Updated", feedbackMessage, "info");

      } catch (backgroundError: any) {
        console.error(`[Background] T-Path generation failed for user ${userId}:`, backgroundError);
        await logUserAlert(supabaseServiceRoleClient, userId!, "Workout Plan Update Failed", `Failed to fully update your workout plan. Some exercises might be missing. Error: ${backgroundError.message}`, "system_error");
      }
    })();

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error('Error in generate-t-path edge function:', message);
    if (userId) {
      await logUserAlert(supabaseServiceRoleClient, userId, "Workout Plan Update Failed", `An error occurred while initiating your workout plan update: ${message}`, "system_error");
    }
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});