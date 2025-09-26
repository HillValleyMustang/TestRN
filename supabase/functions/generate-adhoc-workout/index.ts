// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to shuffle an array in place
const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Define an interface for the exercise definition to avoid 'any' type
interface ExerciseDefinition {
  id: string;
  name: string;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  user_id: string | null;
  library_id: string | null;
  is_favorite: boolean | null;
  icon_url: string | null;
  movement_type: string | null;
  movement_pattern: string | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) throw new Error('Unauthorized');

    const { time_in_minutes, workout_focus, use_gym_equipment } = await req.json();
    if (!time_in_minutes || !workout_focus) {
      throw new Error("Missing required parameters: time_in_minutes and workout_focus.");
    }

    // 1. Calculate Exercise Count
    const exerciseCount = Math.floor(time_in_minutes / 5);
    if (exerciseCount < 1) {
      return new Response(JSON.stringify({ workout: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Create Workout Template
    let templateBase: string[] = [];
    if (workout_focus === 'Full Body') templateBase = ['Push', 'Pull', 'Legs'];
    else if (workout_focus === 'Upper Body') templateBase = ['Push', 'Pull'];
    else if (workout_focus === 'Lower Body') templateBase = ['Legs'];
    else throw new Error("Invalid workout_focus value.");

    let workoutTemplate: string[] = [];
    for (let i = 0; i < exerciseCount; i++) {
      workoutTemplate.push(templateBase[i % templateBase.length]);
    }

    // 3. Fetch Available Exercises
    let query = supabase.from('exercise_definitions').select('*');

    if (use_gym_equipment) {
      const { data: profile } = await supabase.from('profiles').select('active_gym_id').eq('id', user.id).single();
      const activeGymId = profile?.active_gym_id;
      
      let gymExerciseIds: string[] = [];
      if (activeGymId) {
        const { data: gymEx } = await supabase.from('gym_exercises').select('exercise_id').eq('gym_id', activeGymId);
        if (gymEx) {
          gymExerciseIds = gymEx.map((e: { exercise_id: string }) => e.exercise_id);
        }
      }
      
      // Fetch generic exercises OR exercises linked to the active gym
      query = query.or(`user_id.is.null,id.in.(${gymExerciseIds.join(',') || '""'})`);
    } else {
      // Fetch only generic (global) exercises of any type
      query = query.is('user_id', null);
    }

    const { data: availableExercises, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    // 4. Build the Workout
    const pushPool = shuffle((availableExercises || []).filter((e: ExerciseDefinition) => e.movement_pattern === 'Push'));
    const pullPool = shuffle((availableExercises || []).filter((e: ExerciseDefinition) => e.movement_pattern === 'Pull'));
    const legsPool = shuffle((availableExercises || []).filter((e: ExerciseDefinition) => e.movement_pattern === 'Legs'));

    const finalWorkout = [];
    const usedExerciseIds = new Set<string>();

    for (const pattern of workoutTemplate) {
      let pool: any[] | undefined;
      if (pattern === 'Push') pool = pushPool;
      if (pattern === 'Pull') pool = pullPool;
      if (pattern === 'Legs') pool = legsPool;

      if (pool && pool.length > 0) {
        // Find the first available exercise in the shuffled pool that hasn't been used
        const exerciseIndex = pool.findIndex((ex: ExerciseDefinition) => !usedExerciseIds.has(ex.id));
        if (exerciseIndex !== -1) {
          const [exercise] = pool.splice(exerciseIndex, 1); // Remove it from the pool
          finalWorkout.push(exercise);
          usedExerciseIds.add(exercise.id);
        }
      }
    }

    // 5. Return the Workout
    return new Response(JSON.stringify({ workout: finalWorkout }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in generate-adhoc-workout edge function:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});