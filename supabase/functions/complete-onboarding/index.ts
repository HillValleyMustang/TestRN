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
    
    // --- START OF THE CHANGE ---
    // Tier 1: User's custom exercises.
    const tier1Pool = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === userId);
    // Tier 2: Global exercises linked to the active gym.
    const tier2Pool_gymLinkedGlobal = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === null && activeGymExerciseIds.has(ex.id));
    // Tier 3: Global exercises NOT linked to any gym (fallback).
    const tier3Pool_unlinkedGlobal = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === null && !allLinkedExerciseIds.has(ex.id));
    
    // Combine pools in the new priority order.
    const finalPool = [...tier1Pool, ...tier2Pool_gymLinkedGlobal, ...tier3Pool_unlinkedGlobal];
    // --- END OF THE CHANGE ---

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

const getSupabaseServiceRoleClient = () => {
  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  let userId: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');
    userId = user.id;

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'in_progress', t_path_generation_error: null }).eq('id', userId);

    const {
      tPathType, experience, goalFocus, preferredMuscles, constraints,
      sessionLength, equipmentMethod, gymName, confirmedExercises,
      fullName, heightCm, weightKg, bodyFatPct
    } = await req.json();

    if (!tPathType || !experience || !sessionLength || !fullName || !heightCm || !weightKg) {
      throw new Error("Missing required onboarding data.");
    }

    const { data: insertedGym, error: insertGymError } = await supabaseServiceRoleClient.from('gyms').insert({ user_id: user.id, name: gymName || "My Gym" }).select('id').single();
    if (insertGymError) throw insertGymError;
    const newGymId = insertedGym.id;

    const tPathsToInsert = [
      { user_id: user.id, gym_id: newGymId, template_name: '4-Day Upper/Lower', is_bonus: false, parent_t_path_id: null, settings: { tPathType: 'ulul', experience, goalFocus, preferredMuscles, constraints, equipmentMethod } },
      { user_id: user.id, gym_id: newGymId, template_name: '3-Day Push/Pull/Legs', is_bonus: false, parent_t_path_id: null, settings: { tPathType: 'ppl', experience, goalFocus, preferredMuscles, constraints, equipmentMethod } }
    ];
    const { data: insertedTPaths, error: insertTPathsError } = await supabaseServiceRoleClient.from('t_paths').insert(tPathsToInsert).select('*');
    if (insertTPathsError) throw insertTPathsError;

    const activeTPath = insertedTPaths.find((tp: any) => (tPathType === 'ulul' && tp.template_name === '4-Day Upper/Lower') || (tPathType === 'ppl' && tp.template_name === '3-Day Push/Pull/Legs'));
    if (!activeTPath) throw new Error("Could not determine active T-Path after creation.");

    const exerciseIdsToLinkToGym = new Set<string>();
    const newExercisesToCreate = [];
    const confirmedExercisesDataForPlan: any[] = [];

    const useStaticDefaultsForExercises = equipmentMethod === 'skip';

    for (const ex of (confirmedExercises || [])) {
      if (ex.existing_id) {
        exerciseIdsToLinkToGym.add(ex.existing_id);
        confirmedExercisesDataForPlan.push({ id: ex.existing_id, name: ex.name!, user_id: null, library_id: null, movement_type: ex.movement_type || null, movement_pattern: ex.movement_pattern || null, main_muscle: ex.main_muscle!, type: ex.type!, category: ex.category || null, description: ex.description || null, pro_tip: ex.pro_tip || null, video_url: ex.video_url || null, icon_url: ex.icon_url || null });
      } else {
        newExercisesToCreate.push({ name: ex.name!, main_muscle: ex.main_muscle!, type: ex.type!, category: ex.category, description: ex.description, pro_tip: ex.pro_tip, video_url: ex.video_url, icon_url: ex.icon_url, user_id: user.id, library_id: null, is_favorite: false, created_at: new Date().toISOString(), movement_type: ex.movement_type, movement_pattern: ex.movement_pattern });
      }
    }

    if (newExercisesToCreate.length > 0) {
      const { data: insertedExercises, error: insertExError } = await supabaseServiceRoleClient.from('exercise_definitions').insert(newExercisesToCreate).select('*');
      if (insertExError) throw insertExError;
      insertedExercises.forEach((ex: any) => {
        exerciseIdsToLinkToGym.add(ex.id);
        confirmedExercisesDataForPlan.push(ex);
      });
    }

    if (exerciseIdsToLinkToGym.size > 0) {
      const gymLinks = Array.from(exerciseIdsToLinkToGym).map(exId => ({ gym_id: newGymId, exercise_id: exId }));
      const { error: gymLinkError } = await supabaseServiceRoleClient.from('gym_exercises').insert(gymLinks);
      if (gymLinkError) throw gymLinkError;
    }

    const nameParts = fullName.split(' ');
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ') || '';
    const profileData = { id: user.id, first_name: firstName, last_name: lastName, full_name: fullName, height_cm: heightCm, weight_kg: weightKg, body_fat_pct: bodyFatPct, preferred_muscles: preferredMuscles, primary_goal: goalFocus, health_notes: constraints, default_rest_time_seconds: 60, preferred_session_length: sessionLength, active_t_path_id: activeTPath.id, active_gym_id: newGymId, programme_type: tPathType };
    const { data: upsertedProfile, error: profileError } = await supabaseServiceRoleClient.from('profiles').upsert(profileData).select().single();
    if (profileError) throw profileError;

    const childWorkoutsWithExercises = [];
    for (const tPath of insertedTPaths) {
      await generateWorkoutPlanForTPath(supabaseServiceRoleClient, user.id, tPath.id, sessionLength, newGymId, useStaticDefaultsForExercises);
      if (tPath.id === activeTPath.id) {
        const { data: childWorkouts, error: childWorkoutsError } = await supabaseServiceRoleClient
          .from('t_paths')
          .select('*, t_path_exercises(*, exercise_definitions(*))')
          .eq('parent_t_path_id', tPath.id);
        if (childWorkoutsError) throw childWorkoutsError;

        const transformedChildWorkouts = (childWorkouts || []).map((workout: any) => {
          const exercises = (workout.t_path_exercises || []).map((tpe: any) => {
            if (!tpe.exercise_definitions) return null;
            return {
              ...tpe.exercise_definitions,
              is_bonus_exercise: tpe.is_bonus_exercise,
            };
          }).filter(Boolean);

          const { t_path_exercises, ...restOfWorkout } = workout;
          return {
            ...restOfWorkout,
            exercises: exercises,
          };
        });

        childWorkoutsWithExercises.push(...transformedChildWorkouts);
      }
    }

    await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'completed', t_path_generation_error: null }).eq('id', userId);

    return new Response(JSON.stringify({ message: 'Onboarding completed successfully.', profile: upsertedProfile, mainTPath: activeTPath, childWorkouts: childWorkoutsWithExercises, identifiedExercises: confirmedExercises }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in complete-onboarding edge function:", JSON.stringify(error, null, 2));
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: message }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});