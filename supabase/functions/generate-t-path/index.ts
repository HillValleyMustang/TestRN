// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- INLINED SHARED UTILITY CODE ---

// Type Definitions
interface ExerciseDefinition {
  id: string; name: string; user_id: string | null; library_id: string | null;
  movement_type: string | null; movement_pattern: string | null; main_muscle: string;
  type: string; category: string | null; description: string | null;
  pro_tip: string | null; video_url: string | null; icon_url: string | null;
}
interface WorkoutExerciseStructure {
  exercise_library_id: string; workout_name: string;
  min_session_minutes: number | null; bonus_for_time_group: number | null;
}

// Utility Functions
function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30; case '30-45': return 45;
    case '45-60': return 60; case '60-90': return 90;
    default: return 90;
  }
}
function getExerciseCounts(sessionLength: string | null | undefined): { main: number; bonus: number } {
  switch (sessionLength) {
    case '15-30': return { main: 3, bonus: 3 }; case '30-45': return { main: 5, bonus: 3 };
    case '45-60': return { main: 7, bonus: 2 }; case '60-90': return { main: 10, bonus: 2 };
    default: return { main: 5, bonus: 3 };
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
function musclesIntersect(muscleString: string, muscleSet: Set<string>): boolean {
    if (!muscleString) return false;
    const muscles = muscleString.split(',').map(m => m.trim());
    return muscles.some(m => muscleSet.has(m));
}
async function generateWorkoutPlanForTPath(
  supabaseServiceRoleClient: any, userId: string, tPathId: string,
  sessionLength: string | null, activeGymId: string | null, useStaticDefaults: boolean
) {
  const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient.from('t_paths').select('id, settings, user_id').eq('id', tPathId).eq('user_id', userId).single();
  if (tPathError || !tPathData) throw new Error(`Main T-Path not found for user ${userId} and tPathId ${tPathId}.`);
  const { data: oldChildWorkouts, error: fetchOldError } = await supabaseServiceRoleClient.from('t_paths').select('id').eq('parent_t_path_id', tPathId).eq('user_id', userId);
  if (fetchOldError) throw fetchOldError;
  if (oldChildWorkouts && oldChildWorkouts.length > 0) {
    const oldChildIds = oldChildWorkouts.map((w: { id: string }) => w.id);
    await supabaseServiceRoleClient.from('t_path_exercises').delete().in('template_id', oldChildIds);
    await supabaseServiceRoleClient.from('t_paths').delete().in('id', oldChildIds);
  }
  const tPathSettings = tPathData.settings as { tPathType?: string };
  if (!tPathSettings?.tPathType) throw new Error('Invalid T-Path settings.');
  const workoutSplit = tPathSettings.tPathType;
  const { main: maxMainExercises, bonus: maxBonusExercises } = getExerciseCounts(sessionLength);
  const workoutNames = getWorkoutNamesForSplit(workoutSplit);
  const maxAllowedMinutes = getMaxMinutes(sessionLength);
  if (useStaticDefaults) {
    const { data: structureData, error: structureError } = await supabaseServiceRoleClient.from('workout_exercise_structure').select('exercise_library_id, workout_name, min_session_minutes, bonus_for_time_group').eq('workout_split', workoutSplit);
    if (structureError) throw structureError;
    const { data: globalExercises, error: globalExError } = await supabaseServiceRoleClient.from('exercise_definitions').select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, movement_type, movement_pattern, icon_url').is('user_id', null);
    if (globalExError) throw globalExError;
    const globalExerciseMap = new Map<string, ExerciseDefinition>();
    (globalExercises || []).forEach((ex: ExerciseDefinition) => { if (ex.library_id) globalExerciseMap.set(ex.library_id, ex as ExerciseDefinition); });
    for (const workoutName of workoutNames) {
      const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient.from('t_paths').insert({ user_id: userId, parent_t_path_id: tPathId, template_name: workoutName, is_bonus: true, settings: tPathData.settings, gym_id: activeGymId }).select('id').single();
      if (createChildError) throw createChildError;
      const childWorkoutId = newChildWorkout.id;
      const exercisesForThisWorkout = (structureData || []).filter((s: WorkoutExerciseStructure) => s.workout_name === workoutName);
      let mainExercisesToInsert: any[] = [], bonusExercisesToInsert: any[] = [];
      exercisesForThisWorkout.forEach((s: WorkoutExerciseStructure) => {
        const exerciseDef = globalExerciseMap.get(s.exercise_library_id);
        if (exerciseDef) {
          if (s.min_session_minutes !== null && maxAllowedMinutes >= s.min_session_minutes) mainExercisesToInsert.push({ template_id: childWorkoutId, exercise_id: exerciseDef.id, order_index: 0, is_bonus_exercise: false });
          else if (s.bonus_for_time_group !== null && maxAllowedMinutes >= s.bonus_for_time_group) bonusExercisesToInsert.push({ template_id: childWorkoutId, exercise_id: exerciseDef.id, order_index: 0, is_bonus_exercise: true });
        }
      });
      mainExercisesToInsert.sort((a, b) => globalExerciseMap.get(a.exercise_id)?.name.localeCompare(globalExerciseMap.get(b.exercise_id)?.name || '') || 0);
      bonusExercisesToInsert.sort((a, b) => globalExerciseMap.get(a.exercise_id)?.name.localeCompare(globalExerciseMap.get(b.exercise_id)?.name || '') || 0);
      const finalMainExercises = mainExercisesToInsert.slice(0, maxMainExercises);
      const finalBonusExercises = bonusExercisesToInsert.slice(0, maxBonusExercises);
      const exercisesToInsertPayload = [...finalMainExercises.map((ex, index) => ({ ...ex, order_index: index })), ...finalBonusExercises.map((ex, index) => ({ ...ex, order_index: finalMainExercises.length + index }))];
      if (exercisesToInsertPayload.length > 0) {
        const { error: insertError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(exercisesToInsertPayload);
        if (insertError) throw insertError;
      }
    }
    return;
  }
  const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient.from('exercise_definitions').select('*');
  if (fetchAllExercisesError) throw fetchAllExercisesError;
  const { data: allGymLinks, error: allGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id');
  if (allGymLinksError) throw allGymLinksError;
  const allLinkedExerciseIds = new Set((allGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
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
  } else {
    workoutSpecificPools['Push'] = sortExercises((allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Push'));
    workoutSpecificPools['Pull'] = sortExercises((allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Pull'));
    workoutSpecificPools['Legs'] = sortExercises((allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Legs'));
  }
  for (const workoutName of workoutNames) {
    const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient.from('t_paths').insert({ user_id: userId, parent_t_path_id: tPathId, template_name: workoutName, is_bonus: true, settings: tPathData.settings, gym_id: activeGymId }).select('id').single();
    if (createChildError) throw createChildError;
    const childWorkoutId = newChildWorkout.id;
    const candidatePool = workoutSpecificPools[workoutName] || [];
    let activeGymExerciseIds = new Set<string>();
    if (activeGymId) {
      const { data: activeGymLinks, error: activeGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id').eq('gym_id', activeGymId);
      if (activeGymLinksError) throw activeGymLinksError;
      activeGymExerciseIds = new Set((activeGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
    }
    const tier1Pool = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === userId);
    const tier2Pool = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === null && !allLinkedExerciseIds.has(ex.id));
    const tier3Pool = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === null && activeGymExerciseIds.has(ex.id));
    const finalPool = [...tier1Pool, ...tier2Pool, ...tier3Pool];
    const finalUniquePool = [...new Map(finalPool.map(item => [item.id, item])).values()];
    const mainExercisesForWorkout = finalUniquePool.slice(0, maxMainExercises);
    const bonusExercisesForWorkout = finalUniquePool.slice(maxMainExercises, maxMainExercises + maxBonusExercises);
    const exercisesToInsertPayload = [...mainExercisesForWorkout.map((ex, index) => ({ template_id: childWorkoutId, exercise_id: ex.id, order_index: index, is_bonus_exercise: false })), ...bonusExercisesForWorkout.map((ex, index) => ({ template_id: childWorkoutId, exercise_id: ex.id, order_index: mainExercisesForWorkout.length + index, is_bonus_exercise: true }))];
    if (exercisesToInsertPayload.length > 0) {
      const { error: insertError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(exercisesToInsertPayload);
      if (insertError) throw insertError;
    }
  }
}
// --- END INLINED CODE ---

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseServiceRoleClient = createClient(
    // @ts-ignore
    Deno.env.get('SUPABASE_URL') ?? '',
    // @ts-ignore
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let userId: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');
    userId = user.id;

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'in_progress', t_path_generation_error: null }).eq('id', userId);

    const { tPathId, preferred_session_length } = await req.json();
    if (!tPathId || !preferred_session_length) {
      throw new Error("Missing tPathId or preferred_session_length.");
    }

    const { data: profile, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('active_gym_id')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) throw new Error('User profile not found.');

    const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient
      .from('t_paths')
      .select('settings')
      .eq('id', tPathId)
      .single();
    if (tPathError || !tPathData) throw new Error('T-Path not found.');
    const equipmentMethod = (tPathData.settings as { equipmentMethod?: string })?.equipmentMethod;
    const useStaticDefaults = equipmentMethod === 'skip';

    await generateWorkoutPlanForTPath(
      supabaseServiceRoleClient,
      user.id,
      tPathId,
      preferred_session_length,
      profile.active_gym_id,
      useStaticDefaults
    );

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'completed', t_path_generation_error: null }).eq('id', userId);

    return new Response(JSON.stringify({ message: 'Workout plan regeneration initiated successfully.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in generate-t-path edge function:", message);
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: message }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});