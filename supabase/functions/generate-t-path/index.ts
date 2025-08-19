// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define types for the data we're fetching
interface ExerciseDef {
  id: string;
  name: string;
  main_muscle: string;
  type: string;
  description: string | null;
  pro_tip: string | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Client to get user from JWT (uses anon key and request's auth header)
    const supabaseAuthClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Client for database operations (uses service role key to bypass RLS where needed)
    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseAuthClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { tPathId } = await req.json();

    let tPath;
    try {
      // Get the T-Path settings using the service role client
      const { data, error } = await supabaseServiceRoleClient
        .from('t_paths')
        .select('*, profiles(first_name, last_name)')
        .eq('id', tPathId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('T-Path not found in database.');
      tPath = data;
    } catch (err) {
      console.error('Error fetching T-Path:', err);
      return new Response(JSON.stringify({ error: `Error fetching T-Path: ${err instanceof Error ? err.message : String(err)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('T-Path settings:', tPath.settings);

    // Determine workout names based on T-Path type
    let workoutNames: string[] = [];
    if (tPath.settings && typeof tPath.settings === 'object' && 'tPathType' in tPath.settings) {
      if (tPath.settings.tPathType === 'ulul') {
        workoutNames = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
      } else if (tPath.settings.tPathType === 'ppl') {
        workoutNames = ['Push', 'Pull', 'Legs'];
      }
    } else {
      console.warn('T-Path settings or tPathType is missing/invalid:', tPath.settings);
      return new Response(JSON.stringify({ error: 'Invalid T-Path settings. Please re-run onboarding.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log('Determined workout names:', workoutNames);

    // Define the exercises that should exist as default (user_id IS NULL)
    // IMPORTANT: main_muscle values must match the mainMuscleGroups in exercise-form.tsx
    const coreExercises = [
      { name: 'Bench Press', main_muscle: 'Pectorals', type: 'weight', description: 'A fundamental chest exercise', pro_tip: 'Focus on proper form and controlled movement' },
      { name: 'Squat', main_muscle: 'Quadriceps', type: 'weight', description: 'A fundamental leg exercise', pro_tip: 'Keep your back straight' },
      { name: 'Deadlift', main_muscle: 'Hamstrings', type: 'weight', description: 'A full body strength exercise', pro_tip: 'Maintain a neutral spine' },
      { name: 'Pull-up', main_muscle: 'Lats', type: 'weight', description: 'A great back and bicep exercise', pro_tip: 'Engage your lats' },
      { name: 'Overhead Press', main_muscle: 'Deltoids', type: 'weight', description: 'Builds shoulder strength', pro_tip: 'Press straight overhead' },
      { name: 'Barbell Row', main_muscle: 'Lats', type: 'weight', description: 'Develops back thickness', pro_tip: 'Pull to your lower chest' },
    ];
    const bonusExercises = [
      { name: 'Arm Circles', main_muscle: 'Deltoids', type: 'timed', description: 'A shoulder mobility exercise', pro_tip: 'Perform controlled circles' },
      { name: 'Leg Stretch', main_muscle: 'Hamstrings', type: 'timed', description: 'A hamstring flexibility exercise', pro_tip: 'Hold for 30 seconds' }
    ];

    const allExpectedExercises = [...coreExercises, ...bonusExercises];
    const defaultExerciseMap = new Map<string, ExerciseDef>();

    console.log('Ensuring default exercises exist...');
    // Ensure all expected default exercises exist and get their IDs
    for (const expectedEx of allExpectedExercises) {
      try {
        const { data: existingEx, error: fetchExError } = await supabaseServiceRoleClient
          .from('exercise_definitions')
          .select('id, name, main_muscle, type, category, description, pro_tip, video_url')
          .eq('name', expectedEx.name)
          .is('user_id', null) // Crucial: check for default exercises
          .single();

        if (fetchExError && fetchExError.code !== 'PGRST116') { // PGRST116 means no rows found
          throw fetchExError;
        }

        if (existingEx) {
          defaultExerciseMap.set(existingEx.name, existingEx as ExerciseDef);
          console.log(`Found existing default exercise: ${existingEx.name}`);
        } else {
          // If a default exercise doesn't exist, create it.
          const { data: newEx, error: insertExError } = await supabaseServiceRoleClient
            .from('exercise_definitions')
            .insert({
              name: expectedEx.name,
              main_muscle: expectedEx.main_muscle,
              type: expectedEx.type,
              description: expectedEx.description,
              pro_tip: expectedEx.pro_tip,
              user_id: null // Ensure it's a default exercise
            })
            .select('id, name, main_muscle, type, category, description, pro_tip, video_url')
            .single();

          if (insertExError) throw insertExError;
          defaultExerciseMap.set(newEx.name, newEx as ExerciseDef);
          console.log(`Inserted new default exercise: ${newEx.name}`);
        }
      } catch (err) {
        console.error(`Error ensuring default exercise ${expectedEx.name}:`, err);
        return new Response(JSON.stringify({ error: `Error setting up default exercise ${expectedEx.name}: ${err instanceof Error ? err.message : String(err)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    console.log('Finished ensuring default exercises. Map size:', defaultExerciseMap.size);

    // Create workouts for this T-Path
    const workouts = [];
    console.log('Starting workout creation loop...');
    for (let i = 0; i < workoutNames.length; i++) {
      try {
        console.log(`Creating workout: ${workoutNames[i]}`);
        const { data: workout, error: workoutError } = await supabaseServiceRoleClient
          .from('t_paths')
          .insert({
            user_id: user.id, // Use the authenticated user's ID
            template_name: workoutNames[i],
            is_bonus: false,
            version: 1,
            settings: tPath.settings // Pass settings to sub-workouts
          })
          .select()
          .single();

        if (workoutError) throw workoutError;
        workouts.push(workout);
        console.log(`Workout created: ${workout.template_name} (ID: ${workout.id})`);

        // Add exercises to each workout based on workout type
        const exercisesForCurrentWorkout: { name: string; }[] = [];
        if (workout.template_name.includes('Upper Body A')) {
          exercisesForCurrentWorkout.push({ name: 'Bench Press' }, { name: 'Overhead Press' }, { name: 'Barbell Row' });
        } else if (workout.template_name.includes('Lower Body A')) {
          exercisesForCurrentWorkout.push({ name: 'Squat' }, { name: 'Deadlift' });
        } else if (workout.template_name.includes('Upper Body B')) {
          exercisesForCurrentWorkout.push({ name: 'Overhead Press' }, { name: 'Pull-up' }, { name: 'Bench Press' });
        } else if (workout.template_name.includes('Lower Body B')) {
          exercisesForCurrentWorkout.push({ name: 'Deadlift' }, { name: 'Squat' });
        } else if (workout.template_name === 'Push') {
          exercisesForCurrentWorkout.push({ name: 'Bench Press' }, { name: 'Overhead Press' });
        } else if (workout.template_name === 'Pull') {
          exercisesForCurrentWorkout.push({ name: 'Pull-up' }, { name: 'Barbell Row' });
        } else if (workout.template_name === 'Legs') {
          exercisesForCurrentWorkout.push({ name: 'Squat' }, { name: 'Deadlift' });
        }
        console.log(`Exercises for ${workout.template_name}:`, exercisesForCurrentWorkout.map(e => e.name));

        for (let j = 0; j < exercisesForCurrentWorkout.length; j++) {
          const exercise = exercisesForCurrentWorkout[j];
          const exerciseDef = defaultExerciseMap.get(exercise.name);

          if (exerciseDef) {
            await supabaseServiceRoleClient
              .from('t_path_exercises')
              .insert({
                template_id: workout.id,
                exercise_id: exerciseDef.id,
                order_index: j
              });
            console.log(`Inserted ${exercise.name} into ${workout.template_name}`);
          } else {
            console.warn(`Default exercise "${exercise.name}" not found in map. This should not happen if pre-checked.`);
            // If a core exercise is missing, this is a critical error for the workout generation
            throw new Error(`Missing core exercise definition: ${exercise.name}`);
          }
        }

        // Add bonus exercises
        for (let j = 0; j < bonusExercises.length; j++) {
          const bonus = bonusExercises[j];
          const bonusExerciseDef = defaultExerciseMap.get(bonus.name);
          if (bonusExerciseDef) {
            await supabaseServiceRoleClient
              .from('t_path_exercises')
              .insert({
                template_id: workout.id,
                exercise_id: bonusExerciseDef.id,
                order_index: exercisesForCurrentWorkout.length + j
              });
            console.log(`Inserted bonus exercise ${bonus.name} into ${workout.template_name}`);
          } else {
            console.warn(`Default bonus exercise "${bonus.name}" not found in map. This should not happen if pre-checked.`);
          }
        }
      } catch (err) {
        console.error(`Error creating workout ${workoutNames[i]} or its exercises:`, err);
        return new Response(JSON.stringify({ error: `Error creating workout ${workoutNames[i]}: ${err instanceof Error ? err.message : String(err)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    console.log('Finished workout creation loop.');

    return new Response(
      JSON.stringify({ message: 'T-Path generated successfully', workouts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unhandled error in generate-t-path edge function:', error);
    const message = error instanceof Error ? error.message : "An unknown error occurred during T-Path generation.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});