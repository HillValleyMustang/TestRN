// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Type Definitions ---
interface ExerciseDefFromCSV {
  exercise_id: string; // This is the library_id
  name: string;
  main_muscle: string;
  type: string;
  category: string | null;
  description: string | null;
  pro_tip: string | null;
  video_url: string | null;
  icon_url: string | null; // Added icon_url
}

interface WorkoutStructureEntry {
  exercise_library_id: string;
  workout_split: string;
  workout_name: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
}

interface ExerciseDefinitionForWorkoutGeneration {
  id: string;
  name: string;
  user_id: string | null;
  library_id: string | null;
  icon_url: string | null; // Added icon_url
}

interface TPathExerciseLink {
  id: string; // t_path_exercises.id
  exercise_id: string;
  order_index: number;
  is_bonus_exercise: boolean;
}

interface TPathData {
  id: string;
  template_name: string;
  settings: { tPathType?: string } | null;
  user_id: string;
}

interface ProfileData {
  preferred_session_length: string | null;
}

// --- Helper Functions (Moved outside serve) ---

const toNullOrNumber = (val: string | null | undefined): number | null => {
  if (val === null || val === undefined || val.trim() === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

const toNullIfEmpty = (str: string | null | undefined): string | null => (str === '' || str === undefined || str === null) ? null : str;

const getSupabaseClients = (authHeader: string) => {
  // @ts-ignore
  const supabaseUrl = (Deno.env as any).get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseAnonKey = (Deno.env as any).get('SUPABASE_ANON_KEY') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = (Deno.env as any).get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
  const supabaseServiceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  return { supabaseAuthClient, supabaseServiceRoleClient };
};

function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90;
  }
}

function getWorkoutNamesForSplit(workoutSplit: string): string[] {
  if (workoutSplit === 'ulul') return ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
  if (workoutSplit === 'ppl') return ['Push', 'Pull', 'Legs'];
  throw new Error('Unknown workout split type.');
}

