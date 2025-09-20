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
  main_muscle: string;
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
function getExerciseCounts(sessionLength: string | null | undefined): { main: number; bonus: number } {
  switch (sessionLength) {
    case '15-30': return { main: 3, bonus: 3 };
    case '30-45': return { main: 5, bonus: 3 };
    case '45-60': return { main: 7, bonus: 2 };
    case '60-90': return { main: 10, bonus: 2 };
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
  supabaseServiceRoleClient: any,
  userId: string,
  tPathId: string,
  sessionLength: string | null,
  activeGymId: string | null,
  allExercises: ExerciseDefinition[], // Pass pre-fetched data
  allLinkedExerciseIds: Set<string> // Pass pre-fetched data
) {
  const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient.from('t_paths').select('id, settings, user_id').eq('id', tPathId).eq('user_id', userId).single();
  if (tPathError || !tPathData) throw new Error(`Main T-Path not found for user ${userId} and tPathId ${tPathId}.`);

  const tPathSettings = tPathData.settings as { tPathType?: string };
  if (!tPathSettings?.tPathType) throw new Error('Invalid T-Path settings.');
  const workoutSplit = tPathSettings.tPathType;
  const { main: maxMainExercises, bonus: maxBonusExercises } = getExerciseCounts(sessionLength);
  const workoutNames = getWorkoutNamesForSplit(workoutSplit);

  const workoutSpecificPools: Record<string, ExerciseDefinition[]> = {};
  if (workoutSplit === 'ulul') {
    const UPPER_BODY_MUSCLES = new Set(['Pectorals', 'Deltoids', 'Lats', 'Traps', 'Biceps', 'Triceps', 'Abdominals', 'Core']);
    const LOWER_BODY_MUSCLES = new Set(['Quadriceps', 'Hamstrings', 'Glutes', 'Calves']);
    const upperPool = allExercises.filter((ex: any) => musclesIntersect(ex.main_muscle, UPPER_BODY_MUSCLES));
    const lowerPool = allExercises.filter((ex: any) => musclesIntersect(ex.main_muscle, LOWER_BODY_MUSCLES));
    workoutSpecificPools['Upper Body A'] = []; workoutSpecificPools['Upper Body B'] = [];
    workoutSpecificPools['Lower Body A'] = []; workoutSpecificPools['Lower Body B'] = [];
    sortExercises(upperPool).forEach((ex, i) => workoutSpecificPools[i % 2 === 0 ? 'Upper Body A' : 'Upper Body B'].push(ex));
    sortExercises(lowerPool).forEach((ex, i) => workoutSpecificPools[i % 2 === 0 ? 'Lower Body A' : 'Lower Body B'].push(ex));
  } else {
    workoutSpecificPools['Push'] = sortExercises(allExercises.filter((ex: any) => ex.movement_pattern === 'Push'));
    workoutSpecificPools['Pull'] = sortExercises(allExercises.filter((ex: any) => ex.movement_pattern === 'Pull'));
    workoutSpecificPools['Legs'] = sortExercises(allExercises.filter((ex: any) => ex.movement_pattern === 'Legs'));
  }

  const childWorkoutsToInsert = workoutNames.map(name => ({
    user_id: userId,
    parent_t_path_id: tPathId,
    template_name: name,
    is_bonus: true,
    settings: tPathData.settings,
  }));

  const { data: newChildWorkouts, error: createChildError } = await supabaseServiceRoleClient.from('t_paths').insert(childWorkoutsToInsert).select('*');
  if (createChildError) throw createChildError;

  let activeGymExerciseIds = new Set<string>();
  if (activeGymId) {
    const { data: activeGymLinks, error: activeGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id').eq('gym_id', activeGymId);
    if (activeGymLinksError) throw activeGymLinksError;
    activeGymExerciseIds = new Set((activeGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));
  }

  const allExercisesToInsert: any[] = [];
  const childWorkoutsWithExercises = [];

  for (const childWorkout of newChildWorkouts) {
    const candidatePool = workoutSpecificPools[childWorkout.template_name] || [];
    const tier1Pool = candidatePool.filter(ex => ex.user_id === userId);
    const tier2Pool = candidatePool.filter(ex => ex.user_id === null && !allLinkedExerciseIds.has(ex.id));
    const tier3Pool = candidatePool.filter(ex => ex.user_id === null && activeGymExerciseIds.has(ex.id));
    const finalPool = [...new Map([...tier1Pool, ...tier2Pool, ...tier3Pool].map(item => [item.id, item])).values()];
    
    const mainExercisesForWorkout = finalPool.slice(0, maxMainExercises);
    const bonusExercisesForWorkout = finalPool.slice(maxMainExercises, maxMainExercises + maxBonusExercises);

    mainExercisesForWorkout.forEach((ex, index) => allExercisesToInsert.push({ template_id: childWorkout.id, exercise_id: ex.id, order_index: index, is_bonus_exercise: false }));
    bonusExercisesForWorkout.forEach((ex, index) => allExercisesToInsert.push({ template_id: childWorkout.id, exercise_id: ex.id, order_index: mainExercisesForWorkout.length + index, is_bonus_exercise: true }));
    
    childWorkoutsWithExercises.push({
      ...childWorkout,
      exercises: [...mainExercisesForWorkout, ...bonusExercisesForWorkout].map(ex => ({ ...ex, is_bonus_exercise: bonusExercisesForWorkout.includes(ex) }))
    });
  }

  if (allExercisesToInsert.length > 0) {
    const { error: insertError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(allExercisesToInsert);
    if (insertError) throw insertError;
  }

  return childWorkoutsWithExercises;
}

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

    const {
      tPathType, experience, goalFocus, preferredMuscles, constraints,
      sessionLength, equipmentMethod, gymName, confirmedExercises,
      fullName, heightCm, weightKg, bodyFatPct
    } = await req.json();

    if (!tPathType || !experience || !sessionLength || !fullName || !heightCm || !weightKg) {
      throw new Error("Missing required onboarding data.");
    }

    // --- Start Synchronous, Optimized Process ---
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
    for (const ex of (confirmedExercises || [])) {
      if (ex.existing_id) {
        exerciseIdsToLinkToGym.add(ex.existing_id);
      } else {
        newExercisesToCreate.push({ name: ex.name!, main_muscle: ex.main_muscle!, type: ex.type!, category: ex.category, description: ex.description, pro_tip: ex.pro_tip, video_url: ex.video_url, icon_url: ex.icon_url, user_id: user.id, library_id: null, is_favorite: false, created_at: new Date().toISOString(), movement_type: ex.movement_type, movement_pattern: ex.movement_pattern });
      }
    }
    if (newExercisesToCreate.length > 0) {
      const { data: insertedExercises, error: insertExError } = await supabaseServiceRoleClient.from('exercise_definitions').insert(newExercisesToCreate).select('id');
      if (insertExError) throw insertExError;
      insertedExercises.forEach((ex: any) => exerciseIdsToLinkToGym.add(ex.id));
    }
    if (exerciseIdsToLinkToGym.size > 0) {
      const gymLinks = Array.from(exerciseIdsToLinkToGym).map(exId => ({ gym_id: newGymId, exercise_id: exId }));
      const { error: gymLinkError } = await supabaseServiceRoleClient.from('gym_exercises').insert(gymLinks);
      if (gymLinkError) throw gymLinkError;
    }

    const nameParts = fullName.split(' ');
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ') || '';
    const profileData = { id: user.id, first_name: firstName, last_name: lastName, full_name: fullName, height_cm: heightCm, weight_kg: weightKg, body_fat_pct: bodyFatPct, preferred_muscles: preferredMuscles, primary_goal: goalFocus, health_notes: constraints, default_rest_time_seconds: 60, preferred_session_length: sessionLength, active_t_path_id: activeTPath.id, active_gym_id: newGymId, programme_type: tPathType, t_path_generation_status: 'completed' };
    const { error: profileError } = await supabaseServiceRoleClient.from('profiles').upsert(profileData);
    if (profileError) throw profileError;

    // Pre-fetch data for generation function
    const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient.from('exercise_definitions').select('*');
    if (fetchAllExercisesError) throw fetchAllExercisesError;
    const { data: allGymLinks, error: allGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id');
    if (allGymLinksError) throw allGymLinksError;
    const allLinkedExerciseIds = new Set<string>((allGymLinks || []).map((l: { exercise_id: string }) => l.exercise_id));

    // Generate plans for ALL T-Paths, but only get detailed return for the active one
    let activeChildWorkoutsWithExercises: any[] = [];
    for (const tPath of insertedTPaths) {
      const childWorkouts = await generateWorkoutPlanForTPath(supabaseServiceRoleClient, user.id, tPath.id, sessionLength, newGymId, allExercises, allLinkedExerciseIds);
      if (tPath.id === activeTPath.id) {
        activeChildWorkoutsWithExercises = childWorkouts;
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Onboarding process completed successfully.',
      profile: profileData,
      mainTPath: activeTPath,
      childWorkoutsWithExercises: activeChildWorkoutsWithExercises,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in complete-onboarding edge function:", JSON.stringify(error, null, 2));
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({ t_path_generation_status: 'failed', t_path_generation_error: message }).eq('id', userId);
    }
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});