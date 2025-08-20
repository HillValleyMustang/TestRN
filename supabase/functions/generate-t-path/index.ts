// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define types for the data we're fetching and inserting
interface ExerciseDef { // Renamed from ExerciseLibraryEntry for clarity in this context
  exercise_id: string; // This is the library_id
  name: string;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
}

interface WorkoutStructureEntry {
  exercise_id: string; // This is the exercise_library_id
  workout_split: string;
  workout_name: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
}

// Hardcoded data from Dyad - Workout Tracker - ExerciseDefinitions - Workout Tracker - ExerciseDefinitions (6).csv
const exerciseLibraryData: ExerciseDef[] = [
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
  { exercise_id: 'ex_rowing_machine', name: 'Rowing Machine', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'Full-body cardio workout', pro_tip: 'Maintain a strong, consistent stroke', video_url: '' },
  { exercise_id: 'ex_elliptical', name: 'Elliptical', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'Low-impact cardio', pro_tip: 'Maintain a steady pace', video_url: '' },
  { exercise_id: 'ex_treadmill_run', name: 'Treadmill Run', main_muscle: 'Legs', type: 'cardio', category: null, description: 'Cardio workout', pro_tip: 'Maintain good running form', video_url: '' },
  { exercise_id: 'ex_yoga', name: 'Yoga', main_muscle: 'Full Body', type: 'flexibility', category: null, description: 'Improves flexibility and balance', pro_tip: 'Focus on breath and alignment', video_url: '' },
  { exercise_id: 'ex_pilates', name: 'Pilates', main_muscle: 'Core', type: 'strength', category: null, description: 'Strengthens core and improves posture', pro_tip: 'Engage your core throughout', video_url: '' },
  { exercise_id: 'ex_zumba', name: 'Zumba', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'Dance fitness class', pro_tip: 'Move with the music', video_url: '' },
  { exercise_id: 'ex_swimming', name: 'Swimming', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'Full-body, low-impact cardio', pro_tip: 'Focus on stroke technique', video_url: '' },
  { exercise_id: 'ex_cycling', name: 'Cycling', main_muscle: 'Legs', type: 'cardio', category: null, description: 'Cardio workout', pro_tip: 'Maintain a consistent cadence', video_url: '' },
  { exercise_id: 'ex_stair_climber', name: 'Stair Climber', main_muscle: 'Legs', type: 'cardio', category: null, description: 'Intense leg and glute workout', pro_tip: 'Maintain upright posture', video_url: '' },
  { exercise_id: 'ex_battle_ropes', name: 'Battle Ropes', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity full-body workout', pro_tip: 'Generate waves from your core', video_url: '' },
  { exercise_id: 'ex_medicine_ball_slams', name: 'Medicine Ball Slams', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Explosive full-body exercise', pro_tip: 'Use your whole body to slam the ball', video_url: '' },
  { exercise_id: 'ex_box_squats', name: 'Box Squats', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squatting to a box for depth control', pro_tip: 'Sit back onto the box, not down', video_url: '' },
  { exercise_id: 'ex_goblet_squat', name: 'Goblet Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Beginner-friendly squat variation', pro_tip: 'Keep elbows inside knees', video_url: '' },
  { exercise_id: 'ex_sumo_deadlift', name: 'Sumo Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Deadlift variation with wider stance', pro_tip: 'Push knees out, keep chest up', video_url: '' },
  { exercise_id: 'ex_good_mornings', name: 'Good Mornings', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Targets hamstrings and lower back', pro_tip: 'Maintain a slight bend in knees', video_url: '' },
  { exercise_id: 'ex_reverse_hyperextension', name: 'Reverse Hyperextension', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Targets glutes and hamstrings', pro_tip: 'Squeeze glutes at the top', video_url: '' },
  { exercise_id: 'ex_hip_thrust', name: 'Hip Thrust', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Excellent for glute development', pro_tip: 'Drive through your heels', video_url: '' },
  { exercise_id: 'ex_cable_fly', name: 'Cable Fly', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Isolates chest muscles', pro_tip: 'Squeeze chest at the top', video_url: '' },
  { exercise_id: 'ex_pec_deck_fly', name: 'Pec Deck Fly', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Machine-based chest isolation', pro_tip: 'Focus on the squeeze', video_url: '' },
  { exercise_id: 'ex_dumbbell_pullover', name: 'Dumbbell Pullover', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Expands rib cage and targets lats', pro_tip: 'Control the stretch', video_url: '' },
  { exercise_id: 'ex_straight_arm_pulldown', name: 'Straight Arm Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Isolates lats', pro_tip: 'Keep arms straight', video_url: '' },
  { exercise_id: 'ex_arnold_press', name: 'Arnold Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Shoulder press variation', pro_tip: 'Rotate dumbbells as you press', video_url: '' },
  { exercise_id: 'ex_front_raise', name: 'Front Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets front deltoids', pro_tip: 'Avoid swinging', video_url: '' },
  { exercise_id: 'ex_cable_lateral_raise', name: 'Cable Lateral Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets side deltoids with cable', pro_tip: 'Lead with elbows', video_url: '' },
  { exercise_id: 'ex_machine_lateral_raise', name: 'Machine Lateral Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Machine-based side deltoid isolation', pro_tip: 'Focus on the squeeze', video_url: '' },
  { exercise_id: 'ex_overhead_tricep_extension', name: 'Overhead Tricep Extension', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets long head of triceps', pro_tip: 'Keep elbows close to head', video_url: '' },
  { exercise_id: 'ex_skullcrushers', name: 'Skullcrushers', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps', pro_tip: 'Lower the bar towards your forehead', video_url: '' },
  { exercise_id: 'ex_concentration_curl', name: 'Concentration Curl', main_muscle: 'Biceps', type: 'weight', category: 'Unilateral', description: 'Isolates biceps', pro_tip: 'Keep elbow stable against thigh', video_url: '' },
  { exercise_id: 'ex_preacher_curl', name: 'Preacher Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Isolates biceps', pro_tip: 'Maintain constant tension', video_url: '' },
  { exercise_id: 'ex_wrist_curl', name: 'Wrist Curl', main_muscle: 'Forearms', type: 'weight', category: 'Bilateral', description: 'Targets forearm flexors', pro_tip: 'Use a full range of motion', video_url: '' },
  { exercise_id: 'ex_reverse_wrist_curl', name: 'Reverse Wrist Curl', main_muscle: 'Forearms', type: 'weight', category: 'Bilateral', description: 'Targets forearm extensors', pro_tip: 'Control the movement', video_url: '' },
  { exercise_id: 'ex_crunches_machine', name: 'Crunches Machine', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Machine-based abdominal exercise', pro_tip: 'Focus on contracting your abs', video_url: '' },
  { exercise_id: 'ex_leg_raises', name: 'Leg Raises', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets lower abs', pro_tip: 'Keep lower back pressed to the floor', video_url: '' },
  { exercise_id: 'ex_hanging_leg_raises', name: 'Hanging Leg Raises', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Advanced lower abs exercise', pro_tip: 'Control the descent', video_url: '' },
  { exercise_id: 'ex_cable_crunches', name: 'Cable Crunches', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets abs with resistance', pro_tip: 'Crunch from your core', video_url: '' },
  { exercise_id: 'ex_wood_chops', name: 'Wood Chops', main_muscle: 'Core', type: 'weight', category: 'Bilateral', description: 'Targets obliques and rotational strength', pro_tip: 'Rotate from your torso', video_url: '' },
  { exercise_id: 'ex_farmers_walk', name: 'Farmers Walk', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Improves grip strength and core stability', pro_tip: 'Maintain upright posture', video_url: '' },
  { exercise_id: 'ex_sled_push', name: 'Sled Push', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Develops leg and pushing power', pro_tip: 'Stay low and drive through legs', video_url: '' },
  { exercise_id: 'ex_tire_flips', name: 'Tire Flips', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Explosive full-body exercise', pro_tip: 'Lift with your legs, not your back', video_url: '' },
  { exercise_id: 'ex_sprint', name: 'Sprint', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity running', pro_tip: 'Focus on powerful strides', video_url: '' },
  { exercise_id: 'ex_jump_rope', name: 'Jump Rope', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'Cardio and coordination', pro_tip: 'Maintain a steady rhythm', video_url: '' },
  { exercise_id: 'ex_burpee_box_jumps', name: 'Burpee Box Jumps', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Combines burpee with box jump', pro_tip: 'Explode up onto the box', video_url: '' },
  { exercise_id: 'ex_mountain_climbers', name: 'Mountain Climbers', main_muscle: 'Core', type: 'timed', category: null, description: 'Core and cardio exercise', pro_tip: 'Keep hips low and core tight', video_url: '' },
  { exercise_id: 'ex_high_knees', name: 'High Knees', main_muscle: 'Legs', type: 'timed', category: null, description: 'Cardio and leg exercise', pro_tip: 'Drive knees up towards chest', video_url: '' },
  { exercise_id: 'ex_butt_kicks', name: 'Butt Kicks', main_muscle: 'Legs', type: 'timed', category: null, description: 'Cardio and hamstring warm-up', pro_tip: 'Bring heels towards glutes', video_url: '' },
  { exercise_id: 'ex_bear_crawl', name: 'Bear Crawl', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Full-body coordination and strength', pro_tip: 'Keep back flat and core engaged', video_url: '' },
  { exercise_id: 'ex_crab_walk', name: 'Crab Walk', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Full-body coordination and strength', pro_tip: 'Keep hips lifted', video_url: '' },
  { exercise_id: 'ex_superman', name: 'Superman', main_muscle: 'Back', type: 'timed', category: null, description: 'Strengthens lower back and glutes', pro_tip: 'Lift arms and legs simultaneously', video_url: '' },
  { exercise_id: 'ex_bird_dog', name: 'Bird Dog', main_muscle: 'Core', type: 'timed', category: null, description: 'Improves core stability and balance', pro_tip: 'Keep core tight and avoid rocking', video_url: '' },
  { exercise_id: 'ex_hollow_body_hold', name: 'Hollow Body Hold', main_muscle: 'Core', type: 'timed', category: null, description: 'Strengthens entire core', pro_tip: 'Keep lower back pressed to floor', video_url: '' },
  { exercise_id: 'ex_l_sit', name: 'L-Sit', main_muscle: 'Core', type: 'timed', category: null, description: 'Advanced core and upper body strength', pro_tip: 'Keep legs straight and parallel to floor', video_url: '' },
  { exercise_id: 'ex_handstand_hold', name: 'Handstand Hold', main_muscle: 'Shoulders', type: 'timed', category: null, description: 'Shoulder strength and balance', pro_tip: 'Keep body straight and core tight', video_url: '' },
  { exercise_id: 'ex_pistol_squat', name: 'Pistol Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Advanced single-leg squat', pro_tip: 'Maintain balance and control', video_url: '' },
  { exercise_id: 'ex_bulgarian_split_squat', name: 'Bulgarian Split Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Targets quads, glutes, and hamstrings', pro_tip: 'Keep torso upright', video_url: '' },
  { exercise_id: 'ex_single_leg_deadlift', name: 'Single Leg Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Unilateral', description: 'Improves balance and targets hamstrings', pro_tip: 'Keep back straight, hinge at hip', video_url: '' },
  { exercise_id: 'ex_single_arm_dumbbell_row', name: 'Single Arm Dumbbell Row', main_muscle: 'Lats', type: 'weight', category: 'Unilateral', description: 'Targets lats unilaterally', pro_tip: 'Keep back flat and stable', video_url: '' },
  { exercise_id: 'ex_single_arm_overhead_press', name: 'Single Arm Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Unilateral', description: 'Targets shoulders unilaterally', pro_tip: 'Brace core for stability', video_url: '' },
  { exercise_id: 'ex_single_arm_bench_press', name: 'Single Arm Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Unilateral', description: 'Targets chest unilaterally', pro_tip: 'Control the dumbbell', video_url: '' },
  { exercise_id: 'ex_single_arm_tricep_extension', name: 'Single Arm Tricep Extension', main_muscle: 'Triceps', type: 'weight', category: 'Unilateral', description: 'Targets triceps unilaterally', pro_tip: 'Keep elbow stable', video_url: '' },
  { exercise_id: 'ex_single_arm_bicep_curl', name: 'Single Arm Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Unilateral', description: 'Targets biceps unilaterally', pro_tip: 'Control the movement', video_url: '' },
  { exercise_id: 'ex_cable_wood_chop', name: 'Cable Wood Chop', main_muscle: 'Core', type: 'weight', category: 'Unilateral', description: 'Targets obliques and rotational strength', pro_tip: 'Rotate from your torso', video_url: '' },
  { exercise_id: 'ex_landmine_press', name: 'Landmine Press', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Pressing exercise with unique arc', pro_tip: 'Drive through your hips', video_url: '' },
  { exercise_id: 'ex_goblet_lunge', name: 'Goblet Lunge', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Lunge variation with goblet hold', pro_tip: 'Maintain upright posture', video_url: '' },
  { exercise_id: 'ex_reverse_lunge', name: 'Reverse Lunge', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Lunge variation stepping backward', pro_tip: 'Step back, keep front knee stable', video_url: '' },
  { exercise_id: 'ex_walking_lunge', name: 'Walking Lunge', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Dynamic lunge variation', pro_tip: 'Maintain balance throughout', video_url: '' },
  { exercise_id: 'ex_step_ups', name: 'Step-ups', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Targets legs and glutes', pro_tip: 'Drive through the heel of the stepping foot', video_url: '' },
  { exercise_id: 'ex_good_morning_machine', name: 'Good Morning Machine', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Machine-based hamstring exercise', pro_tip: 'Focus on hip hinge', video_url: '' },
  { exercise_id: 'ex_hyperextension', name: 'Hyperextension', main_muscle: 'Lower Back', type: 'weight', category: 'Bilateral', description: 'Strengthens lower back and glutes', pro_tip: 'Control the movement', video_url: '' },
  { exercise_id: 'ex_reverse_crunch', name: 'Reverse Crunch', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets lower abs', pro_tip: 'Lift hips off the floor', video_url: '' },
  { exercise_id: 'ex_bicycle_crunches', name: 'Bicycle Crunches', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets obliques and abs', pro_tip: 'Bring elbow to opposite knee', video_url: '' },
  { exercise_id: 'ex_ab_rollout', name: 'Ab Rollout', main_muscle: 'Core', type: 'weight', category: 'Bilateral', description: 'Advanced core exercise', pro_tip: 'Keep core tight, avoid arching back', video_url: '' },
  { exercise_id: 'ex_cable_pull_through', name: 'Cable Pull-Through', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Targets glutes and hamstrings', pro_tip: 'Hinge at the hips', video_url: '' },
  { exercise_id: 'ex_glute_kickback', name: 'Glute Kickback', main_muscle: 'Glutes', type: 'weight', category: 'Unilateral', description: 'Isolates glutes', pro_tip: 'Squeeze glute at the top', video_url: '' },
  { exercise_id: 'ex_machine_row', name: 'Machine Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Machine-based back exercise', pro_tip: 'Pull with your back muscles', video_url: '' },
  { exercise_id: 'ex_lat_pulldown', name: 'Lat Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets lats', pro_tip: 'Pull bar to upper chest', video_url: '' },
  { exercise_id: 'ex_t_bar_row', name: 'T-Bar Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets back thickness', pro_tip: 'Keep chest up', video_url: '' },
  { exercise_id: 'ex_reverse_fly', name: 'Reverse Fly', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids', pro_tip: 'Squeeze shoulder blades together', video_url: '' },
  { exercise_id: 'ex_shrugs', name: 'Shrugs', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Targets upper traps', pro_tip: 'Shrug shoulders towards ears', video_url: '' },
  { exercise_id: 'ex_upright_row', name: 'Upright Row', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets deltoids and traps', pro_tip: 'Pull bar to chin level', video_url: '' },
  { exercise_id: 'ex_close_grip_bench_press', name: 'Close Grip Bench Press', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_push_press', name: 'Push Press', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Explosive shoulder exercise', pro_tip: 'Use leg drive to assist press', video_url: '' },
  { exercise_id: 'ex_clean_and_jerk', name: 'Clean and Jerk', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Olympic lift for full-body power', pro_tip: 'Focus on technique and explosiveness', video_url: '' },
  { exercise_id: 'ex_snatch', name: 'Snatch', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Olympic lift for full-body power', pro_tip: 'Fast and explosive movement', video_url: '' },
  { exercise_id: 'ex_thruster', name: 'Thruster', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Combines front squat and overhead press', pro_tip: 'Smooth transition between movements', video_url: '' },
  { exercise_id: 'ex_power_clean', name: 'Power Clean', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Explosive full-body exercise', pro_tip: 'Pull bar high, catch in partial squat', video_url: '' },
  { exercise_id: 'ex_sumo_squat', name: 'Sumo Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squat variation with wider stance', pro_tip: 'Keep chest up, knees out', video_url: '' },
  { exercise_id: 'ex_front_squat', name: 'Front Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squat variation with bar on front shoulders', pro_tip: 'Keep elbows high, chest up', video_url: '' },
  { exercise_id: 'ex_overhead_squat', name: 'Overhead Squat', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Advanced full-body exercise', pro_tip: 'Maintain overhead stability', video_url: '' },
  { exercise_id: 'ex_sissy_squat', name: 'Sissy Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Targets quads with emphasis on knee flexion', pro_tip: 'Keep body in a straight line', video_url: '' },
  { exercise_id: 'ex_hack_squat', name: 'Hack Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Machine-based squat', pro_tip: 'Focus on quad isolation', video_url: '' },
  { exercise_id: 'ex_belt_squat', name: 'Belt Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squat variation with weight at hips', pro_tip: 'Good for spinal decompression', video_url: '' },
  { exercise_id: 'ex_zercher_squat', name: 'Zercher Squat', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Squat variation with bar in elbow crease', pro_tip: 'Keep chest up, elbows tucked', video_url: '' },
  { exercise_id: 'ex_pause_squat', name: 'Pause Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squat with a pause at the bottom', pro_tip: 'Improves strength out of the hole', video_url: '' },
  { exercise_id: 'ex_pin_squat', name: 'Pin Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squatting to pins for depth control', pro_tip: 'Explode off the pins', video_url: '' },
  { exercise_id: 'ex_deficit_deadlift', name: 'Deficit Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Deadlift from elevated surface', pro_tip: 'Increases range of motion', video_url: '' },
  { exercise_id: 'ex_rack_pull', name: 'Rack Pull', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Partial deadlift from pins', pro_tip: 'Focus on upper back strength', video_url: '' },
  { exercise_id: 'ex_snatch_grip_deadlift', name: 'Snatch Grip Deadlift', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Deadlift with wide grip', pro_tip: 'Targets upper back and traps', video_url: '' },
  { exercise_id: 'ex_sumo_deadlift_high_pull', name: 'Sumo Deadlift High Pull', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Combines sumo deadlift with upright row', pro_tip: 'Explosive movement', video_url: '' },
  { exercise_id: 'ex_good_morning_barbell', name: 'Good Morning Barbell', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Targets hamstrings and lower back', pro_tip: 'Maintain a neutral spine', video_url: '' },
  { exercise_id: 'ex_reverse_hyper_machine', name: 'Reverse Hyper Machine', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Machine-based glute/hamstring exercise', pro_tip: 'Squeeze glutes at the top', video_url: '' },
  { exercise_id: 'ex_glute_ham_raise', name: 'Glute Ham Raise', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Targets hamstrings and glutes', pro_tip: 'Control the eccentric phase', video_url: '' },
  { exercise_id: 'ex_back_extension', name: 'Back Extension', main_muscle: 'Lower Back', type: 'weight', category: 'Bilateral', description: 'Strengthens lower back', pro_tip: 'Control the movement', video_url: '' },
  { exercise_id: 'ex_reverse_grip_bench_press', name: 'Reverse Grip Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets upper chest and triceps', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_floor_press', name: 'Floor Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Bench press variation from the floor', pro_tip: 'Good for lockout strength', video_url: '' },
  { exercise_id: 'ex_dumbbell_bench_press', name: 'Dumbbell Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets chest with dumbbells', pro_tip: 'Allows for greater range of motion', video_url: '' },
  { exercise_id: 'ex_incline_bench_press', name: 'Incline Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets upper chest', pro_tip: 'Control the descent', video_url: '' },
  { exercise_id: 'ex_decline_bench_press', name: 'Decline Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets lower chest', pro_tip: 'Keep feet secure', video_url: '' },
  { exercise_id: 'ex_push_up_variations', name: 'Push-up Variations', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Various push-up styles', pro_tip: 'Maintain good form', video_url: '' },
  { exercise_id: 'ex_dips_weighted', name: 'Dips Weighted', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Weighted dips for progression', pro_tip: 'Control the descent', video_url: '' },
  { exercise_id: 'ex_close_grip_push_up', name: 'Close Grip Push-up', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with narrow hand placement', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_diamond_push_up', name: 'Diamond Push-up', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with diamond hand placement', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_overhead_dumbbell_extension', name: 'Overhead Dumbbell Extension', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps', pro_tip: 'Keep elbows close to head', video_url: '' },
  { exercise_id: 'ex_cable_tricep_extension', name: 'Cable Tricep Extension', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with cable', pro_tip: 'Maintain constant tension', video_url: '' },
  { exercise_id: 'ex_reverse_grip_tricep_pushdown', name: 'Reverse Grip Tricep Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with reverse grip', pro_tip: 'Squeeze triceps at the bottom', video_url: '' },
  { exercise_id: 'ex_tricep_kickback', name: 'Tricep Kickback', main_muscle: 'Triceps', type: 'weight', category: 'Unilateral', description: 'Isolates triceps', pro_tip: 'Keep elbow stationary', video_url: '' },
  { exercise_id: 'ex_barbell_curl', name: 'Barbell Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_dumbbell_curl', name: 'Dumbbell Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps with dumbbells', pro_tip: 'Rotate palms up as you curl', video_url: '' },
  { exercise_id: 'ex_incline_dumbbell_curl', name: 'Incline Dumbbell Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps with stretch', pro_tip: 'Keep back flat', video_url: '' },
  { exercise_id: 'ex_spider_curl', name: 'Spider Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Isolates biceps', pro_tip: 'Keep chest on bench', video_url: '' },
  { exercise_id: 'ex_cable_curl', name: 'Cable Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps with cable', pro_tip: 'Maintain constant tension', video_url: '' },
  { exercise_id: 'ex_reverse_curl', name: 'Reverse Curl', main_muscle: 'Forearms', type: 'weight', category: 'Bilateral', description: 'Targets forearms and brachialis', pro_tip: 'Keep wrists straight', video_url: '' },
  { exercise_id: 'ex_zottman_curl', name: 'Zottman Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps and forearms', pro_tip: 'Rotate palms down on descent', video_url: '' },
  { exercise_id: 'ex_chin_up', name: 'Chin-up', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets lats and biceps', pro_tip: 'Pull chest to bar', video_url: '' },
  { exercise_id: 'ex_inverted_row', name: 'Inverted Row', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Bodyweight back exercise', pro_tip: 'Keep body straight', video_url: '' },
  { exercise_id: 'ex_dumbbell_row', name: 'Dumbbell Row', main_muscle: 'Lats', type: 'weight', category: 'Unilateral', description: 'Targets lats unilaterally', pro_tip: 'Keep back flat and stable', video_url: '' },
  { exercise_id: 'ex_chest_supported_row', name: 'Chest Supported Row', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Targets back with support', pro_tip: 'Avoid using momentum', video_url: '' },
  { exercise_id: 'ex_pendlay_row', name: 'Pendlay Row', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Explosive barbell row', pro_tip: 'Return bar to floor after each rep', video_url: '' },
  { exercise_id: 'ex_seal_row', name: 'Seal Row', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Targets back with full isolation', pro_tip: 'Lie face down on bench', video_url: '' },
  { exercise_id: 'ex_single_arm_lat_pulldown', name: 'Single Arm Lat Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Unilateral', description: 'Targets lats unilaterally', pro_tip: 'Focus on contraction', video_url: '' },
  { exercise_id: 'ex_reverse_grip_pulldown', name: 'Reverse Grip Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets lats and biceps', pro_tip: 'Pull bar to upper chest', video_url: '' },
  { exercise_id: 'ex_wide_grip_pulldown', name: 'Wide Grip Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets outer lats', pro_tip: 'Pull bar to upper chest', video_url: '' },
  { exercise_id: 'ex_close_grip_pulldown', name: 'Close Grip Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets inner lats', pro_tip: 'Pull bar to upper chest', video_url: '' },
  { exercise_id: 'ex_machine_pullover', name: 'Machine Pullover', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Machine-based lat isolation', pro_tip: 'Focus on the stretch', video_url: '' },
  { exercise_id: 'ex_dumbbell_overhead_press', name: 'Dumbbell Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets shoulders with dumbbells', pro_tip: 'Press straight overhead', video_url: '' },
  { exercise_id: 'ex_seated_overhead_press', name: 'Seated Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets shoulders from seated position', pro_tip: 'Brace core', video_url: '' },
  { exercise_id: 'ex_military_press', name: 'Military Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Strict overhead press', pro_tip: 'Keep body rigid', video_url: '' },
  { exercise_id: 'ex_push_jerk', name: 'Push Jerk', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Explosive overhead press', pro_tip: 'Use leg drive to assist press', video_url: '' },
  { exercise_id: 'ex_dumbbell_front_raise', name: 'Dumbbell Front Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets front deltoids', pro_tip: 'Avoid swinging', video_url: '' },
  { exercise_id: 'ex_reverse_pec_deck_fly', name: 'Reverse Pec Deck Fly', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids', pro_tip: 'Squeeze shoulder blades together', video_url: '' },
  { exercise_id: 'ex_band_pull_apart', name: 'Band Pull Apart', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids and upper back', pro_tip: 'Pull band apart with straight arms', video_url: '' },
  { exercise_id: 'ex_face_pull_rope', name: 'Face Pull Rope', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids and traps', pro_tip: 'Pull rope towards your face', video_url: '' },
  { exercise_id: 'ex_trap_bar_deadlift', name: 'Trap Bar Deadlift', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Deadlift variation with trap bar', pro_tip: 'Easier on lower back', video_url: '' },
  { exercise_id: 'ex_sumo_squat_dumbbell', name: 'Sumo Squat Dumbbell', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squat variation with dumbbell', pro_tip: 'Keep chest up, knees out', video_url: '' },
  { exercise_id: 'ex_goblet_squat_dumbbell', name: 'Goblet Squat Dumbbell', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Beginner-friendly squat variation with dumbbell', pro_tip: 'Keep elbows inside knees', video_url: '' },
  { exercise_id: 'ex_single_leg_press', name: 'Single Leg Press', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Targets legs unilaterally', pro_tip: 'Focus on one leg at a time', video_url: '' },
  { exercise_id: 'ex_leg_curl_machine', name: 'Leg Curl Machine', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Machine-based hamstring isolation', pro_tip: 'Focus on the squeeze', video_url: '' },
  { exercise_id: 'ex_seated_calf_raise', name: 'Seated Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Targets soleus muscle', pro_tip: 'Full range of motion', video_url: '' },
  { exercise_id: 'ex_donkey_calf_raise', name: 'Donkey Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Targets calves with bent-over position', pro_tip: 'Full range of motion', video_url: '' },
  { exercise_id: 'ex_machine_crunch', name: 'Machine Crunch', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Machine-based abdominal exercise', pro_tip: 'Focus on contracting your abs', video_url: '' },
  { exercise_id: 'ex_cable_oblique_crunch', name: 'Cable Oblique Crunch', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets obliques with cable', pro_tip: 'Rotate from your torso', video_url: '' },
  { exercise_id: 'ex_side_bend', name: 'Side Bend', main_muscle: 'Obliques', type: 'weight', category: 'Bilateral', description: 'Targets obliques', pro_tip: 'Bend to the side with control', video_url: '' },
  { exercise_id: 'ex_hanging_knee_raise', name: 'Hanging Knee Raise', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets lower abs', pro_tip: 'Lift knees towards chest', video_url: '' },
  { exercise_id: 'ex_decline_crunch', name: 'Decline Crunch', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets abs from decline bench', pro_tip: 'Control the movement', video_url: '' },
  { exercise_id: 'ex_medicine_ball_twist', name: 'Medicine Ball Twist', main_muscle: 'Core', type: 'weight', category: 'Bilateral', description: 'Targets obliques', pro_tip: 'Rotate from your core', video_url: '' },
  { exercise_id: 'ex_plank_variations', name: 'Plank Variations', main_muscle: 'Core', type: 'timed', category: null, description: 'Various plank styles', pro_tip: 'Maintain good form', video_url: '' },
  { exercise_id: 'ex_hollow_body_rock', name: 'Hollow Body Rock', main_muscle: 'Core', type: 'timed', category: null, description: 'Strengthens entire core', pro_tip: 'Maintain hollow body position while rocking', video_url: '' },
  { exercise_id: 'ex_dead_bug', name: 'Dead Bug', main_muscle: 'Core', type: 'timed', category: null, description: 'Improves core stability and coordination', pro_tip: 'Keep lower back pressed to floor', video_url: '' },
  { exercise_id: 'ex_bird_dog_variations', name: 'Bird Dog Variations', main_muscle: 'Core', type: 'timed', category: null, description: 'Various bird dog styles', pro_tip: 'Maintain core stability', video_url: '' },
  { exercise_id: 'ex_superman_variations', name: 'Superman Variations', main_muscle: 'Back', type: 'timed', category: null, description: 'Various superman styles', pro_tip: 'Lift arms and legs simultaneously', video_url: '' },
  { exercise_id: 'ex_glute_bridge_hold', name: 'Glute Bridge Hold', main_muscle: 'Glutes', type: 'timed', category: null, description: 'Activates glutes isometrically', pro_tip: 'Squeeze glutes at the top', video_url: '' },
  { exercise_id: 'ex_wall_sit_weighted', name: 'Wall Sit Weighted', main_muscle: 'Quadriceps', type: 'timed', category: null, description: 'Weighted wall sit for progression', pro_tip: 'Keep back flat against the wall', video_url: '' },
  { exercise_id: 'ex_push_up_hold', name: 'Push-up Hold', main_muscle: 'Pectorals', type: 'timed', category: null, description: 'Isometric chest exercise', pro_tip: 'Hold at the bottom of a push-up', video_url: '' },
  { exercise_id: 'ex_plank_walk', name: 'Plank Walk', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Dynamic plank exercise', pro_tip: 'Maintain plank position while moving', video_url: '' },
  { exercise_id: 'ex_bear_crawl_variations', name: 'Bear Crawl Variations', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Various bear crawl styles', pro_tip: 'Keep back flat and core engaged', video_url: '' },
  { exercise_id: 'ex_crab_walk_variations', name: 'Crab Walk Variations', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Various crab walk styles', pro_tip: 'Keep hips lifted', video_url: '' },
  { exercise_id: 'ex_sprint_intervals', name: 'Sprint Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity running', pro_tip: 'Alternate between sprints and rest', video_url: '' },
  { exercise_id: 'ex_jump_rope_intervals', name: 'Jump Rope Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between jumping and rest', video_url: '' },
  { exercise_id: 'ex_burpee_intervals', name: 'Burpee Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between burpees and rest', video_url: '' },
  { exercise_id: 'ex_mountain_climber_intervals', name: 'Mountain Climber Intervals', main_muscle: 'Core', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between mountain climbers and rest', video_url: '' },
  { exercise_id: 'ex_high_knee_intervals', name: 'High Knee Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between high knees and rest', video_url: '' },
  { exercise_id: 'ex_butt_kick_intervals', name: 'Butt Kick Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between butt kicks and rest', video_url: '' },
  { exercise_id: 'ex_rowing_intervals', name: 'Rowing Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate rowing', video_url: '' },
  { exercise_id: 'ex_elliptical_intervals', name: 'Elliptical Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate elliptical', video_url: '' },
  { exercise_id: 'ex_treadmill_intervals', name: 'Treadmill Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate running', video_url: '' },
  { exercise_id: 'ex_swimming_intervals', name: 'Swimming Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate swimming', video_url: '' },
  { exercise_id: 'ex_cycling_intervals', name: 'Cycling Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate cycling', video_url: '' },
  { exercise_id: 'ex_stair_climber_intervals', name: 'Stair Climber Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate stair climbing', video_url: '' },
  { exercise_id: 'ex_battle_rope_intervals', name: 'Battle Rope Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate rope waves', video_url: '' },
  { exercise_id: 'ex_medicine_ball_slam_intervals', name: 'Medicine Ball Slam Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate slams', video_url: '' },
  { exercise_id: 'ex_box_jump_intervals', name: 'Box Jump Intervals', main_muscle: 'Quadriceps', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate jumps', video_url: '' },
  { exercise_id: 'ex_kettlebell_swing_intervals', name: 'Kettlebell Kettlebell Swing Intervals', main_muscle: 'Glutes', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate swings', video_url: '' },
  { exercise_id: 'ex_sled_push_intervals', name: 'Sled Push Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate pushes', video_url: '' },
  { exercise_id: 'ex_tire_flip_intervals', name: 'Tire Flip Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training', pro_tip: 'Alternate between intense and moderate flips', video_url: '' },
  { exercise_id: 'ex_yoga_flow', name: 'Yoga Flow', main_muscle: 'Full Body', type: 'flexibility', category: null, description: 'Dynamic yoga sequence', pro_tip: 'Move with your breath', video_url: '' },
  { exercise_id: 'ex_pilates_reformer', name: 'Pilates Reformer', main_muscle: 'Core', type: 'strength', category: null, description: 'Pilates on a reformer machine', pro_tip: 'Focus on controlled movements', video_url: '' },
  { exercise_id: 'ex_barre', name: 'Barre', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Combines ballet, yoga, and pilates', pro_tip: 'Focus on small, isometric movements', video_url: '' },
  { exercise_id: 'ex_trx_suspension_training', name: 'TRX Suspension Training', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Bodyweight training with TRX straps', pro_tip: 'Adjust difficulty by body angle', video_url: '' },
  { exercise_id: 'ex_kettlebell_clean_and_jerk', name: 'Kettlebell Clean and Jerk', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Olympic lift with kettlebells', pro_tip: 'Focus on technique and explosiveness', video_url: '' },
  { exercise_id: 'ex_kettlebell_snatch', name: 'Kettlebell Snatch', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Olympic lift with kettlebells', pro_tip: 'Fast and explosive movement', video_url: '' },
  { exercise_id: 'ex_kettlebell_thruster', name: 'Kettlebell Thruster', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Combines kettlebell front squat and overhead press', pro_tip: 'Smooth transition between movements', video_url: '' },
  { exercise_id: 'ex_kettlebell_goblet_lunge', name: 'Kettlebell Goblet Lunge', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Lunge variation with kettlebell goblet hold', pro_tip: 'Maintain upright posture', video_url: '' },
  { exercise_id: 'ex_kettlebell_reverse_lunge', name: 'Kettlebell Reverse Lunge', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Lunge variation with kettlebell', pro_tip: 'Step backward with control', video_url: '' },
  { exercise_id: 'ex_kettlebell_walking_lunge', name: 'Kettlebell Walking Lunge', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Dynamic lunge variation with kettlebells', pro_tip: 'Maintain balance throughout', video_url: '' },
  { exercise_id: 'ex_kettlebell_step_ups', name: 'Kettlebell Step-ups', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Targets legs and glutes with kettlebells', pro_tip: 'Drive through the heel of the stepping foot', video_url: '' },
  { exercise_id: 'ex_kettlebell_good_mornings', name: 'Kettlebell Good Mornings', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Targets hamstrings and lower back with kettlebell', pro_tip: 'Maintain a slight bend in knees', video_url: '' },
  { exercise_id: 'ex_kettlebell_single_leg_deadlift_romanian', name: 'Kettlebell Single Leg Deadlift Romanian', main_muscle: 'Hamstrings', type: 'weight', category: 'Unilateral', description: 'Improves balance and targets hamstrings', pro_tip: 'Keep back straight, hinge at hip', video_url: '' },
  { exercise_id: 'ex_kettlebell_row', name: 'Kettlebell Row', main_muscle: 'Lats', type: 'weight', category: 'Unilateral', description: 'Targets lats unilaterally with kettlebell', pro_tip: 'Keep back flat and stable', video_url: '' },
  { exercise_id: 'ex_kettlebell_overhead_press', name: 'Kettlebell Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Unilateral', description: 'Targets shoulders unilaterally with kettlebell', pro_tip: 'Brace core for stability', video_url: '' },
  { exercise_id: 'ex_kettlebell_bench_press', name: 'Kettlebell Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets chest with kettlebells', pro_tip: 'Allows for greater range of motion', video_url: '' },
  { exercise_id: 'ex_kettlebell_tricep_extension', name: 'Kettlebell Tricep Extension', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with kettlebell', pro_tip: 'Keep elbows close to head', video_url: '' },
  { exercise_id: 'ex_kettlebell_bicep_curl', name: 'Kettlebell Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps with kettlebells', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_kettlebell_crunches', name: 'Kettlebell Crunches', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets abs with kettlebell', pro_tip: 'Focus on contracting your abs', video_url: '' },
  { exercise_id: 'ex_kettlebell_russian_twists', name: 'Kettlebell Russian Twists', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets obliques with kettlebell', pro_tip: 'Rotate from your core', video_url: '' },
  { exercise_id: 'ex_kettlebell_farmers_carry', name: 'Kettlebell Farmers Carry', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Improves grip strength and core stability', pro_tip: 'Maintain upright posture', video_url: '' },
  { exercise_id: 'ex_kettlebell_sled_push', name: 'Kettlebell Sled Push', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Develops leg and pushing power with kettlebell', pro_tip: 'Stay low and drive through legs', video_url: '' },
  { exercise_id: 'ex_kettlebell_tire_flips', name: 'Kettlebell Tire Flips', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Explosive full-body exercise with kettlebell', pro_tip: 'Lift with your legs, not your back', video_url: '' },
  { exercise_id: 'ex_kettlebell_sprint', name: 'Kettlebell Sprint', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity running with kettlebell', pro_tip: 'Focus on powerful strides', video_url: '' },
  { exercise_id: 'ex_kettlebell_jump_rope', name: 'Kettlebell Jump Rope', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'Cardio and coordination with kettlebell', pro_tip: 'Maintain a steady rhythm', video_url: '' },
  { exercise_id: 'ex_kettlebell_burpee_box_jumps', name: 'Kettlebell Burpee Box Jumps', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Combines burpee with box jump and kettlebell', pro_tip: 'Explode up onto the box', video_url: '' },
  { exercise_id: 'ex_kettlebell_mountain_climbers', name: 'Kettlebell Mountain Climbers', main_muscle: 'Core', type: 'timed', category: null, description: 'Core and cardio exercise with kettlebell', pro_tip: 'Keep hips low and core tight', video_url: '' },
  { exercise_id: 'ex_kettlebell_high_knees', name: 'Kettlebell High Knees', main_muscle: 'Legs', type: 'timed', category: null, description: 'Cardio and leg exercise with kettlebell', pro_tip: 'Drive knees up towards chest', video_url: '' },
  { exercise_id: 'ex_kettlebell_butt_kicks', name: 'Kettlebell Butt Kicks', main_muscle: 'Legs', type: 'timed', category: null, description: 'Cardio and hamstring warm-up with kettlebell', pro_tip: 'Bring heels towards glutes', video_url: '' },
  { exercise_id: 'ex_kettlebell_bear_crawl', name: 'Kettlebell Bear Crawl', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Full-body coordination and strength with kettlebell', pro_tip: 'Keep back flat and core engaged', video_url: '' },
  { exercise_id: 'ex_kettlebell_crab_walk', name: 'Kettlebell Crab Walk', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Full-body coordination and strength with kettlebell', pro_tip: 'Keep hips lifted', video_url: '' },
  { exercise_id: 'ex_kettlebell_superman', name: 'Kettlebell Superman', main_muscle: 'Back', type: 'timed', category: null, description: 'Strengthens lower back and glutes with kettlebell', pro_tip: 'Lift arms and legs simultaneously', video_url: '' },
  { exercise_id: 'ex_kettlebell_bird_dog', name: 'Kettlebell Bird Dog', main_muscle: 'Core', type: 'timed', category: null, description: 'Improves core stability and balance with kettlebell', pro_tip: 'Keep core tight and avoid rocking', video_url: '' },
  { exercise_id: 'ex_kettlebell_hollow_body_hold', name: 'Kettlebell Hollow Body Hold', main_muscle: 'Core', type: 'timed', category: null, description: 'Strengthens entire core with kettlebell', pro_tip: 'Keep lower back pressed to floor', video_url: '' },
  { exercise_id: 'ex_kettlebell_l_sit', name: 'Kettlebell L-Sit', main_muscle: 'Core', type: 'timed', category: null, description: 'Advanced core and upper body strength with kettlebell', pro_tip: 'Keep legs straight and parallel to floor', video_url: '' },
  { exercise_id: 'ex_kettlebell_handstand_hold', name: 'Kettlebell Handstand Hold', main_muscle: 'Shoulders', type: 'timed', category: null, description: 'Shoulder strength and balance with kettlebell', pro_tip: 'Keep body straight and core tight', video_url: '' },
  { exercise_id: 'ex_kettlebell_pistol_squat', name: 'Kettlebell Pistol Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Advanced single-leg squat with kettlebell', pro_tip: 'Maintain balance and control', video_url: '' },
  { exercise_id: 'ex_kettlebell_bulgarian_split_squat', name: 'Kettlebell Bulgarian Split Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Targets quads, glutes, and hamstrings with kettlebell', pro_tip: 'Keep torso upright', video_url: '' },
  { exercise_id: 'ex_kettlebell_single_leg_deadlift_romanian', name: 'Kettlebell Single Leg Deadlift Romanian', main_muscle: 'Hamstrings', type: 'weight', category: 'Unilateral', description: 'Improves balance and targets hamstrings', pro_tip: 'Keep back straight, hinge at hip', video_url: '' },
  { exercise_id: 'ex_kettlebell_single_arm_dumbbell_row', name: 'Kettlebell Single Arm Dumbbell Row', main_muscle: 'Lats', type: 'weight', category: 'Unilateral', description: 'Targets lats unilaterally with kettlebell', pro_tip: 'Keep back flat and stable', video_url: '' },
  { exercise_id: 'ex_kettlebell_single_arm_overhead_press', name: 'Kettlebell Single Arm Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Unilateral', description: 'Targets shoulders unilaterally with kettlebell', pro_tip: 'Brace core for stability', video_url: '' },
  { exercise_id: 'ex_kettlebell_single_arm_bench_press', name: 'Kettlebell Single Arm Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Unilateral', description: 'Targets chest unilaterally with kettlebell', pro_tip: 'Control the kettlebell', video_url: '' },
  { exercise_id: 'ex_kettlebell_single_arm_tricep_extension', name: 'Kettlebell Single Arm Tricep Extension', main_muscle: 'Triceps', type: 'weight', category: 'Unilateral', description: 'Targets triceps unilaterally with kettlebell', pro_tip: 'Keep elbow stable', video_url: '' },
  { exercise_id: 'ex_kettlebell_single_arm_bicep_curl', name: 'Kettlebell Single Arm Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Unilateral', description: 'Targets biceps unilaterally with kettlebell', pro_tip: 'Control the movement', video_url: '' },
  { exercise_id: 'ex_kettlebell_cable_wood_chop', name: 'Kettlebell Cable Wood Chop', main_muscle: 'Core', type: 'weight', category: 'Unilateral', description: 'Targets obliques and rotational strength with kettlebell', pro_tip: 'Rotate from your torso', video_url: '' },
  { exercise_id: 'ex_kettlebell_landmine_press', name: 'Kettlebell Landmine Press', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Pressing exercise with unique arc with kettlebell', pro_tip: 'Drive through your hips', video_url: '' },
  { exercise_id: 'ex_kettlebell_goblet_lunge_weighted', name: 'Kettlebell Goblet Lunge Weighted', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Lunge variation with kettlebell goblet hold', pro_tip: 'Maintain upright posture', video_url: '' },
  { exercise_id: 'ex_kettlebell_reverse_lunge_weighted', name: 'Kettlebell Reverse Lunge Weighted', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Lunge variation with kettlebell', pro_tip: 'Step backward with control', video_url: '' },
  { exercise_id: 'ex_kettlebell_walking_lunge_weighted', name: 'Kettlebell Walking Lunge Weighted', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Dynamic lunge variation with kettlebells', pro_tip: 'Maintain balance throughout', video_url: '' },
  { exercise_id: 'ex_kettlebell_step_ups_weighted', name: 'Kettlebell Step-ups Weighted', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Targets legs and glutes with kettlebells', pro_tip: 'Drive through the heel of the stepping foot', video_url: '' },
  { exercise_id: 'ex_kettlebell_good_morning_machine', name: 'Kettlebell Good Morning Machine', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Machine-based hamstring exercise with kettlebell', pro_tip: 'Focus on hip hinge', video_url: '' },
  { exercise_id: 'ex_kettlebell_hyperextension', name: 'Kettlebell Hyperextension', main_muscle: 'Lower Back', type: 'weight', category: 'Bilateral', description: 'Strengthens lower back and glutes with kettlebell', pro_tip: 'Control the movement', video_url: '' },
  { exercise_id: 'ex_kettlebell_reverse_crunch', name: 'Kettlebell Reverse Crunch', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets lower abs with kettlebell', pro_tip: 'Lift hips off the floor', video_url: '' },
  { exercise_id: 'ex_kettlebell_bicycle_crunches', name: 'Kettlebell Bicycle Crunches', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets obliques and abs with kettlebell', pro_tip: 'Bring elbow to opposite knee', video_url: '' },
  { exercise_id: 'ex_kettlebell_ab_rollout', name: 'Kettlebell Ab Rollout', main_muscle: 'Core', type: 'weight', category: 'Bilateral', description: 'Advanced core exercise with kettlebell', pro_tip: 'Keep core tight, avoid arching back', video_url: '' },
  { exercise_id: 'ex_kettlebell_cable_pull_through', name: 'Kettlebell Cable Pull-Through', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Targets glutes and hamstrings with kettlebell', pro_tip: 'Hinge at the hips', video_url: '' },
  { exercise_id: 'ex_kettlebell_glute_kickback', name: 'Kettlebell Glute Kickback', main_muscle: 'Glutes', type: 'weight', category: 'Unilateral', description: 'Isolates glutes with kettlebell', pro_tip: 'Squeeze glute at the top', video_url: '' },
  { exercise_id: 'ex_kettlebell_machine_row', name: 'Kettlebell Machine Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Machine-based back exercise with kettlebell', pro_tip: 'Pull with your back muscles', video_url: '' },
  { exercise_id: 'ex_kettlebell_lat_pulldown', name: 'Kettlebell Lat Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets lats with kettlebell', pro_tip: 'Pull bar to upper chest', video_url: '' },
  { exercise_id: 'ex_kettlebell_t_bar_row', name: 'Kettlebell T-Bar Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets back thickness with kettlebell', pro_tip: 'Keep chest up', video_url: '' },
  { exercise_id: 'ex_kettlebell_reverse_fly', name: 'Kettlebell Reverse Fly', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids with kettlebell', pro_tip: 'Squeeze shoulder blades together', video_url: '' },
  { exercise_id: 'ex_kettlebell_shrugs', name: 'Kettlebell Shrugs', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Targets upper traps with kettlebell', pro_tip: 'Shrug shoulders towards ears', video_url: '' },
  { exercise_id: 'ex_kettlebell_upright_row', name: 'Kettlebell Upright Row', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets deltoids and traps with kettlebell', pro_tip: 'Pull bar to chin level', video_url: '' },
  { exercise_id: 'ex_kettlebell_close_grip_bench_press', name: 'Kettlebell Close Grip Bench Press', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with kettlebell', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_kettlebell_push_press_weighted', name: 'Kettlebell Push Press Weighted', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Explosive shoulder exercise with kettlebell', pro_tip: 'Use leg drive to assist press', video_url: '' },
  { exercise_id: 'ex_kettlebell_clean_and_jerk_weighted', name: 'Kettlebell Clean and Jerk Weighted', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Olympic lift with kettlebells', pro_tip: 'Focus on technique and explosiveness', video_url: '' },
  { exercise_id: 'ex_kettlebell_snatch_weighted', name: 'Kettlebell Snatch Weighted', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Olympic lift with kettlebells', pro_tip: 'Fast and explosive movement', video_url: '' },
  { exercise_id: 'ex_kettlebell_thruster_weighted', name: 'Kettlebell Thruster Weighted', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Combines kettlebell front squat and overhead press', pro_tip: 'Smooth transition between movements', video_url: '' },
  { exercise_id: 'ex_kettlebell_power_clean', name: 'Kettlebell Power Clean', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Explosive full-body exercise with kettlebell', pro_tip: 'Pull kettlebell high, catch in partial squat', video_url: '' },
  { exercise_id: 'ex_kettlebell_sumo_squat', name: 'Kettlebell Sumo Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squat variation with kettlebell', pro_tip: 'Keep chest up, knees out', video_url: '' },
  { exercise_id: 'ex_kettlebell_front_squat_weighted', name: 'Kettlebell Front Squat Weighted', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squat variation with kettlebell on front shoulders', pro_tip: 'Keep elbows high, chest up', video_url: '' },
  { exercise_id: 'ex_kettlebell_overhead_squat_weighted', name: 'Kettlebell Overhead Squat Weighted', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Advanced full-body exercise with kettlebell', pro_tip: 'Maintain overhead stability', video_url: '' },
  { exercise_id: 'ex_kettlebell_sissy_squat', name: 'Kettlebell Sissy Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Targets quads with emphasis on knee flexion', pro_tip: 'Keep body in a straight line', video_url: '' },
  { exercise_id: 'ex_kettlebell_hack_squat', name: 'Kettlebell Hack Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Machine-based squat with kettlebell', pro_tip: 'Focus on quad isolation', video_url: '' },
  { exercise_id: 'ex_kettlebell_belt_squat', name: 'Kettlebell Belt Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squat variation with kettlebell at hips', pro_tip: 'Good for spinal decompression', video_url: '' },
  { exercise_id: 'ex_kettlebell_zercher_squat', name: 'Kettlebell Zercher Squat', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Squat variation with kettlebell in elbow crease', pro_tip: 'Keep chest up, elbows tucked', video_url: '' },
  { exercise_id: 'ex_kettlebell_pause_squat', name: 'Kettlebell Pause Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squat with a pause at the bottom with kettlebell', pro_tip: 'Improves strength out of the hole', video_url: '' },
  { exercise_id: 'ex_kettlebell_pin_squat', name: 'Kettlebell Pin Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squatting to pins for depth control with kettlebell', pro_tip: 'Explode off the pins', video_url: '' },
  { exercise_id: 'ex_kettlebell_deficit_deadlift', name: 'Kettlebell Deficit Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Deadlift from elevated surface with kettlebell', pro_tip: 'Increases range of motion', video_url: '' },
  { exercise_id: 'ex_kettlebell_rack_pull', name: 'Kettlebell Rack Pull', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Partial deadlift from pins with kettlebell', pro_tip: 'Focus on upper back strength', video_url: '' },
  { exercise_id: 'ex_kettlebell_snatch_grip_deadlift', name: 'Kettlebell Snatch Grip Deadlift', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Deadlift with wide grip with kettlebell', pro_tip: 'Targets upper back and traps', video_url: '' },
  { exercise_id: 'ex_kettlebell_sumo_deadlift_high_pull', name: 'Kettlebell Sumo Deadlift High Pull', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Combines sumo deadlift with upright row with kettlebell', pro_tip: 'Explosive movement', video_url: '' },
  { exercise_id: 'ex_kettlebell_good_morning_barbell', name: 'Kettlebell Good Morning Barbell', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Targets hamstrings and lower back with kettlebell', pro_tip: 'Maintain a neutral spine', video_url: '' },
  { exercise_id: 'ex_kettlebell_reverse_hyper_machine', name: 'Kettlebell Reverse Hyper Machine', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Machine-based glute/hamstring exercise with kettlebell', pro_tip: 'Squeeze glutes at the top', video_url: '' },
  { exercise_id: 'ex_kettlebell_glute_ham_raise', name: 'Kettlebell Glute Ham Raise', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Targets hamstrings and glutes with kettlebell', pro_tip: 'Control the eccentric phase', video_url: '' },
  { exercise_id: 'ex_kettlebell_back_extension', name: 'Kettlebell Back Extension', main_muscle: 'Lower Back', type: 'weight', category: 'Bilateral', description: 'Strengthens lower back with kettlebell', pro_tip: 'Control the movement', video_url: '' },
  { exercise_id: 'ex_kettlebell_reverse_grip_bench_press', name: 'Kettlebell Reverse Grip Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets upper chest and triceps with kettlebell', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_kettlebell_floor_press_weighted', name: 'Kettlebell Floor Press Weighted', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Bench press variation from the floor with kettlebell', pro_tip: 'Good for lockout strength', video_url: '' },
  { exercise_id: 'ex_kettlebell_dumbbell_bench_press', name: 'Kettlebell Dumbbell Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets chest with kettlebells', pro_tip: 'Allows for greater range of motion', video_url: '' },
  { exercise_id: 'ex_kettlebell_incline_bench_press_weighted', name: 'Kettlebell Incline Bench Press Weighted', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets upper chest with kettlebell', pro_tip: 'Control the descent', video_url: '' },
  { exercise_id: 'ex_kettlebell_decline_bench_press_weighted', name: 'Kettlebell Decline Bench Press Weighted', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Targets lower chest with kettlebell', pro_tip: 'Keep feet secure', video_url: '' },
  { exercise_id: 'ex_kettlebell_push_up_variations', name: 'Kettlebell Push-up Variations', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Various push-up styles with kettlebell', pro_tip: 'Maintain good form', video_url: '' },
  { exercise_id: 'ex_kettlebell_dips_weighted', name: 'Kettlebell Dips Weighted', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Weighted dips for progression with kettlebell', pro_tip: 'Control the descent', video_url: '' },
  { exercise_id: 'ex_kettlebell_close_grip_push_up', name: 'Kettlebell Close Grip Push-up', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with narrow hand placement with kettlebell', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_kettlebell_diamond_push_up', name: 'Kettlebell Diamond Push-up', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with diamond hand placement with kettlebell', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_kettlebell_overhead_dumbbell_extension', name: 'Kettlebell Overhead Dumbbell Extension', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with kettlebell', pro_tip: 'Keep elbows close to head', video_url: '' },
  { exercise_id: 'ex_kettlebell_cable_tricep_extension', name: 'Kettlebell Cable Tricep Extension', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with kettlebell and cable', pro_tip: 'Maintain constant tension', video_url: '' },
  { exercise_id: 'ex_kettlebell_reverse_grip_tricep_pushdown', name: 'Kettlebell Reverse Grip Tricep Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Targets triceps with reverse grip with kettlebell', pro_tip: 'Squeeze triceps at the bottom', video_url: '' },
  { exercise_id: 'ex_kettlebell_tricep_kickback_weighted', name: 'Kettlebell Tricep Kickback Weighted', main_muscle: 'Triceps', type: 'weight', category: 'Unilateral', description: 'Isolates triceps with kettlebell', pro_tip: 'Keep elbow stationary', video_url: '' },
  { exercise_id: 'ex_kettlebell_barbell_curl', name: 'Kettlebell Barbell Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps with kettlebell', pro_tip: 'Keep elbows tucked in', video_url: '' },
  { exercise_id: 'ex_kettlebell_dumbbell_curl', name: 'Kettlebell Dumbbell Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps with kettlebells', pro_tip: 'Rotate palms up as you curl', video_url: '' },
  { exercise_id: 'ex_kettlebell_incline_dumbbell_curl', name: 'Kettlebell Incline Dumbbell Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps with stretch with kettlebell', pro_tip: 'Keep back flat', video_url: '' },
  { exercise_id: 'ex_kettlebell_spider_curl', name: 'Kettlebell Spider Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps with isolation with kettlebell', pro_tip: 'Keep chest on bench', video_url: '' },
  { exercise_id: 'ex_kettlebell_cable_curl', name: 'Kettlebell Cable Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps with kettlebell and cable', pro_tip: 'Maintain constant tension', video_url: '' },
  { exercise_id: 'ex_kettlebell_reverse_curl_weighted', name: 'Kettlebell Reverse Curl Weighted', main_muscle: 'Forearms', type: 'weight', category: 'Bilateral', description: 'Targets forearms and brachialis with kettlebell', pro_tip: 'Keep wrists straight', video_url: '' },
  { exercise_id: 'ex_kettlebell_zottman_curl', name: 'Kettlebell Zottman Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Targets biceps and forearms with kettlebell', pro_tip: 'Rotate palms down on descent', video_url: '' },
  { exercise_id: 'ex_kettlebell_chin_up', name: 'Kettlebell Chin-up', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets lats and biceps with kettlebell', pro_tip: 'Pull chest to bar', video_url: '' },
  { exercise_id: 'ex_kettlebell_inverted_row', name: 'Kettlebell Inverted Row', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Bodyweight back exercise with kettlebell', pro_tip: 'Keep body straight', video_url: '' },
  { exercise_id: 'ex_kettlebell_dumbbell_row', name: 'Kettlebell Dumbbell Row', main_muscle: 'Lats', type: 'weight', category: 'Unilateral', description: 'Targets lats unilaterally with kettlebell', pro_tip: 'Keep back flat and stable', video_url: '' },
  { exercise_id: 'ex_kettlebell_chest_supported_row', name: 'Kettlebell Chest Supported Row', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Targets back with support with kettlebell', pro_tip: 'Avoid using momentum', video_url: '' },
  { exercise_id: 'ex_kettlebell_pendlay_row', name: 'Kettlebell Pendlay Row', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Explosive barbell row with kettlebell', pro_tip: 'Return bar to floor after each rep', video_url: '' },
  { exercise_id: 'ex_kettlebell_seal_row', name: 'Kettlebell Seal Row', main_muscle: 'Back', type: 'weight', category: 'Bilateral', description: 'Targets back with full isolation with kettlebell', pro_tip: 'Lie face down on bench', video_url: '' },
  { exercise_id: 'ex_kettlebell_single_arm_lat_pulldown', name: 'Kettlebell Single Arm Lat Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Unilateral', description: 'Targets lats unilaterally with kettlebell', pro_tip: 'Focus on contraction', video_url: '' },
  { exercise_id: 'ex_kettlebell_reverse_grip_pulldown', name: 'Kettlebell Reverse Grip Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets lats and biceps with kettlebell', pro_tip: 'Pull bar to upper chest', video_url: '' },
  { exercise_id: 'ex_kettlebell_wide_grip_pulldown', name: 'Kettlebell Wide Grip Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets outer lats with kettlebell', pro_tip: 'Pull bar to upper chest', video_url: '' },
  { exercise_id: 'ex_kettlebell_close_grip_pulldown', name: 'Kettlebell Close Grip Pulldown', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Targets inner lats with kettlebell', pro_tip: 'Pull bar to upper chest', video_url: '' },
  { exercise_id: 'ex_kettlebell_machine_pullover', name: 'Kettlebell Machine Pullover', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Machine-based lat isolation with kettlebell', pro_tip: 'Focus on the stretch', video_url: '' },
  { exercise_id: 'ex_kettlebell_dumbbell_overhead_press', name: 'Kettlebell Dumbbell Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets shoulders with kettlebells', pro_tip: 'Press straight overhead', video_url: '' },
  { exercise_id: 'ex_kettlebell_seated_overhead_press', name: 'Kettlebell Seated Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets shoulders from seated position with kettlebell', pro_tip: 'Brace core', video_url: '' },
  { exercise_id: 'ex_kettlebell_military_press', name: 'Kettlebell Military Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Strict overhead press with kettlebell', pro_tip: 'Keep body rigid', video_url: '' },
  { exercise_id: 'ex_kettlebell_push_jerk', name: 'Kettlebell Push Jerk', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Explosive overhead press with kettlebell', pro_tip: 'Use leg drive to assist press', video_url: '' },
  { exercise_id: 'ex_kettlebell_dumbbell_front_raise', name: 'Kettlebell Dumbbell Front Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets front deltoids with kettlebell', pro_tip: 'Avoid swinging', video_url: '' },
  { exercise_id: 'ex_kettlebell_cable_lateral_raise', name: 'Kettlebell Cable Lateral Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets side deltoids with kettlebell and cable', pro_tip: 'Lead with elbows', video_url: '' },
  { exercise_id: 'ex_kettlebell_machine_lateral_raise', name: 'Kettlebell Machine Lateral Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Machine-based side deltoid isolation with kettlebell', pro_tip: 'Focus on the squeeze', video_url: '' },
  { exercise_id: 'ex_kettlebell_reverse_pec_deck_fly', name: 'Kettlebell Reverse Pec Deck Fly', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids with kettlebell', pro_tip: 'Squeeze shoulder blades together', video_url: '' },
  { exercise_id: 'ex_kettlebell_band_pull_apart', name: 'Kettlebell Band Pull Apart', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids and upper back with kettlebell', pro_tip: 'Pull band apart with straight arms', video_url: '' },
  { exercise_id: 'ex_kettlebell_face_pull_rope', name: 'Kettlebell Face Pull Rope', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Targets rear deltoids and traps with kettlebell', pro_tip: 'Pull rope towards your face', video_url: '' },
  { exercise_id: 'ex_kettlebell_trap_bar_deadlift', name: 'Kettlebell Trap Bar Deadlift', main_muscle: 'Full Body', type: 'weight', category: 'Bilateral', description: 'Deadlift variation with kettlebell and trap bar', pro_tip: 'Easier on lower back', video_url: '' },
  { exercise_id: 'ex_kettlebell_sumo_squat_dumbbell', name: 'Kettlebell Sumo Squat Dumbbell', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Squat variation with kettlebell', pro_tip: 'Keep chest up, knees out', video_url: '' },
  { exercise_id: 'ex_kettlebell_goblet_squat_dumbbell', name: 'Kettlebell Goblet Squat Dumbbell', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Beginner-friendly squat variation with kettlebell', pro_tip: 'Keep elbows inside knees', video_url: '' },
  { exercise_id: 'ex_kettlebell_single_leg_press', name: 'Kettlebell Single Leg Press', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Targets legs unilaterally with kettlebell', pro_tip: 'Focus on one leg at a time', video_url: '' },
  { exercise_id: 'ex_kettlebell_leg_curl_machine', name: 'Kettlebell Leg Curl Machine', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Machine-based hamstring isolation with kettlebell', pro_tip: 'Focus on the squeeze', video_url: '' },
  { exercise_id: 'ex_kettlebell_seated_calf_raise', name: 'Kettlebell Seated Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Targets soleus muscle with kettlebell', pro_tip: 'Full range of motion', video_url: '' },
  { exercise_id: 'ex_kettlebell_donkey_calf_raise', name: 'Kettlebell Donkey Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Targets calves with bent-over position with kettlebell', pro_tip: 'Full range of motion', video_url: '' },
  { exercise_id: 'ex_kettlebell_machine_crunch', name: 'Kettlebell Machine Crunch', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Machine-based abdominal exercise with kettlebell', pro_tip: 'Focus on contracting your abs', video_url: '' },
  { exercise_id: 'ex_kettlebell_cable_oblique_crunch', name: 'Kettlebell Cable Oblique Crunch', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets obliques with kettlebell and cable', pro_tip: 'Rotate from your torso', video_url: '' },
  { exercise_id: 'ex_kettlebell_side_bend', name: 'Kettlebell Side Bend', main_muscle: 'Obliques', type: 'weight', category: 'Bilateral', description: 'Targets obliques with kettlebell', pro_tip: 'Bend to the side with control', video_url: '' },
  { exercise_id: 'ex_kettlebell_hanging_knee_raise', name: 'Kettlebell Hanging Knee Raise', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets lower abs with kettlebell', pro_tip: 'Lift knees towards chest', video_url: '' },
  { exercise_id: 'ex_kettlebell_decline_crunch', name: 'Kettlebell Decline Crunch', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Targets abs from decline bench with kettlebell', pro_tip: 'Control the movement', video_url: '' },
  { exercise_id: 'ex_kettlebell_medicine_ball_twist', name: 'Kettlebell Medicine Ball Twist', main_muscle: 'Core', type: 'weight', category: 'Bilateral', description: 'Targets obliques with kettlebell', pro_tip: 'Rotate from your core', video_url: '' },
  { exercise_id: 'ex_kettlebell_plank_variations', name: 'Kettlebell Plank Variations', main_muscle: 'Core', type: 'timed', category: null, description: 'Various plank styles with kettlebell', pro_tip: 'Maintain good form', video_url: '' },
  { exercise_id: 'ex_kettlebell_hollow_body_rock', name: 'Kettlebell Hollow Body Rock', main_muscle: 'Core', type: 'timed', category: null, description: 'Strengthens entire core with kettlebell', pro_tip: 'Maintain hollow body position while rocking', video_url: '' },
  { exercise_id: 'ex_kettlebell_dead_bug', name: 'Kettlebell Dead Bug', main_muscle: 'Core', type: 'timed', category: null, description: 'Improves core stability and coordination with kettlebell', pro_tip: 'Keep lower back pressed to floor', video_url: '' },
  { exercise_id: 'ex_kettlebell_bird_dog_variations', name: 'Kettlebell Bird Dog Variations', main_muscle: 'Core', type: 'timed', category: null, description: 'Various bird dog styles with kettlebell', pro_tip: 'Maintain core stability', video_url: '' },
  { exercise_id: 'ex_kettlebell_superman_variations', name: 'Kettlebell Superman Variations', main_muscle: 'Back', type: 'timed', category: null, description: 'Various superman styles with kettlebell', pro_tip: 'Lift arms and legs simultaneously', video_url: '' },
  { exercise_id: 'ex_kettlebell_glute_bridge_hold', name: 'Kettlebell Glute Bridge Hold', main_muscle: 'Glutes', type: 'timed', category: null, description: 'Activates glutes isometrically with kettlebell', pro_tip: 'Squeeze glutes at the top', video_url: '' },
  { exercise_id: 'ex_kettlebell_wall_sit_weighted', name: 'Kettlebell Wall Sit Weighted', main_muscle: 'Quadriceps', type: 'timed', category: null, description: 'Weighted wall sit for progression with kettlebell', pro_tip: 'Keep back flat against the wall', video_url: '' },
  { exercise_id: 'ex_kettlebell_push_up_hold', name: 'Kettlebell Push-up Hold', main_muscle: 'Pectorals', type: 'timed', category: null, description: 'Isometric chest exercise with kettlebell', pro_tip: 'Hold at the bottom of a push-up', video_url: '' },
  { exercise_id: 'ex_kettlebell_plank_walk', name: 'Kettlebell Plank Walk', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Dynamic plank exercise with kettlebell', pro_tip: 'Maintain plank position while moving', video_url: '' },
  { exercise_id: 'ex_kettlebell_bear_crawl_variations', name: 'Kettlebell Bear Crawl Variations', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Various bear crawl styles with kettlebell', pro_tip: 'Keep back flat and core engaged', video_url: '' },
  { exercise_id: 'ex_kettlebell_crab_walk_variations', name: 'Kettlebell Crab Walk Variations', main_muscle: 'Full Body', type: 'timed', category: null, description: 'Various crab walk styles with kettlebell', pro_tip: 'Keep hips lifted', video_url: '' },
  { exercise_id: 'ex_kettlebell_sprint_intervals', name: 'Kettlebell Sprint Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity running with kettlebell', pro_tip: 'Alternate between sprints and rest', video_url: '' },
  { exercise_id: 'ex_kettlebell_jump_rope_intervals', name: 'Kettlebell Jump Rope Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between jumping and rest', video_url: '' },
  { exercise_id: 'ex_kettlebell_burpee_intervals', name: 'Kettlebell Burpee Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between burpees and rest', video_url: '' },
  { exercise_id: 'ex_kettlebell_mountain_climber_intervals', name: 'Kettlebell Mountain Climber Intervals', main_muscle: 'Core', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between mountain climbers and rest', video_url: '' },
  { exercise_id: 'ex_kettlebell_high_knee_intervals', name: 'Kettlebell High Knee Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between high knees and rest', video_url: '' },
  { exercise_id: 'ex_kettlebell_butt_kick_intervals', name: 'Kettlebell Butt Kick Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between butt kicks and rest', video_url: '' },
  { exercise_id: 'ex_kettlebell_rowing_intervals', name: 'Kettlebell Rowing Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate rowing', video_url: '' },
  { exercise_id: 'ex_kettlebell_elliptical_intervals', name: 'Kettlebell Elliptical Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate elliptical', video_url: '' },
  { exercise_id: 'ex_kettlebell_treadmill_intervals', name: 'Kettlebell Treadmill Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate running', video_url: '' },
  { exercise_id: 'ex_kettlebell_swimming_intervals', name: 'Kettlebell Swimming Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate swimming', video_url: '' },
  { exercise_id: 'ex_kettlebell_cycling_intervals', name: 'Kettlebell Cycling Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate cycling', video_url: '' },
  { exercise_id: 'ex_kettlebell_stair_climber_intervals', name: 'Kettlebell Stair Climber Intervals', main_muscle: 'Legs', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate stair climbing', video_url: '' },
  { exercise_id: 'ex_kettlebell_battle_rope_intervals', name: 'Kettlebell Battle Rope Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate rope waves', video_url: '' },
  { exercise_id: 'ex_kettlebell_medicine_ball_slam_intervals', name: 'Kettlebell Medicine Ball Slam Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate slams', video_url: '' },
  { exercise_id: 'ex_kettlebell_box_jump_intervals', name: 'Kettlebell Box Jump Intervals', main_muscle: 'Quadriceps', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate jumps', video_url: '' },
  { exercise_id: 'ex_kettlebell_kettlebell_swing_intervals', name: 'Kettlebell Kettlebell Swing Intervals', main_muscle: 'Glutes', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate swings', video_url: '' },
  { exercise_id: 'ex_kettlebell_sled_push_intervals', name: 'Kettlebell Sled Push Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate pushes', video_url: '' },
  { exercise_id: 'ex_kettlebell_tire_flip_intervals', name: 'Kettlebell Tire Flip Intervals', main_muscle: 'Full Body', type: 'cardio', category: null, description: 'High-intensity interval training with kettlebell', pro_tip: 'Alternate between intense and moderate flips', video_url: '' },
  { exercise_id: 'ex_kettlebell_yoga_flow', name: 'Kettlebell Yoga Flow', main_muscle: 'Full Body', type: 'flexibility', category: null, description: 'Dynamic yoga sequence with kettlebell', pro_tip: 'Move with your breath', video_url: '' },
  { exercise_id: 'ex_kettlebell_pilates_reformer', name: 'Kettlebell Pilates Reformer', main_muscle: 'Core', type: 'strength', category: null, description: 'Pilates on a reformer machine with kettlebell', pro_tip: 'Focus on controlled movements', video_url: '' },
  { exercise_id: 'ex_kettlebell_barre', name: 'Kettlebell Barre', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Combines ballet, yoga, and pilates with kettlebell', pro_tip: 'Focus on small, isometric movements', video_url: '' },
  { exercise_id: 'ex_kettlebell_trx_suspension_training', name: 'Kettlebell TRX Suspension Training', main_muscle: 'Full Body', type: 'strength', category: null, description: 'Bodyweight training with TRX straps and kettlebell', pro_tip: 'Adjust difficulty by body angle', video_url: '' },
];

// Hardcoded data from Dyad - Workout Tracker - ExerciseDefinitions - Workout Tracker - ExerciseDefinitions (6).csv
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
  { exercise_id: 'ex_pull_up', workout_split: 'ppl', workout_name: 'Pull', min_session_minutes: 15, bonus_for_time_group: null },
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
    console.log('Edge function started.');

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

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      console.error('Unauthorized: No user session found or user fetch error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`User authenticated: ${user.id}`);

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
        throw upsertError; // Re-throw to be caught by outer try-catch
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
        throw upsertError; // Re-throw to be caught by outer try-catch
      }
    }
    console.log('Workout exercise structure ensured.');

    // --- Step 3: Fetch T-Path details and generate user-specific workouts ---
    let tPath;
    try {
      console.log(`Fetching T-Path with ID: ${tPathId}`);
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
      .eq('parent_t_path_id', tPath.id); // Use parent_t_path_id for cleanup

    if (fetchChildWorkoutsError) {
      console.error('Error fetching existing child workouts for cleanup:', fetchChildWorkoutsError.message);
      throw fetchChildWorkoutsError;
    }

    if (existingChildWorkouts && existingChildWorkouts.length > 0) {
      const childWorkoutIdsToDelete = existingChildWorkouts.map((w: { id: string }) => w.id);
      console.log(`Found ${childWorkoutIdsToDelete.length} child workouts to delete.`);

      // Delete associated t_path_exercises first
      console.log('Deleting associated t_path_exercises...');
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
      console.log('Deleting child workouts...');
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

        // Fetch raw structure entries first
        console.log(`Fetching workout structure for ${workoutSplit} - ${workoutName}...`);
        const { data: rawStructureEntries, error: structureError } = await supabaseServiceRoleClient
          .from('workout_exercise_structure')
          .select('*') // Select all columns from workout_exercise_structure
          .eq('workout_split', workoutSplit)
          .eq('workout_name', workoutName)
          .order('min_session_minutes', { ascending: true, nullsFirst: false })
          .order('bonus_for_time_group', { ascending: true, nullsFirst: false });

        if (structureError) {
          console.error(`Error fetching raw workout structure for ${workoutName}:`, structureError.message);
          throw structureError;
        }
        console.log(`Fetched ${rawStructureEntries?.length || 0} raw structure entries for ${workoutName}.`);

        const exercisesToInclude = [];
        let mainExerciseCount = 0;
        let bonusExerciseCount = 0;

        for (const entry of rawStructureEntries || []) {
          console.log(`Processing entry for exercise_library_id: ${entry.exercise_library_id}`);
          // Now fetch the exercise_definition using the library_id
          const { data: exerciseDefData, error: exerciseDefError } = await supabaseServiceRoleClient
            .from('exercise_definitions')
            .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id')
            .eq('library_id', entry.exercise_library_id)
            .single(); // Assuming library_id is unique for default exercises

          if (exerciseDefError) {
            console.warn(`Could not find exercise definition for library_id: ${entry.exercise_library_id}. Error: ${exerciseDefError.message}`);
            continue; // Skip this entry if exercise definition is not found
          }
          if (!exerciseDefData) {
            console.warn(`Exercise definition data is null for library_id: ${entry.exercise_library_id}. Skipping.`);
            continue;
          }

          const actualExercise = exerciseDefData; // This is now the single exercise definition object

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
              exercise_id: actualExercise.id, // Use the actual UUID from exercise_definitions
              is_bonus_exercise: isBonus,
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
        console.log(`Inserting child workout: ${workoutName}`);
        const { data: workout, error: workoutError } = await supabaseServiceRoleClient
          .from('t_paths')
          .insert({
            user_id: user.id, // This must be the actual user's ID
            parent_t_path_id: tPath.id, // Link child workout to parent T-Path ID
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
          console.log(`Inserting ${tPathExercisesToInsert.length} exercises into t_path_exercises for ${workoutName}...`);
          const { error: insertTPathExercisesError } = await supabaseServiceRoleClient
            .from('t_path_exercises')
            .insert(tPathExercisesToInsert);
          if (insertTPathExercisesError) {
            console.error(`Error inserting t_path_exercises for ${workoutName}:`, insertTPathExercisesError.message);
            throw insertTPathExercisesError;
          }
          console.log(`Inserted ${tPathExercisesToInsert.length} exercises into ${workoutName}`);
        } else {
          console.log(`No exercises to insert for ${workoutName}.`);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error creating workout ${workoutName} or its exercises: ${errorMessage}`);
        // Do not return here, let the outer catch handle the final response
        throw err; // Re-throw to be caught by outer try-catch
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