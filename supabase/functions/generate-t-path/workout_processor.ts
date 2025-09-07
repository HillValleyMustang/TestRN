// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { ExerciseDefinitionForWorkoutGeneration, TPathData } from './types.ts';

export const processSingleChildWorkout = async (
  supabaseServiceRoleClient: ReturnType<typeof createClient>,
  user: any,
  tPath: TPathData,
  workoutName: string,
  workoutSplit: string,
  maxAllowedMinutes: number,
  exerciseLookupMap: Map<string, ExerciseDefinitionForWorkoutGeneration>
) => {
  console.log(`Processing workout: ${workoutName}`);
  
  // 1. Find or Create the child t_path (the individual workout like "Upper Body A")
  let childWorkoutId: string;
  const { data: existingChildWorkout, error: fetchExistingChildError } = await supabaseServiceRoleClient
    .from('t_paths')
    .select('id')
    .eq('user_id', user.id)
    .eq('parent_t_path_id', tPath.id)
    .eq('template_name', workoutName)
    .eq('is_bonus', true)
    .single();

  if (fetchExistingChildError && fetchExistingChildError.code !== 'PGRST116') {
    throw fetchExistingChildError;
  }

  if (existingChildWorkout) {
    childWorkoutId = existingChildWorkout.id;
    console.log(`Found existing child workout ${workoutName} with ID: ${childWorkoutId}`);
  } else {
    const { data: newChildWorkout, error: createChildWorkoutError } = await supabaseServiceRoleClient
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
    console.log(`Created new child workout ${workoutName} with ID: ${childWorkoutId}`);
  }

  // 2. Delete all existing exercise links for this child workout to ensure a clean slate.
  const { error: deleteError } = await supabaseServiceRoleClient
      .from('t_path_exercises')
      .delete()
      .eq('template_id', childWorkoutId);
  if (deleteError) throw deleteError;
  console.log(`Cleared existing exercises for workout ${workoutName} (ID: ${childWorkoutId}).`);

  // 3. Determine `desiredDefaultExercises` from workout_exercise_structure
  const { data: structureEntries, error: structureError } = await supabaseServiceRoleClient
    .from('workout_exercise_structure')
    .select('exercise_library_id, min_session_minutes, bonus_for_time_group')
    .eq('workout_split', workoutSplit)
    .eq('workout_name', workoutName)
    .order('min_session_minutes', { ascending: true, nullsFirst: true })
    .order('bonus_for_time_group', { ascending: true, nullsFirst: true });
  if (structureError) throw structureError;

  const exercisesToInsertPayload: { template_id: string; exercise_id: string; order_index: number; is_bonus_exercise: boolean }[] = [];
  for (const entry of structureEntries || []) {
    const exerciseDef = exerciseLookupMap.get(entry.exercise_library_id);
    if (!exerciseDef) {
      console.warn(`Could not find exercise definition for library_id: ${entry.exercise_library_id}. Skipping.`);
      continue;
    }

    const isIncludedAsMain = entry.min_session_minutes !== null && maxAllowedMinutes >= entry.min_session_minutes;
    const isIncludedAsBonus = entry.bonus_for_time_group !== null && maxAllowedMinutes >= entry.bonus_for_time_group;

    if (isIncludedAsMain || isIncludedAsBonus) {
      const isBonus = isIncludedAsBonus && !isIncludedAsMain;
      exercisesToInsertPayload.push({
        template_id: childWorkoutId,
        exercise_id: exerciseDef.id, // Use the ID from exercise_definitions, which is the global ID
        order_index: isBonus ? (entry.bonus_for_time_group || 0) : (entry.min_session_minutes || 0),
        is_bonus_exercise: isBonus,
      });
    }
  }

  // 4. Sort and re-index before inserting
  exercisesToInsertPayload.sort((a, b) => a.order_index - b.order_index);
  exercisesToInsertPayload.forEach((ex, i) => {
    ex.order_index = i;
  });

  console.log(`Prepared ${exercisesToInsertPayload.length} exercises for insertion into ${workoutName}.`);

  // 5. Perform a single bulk insert.
  if (exercisesToInsertPayload.length > 0) {
    const { error: insertError } = await supabaseServiceRoleClient
      .from('t_path_exercises')
      .insert(exercisesToInsertPayload);
    if (insertError) throw insertError;
    console.log(`Successfully inserted exercises for workout ${workoutName}.`);
  }

  return { id: childWorkoutId, template_name: workoutName };
};