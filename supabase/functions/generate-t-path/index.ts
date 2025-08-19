// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define types for the data we're fetching and inserting
interface ExerciseLibraryEntry {
  exercise_id: string;
  name: string;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
}

interface WorkoutStructureEntry {
  exercise_id: string;
  workout_split: string;
  workout_name: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
}

// Hardcoded data from exercise_library.csv
const exerciseLibraryData: ExerciseLibraryEntry[] = [
  { exercise_id: 'ex_bench_press', name: 'Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'A fundamental chest exercise', pro_tip: 'Focus on proper form and controlled movement', video_url: '' },
  { exercise_id: 'ex_overhead_press', name: 'Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Builds shoulder strength', pro_tip: 'Press straight overhead', video_url: '' },
  { exercise_id: 'ex_barbell_row', name: 'Barbell Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Develops back thickness', pro_tip: 'Pull to your lower chest', video_url: '' },
  { exercise_id: 'ex_bicep_curl', name: 'Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets the biceps', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_tricep_extension', name: 'Tricep Extension', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets the triceps', pro_tip: 'Control the eccentric phase', video_url: '' },
  { exercise_id: 'ex_squat', name: 'Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'A fundamental leg exercise', pro_tip: 'Keep your back straight', video_url: '' },
  { exercise_id: 'ex_deadlift', name: 'Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'A full body strength exercise', pro_tip: 'Maintain a neutral spine', video_url: '' },
  { exercise_id: 'ex_leg_press', name: 'Leg Press', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Targets quadriceps', pro_tip: 'Don\'t lock your knees', video_url: '' },
  { exercise_id: 'ex_hamstring_curl', name: 'Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Isolates hamstrings', pro_tip: 'Focus on the squeeze', video_url: '' },
  { exercise_id: 'ex_calf_raise', name: 'Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Targets calves', pro_tip: 'Full range of motion', video_url: '' },
  { exercise_id: 'ex_incline_dumbbell_press', name: 'Incline Dumbbell Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets upper chest', pro_tip: 'Control the descent', video_url: '' },
  { exercise_id: 'ex_seated_cable_row', name: 'Seated Cable Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets back thickness', pro_tip: 'Pull with your elbows', video_url: '' },
  { exercise_id: 'ex_lateral_raise', name: 'Lateral Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets side deltoids', pro_tip: 'Lead with elbows', video_url: '' },
  { exercise_id: 'ex_face_pull', name: 'Face Pull', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids and traps', pro_tip: 'Pull towards your face', video_url: '' },
  { exercise_id: 'ex_tricep_pushdown', name: 'Tricep Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps', pro_tip: 'Keep elbows stationary', video_url: '' },
  { exercise_id: 'ex_hammer_curl', name: 'Hammer Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps and forearms', pro_tip: 'Keep palms facing each other', video_url: '' },
  { exercise_id: 'ex_romanian_deadlift', name: 'Romanian Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Targets hamstrings and glutes', pro_tip: 'Maintain a slight bend in knees', video_url: '' },
  { exercise_id: 'ex_leg_extension', name: 'Leg Extension', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Isolates quadriceps', pro_tip: 'Control the movement', video_url: '' },
  { exercise_id: 'ex_lunges', name: 'Lunges', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Targets quads, glutes, and hamstrings', pro_tip: 'Keep front knee behind toes', video_url: '' },
  { exercise_id: 'ex_glute_bridge', name: 'Glute Bridge', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Activates glutes', pro_tip: 'Squeeze glutes at the top', video_url: '' },
  { exercise_id: 'ex_standing_calf_raise', name: 'Standing Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Targets calves', pro_tip: 'Go for a full stretch', video_url: '' },
  { exercise_id: 'ex_pull_up', name: 'Pull-up', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'A great back and bicep exercise', pro_tip: 'Engage your lats', video_url: '' },
  { exercise_id: 'ex_plank', name: 'Plank', main_muscle: 'Core', type: 'timed', category: null, description: 'Strengthens core muscles', pro_tip: 'Keep your body in a straight line', video_url: '' },
  { exercise_id: 'ex_side_plank', name: 'Side Plank', main_muscle: 'Core', type: 'timed', category: null, description: 'Targets obliques and core stability', pro_tip: 'Keep hips lifted and body straight', video_url: '' },
  { exercise_id: 'ex_crunches', name: 'Crunches', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets upper abs', pro_tip: 'Focus on controlled movement', video_url: '' },
  { exercise_id: 'ex_russian_twists', name: 'Russian Twists', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets obliques', pro_tip: 'Rotate from your core', video_url: '' },
  { exercise_id: 'ex_burpees', name: 'Burpees', main_muscle: 'Full Body', type: 'timed', category: null, description: 'A full-body cardio and strength exercise', pro_tip: 'Maintain a consistent pace', video_url: '' },
  { exercise_id: 'ex_jumping_jacks', name: 'Jumping Jacks', main_muscle: 'Full Body', type: 'timed', category: null, description: 'A classic cardio warm-up exercise', pro_tip: 'Maintain a steady rhythm', video_url: '' },
  { exercise_id: 'ex_wall_sit', name: 'Wall Sit', main_muscle: 'Quadriceps', type: 'timed', category: null, description: 'Strengthens quadriceps isometrically', pro_tip: 'Keep back flat against the wall', video_url: '' },
  { exercise_id: 'ex_push_ups', name: 'Push-ups', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'A fundamental bodyweight chest exercise', pro_tip: 'Keep core tight and body straight', video_url: '' },
  { exercise_id: 'ex_dips', name: 'Dips', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps and lower chest', pro_tip: 'Control the descent', video_url: '' },
  { exercise_id: 'ex_box_jumps', name: 'Box Jumps', main_muscle: 'Quadriceps', type: 'timed', category: null, description: 'Explosive leg exercise', pro_tip: 'Land softly and absorb impact', video_url: '' },
  { exercise_id: 'ex_kettlebell_swings', name: 'Kettlebell Swings', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Develops explosive power in hips and glutes', pro_tip: 'Hinge at the hips, not squat', video_url: '' },
];

// Hardcoded data from workout_structure.csv
const workoutStructureData: WorkoutStructureEntry[] = [
  { exercise_id: 'ex_bench_press', workout_split: 'ulul', workout_name: 'Upper Body A', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_overhead_press', workout_split: 'ulul', workout_name: 'Upper Body A', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_barbell_row', workout_split: 'ulul', workout_name: 'Upper Body A', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_bicep_curl', workout_split: 'ulul', workout_name: 'Upper Body A', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_tricep_extension', workout_split: 'ulul', workout_name: 'Upper Body A', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_squat', workout_split: 'ulul', workout_name: 'Lower Body A', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_deadlift', workout_split: 'ulul', workout_name: 'Lower Body A', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_leg_press', workout_split: 'ulul', workout_name: 'Lower Body A', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_hamstring_curl', workout_split: 'ulul', workout_name: 'Lower Body A', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_calf_raise', workout_split: 'ulul', workout_name: 'Lower Body A', min_session_minutes: 45, bonus_for_time_group: null },
  { exercise_id: 'ex_incline_dumbbell_press', workout_split: 'ulul', workout_name: 'Upper Body B', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_seated_cable_row', workout_split: 'ulul', workout_name: 'Upper Body B', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_lateral_raise', workout_split: 'ulul', workout_name: 'Upper Body B', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_face_pull', workout_split: 'ulul', workout_name: 'Upper Body B', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_tricep_pushdown', workout_split: 'ulul', workout_name: 'Upper Body B', min_session_minutes: 45, bonus_for_time_group: null },
  { exercise_id: 'ex_hammer_curl', workout_split: 'ulul', workout_name: 'Upper Body B', min_session_minutes: 45, bonus_for_time_group: null },
  { exercise_id: 'ex_romanian_deadlift', workout_split: 'ulul', workout_name: 'Lower Body B', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_leg_extension', workout_split: 'ulul', workout_name: 'Lower Body B', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_lunges', workout_split: 'ulul', workout_name: 'Lower Body B', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_glute_bridge', workout_split: 'ulul', workout_name: 'Lower Body B', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_standing_calf_raise', workout_split: 'ulul', workout_name: 'Lower Body B', min_session_minutes: 45, bonus_for_time_group: null },
  { exercise_id: 'ex_bench_press', workout_split: 'ppl', workout_name: 'Push', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_overhead_press', workout_split: 'ppl', workout_name: 'Push', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_tricep_pushdown', workout_split: 'ppl', workout_name: 'Push', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_lateral_raise', workout_split: 'ppl', workout_name: 'Push', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_pull_up', workout_split: 'ppl', workout_name: 'Pull', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_barbell_row', workout_split: 'ppl', workout_name: 'Pull', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_face_pull', workout_split: 'ppl', workout_name: 'Pull', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_bicep_curl', workout_split: 'ppl', workout_name: 'Pull', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_squat', workout_split: 'ppl', workout_name: 'Legs', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_deadlift', workout_split: 'ppl', workout_name: 'Legs', min_session_minutes: 15, bonus_for_time_group: null },
  { exercise_id: 'ex_leg_press', workout_split: 'ppl', workout_name: 'Legs', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_hamstring_curl', workout_split: 'ppl', workout_name: 'Legs', min_session_minutes: 30, bonus_for_time_group: null },
  { exercise_id: 'ex_calf_raise', workout_split: 'ppl', workout_name: 'Legs', min_session_minutes: 45, bonus_for_time_group: null },
  { exercise_id: 'ex_plank', workout_split: 'ulul', workout_name: 'Upper Body A', min_session_minutes: null, bonus_for_time_group: 15 },
  { exercise_id: 'ex_side_plank', workout_split: 'ulul', workout_name: 'Upper Body A', min_session_minutes: null, bonus_for_time_group: 30 },
  { exercise_id: 'ex_crunches', workout_split: 'ulul', workout_name: 'Upper Body A', min_session_minutes: null, bonus_for_time_group: 45 },
  { exercise_id: 'ex_russian_twists', workout_split: 'ulul', workout_name: 'Lower Body A', min_session_minutes: null, bonus_for_time_group: 15 },
  { exercise_id: 'ex_burpees', workout_split: 'ulul', workout_name: 'Lower Body A', min_session_minutes: null, bonus_for_time_group: 30 },
  { exercise_id: 'ex_jumping_jacks', workout_split: 'ulul', workout_name: 'Lower Body A', min_session_minutes: null, bonus_for_time_group: 45 },
  { exercise_id: 'ex_wall_sit', workout_split: 'ulul', workout_name: 'Upper Body B', min_session_minutes: null, bonus_for_time_group: 15 },
  { exercise_id: 'ex_push_ups', workout_split: 'ulul', workout_name: 'Upper Body B', min_session_minutes: null, bonus_for_time_group: 30 },
  { exercise_id: 'ex_dips', workout_split: 'ulul', workout_name: 'Upper Body B', min_session_minutes: null, bonus_for_time_group: 45 },
  { exercise_id: 'ex_box_jumps', workout_split: 'ulul', workout_name: 'Lower Body B', min_session_minutes: null, bonus_for_time_group: 15 },
  { exercise_id: 'ex_kettlebell_swings', workout_split: 'ulul', workout_name: 'Lower Body B', min_session_minutes: null, bonus_for_time_group: 30 },
  { exercise_id: 'ex_plank', workout_split: 'ppl', workout_name: 'Push', min_session_minutes: null, bonus_for_time_group: 15 },
  { exercise_id: 'ex_side_plank', workout_split: 'ppl', workout_name: 'Push', min_session_minutes: null, bonus_for_time_group: 30 },
  { exercise_id: 'ex_crunches', workout_split: 'ppl', workout_name: 'Push', min_session_minutes: null, bonus_for_time_group: 45 },
  { exercise_id: 'ex_russian_twists', workout_split: 'ppl', workout_name: 'Pull', min_session_minutes: null, bonus_for_time_group: 15 },
  { exercise_id: 'ex_burpees', workout_split: 'ppl', workout_name: 'Pull', min_session_minutes: null, bonus_for_time_group: 30 },
  { exercise_id: 'ex_jumping_jacks', workout_split: 'ppl', workout_name: 'Pull', min_session_minutes: null, bonus_for_time_group: 45 },
  { exercise_id: 'ex_wall_sit', workout_split: 'ppl', workout_name: 'Legs', min_session_minutes: null, bonus_for_time_group: 15 },
  { exercise_id: 'ex_push_ups', workout_split: 'ppl', workout_name: 'Legs', min_session_minutes: null, bonus_for_time_group: 30 },
  { exercise_id: 'ex_dips', workout_split: 'ppl', workout_name: 'Legs', min_session_minutes: null, bonus_for_time_group: 45 },
  { exercise_id: 'ex_box_jumps', workout_split: 'ppl', workout_name: 'Legs', min_session_minutes: null, bonus_for_time_group: 60 },
  { exercise_id: 'ex_kettlebell_swings', workout_split: 'ppl', workout_name: 'Legs', min_session_minutes: null, bonus_for_time_group: 60 },
];

// Helper to get max minutes from sessionLength string
function getMaxMinutes(sessionLength: string): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90; // Default to longest if unknown
  }
}

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
      console.error('Unauthorized: No user session found.');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { tPathId } = await req.json();
    console.log(`Received request to generate T-Path workouts for tPathId: ${tPathId} for user: ${user.id}`);

    // --- Step 1: Ensure exercise_definitions are populated from exerciseLibraryData ---
    console.log('Ensuring default exercise definitions are up-to-date...');
    for (const ex of exerciseLibraryData) {
      const { error: upsertError } = await supabaseServiceRoleClient
        .from('exercise_definitions')
        .upsert({
          library_id: ex.exercise_id, // Use library_id for upserting default exercises
          name: ex.name,
          main_muscle: ex.main_muscle,
          type: ex.type,
          category: ex.category,
          description: ex.description,
          pro_tip: ex.pro_tip,
          video_url: ex.video_url,
          user_id: null // Mark as default exercise
        }, { onConflict: 'library_id' }); // Conflict on library_id to update existing defaults

      if (upsertError) {
        console.error(`Error upserting exercise definition ${ex.name}:`, upsertError.message);
        throw upsertError;
      }
    }
    console.log('Default exercise definitions ensured.');

    // --- Step 2: Ensure workout_exercise_structure is populated from workoutStructureData ---
    console.log('Ensuring workout exercise structure is up-to-date...');
    for (const ws of workoutStructureData) {
      const { error: upsertError } = await supabaseServiceRoleClient
        .from('workout_exercise_structure')
        .upsert({
          exercise_library_id: ws.exercise_id,
          workout_split: ws.workout_split,
          workout_name: ws.workout_name,
          min_session_minutes: ws.min_session_minutes,
          bonus_for_time_group: ws.bonus_for_time_group,
        }, { onConflict: 'exercise_library_id,workout_split,workout_name' }); // Composite unique key

      if (upsertError) {
        console.error(`Error upserting workout structure entry for ${ws.exercise_id} in ${ws.workout_name}:`, upsertError.message);
        throw upsertError;
      }
    }
    console.log('Workout exercise structure ensured.');

    // --- Step 3: Fetch T-Path details and generate user-specific workouts ---
    let tPath;
    try {
      const { data, error } = await supabaseServiceRoleClient
        .from('t_paths')
        .select('id, template_name, settings')
        .eq('id', tPathId)
        .single();

      if (error) {
        console.error(`Error fetching T-Path with ID ${tPathId}:`, error.message);
        throw error;
      }
      if (!data) {
        console.error(`T-Path with ID ${tPathId} not found in database.`);
        throw new Error('T-Path not found in database.');
      }
      tPath = data;
      console.log(`Fetched T-Path: ${tPath.template_name} (ID: ${tPath.id})`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Error in initial T-Path fetch: ${errorMessage}`);
      return new Response(JSON.stringify({ error: `Error fetching T-Path: ${errorMessage}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tPathSettings = tPath.settings as { tPathType?: string; sessionLength?: string };
    if (!tPathSettings || !tPathSettings.tPathType || !tPathSettings.sessionLength) {
      console.warn('T-Path settings or tPathType/sessionLength is missing/invalid:', tPathSettings);
      return new Response(JSON.stringify({ error: 'Invalid T-Path settings. Please re-run onboarding.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const workoutSplit = tPathSettings.tPathType;
    const maxAllowedMinutes = getMaxMinutes(tPathSettings.sessionLength);
    console.log(`Generating workouts for split: ${workoutSplit}, max minutes: ${maxAllowedMinutes}`);

    let workoutNames: string[] = [];
    if (workoutSplit === 'ulul') {
      workoutNames = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
    } else if (workoutSplit === 'ppl') {
      workoutNames = ['Push', 'Pull', 'Legs'];
    } else {
      console.warn('Unknown workout split type:', workoutSplit);
      return new Response(JSON.stringify({ error: 'Unknown workout split type.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Cleanup existing child workouts for this T-Path ---
    console.log(`Starting cleanup of existing child workouts for parent T-Path ID: ${tPath.id}`);
    const { data: existingChildWorkouts, error: fetchChildWorkoutsError } = await supabaseServiceRoleClient
      .from('t_paths')
      .select('id')
      .eq('user_id', tPath.id) // Child workouts are linked to parent T-Path ID
      .eq('is_bonus', true); // Only delete child workouts

    if (fetchChildWorkoutsError) {
      console.error('Error fetching existing child workouts for cleanup:', fetchChildWorkoutsError.message);
      throw fetchChildWorkoutsError;
    }

    if (existingChildWorkouts && existingChildWorkouts.length > 0) {
      const childWorkoutIdsToDelete = existingChildWorkouts.map((w: { id: string }) => w.id);
      console.log(`Found ${childWorkoutIdsToDelete.length} child workouts to delete.`);

      // Delete associated t_path_exercises first
      const { error: deleteTPathExercisesError } = await supabaseServiceRoleClient
        .from('t_path_exercises')
        .delete()
        .in('template_id', childWorkoutIdsToDelete);
      if (deleteTPathExercisesError) {
        console.error('Error deleting t_path_exercises for child workouts:', deleteTPathExercisesError.message);
        throw deleteTPathExercisesError;
      }
      console.log(`Deleted t_path_exercises for ${childWorkoutIdsToDelete.length} child workouts.`);

      // Then delete the child workouts themselves
      const { error: deleteWorkoutsError } = await supabaseServiceRoleClient
        .from('t_paths')
        .delete()
        .in('id', childWorkoutIdsToDelete);
      if (deleteWorkoutsError) {
        console.error('Error deleting child workouts:', deleteWorkoutsError.message);
        throw deleteWorkoutsError;
      }
      console.log(`Deleted ${childWorkoutIdsToDelete.length} child workouts.`);
    } else {
      console.log('No existing child workouts found for cleanup.');
    }
    // --- End Cleanup Logic ---

    // Create workouts for this T-Path
    const generatedWorkouts = [];
    console.log('Starting workout creation loop...');
    for (const workoutName of workoutNames) {
      try {
        console.log(`Processing workout: ${workoutName}`);

        // Fetch exercises for the current workout from workout_exercise_structure
        const { data: structureEntries, error: structureError } = await supabaseServiceRoleClient
          .from('workout_exercise_structure')
          .select(`
            *,
            exercise_definitions (
              id, name, main_muscle, type, category, description, pro_tip, video_url
            )
          `)
          .eq('workout_split', workoutSplit)
          .eq('workout_name', workoutName)
          .order('min_session_minutes', { ascending: true, nullsFirst: false }) // Order main exercises first
          .order('bonus_for_time_group', { ascending: true, nullsFirst: false }); // Then bonus exercises

        if (structureError) {
          console.error(`Error fetching workout structure for ${workoutName}:`, structureError.message);
          throw structureError;
        }

        const exercisesToInclude = [];
        let mainExerciseCount = 0;
        let bonusExerciseCount = 0;

        for (const entry of structureEntries || []) {
          const exerciseDef = entry.exercise_definitions;
          if (!exerciseDef || !Array.isArray(exerciseDef) || exerciseDef.length === 0) {
            console.warn(`Exercise definition not found for library_id: ${entry.exercise_library_id}`);
            continue;
          }
          const actualExercise = exerciseDef[0]; // Assuming exercise_definitions is an array of one item due to select syntax

          let isBonus = false;
          let includeExercise = false;

          if (entry.min_session_minutes !== null && entry.bonus_for_time_group === null) {
            // This is a main exercise
            if (entry.min_session_minutes <= maxAllowedMinutes) {
              includeExercise = true;
            }
          } else if (entry.bonus_for_time_group !== null && entry.min_session_minutes === null) {
            // This is a bonus exercise
            isBonus = true;
            if (entry.bonus_for_time_group <= maxAllowedMinutes) {
              includeExercise = true;
            }
          } else {
            console.warn(`Exercise structure entry for ${actualExercise.name} has invalid min_session_minutes/bonus_for_time_group configuration. Skipping.`);
            continue;
          }

          if (includeExercise) {
            exercisesToInclude.push({
              exercise_id: actualExercise.id,
              is_bonus_exercise: isBonus,
              // Keep other exercise details if needed for ordering or display
              order_criteria: isBonus ? entry.bonus_for_time_group : entry.min_session_minutes,
              original_order: exercisesToInclude.length // Preserve original order from CSV for same time group
            });
            if (isBonus) bonusExerciseCount++;
            else mainExerciseCount++;
          }
        }

        // Sort exercises: main exercises first, then bonus exercises, then by their order criteria
        exercisesToInclude.sort((a, b) => {
          if (a.is_bonus_exercise === b.is_bonus_exercise) {
            // If both are main or both are bonus, sort by their time group criteria
            return (a.order_criteria || 0) - (b.order_criteria || 0) || a.original_order - b.original_order;
          }
          // Main exercises (false) come before bonus exercises (true)
          return a.is_bonus_exercise ? 1 : -1;
        });

        console.log(`Workout ${workoutName}: ${mainExerciseCount} main exercises, ${bonusExerciseCount} bonus exercises selected.`);

        if (exercisesToInclude.length === 0) {
          console.warn(`No exercises selected for workout ${workoutName} based on session length ${maxAllowedMinutes}. Skipping workout creation.`);
          continue; // Skip creating this workout if no exercises are selected
        }

        // Insert the child workout (t_paths entry)
        const { data: workout, error: workoutError } = await supabaseServiceRoleClient
          .from('t_paths')
          .insert({
            user_id: tPath.id, // Link child workout to parent T-Path ID
            template_name: workoutName,
            is_bonus: true, // Mark as a child workout
            version: 1,
            settings: tPathSettings // Pass settings to sub-workouts
          })
          .select()
          .single();

        if (workoutError) {
          console.error(`Error inserting workout ${workoutName}:`, workoutError.message);
          throw workoutError;
        }
        if (!workout) {
          console.error(`Insert operation for workout ${workoutName} returned no data.`);
          throw new Error(`Failed to retrieve new workout data for ${workoutName}.`);
        }
        generatedWorkouts.push(workout);
        console.log(`Child workout created: ${workout.template_name} (ID: ${workout.id})`);

        // Insert exercises into t_path_exercises
        const tPathExercisesToInsert = exercisesToInclude.map((ex, i) => ({
          template_id: workout.id,
          exercise_id: ex.exercise_id,
          order_index: i, // Assign new order based on filtered and sorted list
          is_bonus_exercise: ex.is_bonus_exercise,
        }));

        if (tPathExercisesToInsert.length > 0) {
          const { error: insertTPathExercisesError } = await supabaseServiceRoleClient
            .from('t_path_exercises')
            .insert(tPathExercisesToInsert);
          if (insertTPathExercisesError) {
            console.error(`Error inserting t_path_exercises for ${workoutName}:`, insertTPathExercisesError.message);
            throw insertTPathExercisesError;
          }
          console.log(`Inserted ${tPathExercisesToInsert.length} exercises into ${workoutName}`);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error creating workout ${workoutName} or its exercises: ${errorMessage}`);
        return new Response(JSON.stringify({ error: `Error creating workout ${workoutName}: ${errorMessage}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    console.log('Finished workout creation loop.');

    return new Response(
      JSON.stringify({ message: 'T-Path generated successfully', workouts: generatedWorkouts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during T-Path generation.";
    console.error('Unhandled error in generate-t-path edge function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});