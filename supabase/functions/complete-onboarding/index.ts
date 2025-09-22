// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { generateWorkoutPlanForTPath } from '../shared/workout-generation-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to initialize Supabase client with service role key
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