// --- Master Data Source (from CSV) ---
const rawCsvData = [
    { name: 'Incline Smith Machine Press', main_muscle: 'Chest, Shoulders', type: 'weight', category: 'Bilateral', description: 'Lie on an incline bench under the bar. Grip the bar slightly wider than your shoulders. Unrack it, lower it to your upper chest, and press it back up until your arms are extended.', pro_tip: 'Tuck your elbows to about a 45-75 degree angle relative to your torso. Flaring them out to 90 degrees puts unnecessary stress on your shoulder joints.', video_url: 'https://www.youtube.com/embed/tLB1XtM21Fk', workout_name: 'Upper Body A', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Lat Pulldown', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Sit down and secure your knees under the pads. Grab the bar with a wide, overhand grip. Pull the bar down to your upper chest, squeezing your back muscles. Slowly return to the start.', pro_tip: 'Instead of just pulling with your arms, think about driving your elbows down and back towards the floor. This will engage your lats much more effectively.', video_url: 'https://www.youtube.com/embed/JGeRYIZdojU', workout_name: 'Upper Body A', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Dumbbell Press', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Sit on a bench with back support, holding a dumbbell in each hand at shoulder height, palms forward. Press the weights straight overhead. Lower them back down with control.', pro_tip: 'Keep your lower back pressed firmly against the bench pad. Arching your back takes the focus off your shoulders and can lead to injury.', video_url: 'https://www.youtube.com/embed/3GFZpOYu0pQ', workout_name: 'Upper Body A', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Machine Row', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Sit at the machine with your chest against the pad. Grab the handles and pull them towards your lower ribs, squeezing your shoulder blades together. Slowly extend your arms to return.', pro_tip: 'At the peak of the movement, pause for a full second and squeeze your back muscles as hard as you can. The quality of the contraction is more important than the weight.', video_url: 'https://www.youtube.com/embed/TeFo51Q_Nsc', workout_name: 'Upper Body A', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Cable Lateral Raise', main_muscle: 'Shoulders', type: 'weight', category: 'Unilateral', description: 'Stand next to a cable machine with the pulley set low. Grab the handle with your outside hand. Raise your arm out to your side until it\'s parallel to the floor, keeping a slight elbow bend.', pro_tip: 'Lead the movement with your elbow, not your hand. Imagine lifting the weight with your elbow, keeping your wrist and hand just along for the ride. This better isolates the side delt.', video_url: 'https://www.youtube.com/embed/Z5FA9aq3L6A', workout_name: 'Upper Body A', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Dumbbell Flyes', main_muscle: 'Chest', type: 'weight', category: 'Bilateral', description: 'Sit on a flat bench, holding dumbbells above your chest with palms facing each other. With a slight, fixed bend in your elbows, lower the weights in a wide arc until you feel a stretch.', pro_tip: 'Think of hugging a giant tree. Avoid pressing the weight up; the goal is to squeeze your chest to bring your arms back together in that same wide arc.', video_url: 'https://www.youtube.com/embed/eozdVDA78K0', workout_name: 'Upper Body A', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Sit on a bench, dumbbells in hand at your sides, palms facing forward. Keeping your elbows pinned to your sides, curl the weights up towards your shoulders. Squeeze, then lower slowly.', pro_tip: 'As you curl up, slightly rotate your wrists so that your pinky finger is higher than your thumb at the top. This extra twist (supination) creates a stronger bicep peak contraction.', video_url: 'https://www.youtube.com/embed/BsULGO70tcU', workout_name: 'Upper Body A', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Face Pulls', main_muscle: 'Rear Delts, Traps', type: 'weight', category: 'Bilateral', description: 'Set a rope on a cable machine at chest height. Pull the rope towards your face, simultaneously pulling the ends apart. Aim to get your hands on either side of your head.', pro_tip: 'Focus on external rotation. At the end of the pull, your knuckles should be pointing towards the ceiling. This is crucial for strengthening the rotator cuff and improving posture.', video_url: 'https://www.youtube.com/embed/rep-qVOkqgk', workout_name: 'Upper Body A', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Dumbbell Shrugs', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Stand holding heavy dumbbells at your sides. Without using your arms, elevate your shoulders straight up towards your ears. Pause at the top, then slowly lower them.', pro_tip: 'Avoid rolling your shoulders forwards or backwards. The movement should be purely vertical (up and down) to safely and effectively target the trapezius muscles.', video_url: 'https://www.youtube.com/embed/8lP_eJvClSA', workout_name: 'Upper Body A', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Leg Press', main_muscle: 'Quads, Glutes', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your feet flat on the platform, about shoulder-width apart. Push the platform away until your legs are nearly straight (but not locked), then return to the start.', pro_tip: 'Control the negative. Take at least 2-3 seconds to lower the weight. The muscle-building stimulus from the eccentric (lowering) phase is incredibly powerful.', video_url: 'https://www.youtube.com/embed/p5dCqF7wWUw', workout_name: 'Lower Body A', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Leg Extension', main_muscle: 'Quads', type: 'weight', category: 'Bilateral', description: 'Sit on the machine with your shins behind the pad. Extend your legs to lift the weight until they are straight out in front of you. Squeeze your quads at the top.', pro_tip: 'Point your toes slightly outwards to target the vastus medialis (teardrop muscle) near your knee, or slightly inwards to focus more on the outer quad sweep.', video_url: 'https://www.youtube.com/embed/4ZDm5EbiFI8', workout_name: 'Lower Body A', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Sit in the machine and secure the lap pad. Hook your ankles behind the roller pad. Curl your legs down and back as far as possible, squeezing your hamstrings.', pro_tip: 'To increase hamstring activation, try to ""pull"" with your heels and dorsiflex your feet (point your toes up towards your shins) throughout the movement.', video_url: 'https://www.youtube.com/embed/ELOCsoDSmrg', workout_name: 'Lower Body A', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Hip Adduction', main_muscle: 'Inner Thighs', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your legs on the inside of the pads. Squeeze your legs together against the resistance. Control the movement as you return to the starting position.', pro_tip: 'Pause and hold the squeezed position for a 1-2 second count on every single rep to maximize tension on the inner thigh muscles.', video_url: 'https://www.youtube.com/embed/CjAVezAggkI', workout_name: 'Lower Body A', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Hip Abduction', main_muscle: 'Outer Glutes', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your legs on the outside of the pads. Push your legs apart against the resistance. Control the movement as you return to the starting position.', pro_tip: 'Hinge forward slightly at the hips and keep your glutes pressed into the seat. This angle can help to better target the gluteus medius and minimus.', video_url: 'https://www.youtube.com/embed/G_8LItOiZ0Q', workout_name: 'Lower Body A', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Calf Raise on Leg Press', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Position your feet at the bottom of the leg press platform with only the balls of your feet on it. Extend your legs, then press through the balls of your feet to lift the weight.', pro_tip: 'For a full range of motion, focus on getting a deep stretch at the bottom (letting your heels drop) and a powerful, paused squeeze at the very top of the movement.', video_url: 'https://www.youtube.com/embed/dhRz1Ns60Zg', workout_name: 'Lower Body A', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Cable Crunches', main_muscle: 'Abs', type: 'weight', category: 'Bilateral', description: 'Kneel facing a high-pulley cable machine with a rope attachment. Holding the rope on either side of your head, crunch your chest towards your knees, engaging your abs.', pro_tip: 'Don\'t pull with your arms. Your hands should stay fixed by your head. The movement should come from contracting your abs and flexing your spine, like you\'re trying to roll into a ball.', video_url: 'https://www.youtube.com/embed/3qjoXDTuyOE', workout_name: 'Lower Body A', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Plank', main_muscle: 'Core', type: 'timed', category: 'Bilateral', description: 'Hold a push-up position, but with your weight resting on your forearms instead of your hands. Keep your body in a dead-straight line from your head to your heels.', pro_tip: 'Actively squeeze your glutes and brace your abs as if you\'re about to be punched in the stomach. This creates full-body tension and makes the plank far more effective.', video_url: 'https://www.youtube.com/embed/pSHjTRCQxIw', workout_name: 'Lower Body A', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Assisted Pull-up', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Set the machine to the desired assistance level. Grab the handles with an overhand grip. Pull your chest up to the handles, then lower yourself with control.', pro_tip: 'Focus on driving your elbows down towards your hips. The less assistance you use, the harder the exercise becomes. Aim to reduce the assistance weight over time.', video_url: 'https://www.youtube.com/embed/wFj808u2HWU', workout_name: 'Upper Body B', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Flat Dumbbell Bench Press', main_muscle: 'Chest', type: 'weight', category: 'Bilateral', description: 'Lie on a flat bench with a dumbbell in each hand resting on your thighs. Kick the weights up to your chest. Press them up until your arms are extended, then lower them back down.', pro_tip: 'Don\'t let the dumbbells clang together at the top. Stop just short of full extension with the weights about an inch apart to keep constant tension on your chest muscles.', video_url: 'https://www.youtube.com/embed/YwrzZaNqJWU', workout_name: 'Upper Body B', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Chest-Supported Row', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Lie face down on an incline bench holding dumbbells with your arms extended. Row the dumbbells up by pulling your elbows back and squeezing your shoulder blades together.', pro_tip: 'Keep your chest glued to the bench throughout the entire set. This removes all momentum and forces your back muscles to do 100% of the work.', video_url: 'https://www.youtube.com/embed/LuWGKt8B_7o', workout_name: 'Upper Body B', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Pec Deck Fly', main_muscle: 'Chest', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your back flat against the pad. Place your forearms on the pads or grab the handles. Squeeze your chest to bring the handles together in front of you.', pro_tip: 'Imagine you have a pen in the middle of your chest that you are trying to squeeze with your pecs on every single repetition. This mind-muscle connection is key.', video_url: 'https://www.youtube.com/embed/jiitI2ma3J4', workout_name: 'Upper Body B', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Rear Delt Fly', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Using a pec deck machine in reverse, or dumbbells while bent over. Move your arms back and out in a wide arc, focusing on squeezing your rear shoulder muscles and upper back.', pro_tip: 'Keep a slight bend in your elbows and think of leading with your pinky fingers. This helps to minimize tricep and lat involvement and isolate the rear delts.', video_url: 'https://www.youtube.com/embed/1jpBatm8RYw', workout_name: 'Upper Body B', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Assisted Dips', main_muscle: 'Triceps, Chest', type: 'weight', category: 'Bilateral', description: 'Set the machine\'s assistance level. Place your hands on the bars and your knees on the pad. Lower your body until your elbows are at a 90-degree angle, then press back up.', pro_tip: 'To target your chest, lean your torso forward. To target your triceps, keep your torso as upright and vertical as possible.', video_url: 'https://www.youtube.com/embed/kbmVlw-i0Vs', workout_name: 'Upper Body B', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Kneeling Single-Arm Row', main_muscle: 'Back, Biceps', type: 'weight', category: 'Unilateral', description: 'Kneel with one knee on a bench, placing your hand on the bench for support. Grab a dumbbell with your free hand and pull it up towards your hip, keeping your back straight.', pro_tip: 'Initiate the pull by retracting your scapula (pulling your shoulder blade back) before your arm even starts to bend. This ensures your back muscles are doing the work, not just your bicep.', video_url: 'https://www.youtube.com/embed/pYcpY20QaE8', workout_name: 'Upper Body B', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Cable Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Unilateral', description: 'Stand facing a cable machine with a straight or EZ bar attached to the low pulley. Grab the bar and perform a bicep curl, keeping your elbows locked at your sides.', pro_tip: 'Take a step back from the machine. This ensures there is tension on the bicep throughout the entire range of motion, even at the very bottom of the rep.', video_url: 'https://www.youtube.com/embed/NFzTWp2qpiE', workout_name: 'Upper Body B', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Tricep Rope Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Attach a rope to a high pulley. Grab the rope and push down until your arms are fully extended. At the bottom, pull the rope ends apart.', pro_tip: 'Keep your elbows pinned to your sides as if they were on a hinge. Do not let them drift forward as you push down; this turns the exercise into a chest press.', video_url: 'https://www.youtube.com/embed/2-LAMcpzODU', workout_name: 'Upper Body B', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Smith Machine Lunge', main_muscle: 'Glutes, Quads', type: 'weight', category: 'Unilateral', description: 'Place the bar across your upper back. Step one foot forward into a lunge stance. Lower your back knee towards the floor, then press back up through your front foot.', pro_tip: 'Focus on a ""vertical"" movement path. Think about your torso moving straight up and down, rather than forward and back, to keep the tension on your legs.', video_url: 'https://www.youtube.com/embed/qY7Yo0x5mhE', workout_name: 'Lower Body B', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Leg Press (Narrow Stance)', main_muscle: 'Quads', type: 'weight', category: 'Bilateral', description: 'Sit in the machine and place your feet in the middle of the platform, only a few inches apart. Push the platform away until your legs are nearly straight, then return to the start.', pro_tip: 'This stance heavily targets the outer quads (vastus lateralis). To maximize this, consciously try to push through the outer edges of your feet as you press the weight.', video_url: 'https://www.youtube.com/embed/IZxyjW7MPJQ', workout_name: 'Lower Body B', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Cable Glute Kickback', main_muscle: 'Glutes', type: 'weight', category: 'Unilateral', description: 'Attach an ankle strap to a low cable pulley. Facing the machine, kick your leg straight back behind you, squeezing your glute at the top of the movement.', pro_tip: 'Keep your core tight and avoid arching your lower back. The movement should be initiated and finished by a powerful squeeze of your glute, not by swinging your back.', video_url: 'https://www.youtube.com/embed/SqO-VUEak2M', workout_name: 'Lower Body B', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Leg Extension', main_muscle: 'Quads', type: 'weight', category: 'Bilateral', description: 'Sit on the machine with your shins behind the pad. Extend your legs to lift the weight until they are straight out in front of you. Squeeze your quads at the top.', pro_tip: 'At the top of the rep, hold the contraction for a 2-second count while actively flexing your quad muscles as hard as you can before lowering the weight slowly.', video_url: 'https://www.youtube.com/embed/4ZDm5EbiFI8', workout_name: 'Lower Body B', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Sit in the machine and secure the lap pad. Hook your ankles behind the roller pad. Curl your legs down and back as far as possible, squeezing your hamstrings.', pro_tip: 'Experiment with pointing your toes. Pointing them slightly inwards can engage the inner hamstring more, while pointing them slightly outwards can hit the outer hamstring.', video_url: 'https://www.youtube.com/embed/ELOCsoDSmrg', workout_name: 'Lower Body B', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Calf Raise on Smith Machine', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Stand on a small block or plate under the Smith machine bar, with the bar across your shoulders. Press up through the balls of your feet, then lower your heels below the block.', pro_tip: 'Control the eccentric (lowering) portion of the rep. Take 3-4 seconds to lower your heels and feel a deep stretch in your calves before exploding back up.', video_url: 'https://www.youtube.com/embed/FNdI5TynYxs', workout_name: 'Lower Body B', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Hanging Leg Raises', main_muscle: 'Abs, Core', type: 'weight', category: 'Bilateral', description: 'Hang from a pull-up bar. Keeping your legs straight (or bent, for an easier version), raise them up as high as you can by contracting your abs. Lower them slowly.', pro_tip: 'To prevent swinging, engage your lats by slightly pulling your shoulder blades down. Initiate the movement by tilting your pelvis upwards, not by swinging your legs.', video_url: 'https://www.youtube.com/embed/Pr1ieGZ5atk', workout_name: 'Lower Body B', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Sit at the machine with the pads on your knees and the balls of your feet on the platform. Raise your heels up by flexing your calves, then lower them for a full stretch.', pro_tip: 'The seated calf raise primarily targets the soleus muscle. Because this muscle is made of slow-twitch fibers, it responds well to a slow, controlled tempo and a hard pause at the top.', video_url: 'https://www.youtube.com/embed/YMmgqO8Jo-k', workout_name: 'Lower Body B', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Leg Press', main_muscle: 'Quads, Glutes', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your feet flat on the platform, about shoulder-width apart. Push the platform away until your legs are nearly straight (but not locked), then return to the start.', pro_tip: 'Control the negative. Take at least 2-3 seconds to lower the weight. The muscle-building stimulus from the eccentric (lowering) phase is incredibly powerful.', video_url: 'https://www.youtube.com/embed/p5dCqF7wWUw', workout_name: 'Legs', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Sit in the machine and secure the lap pad. Hook your ankles behind the roller pad. Curl your legs down and back as far as possible, squeezing your hamstrings.', pro_tip: 'To increase hamstring activation, try to ""pull"" with your heels and dorsiflex your feet (point your toes up towards your shins) throughout the movement.', video_url: 'https://www.youtube.com/embed/ELOCsoDSmrg', workout_name: 'Legs', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Leg Extension', main_muscle: 'Quads', type: 'weight', category: 'Bilateral', description: 'Sit on the machine with your shins behind the pad. Extend your legs to lift the weight until they are straight out in front of you. Squeeze your quads at the top.', pro_tip: 'Point your toes slightly outwards to target the vastus medialis (teardrop muscle) near your knee, or slightly inwards to focus more on the outer quad sweep.', video_url: 'https://www.youtube.com/embed/4ZDm5EbiFI8', workout_name: 'Legs', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Smith Machine Lunge', main_muscle: 'Glutes, Quads', type: 'weight', category: 'Unilateral', description: 'Place the bar across your upper back. Step one foot forward into a lunge stance. Lower your back knee towards the floor, then press back up through your front foot.', pro_tip: 'Focus on a ""vertical"" movement path. Think about your torso moving straight up and down, rather than forward and back, to keep the tension on your legs.', video_url: 'https://www.youtube.com/embed/qY7Yo0x5mhE', workout_name: 'Legs', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Calf Raise on Leg Press', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Position your feet at the bottom of the leg press platform with only the balls of your feet on it. Extend your legs, then press through the balls of your feet to lift the weight.', pro_tip: 'For a full range of motion, focus on getting a deep stretch at the bottom (letting your heels drop) and a powerful, paused squeeze at the very top of the movement.', video_url: 'https://www.youtube.com/embed/dhRz1Ns60Zg', workout_name: 'Legs', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Plank', main_muscle: 'Core', type: 'timed', category: 'Bilateral', description: 'Hold a push-up position, but with your weight resting on your forearms instead of your hands. Keep your body in a dead-straight line from your head to your heels.', pro_tip: 'Actively squeeze your glutes and brace your abs as if you\'re about to be punched in the stomach. This creates full-body tension and makes the plank far more effective.', video_url: 'https://www.youtube.com/embed/pSHjTRCQxIw', workout_name: 'Legs', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Cable Glute Kickback', main_muscle: 'Glutes', type: 'weight', category: 'Unilateral', description: 'Attach an ankle strap to a low cable pulley. Facing the machine, kick your leg straight back behind you, squeezing your glute at the top of the movement.', pro_tip: 'Keep your core tight and avoid arching your lower back. The movement should be initiated and finished by a powerful squeeze of your glute, not by swinging your back.', video_url: 'https://www.youtube.com/embed/SqO-VUEak2M', workout_name: 'Legs', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Hanging Leg Raises', main_muscle: 'Abs, Core', type: 'weight', category: 'Bilateral', description: 'Hang from a pull-up bar. Keeping your legs straight (or bent, for an easier version), raise them up as high as you can by contracting your abs. Lower them slowly.', pro_tip: 'To prevent swinging, engage your lats by slightly pulling your shoulder blades down. Initiate the movement by tilting your pelvis upwards, not by swinging your legs.', video_url: 'https://www.youtube.com/embed/Pr1ieGZ5atk', workout_name: 'Legs', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Assisted Pull-up', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Set the machine to the desired assistance level. Grab the handles with an overhand grip. Pull your chest up to the handles, then lower yourself with control.', pro_tip: 'Focus on driving your elbows down towards your hips. The less assistance you use, the harder the exercise becomes. Aim to reduce the assistance weight over time.', video_url: 'https://www.youtube.com/embed/wFj808u2HWU', workout_name: 'Pull', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Chest-Supported Row', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Lie face down on an incline bench holding dumbbells with your arms extended. Row the dumbbells up by pulling your elbows back and squeezing your shoulder blades together.', pro_tip: 'Keep your chest glued to the bench throughout the entire set. This removes all momentum and forces your back muscles to do 100% of the work.', video_url: 'https://www.youtube.com/embed/LuWGKt8B_7o', workout_name: 'Pull', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Lat Pulldown', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Sit down and secure your knees under the pads. Grab the bar with a wide, overhand grip. Pull the bar down to your upper chest, squeezing your back muscles. Slowly return to the start.', pro_tip: 'Instead of just pulling with your arms, think about driving your elbows down and back towards the floor. This will engage your lats much more effectively.', video_url: 'https://www.youtube.com/embed/JGeRYIZdojU', workout_name: 'Pull', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Sit on a bench, dumbbells in hand at your sides, palms facing forward. Keeping your elbows pinned to your sides, curl the weights up towards your shoulders. Squeeze, then lower slowly.', pro_tip: 'As you curl up, slightly rotate your wrists so that your pinky finger is higher than your thumb at the top. This extra twist (supination) creates a stronger bicep peak contraction.', video_url: 'https://www.youtube.com/embed/BsULGO70tcU', workout_name: 'Pull', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Rear Delt Fly', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Using a pec deck machine in reverse, or dumbbells while bent over. Move your arms back and out in a wide arc, focusing on squeezing your rear shoulder muscles and upper back.', pro_tip: 'Keep a slight bend in your elbows and think of leading with your pinky fingers. This helps to minimize tricep and lat involvement and isolate the rear delts.', video_url: 'https://www.youtube.com/embed/1jpBatm8RYw', workout_name: 'Pull', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Face Pulls', main_muscle: 'Rear Delts, Traps', type: 'weight', category: 'Bilateral', description: 'Set a rope on a cable machine at chest height. Pull the rope towards your face, simultaneously pulling the ends apart. Aim to get your hands on either side of your head.', pro_tip: 'Focus on external rotation. At the end of the pull, your knuckles should be pointing towards the ceiling. This is crucial for strengthening the rotator cuff and improving posture.', video_url: 'https://www.youtube.com/embed/rep-qVOkqgk', workout_name: 'Pull', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Kneeling Single-Arm Row', main_muscle: 'Back, Biceps', type: 'weight', category: 'Unilateral', description: 'Kneel with one knee on a bench, placing your hand on the bench for support. Grab a dumbbell with your free hand and pull it up towards your hip, keeping your back straight.', pro_tip: 'Initiate the pull by retracting your scapula (pulling your shoulder blade back) before your arm even starts to bend. This ensures your back muscles are doing the work, not just your bicep.', video_url: 'https://www.youtube.com/embed/pYcpY20QaE8', workout_name: 'Pull', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Dumbbell Shrugs', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Stand holding heavy dumbbells at your sides. Without using your arms, elevate your shoulders straight up towards your ears. Pause at the top, then slowly lower them.', pro_tip: 'Avoid rolling your shoulders forwards or backwards. The movement should be purely vertical (up and down) to safely and effectively target the trapezius muscles.', video_url: 'https://www.youtube.com/embed/8lP_eJvClSA', workout_name: 'Pull', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Dumbbell Press', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Sit on a bench with back support, holding a dumbbell in each hand at shoulder height, palms forward. Press the weights straight overhead. Lower them back down with control.', pro_tip: 'Keep your lower back pressed firmly against the bench pad. Arching your back takes the focus off your shoulders and can lead to injury.', video_url: 'https://www.youtube.com/embed/3GFZpOYu0pQ', workout_name: 'Push', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Flat Dumbbell Bench Press', main_muscle: 'Chest', type: 'weight', category: 'Bilateral', description: 'Lie on a flat bench with a dumbbell in each hand resting on your thighs. Kick the weights up to your chest. Press them up until your arms are extended, then lower them back down.', pro_tip: 'Don\'t let the dumbbells clang together at the top. Stop just short of full extension with the weights about an inch apart to keep constant tension on your chest muscles.', video_url: 'https://www.youtube.com/embed/YwrzZaNqJWU', workout_name: 'Push', min_session_minutes: '0', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Cable Lateral Raise', main_muscle: 'Shoulders', type: 'weight', category: 'Unilateral', description: 'Stand next to a cable machine with the pulley set low. Grab the handle with your outside hand. Raise your arm out to your side until it\'s parallel to the floor, keeping a slight elbow bend.', pro_tip: 'Lead the movement with your elbow, not your hand. Imagine lifting the weight with your elbow, keeping your wrist and hand just along for the ride. This better isolates the side delt.', video_url: 'https://www.youtube.com/embed/Z5FA9aq3L6A', workout_name: 'Push', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Assisted Dips', main_muscle: 'Triceps, Chest', type: 'weight', category: 'Bilateral', description: 'Set the machine\'s assistance level. Place your hands on the bars and your knees on the pad. Lower your body until your elbows are at a 90-degree angle, then press back up.', pro_tip: 'To target your chest, lean your torso forward. To target your triceps, keep your torso as upright and vertical as possible.', video_url: 'https://www.youtube.com/embed/kbmVlw-i0Vs', workout_name: 'Push', min_session_minutes: '30', bonus_for_time_group: '15', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Pec Deck Fly', main_muscle: 'Chest', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your back flat against the pad. Place your forearms on the pads or grab the handles. Squeeze your chest to bring the handles together in front of you.', pro_tip: 'Imagine you have a pen in the middle of your chest that you are trying to squeeze with your pecs on every single repetition. This mind-muscle connection is key.', video_url: 'https://www.youtube.com/embed/jiitI2ma3J4', workout_name: 'Push', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Tricep Rope Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Attach a rope to a high pulley. Grab the rope and push down until your arms are fully extended. At the bottom, pull the rope ends apart.', pro_tip: 'Keep your elbows pinned to your sides as if they were on a hinge. Do not let them drift forward as you push down; this turns the exercise into a chest press.', video_url: 'https://www.youtube.com/embed/2-LAMcpzODU', workout_name: 'Push', min_session_minutes: '45', bonus_for_time_group: '30', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Incline Smith Machine Press', main_muscle: 'Chest, Shoulders', type: 'weight', category: 'Bilateral', description: 'Lie on an incline bench under the bar. Grip the bar slightly wider than your shoulders. Unrack it, lower it to your upper chest, and press it back up until your arms are extended.', pro_tip: 'Tuck your elbows to about a 45-75 degree angle relative to your torso. Flaring them out to 90 degrees puts unnecessary stress on your shoulder joints.', video_url: 'https://www.youtube.com/embed/tLB1XtM21Fk', workout_name: 'Push', min_session_minutes: '60', bonus_for_time_group: '45', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Barbell Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Hinge at your hips with a slight bend in your knees, keeping your back straight. Pull the barbell from the floor towards your lower chest, squeezing your back muscles.', pro_tip: 'Drive your elbows up and back, thinking about pulling them towards the ceiling, not just lifting the weight with your arms.', video_url: 'https://www.youtube.com/embed/FWJR5Ve8bnQ', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Lie on a flat bench, grip the barbell slightly wider than shoulder-width, and lower it to your mid-chest. Press the bar back up until your arms are fully extended.', pro_tip: 'Keep your shoulder blades retracted (squeezed together) and pinned to the bench throughout the entire lift to protect your shoulders and create a stable base.', video_url: 'https://www.youtube.com/embed/rT7DgCr-3pg', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Stand or sit holding a dumbbell in each hand with an underhand grip. Keeping your elbows pinned to your sides, curl the weights up towards your shoulders. Squeeze, then lower slowly.', pro_tip: 'Avoid swinging your body. Control the weight on the way down (the eccentric phase) for at least a 2-3 second count to maximize muscle growth.', video_url: 'https://www.youtube.com/embed/ykJmrZ5v0Oo', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Box Jumps', main_muscle: 'Quadriceps', type: 'timed', category: 'Bilateral', description: 'Stand in front of a sturdy box. Swing your arms and bend your knees to jump explosively onto the center of the box, landing softly in a squat position. Step back down.', pro_tip: 'Focus on a soft, quiet landing. The goal is explosive power on the way up, not a jarring impact on the way down. Step down, don\'t jump down.', video_url: 'https://www.youtube.com/embed/A8_OCd36-2s', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Burpees', main_muscle: 'Full Body', type: 'timed', category: 'Bilateral', description: 'From a standing position, drop into a squat, place your hands on the ground, kick your feet back into a plank, perform a push-up, jump your feet back to your hands, and jump up explosively.', pro_tip: 'Maintain a tight core when you kick your feet back to the plank position to prevent your lower back from sagging.', video_url: 'https://www.youtube.com/embed/auBLPXO8Fww', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Crunches', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Lie on your back with your knees bent and feet flat on the floor. Place your hands behind your head or across your chest and lift your upper back off the floor towards your knees.', pro_tip: 'Focus on lifting with your abs, not pulling with your neck. Keep a space the size of a fist between your chin and your chest.', video_url: 'https://www.youtube.com/embed/Xyd_fa5zoEU', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'With the barbell on the floor, hinge at your hips and bend your knees to grip the bar. Keeping your back straight, lift the weight by driving through your legs and extending your hips and knees simultaneously.', pro_tip: 'Think about \'pushing the floor away\' with your feet rather than \'pulling the bar up\' with your back. This helps engage your legs and glutes correctly.', video_url: 'https://www.youtube.com/embed/VL5Ab0T07e4', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Dips', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Grip parallel bars and press up to support your body weight with straight arms. Lower your body by bending your elbows until your shoulders are slightly below your elbows, then press back up.', pro_tip: 'To target your chest more, lean your torso forward. To target your triceps more, keep your torso as upright as possible.', video_url: 'https://www.youtube.com/embed/_cD4TAk2y0g', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Face Pull', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Set a cable pulley at chest height with a rope attachment. Grab the rope and pull it towards your face, aiming to bring your hands to either side of your head while externally rotating your shoulders.', pro_tip: 'Imagine trying to show off your biceps at the end of the movement. This encourages the proper external rotation that targets the rear delts and rotator cuff muscles.', video_url: 'https://www.youtube.com/embed/eIq5CB9vKd4', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Glute Bridge', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Lie on your back with your knees bent, feet flat on the floor close to your glutes. Drive through your heels to lift your hips off the floor until your body forms a straight line from your shoulders to your knees.', pro_tip: 'Squeeze your glutes powerfully at the top of the movement and hold for a second before slowly lowering your hips back down.', video_url: 'https://www.youtube.com/embed/wPM8icPu6H8', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Hammer Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Stand holding a dumbbell in each hand with a neutral (palms facing each other) grip, like you\'re holding a hammer. Curl the weights up towards your shoulders, keeping your elbows locked at your sides.', pro_tip: 'This exercise targets the brachialis muscle, which can help add thickness to your arm. Keep the neutral grip throughout the entire movement.', video_url: 'https://www.youtube.com/embed/zC3nLlEvin4', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Lie face down on a hamstring curl machine with the pad resting just above your ankles. Curl your legs up towards your glutes, squeezing your hamstrings.', pro_tip: 'Control the negative (lowering) part of the repetition. Resisting the weight on the way down is crucial for hamstring development.', video_url: 'https://www.youtube.com/embed/Fffb1g2iL4Y', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Incline Dumbbell Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Lie on a bench set at a 30-45 degree incline. Hold a dumbbell in each hand at chest level and press them upwards until your arms are fully extended.', pro_tip: 'Don\'t let the dumbbells touch at the top. Keep them slightly apart to maintain constant tension on your upper chest muscles.', video_url: 'https://www.youtube.com/embed/8iPEnn-ltC8', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Jumping Jacks', main_muscle: 'Full Body', type: 'timed', category: 'Bilateral', description: 'Stand with your feet together and arms at your sides. Simultaneously jump your feet out to the sides while raising your arms overhead. Jump back to the starting position.', pro_tip: 'Stay light on the balls of your feet to make the movement more efficient and reduce impact on your joints.', video_url: 'https://www.youtube.com/embed/1b98vrFRiMA', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Kettlebell Swings', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Stand with feet shoulder-width apart, holding a kettlebell with both hands. Hinge at your hips, swing the kettlebell between your legs, then explosively drive your hips forward to swing the weight up to chest level.', pro_tip: 'The power comes from a powerful hip thrust, not from lifting with your arms. Your arms are just there to guide the kettlebell.', video_url: 'https://www.youtube.com/embed/sSESeQoM_1o', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Lateral Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Stand holding a light dumbbell in each hand at your sides. With a slight bend in your elbows, raise your arms out to the sides until they are parallel with the floor.', pro_tip: 'Pour the dumbbells out slightly at the top of the movement, as if you\'re pouring a jug of water. This helps to better isolate the medial deltoid.', video_url: 'https://www.youtube.com/embed/3GFZpOYu0pQ', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Leg Extension', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Sit on the machine with your shins behind the pad. Extend your legs to lift the weight until they are straight out in front of you. Squeeze your quads at the top.', pro_tip: 'Point your toes slightly outwards to target the vastus medialis (teardrop muscle) near your knee, or slightly inwards to focus more on the outer quad sweep.', video_url: 'https://www.youtube.com/embed/YyvSfVjQeL0', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Leg Press', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Sit in the leg press machine with your feet shoulder-width apart on the platform. Lower the platform by bending your knees until they form a 90-degree angle, then press the weight back up.', pro_tip: 'Placing your feet higher on the platform will target your glutes and hamstrings more; placing them lower will target your quads more.', video_url: 'https://www.youtube.com/embed/IZ_9sZt31iA', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Lunges', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Step forward with one leg and lower your hips until both knees are bent at a 90-degree angle. Your front knee should be directly above your ankle, and your back knee should hover just above the ground. Push off your front foot to return to the start.', pro_tip: 'Keep your torso upright and your core engaged to maintain balance throughout the movement.', video_url: 'https://www.youtube.com/embed/QOVaHwm-Q6U', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Stand with a barbell resting on your front shoulders. Press the bar directly overhead until your arms are fully locked out, keeping your core tight.', pro_tip: 'Squeeze your glutes and brace your core as if you\'re about to be punched. This creates a stable base and prevents you from arching your lower back.', video_url: 'https://www.youtube.com/embed/2yjwXTZQDDI', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Plank', main_muscle: 'Core', type: 'timed', category: 'Bilateral', description: 'Hold a push-up position, but with your weight resting on your forearms instead of your hands. Keep your body in a straight line from your head to your heels.', pro_tip: 'Actively squeeze your glutes and abs. Imagine you are trying to pull your elbows and toes towards each other to maximize core engagement.', video_url: 'https://www.youtube.com/embed/ASdvN_XEl_c', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Pull-up', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Hang from a bar with an overhand grip, slightly wider than your shoulders. Pull your body up until your chin is over the bar, then lower yourself back down with control.', pro_tip: 'Initiate the pull by depressing and retracting your shoulder blades, as if you\'re trying to put them in your back pockets. This engages your lats properly.', video_url: 'https://www.youtube.com/embed/eGo4IYlbE5g', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Push-ups', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Start in a high plank position. Lower your body until your chest nearly touches the floor, keeping your elbows tucked in at about a 45-degree angle. Push back up to the starting position.', pro_tip: 'Keep your body in a straight line from head to heels. Don\'t let your hips sag or rise too high.', video_url: 'https://www.youtube.com/embed/IODxDxX7oi4', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Romanian Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Stand holding a barbell or dumbbells in front of your thighs. Keeping your legs almost straight (a soft bend in the knee), hinge at your hips and lower the weight down the front of your legs. Go as low as you can without rounding your back, then drive your hips forward to return to the start.', pro_tip: 'Think about pushing your hips back as far as possible, rather than just bending over. The movement is a hip hinge, not a squat.', video_url: 'https://www.youtube.com/embed/JCX_A_BqR0A', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Russian Twists', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Sit on the floor, lean back with your torso at a 45-degree angle, and lift your feet off the ground. Clasp your hands or hold a weight and twist your torso from side to side.', pro_tip: 'Move slowly and deliberately. The goal is to rotate your torso, not just swing your arms from side to side.', video_url: 'https://www.youtube.com/embed/wkD8rjkodUI', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Seated Cable Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Sit at a cable row machine with your feet on the platform. Grab the handle and pull it towards your abdomen, squeezing your shoulder blades together.', pro_tip: 'Don\'t use momentum by leaning your torso too far back and forth. Keep your back relatively straight and focus on pulling with your back muscles.', video_url: 'https://www.youtube.com/embed/GZbfZ033f74', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Side Plank', main_muscle: 'Core', type: 'timed', category: 'Bilateral', description: 'Lie on your side and prop your body up on your forearm, keeping your feet stacked. Lift your hips until your body is in a straight line from your ankles to your shoulders.', pro_tip: 'Avoid letting your hips drop towards the floor. Actively push your supporting forearm into the ground to keep your shoulder stable and your hips high.', video_url: 'https://www.youtube.com/embed/NXr4Fw8q60o', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Stand with your feet shoulder-width apart. Hinge at your hips and bend your knees to lower your body as if you\'re sitting in an invisible chair. Keep your chest up and back straight. Go as low as you can comfortably, then drive through your heels to return to the start.', pro_tip: 'Imagine you are \'spreading the floor apart\' with your feet. This helps activate your glutes and keeps your knees from caving inward.', video_url: 'https://www.youtube.com/embed/U3mC6_o2o_c', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Standing Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Stand with the balls of your feet on an elevated surface. Lower your heels as far as comfortable, then press up onto your tiptoes, squeezing your calf muscles.', pro_tip: 'Pause and squeeze for a second at the very top of the movement to maximize the contraction in your calves.', video_url: 'https://www.youtube.com/embed/wxwY7GXxL4k', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Tricep Extension', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Sit or stand holding one dumbbell with both hands over your head. Lower the dumbbell behind your head by bending your elbows, then extend your arms to lift it back up.', pro_tip: 'Keep your elbows tucked in and pointing towards the ceiling as much as possible. Don\'t let them flare out to the sides.', video_url: 'https://www.youtube.com/embed/YbX7Wd3S4S4', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Tricep Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Stand in front of a cable machine with a high pulley. Grab the bar or rope attachment with an overhand grip. Keeping your elbows pinned to your sides, push the bar down until your arms are fully extended.', pro_tip: 'Take a step back from the machine and hinge slightly at your hips. This will give you a better range of motion and prevent the weight stack from hitting the top.', video_url: 'https://www.youtube.com/embed/2-LAMcpzODU', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
    { name: 'Wall Sit', main_muscle: 'Quadriceps', type: 'timed', category: 'Bilateral', description: 'Lean with your back flat against a wall. Slide down until your knees are at a 90-degree angle, as if you are sitting in an invisible chair. Hold this position.', pro_tip: 'Ensure your entire back is pressed against the wall and your weight is evenly distributed through your heels. Don\'t rest your hands on your thighs.', video_url: 'https://www.youtube.com/embed/y-wV4VnusdQ', workout_name: 'FALSE', min_session_minutes: '', bonus_for_time_group: '', icon_url: 'https://i.imgur.com/2Y4Y4Y4.png' },
];

const exerciseLibraryData: ExerciseDefFromCSV[] = (() => {
  const uniqueMap = new Map<string, ExerciseDefFromCSV>();
  rawCsvData.forEach(row => {
    const exerciseId = 'ex_' + row.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!uniqueMap.has(exerciseId)) {
      uniqueMap.set(exerciseId, {
        exercise_id: exerciseId,
        name: row.name,
        main_muscle: row.main_muscle,
        type: row.type,
        category: toNullIfEmpty(row.category),
        description: toNullIfEmpty(row.description),
        pro_tip: toNullIfEmpty(row.pro_tip),
        video_url: toNullIfEmpty(row.video_url),
        icon_url: toNullIfEmpty(row.icon_url), // Include icon_url
      });
    }
  });
  return Array.from(uniqueMap.values());
})();

