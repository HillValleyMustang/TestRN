// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Type definitions for better type safety
interface TPathData {
  id: string;
  settings: any;
  user_id: string;
}

interface WorkoutStructure {
  exercise_library_id: string;
  workout_name: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
}

interface ExerciseDefinition {
  id: string;
  name: string;
  main_muscle: string | null;
  type: string | null;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  library_id: string | null;
  movement_type: string | null;
  movement_pattern: string | null;
  icon_url: string | null;
  user_id: string | null;
}

// Utility Functions
function getMaxMinutes(sessionLength: string): number {
  switch(sessionLength){
    case '15-30':
      return 30;
    case '30-45':
      return 45;
    case '45-60':
      return 60;
    case '60-90':
      return 90;
    default:
      return 90;
  }
}

function getExerciseCounts(sessionLength: string): { main: number; bonus: number } {
  switch(sessionLength){
    case '15-30':
      return {
        main: 3,
        bonus: 3
      };
    case '30-45':
      return {
        main: 5,
        bonus: 3
      };
    case '45-60':
      return {
        main: 7,
        bonus: 2
      };
    case '60-90':
      return {
        main: 10,
        bonus: 2
      };
    default:
      return {
        main: 5,
        bonus: 3
      };
  }
}

function getWorkoutNamesForSplit(workoutSplit: string): string[] {
  if (workoutSplit === 'ulul') return [
    'Upper Body A',
    'Lower Body A',
    'Upper Body B',
    'Lower Body B'
  ];
  if (workoutSplit === 'ppl') return [
    'Push',
    'Pull',
    'Legs'
  ];
  throw new Error('Unknown workout split type.');
}

const sortExercises = (exercises: ExerciseDefinition[]): ExerciseDefinition[] => {
  return exercises.sort((a: ExerciseDefinition, b: ExerciseDefinition) => {
    if (a.movement_type === 'compound' && b.movement_type !== 'compound') return -1;
    if (a.movement_type !== 'compound' && b.movement_type === 'compound') return 1;
    return a.name.localeCompare(b.name);
  });
};

function musclesIntersect(muscleString: string | null, muscleSet: Set<string>): boolean {
  if (!muscleString) return false;
  const muscles = muscleString.split(',').map((m: string) => m.trim());
  return muscles.some((m: string) => muscleSet.has(m));
}

