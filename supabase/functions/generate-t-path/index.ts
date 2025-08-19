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
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
}

interface CsvExercise {
  name: string;
  main_muscle: string;
  type: string;
  category: string;
  description: string;
  pro_tip: string;
  video_url: string;
  workout_name: string;
}

// Hardcoded CSV data
const csvExercises: CsvExercise[] = [
  { name: 'Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'A fundamental chest exercise', pro_tip: 'Focus on proper form and controlled movement', video_url: '', workout_name: 'Upper Body A' },
  { name: 'Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Builds shoulder strength', pro_tip: 'Press straight overhead', video_url: '', workout_name: 'Upper Body A' },
  { name: 'Barbell Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Develops back thickness', pro_tip: 'Pull to your lower chest', video_url: '', workout_name: 'Upper Body A' },
  { name: 'Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets the biceps', pro_tip: 'Keep elbows tucked in', video_url: '', workout_name: 'Upper Body A' },
  { name: 'Tricep Extension', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets the triceps', pro_tip: 'Control the eccentric phase', video_url: '', workout_name: 'Upper Body A' },
  { name: 'Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'A fundamental leg exercise', pro_tip: 'Keep your back straight', video_url: '', workout_name: 'Lower Body A' },
  { name: 'Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'A full body strength exercise', pro_tip: 'Maintain a neutral spine', video_url: '', workout_name: 'Lower Body A' },
  { name: 'Leg Press', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Targets quadriceps', pro_tip: 'Don\'t lock your knees', video_url: '', workout_name: 'Lower Body A' },
  { name: 'Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Isolates hamstrings', pro_tip: 'Focus on the squeeze', video_url: '', workout_name: 'Lower Body A' },
  { name: 'Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Targets calves', pro_tip: 'Full range of motion', video_url: '', workout_name: 'Lower Body A' },
  { name: 'Incline Dumbbell Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets upper chest', pro_tip: 'Control the descent', video_url: '', workout_name: 'Upper Body B' },
  { name: 'Seated Cable Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets back thickness', pro_tip: 'Pull with your elbows', video_url: '', workout_name: 'Upper Body B' },
  { name: 'Lateral Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets side deltoids', pro_tip: 'Lead with elbows', video_url: '', workout_name: 'Upper Body B' },
  { name: 'Face Pull', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids and traps', pro_tip: 'Pull towards your face', video_url: '', workout_name: 'Upper Body B' },
  { name: 'Tricep Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps', pro_tip: 'Keep elbows stationary', video_url: '', workout_name: 'Upper Body B' },
  { name: 'Hammer Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps and forearms', pro_tip: 'Keep palms facing each other', video_url: '', workout_name: 'Upper Body B' },
  { name: 'Romanian Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Targets hamstrings and glutes', pro_tip: 'Maintain a slight bend in knees', video_url: '', workout_name: 'Lower Body B' },
  { name: 'Leg Extension', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Isolates quadriceps', pro_tip: 'Control the movement', video_url: '', workout_name: 'Lower Body B' },
  { name: 'Lunges', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Targets quads, glutes, and hamstrings', pro_tip: 'Keep front knee behind toes', video_url: '', workout_name: 'Lower Body B' },
  { name: 'Glute Bridge', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Activates glutes', pro_tip: 'Squeeze glutes at the top', video_url: '', workout_name: 'Lower Body B' },
  { name: 'Standing Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Targets calves', pro_tip: 'Go for a full stretch', video_url: '', workout_name: 'Lower Body B' },
  { name: 'Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'A fundamental chest exercise', pro_tip: 'Focus on proper form and controlled movement', video_url: '', workout_name: 'Push' },
  { name: 'Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Builds shoulder strength', pro_tip: 'Press straight overhead', video_url: '', workout_name: 'Push' },
  { name: 'Tricep Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps', pro_tip: 'Keep elbows stationary', video_url: '', workout_name: 'Push' },
  { name: 'Lateral Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets side deltoids', pro_tip: 'Lead with elbows', video_url: '', workout_name: 'Push' },
  { name: 'Pull-up', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'A great back and bicep exercise', pro_tip: 'Engage your lats', video_url: '', workout_name: 'Pull' },
  { name: 'Barbell Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Develops back thickness', pro_tip: 'Pull to your lower chest', video_url: '', workout_name: 'Pull' },
  { name: 'Face Pull', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids and traps', pro_tip: 'Pull towards your face', video_url: '', workout_name: 'Pull' },
  { name: 'Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets the biceps', pro_tip: 'Keep elbows tucked in', video_url: '', workout_name: 'Pull' },
  { name: 'Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'A fundamental leg exercise', pro_tip: 'Keep your back straight', video_url: '', workout_name: 'Legs' },
  { name: 'Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'A full body strength exercise', pro_tip: 'Maintain a neutral spine', video_url: '', workout_name: 'Legs' },
  { name: 'Leg Press', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Targets quadriceps', pro_tip: 'Don\'t lock your knees', video_url: '', workout_name: 'Legs' },
  { name: 'Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Isolates hamstrings', pro_tip: 'Focus on the squeeze', video_url: '', workout_name: 'Legs' },
  { name: 'Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Targets calves', pro_tip: 'Full range of motion', video_url: '', workout_name: 'Legs' },
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAuthClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

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

    // --- Delete existing child workouts and their exercises for this tPathId ---
    console.log(`Deleting existing child workouts for parent T-Path ID: ${tPathId}`);
    const { data: existingChildWorkouts, error: fetchChildrenError } = await supabaseServiceRoleClient
      .from('t_paths')
      .select('id')
      .eq('user_id', tPathId); // Child workouts have parent's ID as their user_id

    if (fetchChildrenError) throw fetchChildrenError;

    if (existingChildWorkouts && existingChildWorkouts.length > 0) {
      const childWorkoutIds = existingChildWorkouts.map((w: { id: string }) => w.id); // Fixed: Explicitly type 'w'

      // Delete associated t_path_exercises first
      const { error: deleteTPathExercisesError } = await supabaseServiceRoleClient
        .from('t_path_exercises')
        .delete()
        .in('template_id', childWorkoutIds);
      if (deleteTPathExercisesError) throw deleteTPathExercisesError;
      console.log(`Deleted t_path_exercises for ${childWorkoutIds.length} child workouts.`);

      // Then delete the child workouts themselves
      const { error: deleteWorkoutsError } = await supabaseServiceRoleClient
        .from('t_paths')
        .delete()
        .in('id', childWorkoutIds);
      if (deleteWorkoutsError) throw deleteWorkoutsError;
      console.log(`Deleted ${childWorkoutIds.length} child workouts.`);
    }
    // --- End Delete Logic ---

    // Ensure all unique exercises from CSV exist in exercise_definitions (user_id IS NULL)
    const uniqueCsvExercises = Array.from(new Map(csvExercises.map(item => [item.name, item])).values());
    const defaultExerciseMap = new Map<string, ExerciseDef>();

    console.log('Ensuring default exercises from CSV exist...');
    for (const csvEx of uniqueCsvExercises) {
      try {
        const { data: existingEx, error: fetchExError } = await supabaseServiceRoleClient
          .from('exercise_definitions')
          .select('id, name, main_muscle, type, category, description, pro_tip, video_url')
          .eq('name', csvEx.name)
          .is('user_id', null) // Check for default exercises
          .single();

        if (fetchExError && fetchExError.code !== 'PGRST116') {
          throw fetchExError;
        }

        if (existingEx) {
          // Update existing default exercise with CSV data
          const { data: updatedEx, error: updateExError } = await supabaseServiceRoleClient
            .from('exercise_definitions')
            .update({
              main_muscle: csvEx.main_muscle,
              type: csvEx.type,
              category: csvEx.category,
              description: csvEx.description,
              pro_tip: csvEx.pro_tip,
              video_url: csvEx.video_url,
            })
            .eq('id', existingEx.id)
            .select('id, name, main_muscle, type, category, description, pro_tip, video_url')
            .single();
          if (updateExError) throw updateExError;
          defaultExerciseMap.set(updatedEx.name, updatedEx as ExerciseDef);
          console.log(`Updated existing default exercise: ${updatedEx.name}`);
        } else {
          // Insert new default exercise
          const { data: newEx, error: insertExError } = await supabaseServiceRoleClient
            .from('exercise_definitions')
            .insert({
              name: csvEx.name,
              main_muscle: csvEx.main_muscle,
              type: csvEx.type,
              category: csvEx.category,
              description: csvEx.description,
              pro_tip: csvEx.pro_tip,
              video_url: csvEx.video_url,
              user_id: null // Ensure it's a default exercise
            })
            .select('id, name, main_muscle, type, category, description, pro_tip, video_url')
            .single();

          if (insertExError) throw insertExError;
          defaultExerciseMap.set(newEx.name, newEx as ExerciseDef);
          console.log(`Inserted new default exercise: ${newEx.name}`);
        }
      } catch (err) {
        console.error(`Error ensuring default exercise ${csvEx.name}:`, err);
        return new Response(JSON.stringify({ error: `Error setting up default exercise ${csvEx.name}: ${err instanceof Error ? err.message : String(err)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    console.log('Finished ensuring default exercises from CSV. Map size:', defaultExerciseMap.size);

    // Create workouts for this T-Path
    const workouts = [];
    console.log('Starting workout creation loop...');
    for (let i = 0; i < workoutNames.length; i++) {
      try {
        console.log(`Creating workout: ${workoutNames[i]}`);
        const { data: workout, error: workoutError } = await supabaseServiceRoleClient
          .from('t_paths')
          .insert({
            user_id: tPath.id, // IMPORTANT: Link child workout to parent T-Path ID
            template_name: workoutNames[i],
            is_bonus: true, // Mark as a child workout
            version: 1,
            settings: tPath.settings // Pass settings to sub-workouts
          })
          .select()
          .single();

        if (workoutError) throw workoutError;
        workouts.push(workout);
        console.log(`Workout created: ${workout.template_name} (ID: ${workout.id})`);

        // Filter exercises from CSV for the current workout
        const exercisesForCurrentWorkout = csvExercises.filter(ex => ex.workout_name === workout.template_name);
        console.log(`Exercises for ${workout.template_name}:`, exercisesForCurrentWorkout.map(e => e.name));

        const tPathExercisesToInsert = [];
        for (let j = 0; j < exercisesForCurrentWorkout.length; j++) {
          const exercise = exercisesForCurrentWorkout[j];
          const exerciseDef = defaultExerciseMap.get(exercise.name);

          if (exerciseDef) {
            tPathExercisesToInsert.push({
              template_id: workout.id,
              exercise_id: exerciseDef.id,
              order_index: j
            });
          } else {
            console.warn(`Exercise "${exercise.name}" not found in map. This should not happen.`);
            throw new Error(`Missing exercise definition for workout: ${exercise.name}`);
          }
        }

        if (tPathExercisesToInsert.length > 0) {
          const { error: insertTPathExercisesError } = await supabaseServiceRoleClient
            .from('t_path_exercises')
            .insert(tPathExercisesToInsert);
          if (insertTPathExercisesError) throw insertTPathExercisesError;
          console.log(`Inserted ${tPathExercisesToInsert.length} exercises into ${workout.template_name}`);
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