const workoutStructureData: WorkoutStructureEntry[] = (() => {
  const structure: WorkoutStructureEntry[] = [];
  rawCsvData.forEach(row => {
    if (row.workout_name !== 'FALSE') {
      const exerciseId = 'ex_' + row.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      let workoutSplit = '';
      if (['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'].includes(row.workout_name)) {
        workoutSplit = 'ulul';
      } else if (['Push', 'Pull', 'Legs'].includes(row.workout_name)) {
        workoutSplit = 'ppl';
      }

      if (workoutSplit) {
        structure.push({
          exercise_library_id: exerciseId,
          workout_split: workoutSplit,
          workout_name: row.workout_name,
          min_session_minutes: toNullOrNumber(row.min_session_minutes),
          bonus_for_time_group: toNullOrNumber(row.bonus_for_time_group),
        });
      }
    }
  });
  return structure;
})();

// --- Core Logic Functions ---

const synchronizeSourceData = async (supabaseServiceRoleClient: any) => {
    console.log('Synchronizing source data...');

    // 1. Safely wipe and repopulate workout_exercise_structure (this is safe as it has no dependencies)
    const { error: deleteStructureError } = await supabaseServiceRoleClient
        .from('workout_exercise_structure')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Trick to delete all rows
    if (deleteStructureError) throw deleteStructureError;
    console.log('Successfully wiped workout_exercise_structure.');

    const { error: insertStructureError } = await supabaseServiceRoleClient
        .from('workout_exercise_structure')
        .insert(workoutStructureData);
    if (insertStructureError) throw insertStructureError;
    console.log(`Successfully re-inserted ${workoutStructureData.length} workout structure rules.`);

    // 2. Safely upsert global exercises. This will update existing ones and insert new ones without deleting.
    const exercisesToUpsert = exerciseLibraryData.map(ex => ({
        library_id: ex.exercise_id,
        name: ex.name,
        main_muscle: ex.main_muscle,
        type: ex.type,
        category: ex.category,
        description: ex.description,
        pro_tip: ex.pro_tip,
        video_url: ex.video_url,
        icon_url: ex.icon_url, // Include icon_url
        user_id: null
    }));

    const { error: upsertExercisesError } = await supabaseServiceRoleClient
        .from('exercise_definitions')
        .upsert(exercisesToUpsert, { onConflict: 'library_id', ignoreDuplicates: false });
        
    if (upsertExercisesError) {
        console.error("Upsert error details:", upsertExercisesError);
        throw upsertExercisesError;
    }
    console.log(`Successfully synchronized ${exercisesToUpsert.length} global exercises.`);
};

