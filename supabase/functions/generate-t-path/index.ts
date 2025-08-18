// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { tPathId } = await req.json();

    // Get the T-Path settings
    const { data: tPath, error: tPathError } = await supabaseClient
      .from('t_paths')
      .select('*, profiles(first_name, last_name)')
      .eq('id', tPathId)
      .single();

    if (tPathError) throw tPathError;
    if (!tPath) throw new Error('T-Path not found');

    // Get user profile for equipment info
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', tPath.user_id)
      .single();

    if (profileError) throw profileError;

    // Determine workout names based on T-Path type
    let workoutNames: string[] = [];
    if (tPath.settings?.tPathType === 'ulul') {
      workoutNames = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
    } else if (tPath.settings?.tPathType === 'ppl') {
      workoutNames = ['Push', 'Pull', 'Legs'];
    }

    // Create workouts for this T-Path
    const workouts = [];
    for (let i = 0; i < workoutNames.length; i++) {
      const { data: workout, error: workoutError } = await supabaseClient
        .from('t_paths')
        .insert({
          user_id: tPath.user_id,
          template_name: workoutNames[i],
          is_bonus: false,
          version: 1,
          settings: tPath.settings
        })
        .select()
        .single();

      if (workoutError) throw workoutError;
      workouts.push(workout);
    }

    // For MVP, we'll add some sample exercises to each workout
    // In a full implementation, this would be AI-generated based on user profile
    const sampleExercises = [
      { name: 'Bench Press', main_muscle: 'Chest', type: 'weight' },
      { name: 'Squat', main_muscle: 'Quads', type: 'weight' },
      { name: 'Deadlift', main_muscle: 'Hamstrings', type: 'weight' },
      { name: 'Pull-up', main_muscle: 'Lats', type: 'weight' },
      { name: 'Overhead Press', main_muscle: 'Shoulders', type: 'weight' },
      { name: 'Barbell Row', main_muscle: 'Middle Back', type: 'weight' }
    ];

    // Add sample exercises to each workout
    for (const workout of workouts) {
      // Create exercise definitions for this user if they don't exist
      for (const exercise of sampleExercises) {
        const { data: existingExercise } = await supabaseClient
          .from('exercise_definitions')
          .select('*')
          .eq('user_id', tPath.user_id)
          .eq('name', exercise.name)
          .single();

        if (!existingExercise) {
          await supabaseClient
            .from('exercise_definitions')
            .insert({
              user_id: tPath.user_id,
              name: exercise.name,
              main_muscle: exercise.main_muscle,
              type: exercise.type,
              description: `A fundamental ${exercise.main_muscle} exercise`,
              pro_tip: 'Focus on proper form and controlled movement'
            });
        }
      }

      // Add 2-3 exercises to each workout
      const exerciseCount = workout.template_name.includes('Upper') || workout.template_name === 'Push' || workout.template_name === 'Pull' ? 3 : 2;
      const selectedExercises = sampleExercises.slice(0, exerciseCount);
      
      for (let i = 0; i < selectedExercises.length; i++) {
        const exercise = selectedExercises[i];
        const { data: exerciseDef } = await supabaseClient
          .from('exercise_definitions')
          .select('*')
          .eq('user_id', tPath.user_id)
          .eq('name', exercise.name)
          .single();

        if (exerciseDef) {
          await supabaseClient
            .from('t_path_exercises')
            .insert({
              template_id: workout.id,
              exercise_id: exerciseDef.id,
              order_index: i
            });
        }
      }

      // Add 2 bonus exercises (mobility/stretch)
      const bonusExercises = [
        { name: 'Arm Circles', main_muscle: 'Shoulders', type: 'timed' },
        { name: 'Leg Stretch', main_muscle: 'Hamstrings', type: 'timed' }
      ];

      for (const bonus of bonusExercises) {
        // Check if bonus exercise exists, create if not
        const { data: existingBonus } = await supabaseClient
          .from('exercise_definitions')
          .select('*')
          .eq('user_id', tPath.user_id)
          .eq('name', bonus.name)
          .single();

        let bonusExerciseId;
        if (!existingBonus) {
          const { data: newBonus } = await supabaseClient
            .from('exercise_definitions')
            .insert({
              user_id: tPath.user_id,
              name: bonus.name,
              main_muscle: bonus.main_muscle,
              type: bonus.type,
              description: `A ${bonus.main_muscle} mobility exercise`,
              pro_tip: 'Hold for 30 seconds'
            })
            .select()
            .single();
          bonusExerciseId = newBonus.id;
        } else {
          bonusExerciseId = existingBonus.id;
        }

        await supabaseClient
          .from('t_path_exercises')
          .insert({
            template_id: workout.id,
            exercise_id: bonusExerciseId,
            order_index: selectedExercises.length + bonusExercises.indexOf(bonus)
          });
      }
    }

    return new Response(
      JSON.stringify({ message: 'T-Path generated successfully', workouts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});