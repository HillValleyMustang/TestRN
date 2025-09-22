// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// --- Type Definitions ---
export interface ExerciseDefinition {
  id: string;
  name: string;
  user_id: string | null;
  library_id: string | null;
  movement_type: string | null;
  movement_pattern: string | null;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  icon_url: string | null;
}

export interface WorkoutExerciseStructure {
  exercise_library_id: string;
  workout_name: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
}

// --- Utility Functions ---
export function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90;
  }
}

export function getExerciseCounts(sessionLength: string | null | undefined): { main: number; bonus: number } {
  switch (sessionLength) {
    case '15-30': return { main: 3, bonus: 3 };
    case '30-45': return { main: 5, bonus: 3 };
    case '45-60': return { main: 7, bonus: 2 };
    case '60-90': return { main: 10, bonus: 2 };
    default: return { main: 5, bonus: 3 };
  }
}

export function getWorkoutNamesForSplit(workoutSplit: string): string[] {
  if (workoutSplit === 'ulul') return ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
  if (workoutSplit === 'ppl') return ['Push', 'Pull', 'Legs'];
  throw new Error('Unknown workout split type.');
}

export const sortExercises = (exercises: ExerciseDefinition[]) => {
  return exercises.sort((a, b) => {
    if (a.movement_type === 'compound' && b.movement_type !== 'compound') return -1;
    if (a.movement_type !== 'compound' && b.movement_type === 'compound') return 1;
    return a.name.localeCompare(b.name);
  });
};

export function musclesIntersect(muscleString: string, muscleSet: Set<string>): boolean {
    if (!muscleString) return false;
    const muscles = muscleString.split(',').map(m => m.trim());
    return muscles.some(m => muscleSet.has(m));
}