const processSingleChildWorkout = async (
  supabaseServiceRoleClient: any,
  user: any,
  tPath: TPathData,
  workoutName: string,
  workoutSplit: string,
  maxAllowedMinutes: number,
  exerciseLookupMap: Map<string, ExerciseDefinitionForWorkoutGeneration>
) => {
  console.log(`Processing workout: ${workoutName}`);
  
  // 1. Find or Create the child t_path (the individual workout like "Upper Body A")
  let childWorkoutId: string;
  const { data: existingChildWorkout, error: fetchExistingChildError } = await supabaseServiceRoleClient
    .from('t_paths')
    .select('id')
    .eq('user_id', user.id)
    .eq('parent_t_path_id', tPath.id)
    .eq('template_name', workoutName)
    .eq('is_bonus', true)
    .single();

  if (fetchExistingChildError && fetchExistingChildError.code !== 'PGRST116') {
    throw fetchExistingChildError;
  }

  if (existingChildWorkout) {
    childWorkoutId = existingChildWorkout.id;
    console.log(`Found existing child workout ${workoutName} with ID: ${childWorkoutId}`);
  } else {
    const { data: newChildWorkout, error: createChildWorkoutError } = await supabaseServiceRoleClient
      .from('t_paths')
      .insert({
        user_id: user.id,
        parent_t_path_id: tPath.id,
        template_name: workoutName,
        is_bonus: true,
        settings: tPath.settings
      })
      .select('id')
      .single();
    if (createChildWorkoutError) throw createChildWorkoutError;
    childWorkoutId = newChildWorkout.id;
    console.log(`Created new child workout ${workoutName} with ID: ${childWorkoutId}`);
  }

  // 2. Delete all existing exercise links for this child workout to ensure a clean slate.
  const { error: deleteError } = await supabaseServiceRoleClient
      .from('t_path_exercises')
      .delete()
      .eq('template_id', childWorkoutId);
  if (deleteError) throw deleteError;
  console.log(`Cleared existing exercises for workout ${workoutName} (ID: ${childWorkoutId}).`);

  // 3. Determine `desiredDefaultExercises` from workout_exercise_structure
  const { data: structureEntries, error: structureError } = await supabaseServiceRoleClient
    .from('workout_exercise_structure')
    .select('exercise_library_id, min_session_minutes, bonus_for_time_group')
    .eq('workout_split', workoutSplit)
    .eq('workout_name', workoutName)
    .order('min_session_minutes', { ascending: true, nullsFirst: true })
    .order('bonus_for_time_group', { ascending: true, nullsFirst: true });
  if (structureError) throw structureError;

  const exercisesToInsertPayload: { template_id: string; exercise_id: string; order_index: number; is_bonus_exercise: boolean }[] = [];
  for (const entry of structureEntries || []) {
    const exerciseDef = exerciseLookupMap.get(entry.exercise_library_id);
    if (!exerciseDef) {
      console.warn(`Could not find exercise definition for library_id: ${entry.exercise_library_id}. Skipping.`);
      continue;
    }

    const isIncludedAsMain = entry.min_session_minutes !== null && maxAllowedMinutes >= entry.min_session_minutes;
    const isIncludedAsBonus = entry.bonus_for_time_group !== null && maxAllowedMinutes >= entry.bonus_for_time_group;

    if (isIncludedAsMain || isIncludedAsBonus) {
      const isBonus = isIncludedAsBonus && !isIncludedAsMain;
      exercisesToInsertPayload.push({
        template_id: childWorkoutId,
        exercise_id: exerciseDef.id, // Use the ID from exercise_definitions, which is the global ID
        order_index: isBonus ? (entry.bonus_for_time_group || 0) : (entry.min_session_minutes || 0),
        is_bonus_exercise: isBonus,
      });
    }
  }

  // 4. Sort and re-index before inserting
  exercisesToInsertPayload.sort((a, b) => a.order_index - b.order_index);
  exercisesToInsertPayload.forEach((ex, i) => {
    ex.order_index = i;
  });

  console.log(`Prepared ${exercisesToInsertPayload.length} exercises for insertion into ${workoutName}.`);

  // 5. Perform a single bulk insert.
  if (exercisesToInsertPayload.length > 0) {
    const { error: insertError } = await supabaseServiceRoleClient
      .from('t_path_exercises')
      .insert(exercisesToInsertPayload);
    if (insertError) throw insertError;
    console.log(`Successfully inserted exercises for workout ${workoutName}.`);
  }

  return { id: childWorkoutId, template_name: workoutName };
};