async function generateWorkoutPlanForTPath(
  supabaseServiceRoleClient: any,
  userId: string,
  tPathId: string,
  sessionLength: string,
  activeGymId: string | null,
  useStaticDefaults: boolean
): Promise<void> {
  const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient.from('t_paths').select('id, settings, user_id').eq('id', tPathId).eq('user_id', userId).single();
  if (tPathError || !tPathData) throw new Error(`Main T-Path not found for user ${userId} and tPathId ${tPathId}.`);
  
  const { data: oldChildWorkouts, error: fetchOldError } = await supabaseServiceRoleClient.from('t_paths').select('id').eq('parent_t_path_id', tPathId).eq('user_id', userId);
  if (fetchOldError) throw fetchOldError;
  
  if (oldChildWorkouts && oldChildWorkouts.length > 0) {
    const oldChildIds = oldChildWorkouts.map((w: any) => w.id);
    await supabaseServiceRoleClient.from('t_path_exercises').delete().in('template_id', oldChildIds);
    await supabaseServiceRoleClient.from('t_paths').delete().in('id', oldChildIds);
  }

  const tPathSettings = tPathData.settings;
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
    (globalExercises || []).forEach((ex: ExerciseDefinition) => {
      if (ex.library_id) globalExerciseMap.set(ex.library_id, ex);
    });

    for (const workoutName of workoutNames){
      if (!workoutName || typeof workoutName !== 'string' || workoutName.trim() === '') {
        console.error('Invalid workout name:', workoutName);
        continue; // Skip invalid workout names
      }
  
      const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient.from('t_paths').insert({
        user_id: userId,
        parent_t_path_id: tPathId,
        template_name: workoutName.trim(),
        is_bonus: true,
        settings: tPathData.settings,
        gym_id: activeGymId
      }).select('id').single();
      if (createChildError) throw createChildError;
      
      const childWorkoutId = newChildWorkout.id;
      const exercisesForThisWorkout = (structureData || []).filter((s: WorkoutStructure) => s.workout_name === workoutName);
      let mainExercisesToInsert: any[] = [];
      let bonusExercisesToInsert: any[] = [];
      
      exercisesForThisWorkout.forEach((s: WorkoutStructure) => {
        const exerciseDef = globalExerciseMap.get(s.exercise_library_id);
        if (exerciseDef) {
          if (s.min_session_minutes !== null && maxAllowedMinutes >= s.min_session_minutes) {
            mainExercisesToInsert.push({
              template_id: childWorkoutId,
              exercise_id: exerciseDef.id,
              order_index: 0,
              is_bonus_exercise: false
            });
          } else if (s.bonus_for_time_group !== null && maxAllowedMinutes >= s.bonus_for_time_group) {
            bonusExercisesToInsert.push({
              template_id: childWorkoutId,
              exercise_id: exerciseDef.id,
              order_index: 0,
              is_bonus_exercise: true
            });
          }
        }
      });

      mainExercisesToInsert.sort((a: any, b: any) => globalExerciseMap.get(a.exercise_id)?.name.localeCompare(globalExerciseMap.get(b.exercise_id)?.name || '') || 0);
      bonusExercisesToInsert.sort((a: any, b: any) => globalExerciseMap.get(a.exercise_id)?.name.localeCompare(globalExerciseMap.get(b.exercise_id)?.name || '') || 0);
      
      const finalMainExercises = mainExercisesToInsert.slice(0, maxMainExercises);
      const finalBonusExercises = bonusExercisesToInsert.slice(0, maxBonusExercises);
      
      const exercisesToInsertPayload = [
        ...finalMainExercises.map((ex: any, index: number) => ({
            ...ex,
            order_index: index
          })),
        ...finalBonusExercises.map((ex: any, index: number) => ({
            ...ex,
            order_index: finalMainExercises.length + index
          }))
      ];
      
      if (exercisesToInsertPayload.length > 0) {
        const { error: insertError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(exercisesToInsertPayload);
        if (insertError) throw insertError;
      }
    }
    return;
  }

  // Dynamic exercise selection logic
  const { data: allExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient.from('exercise_definitions').select('*');
  if (fetchAllExercisesError) throw fetchAllExercisesError;
  
  const { data: allGymLinks, error: allGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id');
  if (allGymLinksError) throw allGymLinksError;
  const allLinkedExerciseIds = new Set((allGymLinks || []).map((l: any) => l.exercise_id));
  
  const workoutSpecificPools: Record<string, ExerciseDefinition[]> = {};
  
  if (workoutSplit === 'ulul') {
    const UPPER_BODY_MUSCLES = new Set([
      'Pectorals',
      'Deltoids',
      'Lats',
      'Traps',
      'Biceps',
      'Triceps',
      'Abdominals',
      'Core'
    ]);
    const LOWER_BODY_MUSCLES = new Set([
      'Quadriceps',
      'Hamstrings',
      'Glutes',
      'Calves'
    ]);
    
    const upperPool = (allExercises || []).filter((ex: ExerciseDefinition) => musclesIntersect(ex.main_muscle, UPPER_BODY_MUSCLES));
    const lowerPool = (allExercises || []).filter((ex: ExerciseDefinition) => musclesIntersect(ex.main_muscle, LOWER_BODY_MUSCLES));
    
    workoutSpecificPools['Upper Body A'] = [];
    workoutSpecificPools['Upper Body B'] = [];
    workoutSpecificPools['Lower Body A'] = [];
    workoutSpecificPools['Lower Body B'] = [];
    
    sortExercises(upperPool).forEach((ex: ExerciseDefinition, i: number) => {
      const targetPool = i % 2 === 0 ? 'Upper Body A' : 'Upper Body B';
      workoutSpecificPools[targetPool].push(ex);
    });
    sortExercises(lowerPool).forEach((ex: ExerciseDefinition, i: number) => {
      const targetPool = i % 2 === 0 ? 'Lower Body A' : 'Lower Body B';
      workoutSpecificPools[targetPool].push(ex);
    });
  } else {
    workoutSpecificPools['Push'] = sortExercises((allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Push'));
    workoutSpecificPools['Pull'] = sortExercises((allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Pull'));
    workoutSpecificPools['Legs'] = sortExercises((allExercises || []).filter((ex: ExerciseDefinition) => ex.movement_pattern === 'Legs'));
  }

  for (const workoutName of workoutNames){
    if (!workoutName || typeof workoutName !== 'string' || workoutName.trim() === '') {
      console.error('Invalid workout name:', workoutName);
      continue; // Skip invalid workout names
    }

    const { data: newChildWorkout, error: createChildError } = await supabaseServiceRoleClient.from('t_paths').insert({
      user_id: userId,
      parent_t_path_id: tPathId,
      template_name: workoutName.trim(),
      is_bonus: true,
      settings: tPathData.settings,
      gym_id: activeGymId
    }).select('id').single();
    if (createChildError) throw createChildError;
    
    const childWorkoutId = newChildWorkout.id;
    const candidatePool = workoutSpecificPools[workoutName] || [];
    
    let activeGymExerciseIds = new Set<string>();
    if (activeGymId) {
      const { data: activeGymLinks, error: activeGymLinksError } = await supabaseServiceRoleClient.from('gym_exercises').select('exercise_id').eq('gym_id', activeGymId);
      if (activeGymLinksError) throw activeGymLinksError;
      activeGymExerciseIds = new Set((activeGymLinks || []).map((l: any) => l.exercise_id));
    }

    // Exercise selection logic
    const tier1Pool = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === userId);
    const tier2Pool_gymLinkedGlobal = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === null && activeGymExerciseIds.has(ex.id));
    const tier3Pool_unlinkedGlobal = candidatePool.filter((ex: ExerciseDefinition) => ex.user_id === null && !allLinkedExerciseIds.has(ex.id));
    
    const finalPool = [
      ...tier1Pool,
      ...tier2Pool_gymLinkedGlobal,
      ...tier3Pool_unlinkedGlobal
    ];
    
    const finalUniquePool = [
      ...new Map(finalPool.map((item: ExerciseDefinition) => [
          item.id,
          item
        ])).values()
    ];
    
    const mainExercisesForWorkout = finalUniquePool.slice(0, maxMainExercises);
    const bonusExercisesForWorkout = finalUniquePool.slice(maxMainExercises, maxMainExercises + maxBonusExercises);
    
    const exercisesToInsertPayload = [
      ...mainExercisesForWorkout.map((ex: ExerciseDefinition, index: number) => ({
          template_id: childWorkoutId,
          exercise_id: ex.id,
          order_index: index,
          is_bonus_exercise: false
        })),
      ...bonusExercisesForWorkout.map((ex: ExerciseDefinition, index: number) => ({
          template_id: childWorkoutId,
          exercise_id: ex.id,
          order_index: mainExercisesForWorkout.length + index,
          is_bonus_exercise: true
        }))
    ];
    
    if (exercisesToInsertPayload.length > 0) {
      const { error: insertError } = await supabaseServiceRoleClient.from('t_path_exercises').insert(exercisesToInsertPayload);
      if (insertError) throw insertError;
    }
  }
}

const getSupabaseServiceRoleClient = () => {
  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(supabaseUrl, supabaseServiceRoleKey);
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, {
    headers: corsHeaders
  });
  
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  let userId = null;
  
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');
    
    userId = user.id;
    
    await supabaseServiceRoleClient.from('profiles').update({
      t_path_generation_status: 'in_progress',
      t_path_generation_error: null
    }).eq('id', userId);
    
    const { tPathType, experience, goalFocus, preferredMuscles, constraints, sessionLength, equipmentMethod, gymName, confirmedExercises, fullName, heightCm, weightKg, bodyFatPct } = await req.json();
    
    console.log(`[DEBUG] 🚀 ONBOARDING STARTED`);
    console.log(`[DEBUG] 📋 User selected tPathType: ${tPathType}`);
    console.log(`[DEBUG] 📋 Full request data:`, { tPathType, experience, goalFocus, sessionLength, equipmentMethod, fullName });
    
    if (!tPathType || !experience || !sessionLength || !fullName || !heightCm || !weightKg) {
      throw new Error("Missing required onboarding data.");
    }
    
    // CRITICAL FIX: Clean up ALL existing T-Paths for this user before starting
    console.log(`[DEBUG] 🧹 CLEANUP: Checking for existing T-Paths for user ${userId}`);
    const { data: existingTPaths, error: fetchExistingError } = await supabaseServiceRoleClient.from('t_paths').select('id, template_name, parent_t_path_id').eq('user_id', userId);
    if (fetchExistingError) throw fetchExistingError;
    
    if (existingTPaths && existingTPaths.length > 0) {
      console.log(`[DEBUG] 🧹 Found ${existingTPaths.length} existing T-Paths - cleaning up...`);
      console.log(`[DEBUG] 🧹 Existing T-Paths:`, existingTPaths.map((tp: any) => ({ id: tp.id, template: tp.template_name, isChild: tp.parent_t_path_id !== null })));
      const existingChildIds = existingTPaths.filter((tp: any) => tp.parent_t_path_id !== null).map((tp: any) => tp.id);
      const existingMainIds = existingTPaths.filter((tp: any) => tp.parent_t_path_id === null).map((tp: any) => tp.id);
      
      if (existingChildIds.length > 0) {
        await supabaseServiceRoleClient.from('t_path_exercises').delete().in('template_id', existingChildIds);
        await supabaseServiceRoleClient.from('t_paths').delete().in('id', existingChildIds);
      }
      
      if (existingMainIds.length > 0) {
        await supabaseServiceRoleClient.from('t_paths').delete().in('id', existingMainIds);
      }
      
      console.log(`[DEBUG] ✅ Cleanup completed - removed ${existingTPaths.length} existing T-Paths`);
    } else {
      console.log(`[DEBUG] ✅ No existing T-Paths found - clean start`);
    }
    
    // Create gym
    console.log(`[DEBUG] 🏢 Creating gym: ${gymName || "My Gym"}`);
    const { data: insertedGym, error: insertGymError } = await supabaseServiceRoleClient.from('gyms').insert({
      user_id: user.id,
      name: gymName || "My Gym"
    }).select('id').single();
    if (insertGymError) throw insertGymError;
    const newGymId = insertedGym.id;
    console.log(`[DEBUG] ✅ Gym created with ID: ${newGymId}`);
    
    // Create only the selected T-Path based on user choice
    let templateName: string;
    if (tPathType === 'ulul') {
      templateName = '4-Day Upper/Lower';
    } else if (tPathType === 'ppl') {
      templateName = '3-Day Push/Pull/Legs';
    } else {
      throw new Error("Invalid tPathType. Must be 'ulul' or 'ppl'.");
    }
    
    console.log(`[DEBUG] 🏋️ Selected template: ${templateName} for tPathType: ${tPathType}`);
    
    const tPathsToInsert = [
      {
        user_id: user.id,
        gym_id: newGymId,
        template_name: templateName,
        is_bonus: false,
        parent_t_path_id: null,
        settings: {
          tPathType: tPathType,
          experience,
          goalFocus,
          preferredMuscles,
          constraints,
          equipmentMethod
        }
      }
    ];
    
    console.log(`[DEBUG] 📝 About to insert ${tPathsToInsert.length} T-Path(s):`, tPathsToInsert.map((tp: any) => ({ template: tp.template_name, type: tp.settings.tPathType })));
    
    const { data: insertedTPaths, error: insertTPathsError } = await supabaseServiceRoleClient.from('t_paths').insert(tPathsToInsert).select('*');
    if (insertTPathsError) throw insertTPathsError;
    
    console.log(`[DEBUG] ✅ Successfully inserted ${insertedTPaths.length} T-Path(s):`, insertedTPaths.map((tp: any) => ({ id: tp.id, template: tp.template_name, type: tp.settings?.tPathType })));
    
    // Only process the selected T-Path (there's only one now)
    const activeTPath = insertedTPaths[0];
    if (!activeTPath) throw new Error("Could not create active T-Path.");
    
    console.log(`[DEBUG] 🎯 Active T-Path: ${activeTPath.template_name} (${activeTPath.settings?.tPathType})`);
    
    // Process confirmed exercises
    const exerciseIdsToLinkToGym = new Set<string>();
    const newExercisesToCreate: any[] = [];
    const confirmedExercisesDataForPlan: ExerciseDefinition[] = [];
    const useStaticDefaultsForExercises = equipmentMethod === 'skip';
    
    for (const ex of confirmedExercises || []){
      if (ex.existing_id) {
        exerciseIdsToLinkToGym.add(ex.existing_id);
        confirmedExercisesDataForPlan.push({
          id: ex.existing_id,
          name: ex.name,
          user_id: null,
          library_id: null,
          movement_type: ex.movement_type || null,
          movement_pattern: ex.movement_pattern || null,
          main_muscle: ex.main_muscle,
          type: ex.type,
          category: ex.category || null,
          description: ex.description || null,
          pro_tip: ex.pro_tip || null,
          video_url: ex.video_url || null,
          icon_url: ex.icon_url || null
        });
      } else {
        newExercisesToCreate.push({
          name: ex.name,
          main_muscle: ex.main_muscle,
          type: ex.type,
          category: ex.category,
          description: ex.description,
          pro_tip: ex.pro_tip,
          video_url: ex.video_url,
          icon_url: ex.icon_url,
          user_id: user.id,
          library_id: null,
          is_favorite: false,
          created_at: new Date().toISOString(),
          movement_type: ex.movement_type,
          movement_pattern: ex.movement_pattern
        });
      }
    }
    
    if (newExercisesToCreate.length > 0) {
      const { data: insertedExercises, error: insertExError } = await supabaseServiceRoleClient.from('exercise_definitions').insert(newExercisesToCreate).select('*');
      if (insertExError) throw insertExError;
      insertedExercises.forEach((ex: ExerciseDefinition) => {
        exerciseIdsToLinkToGym.add(ex.id);
        confirmedExercisesDataForPlan.push(ex);
      });
    }
    
    if (exerciseIdsToLinkToGym.size > 0) {
      const gymLinks = Array.from(exerciseIdsToLinkToGym).map((exId) => ({
          gym_id: newGymId,
          exercise_id: exId
        }));
      const { error: gymLinkError } = await supabaseServiceRoleClient.from('gym_exercises').insert(gymLinks);
      if (gymLinkError) throw gymLinkError;
    }
    
    // Update profile
    const nameParts = fullName.split(' ');
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ') || '';
    const profileData = {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      height_cm: heightCm,
      weight_kg: weightKg,
      body_fat_pct: bodyFatPct,
      preferred_muscles: preferredMuscles,
      primary_goal: goalFocus,
      health_notes: constraints,
      default_rest_time_seconds: 60,
      preferred_session_length: sessionLength,
      active_t_path_id: activeTPath.id,
      active_gym_id: newGymId,
      programme_type: tPathType
    };
    
    const { data: upsertedProfile, error: profileError } = await supabaseServiceRoleClient.from('profiles').upsert(profileData).select().single();
    if (profileError) throw profileError;
    
    // Process only the selected T-Path to get child workout data
    const childWorkoutsWithExercises: any[] = [];
    
    console.log(`[DEBUG] 🏗️ Generating workout plan for T-Path: ${activeTPath.template_name} (${activeTPath.settings?.tPathType})`);
    
    // Generate workout plan for the selected T-Path
    await generateWorkoutPlanForTPath(supabaseServiceRoleClient, user.id, activeTPath.id, sessionLength, newGymId, useStaticDefaultsForExercises);
    
    console.log(`[DEBUG] 🔍 Fetching child workouts for parent T-Path ID: ${activeTPath.id}`);
    
    // Fetch child workouts for the selected T-Path
    const { data: childWorkouts, error: childWorkoutsError } = await supabaseServiceRoleClient.from('t_paths').select('*, t_path_exercises(*, exercise_definitions(*))').eq('parent_t_path_id', activeTPath.id);
    if (childWorkoutsError) throw childWorkoutsError;
    
    console.log(`[DEBUG] 📊 Found ${childWorkouts?.length || 0} child workouts:`, childWorkouts?.map((w: any) => ({ id: w.id, template_name: w.template_name, exercise_count: w.t_path_exercises?.length || 0 })));
    
    const transformedChildWorkouts = (childWorkouts || []).map((workout: any) => {
      const exercises = (workout.t_path_exercises || []).map((tpe: any) => {
        if (!tpe.exercise_definitions) return null;
        return {
          ...tpe.exercise_definitions,
          is_bonus_exercise: tpe.is_bonus_exercise
        };
      }).filter(Boolean);
      const { t_path_exercises, template_name, ...restOfWorkout } = workout;
      return {
        ...restOfWorkout,
        workout_name: template_name, // Map template_name to workout_name for mobile app
        exercises: exercises
      };
    });
    
    childWorkoutsWithExercises.push(...transformedChildWorkouts);
    
    // CRITICAL VALIDATION: Verify we have the correct number of workouts
    const expectedWorkouts = tPathType === 'ppl' ? 3 : 4;
    const actualWorkouts = childWorkoutsWithExercises.length;
    
    console.log(`[DEBUG] 🎯 WORKOUT COUNT VALIDATION:`);
    console.log(`[DEBUG] 🎯 Expected: ${expectedWorkouts} workouts for ${tPathType}`);
    console.log(`[DEBUG] 🎯 Actual: ${actualWorkouts} workouts generated`);
    console.log(`[DEBUG] 🎯 Workout names:`, childWorkoutsWithExercises.map(w => w.workout_name));
    
    if (expectedWorkouts !== actualWorkouts) {
      console.error(`[DEBUG] 🚨 ERROR: Workout count mismatch! Expected ${expectedWorkouts}, got ${actualWorkouts}`);
      console.error(`[DEBUG] 🚨 This indicates the bug is still present. Full workout data:`, childWorkoutsWithExercises);
      throw new Error(`Workout generation error: Expected ${expectedWorkouts} workouts for ${tPathType}, but generated ${actualWorkouts}. This may be due to incomplete cleanup or multiple function calls.`);
    }
    
    console.log(`[DEBUG] ✅ Final response - Returning ${childWorkoutsWithExercises.length} child workouts:`, childWorkoutsWithExercises.map(w => ({ template_name: w.template_name, exercise_count: w.exercises?.length || 0 })));
    
    await supabaseServiceRoleClient.from('profiles').update({
      t_path_generation_status: 'completed',
      t_path_generation_error: null
    }).eq('id', userId);
    
    const finalResponse = {
      message: 'Onboarding completed successfully.',
      profile: upsertedProfile,
      mainTPath: activeTPath,
      childWorkouts: childWorkoutsWithExercises,
      identifiedExercises: confirmedExercises
    };
    
    console.log(`[DEBUG] 🎉 ONBOARDING COMPLETED SUCCESSFULLY`);
    console.log(`[DEBUG] 📋 Summary:`, {
      mainTPath: activeTPath.template_name,
      childWorkoutsCount: childWorkoutsWithExercises.length,
      childWorkoutNames: childWorkoutsWithExercises.map(w => w.workout_name),
      validationPassed: expectedWorkouts === actualWorkouts
    });
    
    return new Response(JSON.stringify(finalResponse), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in complete-onboarding edge function:", JSON.stringify(error, null, 2));
    
    if (userId) {
      await supabaseServiceRoleClient.from('profiles').update({
        t_path_generation_status: 'failed',
        t_path_generation_error: message
      }).eq('id', userId);
    }
    
    return new Response(JSON.stringify({
      error: message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});