export async function generateWorkoutPlanForTPath(
  supabaseServiceRoleClient: any,
  userId: string,
  tPathId: string,
  sessionLength: string | null,
  activeGymId: string | null,
  useStaticDefaults: boolean
) {
  console.log(`[generateWorkoutPlanForTPath] User ${userId}: Starting for tPathId: ${tPathId}, useStaticDefaults: ${useStaticDefaults}`);

  const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient.from('t_paths').select('id, settings, user_id').eq('id', tPathId).eq('user_id', userId).single();
  if (tPathError || !tPathData) throw new Error(`Main T-Path not found for user ${userId} and tPathId ${tPathId}.`);
  console.log(`[generateWorkoutPlanForTPath] Fetched main T-Path data: ${JSON.stringify(tPathData)}`);

  console.log(`[generateWorkoutPlanForTPath] Deleting old child workouts and their exercises for parent T-Path ${tPathId}`);
  const { data: oldChildWorkouts, error: fetchOldError } = await supabaseServiceRoleClient.from('t_paths').select('id').eq('parent_t_path_id', tPathId).eq('user_id', userId);
  if (fetchOldError) throw fetchOldError;
  if (oldChildWorkouts && oldChildWorkouts.length > 0) {
    const oldChildIds = oldChildWorkouts.map((w: { id: string }) => w.id);
    console.log(`[generateWorkoutPlanForTPath] Found ${oldChildIds.length} old child workouts: ${oldChildIds.join(', ')}`);
    await supabaseServiceRoleClient.from('t_path_exercises').delete().in('template_id', oldChildIds);
    await supabaseServiceRoleClient.from('t_paths').delete().in('id', oldChildIds);
    console.log(`[generateWorkoutPlanForTPath] Successfully deleted old child workouts and their exercises.`);
  } else {
    console.log(`[generateWorkoutPlanForTPath] No old child workouts found to delete.`);
  }

  const tPathSettings = tPathData.settings as { tPathType?: string };
  if (!tPathSettings?.tPathType) throw new Error('Invalid T-Path settings.');
  const workoutSplit = tPathSettings.tPathType;
  const { main: maxMainExercises, bonus: maxBonusExercises } = getExerciseCounts(sessionLength);
  const workoutNames = getWorkoutNamesForSplit(workoutSplit);
  const maxAllowedMinutes = getMaxMinutes(sessionLength);

  console.log(`[generateWorkoutPlanForTPath] Workout Split: ${workoutSplit}, Workout Names: ${workoutNames.join(', ')}`);
  console.log(`[generateWorkoutPlanForTPath] Max Main Exercises: ${maxMainExercises}, Max Bonus Exercises: ${maxBonusExercises}`);
  console.log(`[generateWorkoutPlanForTPath] Max Allowed Minutes for Session: ${maxAllowedMinutes}`);

  if (useStaticDefaults) {
    console.log(`[generateWorkoutPlanForTPath] Using STATIC DEFAULTS for tPathId: ${tPathId}`);

    const { data: structureData, error: structureError } = await supabaseServiceRoleClient
      .from('workout_exercise_structure')
      .select('exercise_library_id, workout_name, min_session_minutes, bonus_for_time_group')
      .eq('workout_split', workoutSplit);

    if (structureError) throw structureError;

    const { data: globalExercises, error: globalExError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, movement_type, movement_pattern, icon_url')
      .is('user_id', null);

    if (globalExError) throw globalExError;

    const globalExerciseMap = new Map<string, ExerciseDefinition>();
    (globalExercises || []).forEach((ex: ExerciseDefinition) => {
      if (ex.library_id) {
        globalExerciseMap.set(ex.library_id, ex as ExerciseDefinition);
      }
    });

    for (const workoutName of workoutNames) {
      console.log(`[generateWorkoutPlanForTPath] Processing STATIC workout: ${workoutName}`);
      const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient
        .from('t_paths')
        .insert({ user_id: userId, parent_t_path_id: tPathId, template_name: workoutName, is_bonus: true, settings: tPathData.settings, gym_id: activeGymId })
        .select('id').single();
      if (createChildError) throw createChildError;
      const childWorkoutId = newChildWorkout.id;
      console.log(`[generateWorkoutPlanForTPath] Created child workout ${workoutName} with ID: ${childWorkoutId}`);

      const exercisesForThisWorkout = (structureData || []).filter((s: WorkoutExerciseStructure) => s.workout_name === workoutName);

      let mainExercisesToInsert: { template_id: string; exercise_id: string; order_index: number; is_bonus_exercise: boolean }[] = [];
      let bonusExercisesToInsert: { template_id: string; exercise_id: string; order_index: number; is_bonus_exercise: boolean }[] = [];

      exercisesForThisWorkout.forEach((s: WorkoutExerciseStructure) => {
        const exerciseDef = globalExerciseMap.get(s.exercise_library_id);
        if (exerciseDef) {
          if (s.min_session_minutes !== null && maxAllowedMinutes >= s.min_session_minutes) {
            mainExercisesToInsert.push({ template_id: childWorkoutId, exercise_id: exerciseDef.id, order_index: 0, is_bonus_exercise: false });
          } else if (s.bonus_for_time_group !== null && maxAllowedMinutes >= s.bonus_for_time_group) {
            bonusExercisesToInsert.push({ template_id: childWorkoutId, exercise_id: exerciseDef.id, order_index: 0, is_bonus_exercise: true });
          }
        }
      });

      mainExercisesToInsert.sort((a, b) => globalExerciseMap.get(a.exercise_id)?.name.localeCompare(globalExerciseMap.get(b.exercise_id)?.name || '') || 0);
      bonusExercisesToInsert.sort((a, b) => globalExerciseMap.get(a.exercise_id)?.name.localeCompare(globalExerciseMap.get(b.exercise_id)?.name || '') || 0);

      const finalMainExercises = mainExercisesToInsert.slice(0, maxMainExercises);
      const finalBonusExercises = bonusExercisesToInsert.slice(0, maxBonusExercises);

      const exercisesToInsertPayload = [
        ...finalMainExercises.map((ex, index) => ({ ...ex, order_index: index })),
        ...finalBonusExercises.map((ex, index) => ({ ...ex, order_index: finalMainExercises.length + index }))
      ];

      if (exercisesToInsertPayload.length > 0) {
        const { error: insertError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(exercisesToInsertPayload);
        if (insertError) throw insertError;
        console.log(`[generateWorkoutPlanForTPath] Successfully inserted ${exercisesToInsertPayload.length} STATIC exercises for ${workoutName}.`);
      } else {
        console.log(`[generateWorkoutPlanForTPath] No STATIC exercises to insert for ${workoutName}.`);
      }
    }
    return;
  }

  console.log(`[generateWorkoutPlanForTPath] Using DYNAMIC generation for tPathId: ${tPathId}`);

  const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient.from('exercise_definitions').select('*');
  if (fetchAllExercisesError) throw fetchAllExercisesError;
  console.log(`[generateWorkoutPlanForTPath] Fetched ${allExercises?.length || 0} total exercise definitions.`);

  const { data: allGymLinks, error: allGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id');
  if (allGymLinksError) throw allGymLinksError;
  const allLinkedExerciseIds = new Set((allGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
  console.log(`[generateWorkoutPlanForTPath] Total exercises linked to any gym: ${allLinkedExerciseIds.size}`);

  const workoutSpecificPools: Record<string, ExerciseDefinition[]> = {};
  if (workoutSplit === 'ulul') {
    const UPPER_BODY_MUSCLES = new Set(['Pectorals', 'Deltoids', 'Lats', 'Traps', 'Biceps', 'Triceps', 'Abdominals', 'Core']);
    const LOWER_BODY_MUSCLES = new Set(['Quadriceps', 'Hamstrings', 'Glutes', 'Calves']);
    const upperPool = (allExercises || []).filter((ex: ExerciseDefinition) => musclesIntersect(ex.main_muscle, UPPER_BODY_MUSCLES));
    const lowerPool = (allExercises || []).filter((ex: ExerciseDefinition) => musclesIntersect(ex.main_muscle, LOWER_BODY_MUSCLES));
    workoutSpecificPools['Upper Body A'] = []; workoutSpecificPools['Upper Body B'] = [];
    workoutSpecificPools['Lower Body A'] = []; workoutSpecificPools['Lower Body B'] = [];
    sortExercises(upperPool).forEach((ex, i) => workoutSpecificPools[i % 2 === 0 ? 'Upper Body A' : 'Upper Body B'].push(ex));
    sortExercises(lowerPool).forEach((ex, i) => workoutSpecificPools[i % 2 === 0 ? 'Lower Body A' : 'Lower Body B'].push(ex));
    console.log(`[generateWorkoutPlanForTPath] ULUL Pools - Upper A: ${workoutSpecificPools['Upper Body A'].length}, Upper B: ${workoutSpecificPools['Upper Body B'].length}, Lower A: ${workoutSpecificPools['Lower Body A'].length}, Lower B: ${workoutSpecificPools['Lower Body B'].length}`);
  } else {
    workoutSpecificPools['Push'] = sortExercises((allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Push'));
    workoutSpecificPools['Pull'] = sortExercises((allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Pull'));
    workoutSpecificPools['Legs'] = sortExercises((allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Legs'));
    console.log(`[generateWorkoutPlanForTPath] PPL Pools - Push: ${workoutSpecificPools['Push'].length}, Pull: ${workoutSpecificPools['Pull'].length}, Legs: ${workoutSpecificPools['Legs'].length}`);
  }

  for (const workoutName of workoutNames) {
    console.log(`[generateWorkoutPlanForTPath] Processing DYNAMIC workout: ${workoutName}`);
    const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient
      .from('t_paths')
      .insert({ user_id: userId, parent_t_path_id: tPathId, template_name: workoutName, is_bonus: true, settings: tPathData.settings, gym_id: activeGymId })
      .select('id').single();
    if (createChildError) throw createChildError;
    const childWorkoutId = newChildWorkout.id;
    console.log(`[generateWorkoutPlanForTPath] Created child workout ${workoutName} with ID: ${childWorkoutId}`);

    const candidatePool = workoutSpecificPools[workoutName] || [];
    console.log(`[generateWorkoutPlanForTPath] Candidate pool for ${workoutName}: ${candidatePool.length} exercises`);
    
    let activeGymExerciseIds = new Set<string>();
    if (activeGymId) {
      const { data: activeGymLinks, error: activeGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id').eq('gym_id', activeGymId);
      if (activeGymLinksError) throw activeGymLinksError;
      activeGymExerciseIds = new Set((activeGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
      console.log(`[generateWorkoutPlanForTPath] Active gym ${activeGymId} has ${activeGymExerciseIds.size} linked exercises.`);
    }

    const tier1Pool = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === userId);
    const tier2Pool = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === null && !allLinkedExerciseIds.has(ex.id));
    const tier3Pool = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === null && activeGymExerciseIds.has(ex.id));

    console.log(`[generateWorkoutPlanForTPath] Tier 1 (User Custom) for ${workoutName}: ${tier1Pool.length} exercises`);
    console.log(`[generateWorkoutPlanForTPath] Tier 2 (Global Bodyweight) for ${workoutName}: ${tier2Pool.length} exercises`);
    console.log(`[generateWorkoutPlanForTPath] Tier 3 (Global Gym-Specific) for ${workoutName}: ${tier3Pool.length} exercises`);

    const finalPool = [...tier1Pool, ...tier2Pool, ...tier3Pool];
    const finalUniquePool = [...new Map(finalPool.map(item => [item.id, item])).values()];
    console.log(`[generateWorkoutPlanForTPath] Final unique pool for ${workoutName}: ${finalUniquePool.length} exercises`);
    
    const mainExercisesForWorkout = finalUniquePool.slice(0, maxMainExercises);
    const bonusExercisesForWorkout = finalUniquePool.slice(maxMainExercises, maxMainExercises + maxBonusExercises);
    console.log(`[generateWorkoutPlanForTPath] Selected ${mainExercisesForWorkout.length} main and ${bonusExercisesForWorkout.length} bonus exercises for ${workoutName}.`);

    const exercisesToInsertPayload = [
      ...mainExercisesForWorkout.map((ex, index) => ({ template_id: childWorkoutId, exercise_id: ex.id, order_index: index, is_bonus_exercise: false })),
      ...bonusExercisesForWorkout.map((ex, index) => ({ template_id: childWorkoutId, exercise_id: ex.id, order_index: mainExercisesForWorkout.length + index, is_bonus_exercise: true }))
    ];

    if (exercisesToInsertPayload.length > 0) {
      const { error: insertError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(exercisesToInsertPayload);
      if (insertError) throw insertError;
      console.log(`[generateWorkoutPlanForTPath] Successfully inserted ${exercisesToInsertPayload.length} DYNAMIC exercises for ${workoutName}.`);
    } else {
      console.log(`[generateWorkoutPlanForTPath] No DYNAMIC exercises to insert for ${workoutName}.`);
    }
  }
}