// --- Main Serve Function ---
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Edge Function: generate-t-path started.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header missing');

    const { supabaseAuthClient, supabaseServiceRoleClient } = getSupabaseClients(authHeader);

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');
    console.log(`User authenticated: ${user.id}`);

    const { tPathId } = await req.json();
    if (!tPathId) throw new Error('tPathId is required');
    console.log(`Received tPathId (main T-Path ID): ${tPathId}`);

    // Step 1: SYNCHRONIZE SOURCE DATA
    await synchronizeSourceData(supabaseServiceRoleClient);

    // Step 2: Fetch T-Path details and user's preferred session length
    const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient
      .from('t_paths')
      .select('id, template_name, settings, user_id')
      .eq('id', tPathId)
      .eq('user_id', user.id)
      .single();
    if (tPathError) throw tPathError;
    if (!tPathData) throw new Error('Main T-Path not found or does not belong to user.');
    const tPath: TPathData = tPathData;

    const { data: profileData, error: profileError } = await supabaseServiceRoleClient
      .from('profiles')
      .select('preferred_session_length')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    const preferredSessionLength = profileData?.preferred_session_length;

    const tPathSettings = tPath.settings as { tPathType?: string };
    if (!tPathSettings || !tPathSettings.tPathType) throw new Error('Invalid T-Path settings.');
    
    const workoutSplit = tPathSettings.tPathType;
    const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);
    console.log(`Workout split: ${workoutSplit}, Max Minutes: ${maxAllowedMinutes}`);

    const workoutNames = getWorkoutNamesForSplit(workoutSplit);

    // Step 3: Fetch all user-owned and global exercises for efficient lookup
    const { data: allUserAndGlobalExercises, error: fetchAllExercisesError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .select('id, library_id, user_id, icon_url') // Include icon_url
      .or(`user_id.eq.${user.id},user_id.is.null`);
    if (fetchAllExercisesError) throw fetchAllExercisesError;
    const exerciseLookupMap = new Map<string, ExerciseDefinitionForWorkoutGeneration>();
    (allUserAndGlobalExercises as ExerciseDefinitionForWorkoutGeneration[]).forEach(ex => {
      exerciseLookupMap.set(ex.id, ex);
      if (ex.library_id) {
        exerciseLookupMap.set(ex.library_id, ex); // Also map by library_id for structure lookup
      }
    });
    console.log(`Fetched ${exerciseLookupMap.size} user and global exercises for lookup.`);

    // Step 4: Process each workout (child T-Path)
    const generatedWorkouts = [];
    for (const workoutName of workoutNames) {
      const result = await processSingleChildWorkout(
        supabaseServiceRoleClient,
        user,
        tPath,
        workoutName,
        workoutSplit,
        maxAllowedMinutes,
        exerciseLookupMap
      );
      generatedWorkouts.push(result);
    }

    console.log('Edge Function: generate-t-path finished successfully.');
    return new Response(
      JSON.stringify({ message: 'T-Path generated successfully', workouts: generatedWorkouts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    console.error('Unhandled error in generate-t-path edge function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});