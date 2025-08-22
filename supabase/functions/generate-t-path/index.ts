// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define types for the data we're fetching and inserting
interface ExerciseDef {
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
  exercise_library_id: string; // This is the exercise_library_id
  workout_split: string;
  workout_name: string;
  min_session_minutes: number | null;
  bonus_for_time_group: number | null;
}

// Helper to convert CSV string to null if empty
const toNullIfEmpty = (str: string | null | undefined) => (str === '' || str === undefined) ? null : str;

// Raw data from the provided CSV
const rawCsvData = [
  { name: 'Incline Smith Machine Press', main_muscle: 'Chest, Shoulders', type: 'weight', category: 'Bilateral', description: 'Lie on an incline bench under the bar. Grip the bar slightly wider than your shoulders. Unrack it, lower it to your upper chest, and press it back up until your arms are extended.', pro_tip: 'Tuck your elbows to about a 45-75 degree angle relative to your torso. Flaring them out to 90 degrees puts unnecessary stress on your shoulder joints.', video_url: 'https://www.youtube.com/embed/tLB1XtM21Fk', workout_name: 'Upper Body A', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Lat Pulldown', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Sit down and secure your knees under the pads. Grab the bar with a wide, overhand grip. Pull the bar down to your upper chest, squeezing your back muscles. Slowly return to the start.', pro_tip: 'Instead of just pulling with your arms, think about driving your elbows down and back towards the floor. This will engage your lats much more effectively.', video_url: 'https://www.youtube.com/embed/JGeRYIZdojU', workout_name: 'Upper Body A', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Seated Dumbbell Press', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Sit on a bench with back support, holding a dumbbell in each hand at shoulder height, palms forward. Press the weights straight overhead. Lower them back down with control.', pro_tip: 'Keep your lower back pressed firmly against the bench pad. Arching your back takes the focus off your shoulders and can lead to injury.', video_url: 'https://www.youtube.com/embed/3GFZpOYu0pQ', workout_name: 'Upper Body A', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Seated Machine Row', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Sit at the machine with your chest against the pad. Grab the handles and pull them towards your lower ribs, squeezing your shoulder blades together. Slowly extend your arms to return.', pro_tip: 'At the peak of the movement, pause for a full second and squeeze your back muscles as hard as you can. The quality of the contraction is more important than the weight.', video_url: 'https://www.youtube.com/embed/TeFo51Q_Nsc', workout_name: 'Upper Body A', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Cable Lateral Raise', main_muscle: 'Shoulders', type: 'weight', category: 'Unilateral', description: 'Stand next to a cable machine with the pulley set low. Grab the handle with your outside hand. Raise your arm out to your side until it\'s parallel to the floor, keeping a slight elbow bend.', pro_tip: 'Lead the movement with your elbow, not your hand. Imagine lifting the weight with your elbow, keeping your wrist and hand just along for the ride. This better isolates the side delt.', video_url: 'https://www.youtube.com/embed/Z5FA9aq3L6A', workout_name: 'Upper Body A', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Seated Dumbbell Flyes', main_muscle: 'Chest', type: 'weight', category: 'Bilateral', description: 'Sit on a flat bench, holding dumbbells above your chest with palms facing each other. With a slight, fixed bend in your elbows, lower the weights in a wide arc until you feel a stretch.', pro_tip: 'Think of hugging a giant tree. Avoid pressing the weight up; the goal is to squeeze your chest to bring your arms back together in that same wide arc.', video_url: 'https://www.youtube.com/embed/eozdVDA78K0', workout_name: 'Upper Body A', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Seated Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Sit on a bench, dumbbells in hand at your sides, palms facing forward. Keeping your elbows pinned to your sides, curl the weights up towards your shoulders. Squeeze, then lower slowly.', pro_tip: 'As you curl up, slightly rotate your wrists so that your pinky finger is higher than your thumb at the top. This extra twist (supination) creates a stronger bicep peak contraction.', video_url: 'https://www.youtube.com/embed/BsULGO70tcU', workout_name: 'Upper Body A', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Face Pulls', main_muscle: 'Rear Delts, Traps', type: 'weight', category: 'Bilateral', description: 'Set a rope on a cable machine at chest height. Pull the rope towards your face, simultaneously pulling the ends apart. Aim to get your hands on either side of your head.', pro_tip: 'Focus on external rotation. At the end of the pull, your knuckles should be pointing towards the ceiling. This is crucial for strengthening the rotator cuff and improving posture.', video_url: 'https://www.youtube.com/embed/rep-qVOkqgk', workout_name: 'Upper Body A', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Dumbbell Shrugs', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Stand holding heavy dumbbells at your sides. Without using your arms, elevate your shoulders straight up towards your ears. Pause at the top, then slowly lower them.', pro_tip: 'Avoid rolling your shoulders forwards or backwards. The movement should be purely vertical (up and down) to safely and effectively target the trapezius muscles.', video_url: 'https://www.youtube.com/embed/8lP_eJvClSA', workout_name: 'Upper Body A', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Leg Press', main_muscle: 'Quads, Glutes', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your feet flat on the platform, about shoulder-width apart. Push the platform away until your legs are nearly straight (but not locked), then return to the start.', pro_tip: 'Control the negative. Take at least 2-3 seconds to lower the weight. The muscle-building stimulus from the eccentric (lowering) phase is incredibly powerful.', video_url: 'https://www.youtube.com/embed/p5dCqF7wWUw', workout_name: 'Lower Body A', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Leg Extension', main_muscle: 'Quads', type: 'weight', category: 'Bilateral', description: 'Sit on the machine with your shins behind the pad. Extend your legs to lift the weight until they are straight out in front of you. Squeeze your quads at the top.', pro_tip: 'Point your toes slightly outwards to target the vastus medialis (teardrop muscle) near your knee, or slightly inwards to focus more on the outer quad sweep.', video_url: 'https://www.youtube.com/embed/4ZDm5EbiFI8', workout_name: 'Lower Body A', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Seated Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Sit in the machine and secure the lap pad. Hook your ankles behind the roller pad. Curl your legs down and back as far as possible, squeezing your hamstrings.', pro_tip: 'To increase hamstring activation, try to ""pull"" with your heels and dorsiflex your feet (point your toes up towards your shins) throughout the movement.', video_url: 'https://www.youtube.com/embed/ELOCsoDSmrg', workout_name: 'Lower Body A', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Hip Adduction', main_muscle: 'Inner Thighs', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your legs on the inside of the pads. Squeeze your legs together against the resistance. Control the movement as you return to the starting position.', pro_tip: 'Pause and hold the squeezed position for a 1-2 second count on every single rep to maximize tension on the inner thigh muscles.', video_url: 'https://www.youtube.com/embed/CjAVezAggkI', workout_name: 'Lower Body A', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Hip Abduction', main_muscle: 'Outer Glutes', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your legs on the outside of the pads. Push your legs apart against the resistance. Control the movement as you return to the starting position.', pro_tip: 'Hinge forward slightly at the hips and keep your glutes pressed into the seat. This angle can help to better target the gluteus medius and minimus.', video_url: 'https://www.youtube.com/embed/G_8LItOiZ0Q', workout_name: 'Lower Body A', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Calf Raise on Leg Press', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Position your feet at the bottom of the leg press platform with only the balls of your feet on it. Extend your legs, then press through the balls of your feet to lift the weight.', pro_tip: 'For a full range of motion, focus on getting a deep stretch at the bottom (letting your heels drop) and a powerful, paused squeeze at the very top of the movement.', video_url: 'https://www.youtube.com/embed/dhRz1Ns60Zg', workout_name: 'Lower Body A', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Cable Crunches', main_muscle: 'Abs', type: 'weight', category: 'Bilateral', description: 'Kneel facing a high-pulley cable machine with a rope attachment. Holding the rope on either side of your head, crunch your chest towards your knees, engaging your abs.', pro_tip: 'Don\'t pull with your arms. Your hands should stay fixed by your head. The movement should come from contracting your abs and flexing your spine, like you\'re trying to roll into a ball.', video_url: 'https://www.youtube.com/embed/3qjoXDTuyOE', workout_name: 'Lower Body A', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Plank', main_muscle: 'Core', type: 'timed', category: 'Bilateral', description: 'Hold a push-up position, but with your weight resting on your forearms instead of your hands. Keep your body in a dead-straight line from your head to your heels.', pro_tip: 'Actively squeeze your glutes and brace your abs as if you\'re about to be punched in the stomach. This creates full-body tension and makes the plank far more effective.', video_url: 'https://www.youtube.com/embed/pSHjTRCQxIw', workout_name: 'Lower Body A', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Assisted Pull-up', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Set the machine to the desired assistance level. Grab the handles with an overhand grip. Pull your chest up to the handles, then lower yourself with control.', pro_tip: 'Focus on driving your elbows down towards your hips. The less assistance you use, the harder the exercise becomes. Aim to reduce the assistance weight over time.', video_url: 'https://www.youtube.com/embed/wFj808u2HWU', workout_name: 'Upper Body B', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Flat Dumbbell Bench Press', main_muscle: 'Chest', type: 'weight', category: 'Bilateral', description: 'Lie on a flat bench with a dumbbell in each hand resting on your thighs. Kick the weights up to your chest. Press them up until your arms are extended, then lower them back down.', pro_tip: 'Don\'t let the dumbbells clang together at the top. Stop just short of full extension with the weights about an inch apart to keep constant tension on your chest muscles.', video_url: 'https://www.youtube.com/embed/YwrzZaNqJWU', workout_name: 'Upper Body B', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Chest-Supported Row', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Lie face down on an incline bench holding dumbbells with your arms extended. Row the dumbbells up by pulling your elbows back and squeezing your shoulder blades together.', pro_tip: 'Keep your chest glued to the bench throughout the entire set. This removes all momentum and forces your back muscles to do 100% of the work.', video_url: 'https://www.youtube.com/embed/LuWGKt8B_7o', workout_name: 'Upper Body B', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Pec Deck Fly', main_muscle: 'Chest', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your back flat against the pad. Place your forearms on the pads or grab the handles. Squeeze your chest to bring the handles together in front of you.', pro_tip: 'Imagine you have a pen in the middle of your chest that you are trying to squeeze with your pecs on every single repetition. This mind-muscle connection is key.', video_url: 'https://www.youtube.com/embed/jiitI2ma3J4', workout_name: 'Upper Body B', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Rear Delt Fly', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Using a pec deck machine in reverse, or dumbbells while bent over. Move your arms back and out in a wide arc, focusing on squeezing your rear shoulder muscles and upper back.', pro_tip: 'Keep a slight bend in your elbows and think of leading with your pinky fingers. This helps to minimize tricep and lat involvement and isolate the rear delts.', video_url: 'https://www.youtube.com/embed/1jpBatm8RYw', workout_name: 'Upper Body B', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Assisted Dips', main_muscle: 'Triceps, Chest', type: 'weight', category: 'Bilateral', description: 'Set the machine\'s assistance level. Place your hands on the bars and your knees on the pad. Lower your body until your elbows are at a 90-degree angle, then press back up.', pro_tip: 'To target your chest, lean your torso forward. To target your triceps, keep your torso as upright and vertical as possible.', video_url: 'https://www.youtube.com/embed/kbmVlw-i0Vs', workout_name: 'Upper Body B', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Kneeling Single-Arm Row', main_muscle: 'Back, Biceps', type: 'weight', category: 'Unilateral', description: 'Kneel with one knee on a bench, placing your hand on the bench for support. Grab a dumbbell with your free hand and pull it up towards your hip, keeping your back straight.', pro_tip: 'Initiate the pull by retracting your scapula (pulling your shoulder blade back) before your arm even starts to bend. This ensures your back muscles are doing the work, not just your bicep.', video_url: 'https://www.youtube.com/embed/pYcpY20QaE8', workout_name: 'Upper Body B', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Cable Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Unilateral', description: 'Stand facing a cable machine with a straight or EZ bar attached to the low pulley. Grab the bar and perform a bicep curl, keeping your elbows locked at your sides.', pro_tip: 'Take a step back from the machine. This ensures there is tension on the bicep throughout the entire range of motion, even at the very bottom of the rep.', video_url: 'https://www.youtube.com/embed/NFzTWp2qpiE', workout_name: 'Upper Body B', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Tricep Rope Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Attach a rope to a high pulley. Grab the rope and push down until your arms are fully extended. At the bottom, pull the rope ends apart.', pro_tip: 'Keep your elbows pinned to your sides as if they were on a hinge. Do not let them drift forward as you push down; this turns the exercise into a chest press.', video_url: 'https://www.youtube.com/embed/2-LAMcpzODU', workout_name: 'Upper Body B', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Smith Machine Lunge', main_muscle: 'Glutes, Quads', type: 'weight', category: 'Unilateral', description: 'Place the bar across your upper back. Step one foot forward into a lunge stance. Lower your back knee towards the floor, then press back up through your front foot.', pro_tip: 'Focus on a ""vertical"" movement path. Think about your torso moving straight up and down, rather than forward and back, to keep the tension on your legs.', video_url: 'https://www.youtube.com/embed/qY7Yo0x5mhE', workout_name: 'Lower Body B', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Leg Press (Narrow Stance)', main_muscle: 'Quads', type: 'weight', category: 'Bilateral', description: 'Sit in the machine and place your feet in the middle of the platform, only a few inches apart. Push the platform away until your legs are nearly straight, then return to the start.', pro_tip: 'This stance heavily targets the outer quads (vastus lateralis). To maximize this, consciously try to push through the outer edges of your feet as you press the weight.', video_url: 'https://www.youtube.com/embed/IZxyjW7MPJQ', workout_name: 'Lower Body B', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Cable Glute Kickback', main_muscle: 'Glutes', type: 'weight', category: 'Unilateral', description: 'Attach an ankle strap to a low cable pulley. Facing the machine, kick your leg straight back behind you, squeezing your glute at the top of the movement.', pro_tip: 'Keep your core tight and avoid arching your lower back. The movement should be initiated and finished by a powerful squeeze of your glute, not by swinging your back.', video_url: 'https://www.youtube.com/embed/SqO-VUEak2M', workout_name: 'Lower Body B', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Leg Extension', main_muscle: 'Quads', type: 'weight', category: 'Bilateral', description: 'Sit on the machine with your shins behind the pad. Extend your legs to lift the weight until they are straight out in front of you. Squeeze your quads at the top.', pro_tip: 'At the top of the rep, hold the contraction for a 2-second count while actively flexing your quad muscles as hard as you can before lowering the weight slowly.', video_url: 'https://www.youtube.com/embed/4ZDm5EbiFI8', workout_name: 'Lower Body B', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Seated Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Sit in the machine and secure the lap pad. Hook your ankles behind the roller pad. Curl your legs down and back as far as possible, squeezing your hamstrings.', pro_tip: 'Experiment with pointing your toes. Pointing them slightly inwards can engage the inner hamstring more, while pointing them slightly outwards can hit the outer hamstring.', video_url: 'https://www.youtube.com/embed/ELOCsoDSmrg', workout_name: 'Lower Body B', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Calf Raise on Smith Machine', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Stand on a small block or plate under the Smith machine bar, with the bar across your shoulders. Press up through the balls of your feet, then lower your heels below the block.', pro_tip: 'Control the eccentric (lowering) portion of the rep. Take 3-4 seconds to lower your heels and feel a deep stretch in your calves before exploding back up.', video_url: 'https://www.youtube.com/embed/FNdI5TynYxs', workout_name: 'Lower Body B', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Hanging Leg Raises', main_muscle: 'Abs, Core', type: 'weight', category: 'Bilateral', description: 'Hang from a pull-up bar. Keeping your legs straight (or bent, for an easier version), raise them up as high as you can by contracting your abs. Lower them slowly.', pro_tip: 'To prevent swinging, engage your lats by slightly pulling your shoulder blades down. Initiate the movement by tilting your pelvis upwards, not by swinging your legs.', video_url: 'https://www.youtube.com/embed/Pr1ieGZ5atk', workout_name: 'Lower Body B', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Seated Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Sit at the machine with the pads on your knees and the balls of your feet on the platform. Raise your heels up by flexing your calves, then lower them for a full stretch.', pro_tip: 'The seated calf raise primarily targets the soleus muscle. Because this muscle is made of slow-twitch fibers, it responds well to a slow, controlled tempo and a hard pause at the top.', video_url: 'https://www.youtube.com/embed/YMmgqO8Jo-k', workout_name: 'Lower Body B', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Leg Press', main_muscle: 'Quads, Glutes', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your feet flat on the platform, about shoulder-width apart. Push the platform away until your legs are nearly straight (but not locked), then return to the start.', pro_tip: 'Control the negative. Take at least 2-3 seconds to lower the weight. The muscle-building stimulus from the eccentric (lowering) phase is incredibly powerful.', video_url: 'https://www.youtube.com/embed/p5dCqF7wWUw', workout_name: 'Legs', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Seated Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Sit in the machine and secure the lap pad. Hook your ankles behind the roller pad. Curl your legs down and back as far as possible, squeezing your hamstrings.', pro_tip: 'To increase hamstring activation, try to ""pull"" with your heels and dorsiflex your feet (point your toes up towards your shins) throughout the movement.', video_url: 'https://www.youtube.com/embed/ELOCsoDSmrg', workout_name: 'Legs', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Leg Extension', main_muscle: 'Quads', type: 'weight', category: 'Bilateral', description: 'Sit on the machine with your shins behind the pad. Extend your legs to lift the weight until they are straight out in front of you. Squeeze your quads at the top.', pro_tip: 'Point your toes slightly outwards to target the vastus medialis (teardrop muscle) near your knee, or slightly inwards to focus more on the outer quad sweep.', video_url: 'https://www.youtube.com/embed/4ZDm5EbiFI8', workout_name: 'Legs', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Smith Machine Lunge', main_muscle: 'Glutes, Quads', type: 'weight', category: 'Unilateral', description: 'Place the bar across your upper back. Step one foot forward into a lunge stance. Lower your back knee towards the floor, then press back up through your front foot.', pro_tip: 'Focus on a ""vertical"" movement path. Think about your torso moving straight up and down, rather than forward and back, to keep the tension on your legs.', video_url: 'https://www.youtube.com/embed/qY7Yo0x5mhE', workout_name: 'Legs', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Calf Raise on Leg Press', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Position your feet at the bottom of the leg press platform with only the balls of your feet on it. Extend your legs, then press through the balls of your feet to lift the weight.', pro_tip: 'For a full range of motion, focus on getting a deep stretch at the bottom (letting your heels drop) and a powerful, paused squeeze at the very top of the movement.', video_url: 'https://www.youtube.com/embed/dhRz1Ns60Zg', workout_name: 'Legs', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Plank', main_muscle: 'Core', type: 'timed', category: 'Bilateral', description: 'Hold a push-up position, but with your weight resting on your forearms instead of your hands. Keep your body in a dead-straight line from your head to your heels.', pro_tip: 'Actively squeeze your glutes and brace your abs as if you\'re about to be punched in the stomach. This creates full-body tension and makes the plank far more effective.', video_url: 'https://www.youtube.com/embed/pSHjTRCQxIw', workout_name: 'Legs', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Cable Glute Kickback', main_muscle: 'Glutes', type: 'weight', category: 'Unilateral', description: 'Attach an ankle strap to a low cable pulley. Facing the machine, kick your leg straight back behind you, squeezing your glute at the top of the movement.', pro_tip: 'Keep your core tight and avoid arching your lower back. The movement should be initiated and finished by a powerful squeeze of your glute, not by swinging your back.', video_url: 'https://www.youtube.com/embed/SqO-VUEak2M', workout_name: 'Legs', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Hanging Leg Raises', main_muscle: 'Abs, Core', type: 'weight', category: 'Bilateral', description: 'Hang from a pull-up bar. Keeping your legs straight (or bent, for an easier version), raise them up as high as you can by contracting your abs. Lower them slowly.', pro_tip: 'To prevent swinging, engage your lats by slightly pulling your shoulder blades down. Initiate the movement by tilting your pelvis upwards, not by swinging your legs.', video_url: 'https://www.youtube.com/embed/Pr1ieGZ5atk', workout_name: 'Legs', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Assisted Pull-up', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Set the machine to the desired assistance level. Grab the handles with an overhand grip. Pull your chest up to the handles, then lower yourself with control.', pro_tip: 'Focus on driving your elbows down towards your hips. The less assistance you use, the harder the exercise becomes. Aim to reduce the assistance weight over time.', video_url: 'https://www.youtube.com/embed/wFj808u2HWU', workout_name: 'Pull', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Chest-Supported Row', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Lie face down on an incline bench holding dumbbells with your arms extended. Row the dumbbells up by pulling your elbows back and squeezing your shoulder blades together.', pro_tip: 'Keep your chest glued to the bench throughout the entire set. This removes all momentum and forces your back muscles to do 100% of the work.', video_url: 'https://www.youtube.com/embed/LuWGKt8B_7o', workout_name: 'Pull', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Lat Pulldown', main_muscle: 'Back, Biceps', type: 'weight', category: 'Bilateral', description: 'Sit down and secure your knees under the pads. Grab the bar with a wide, overhand grip. Pull the bar down to your upper chest, squeezing your back muscles. Slowly return to the start.', pro_tip: 'Instead of just pulling with your arms, think about driving your elbows down and back towards the floor. This will engage your lats much more effectively.', video_url: 'https://www.youtube.com/embed/JGeRYIZdojU', workout_name: 'Pull', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Seated Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Sit on a bench, dumbbells in hand at your sides, palms facing forward. Keeping your elbows pinned to your sides, curl the weights up towards your shoulders. Squeeze, then lower slowly.', pro_tip: 'As you curl up, slightly rotate your wrists so that your pinky finger is higher than your thumb at the top. This extra twist (supination) creates a stronger bicep peak contraction.', video_url: 'https://www.youtube.com/embed/BsULGO70tcU', workout_name: 'Pull', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Rear Delt Fly', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Using a pec deck machine in reverse, or dumbbells while bent over. Move your arms back and out in a wide arc, focusing on squeezing your rear shoulder muscles and upper back.', pro_tip: 'Keep a slight bend in your elbows and think of leading with your pinky fingers. This helps to minimize tricep and lat involvement and isolate the rear delts.', video_url: 'https://www.youtube.com/embed/1jpBatm8RYw', workout_name: 'Pull', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Face Pulls', main_muscle: 'Rear Delts, Traps', type: 'weight', category: 'Bilateral', description: 'Set a rope on a cable machine at chest height. Pull the rope towards your face, simultaneously pulling the ends apart. Aim to get your hands on either side of your head.', pro_tip: 'Focus on external rotation. At the end of the pull, your knuckles should be pointing towards the ceiling. This is crucial for strengthening the rotator cuff and improving posture.', video_url: 'https://www.youtube.com/embed/rep-qVOkqgk', workout_name: 'Pull', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Kneeling Single-Arm Row', main_muscle: 'Back, Biceps', type: 'weight', category: 'Unilateral', description: 'Kneel with one knee on a bench, placing your hand on the bench for support. Grab a dumbbell with your free hand and pull it up towards your hip, keeping your back straight.', pro_tip: 'Initiate the pull by retracting your scapula (pulling your shoulder blade back) before your arm even starts to bend. This ensures your back muscles are doing the work, not just your bicep.', video_url: 'https://www.youtube.com/embed/pYcpY20QaE8', workout_name: 'Pull', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Dumbbell Shrugs', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Stand holding heavy dumbbells at your sides. Without using your arms, elevate your shoulders straight up towards your ears. Pause at the top, then slowly lower them.', pro_tip: 'Avoid rolling your shoulders forwards or backwards. The movement should be purely vertical (up and down) to safely and effectively target the trapezius muscles.', video_url: 'https://www.youtube.com/embed/8lP_eJvClSA', workout_name: 'Pull', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Seated Dumbbell Press', main_muscle: 'Shoulders', type: 'weight', category: 'Bilateral', description: 'Sit on a bench with back support, holding a dumbbell in each hand at shoulder height, palms forward. Press the weights straight overhead. Lower them back down with control.', pro_tip: 'Keep your lower back pressed firmly against the bench pad. Arching your back takes the focus off your shoulders and can lead to injury.', video_url: 'https://www.youtube.com/embed/3GFZpOYu0pQ', workout_name: 'Push', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Flat Dumbbell Bench Press', main_muscle: 'Chest', type: 'weight', category: 'Bilateral', description: 'Lie on a flat bench with a dumbbell in each hand resting on your thighs. Kick the weights up to your chest. Press them up until your arms are extended, then lower them back down.', pro_tip: 'Don\'t let the dumbbells clang together at the top. Stop just short of full extension with the weights about an inch apart to keep constant tension on your chest muscles.', video_url: 'https://www.youtube.com/embed/YwrzZaNqJWU', workout_name: 'Push', min_session_minutes: 0, bonus_for_time_group: null },
  { name: 'Cable Lateral Raise', main_muscle: 'Shoulders', type: 'weight', category: 'Unilateral', description: 'Stand next to a cable machine with the pulley set low. Grab the handle with your outside hand. Raise your arm out to your side until it\'s parallel to the floor, keeping a slight elbow bend.', pro_tip: 'Lead the movement with your elbow, not your hand. Imagine lifting the weight with your elbow, keeping your wrist and hand just along for the ride. This better isolates the side delt.', video_url: 'https://www.youtube.com/embed/Z5FA9aq3L6A', workout_name: 'Push', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Assisted Dips', main_muscle: 'Triceps, Chest', type: 'weight', category: 'Bilateral', description: 'Set the machine\'s assistance level. Place your hands on the bars and your knees on the pad. Lower your body until your elbows are at a 90-degree angle, then press back up.', pro_tip: 'To target your chest, lean your torso forward. To target your triceps, keep your torso as upright and vertical as possible.', video_url: 'https://www.youtube.com/embed/kbmVlw-i0Vs', workout_name: 'Push', min_session_minutes: 30, bonus_for_time_group: 15 },
  { name: 'Pec Deck Fly', main_muscle: 'Chest', type: 'weight', category: 'Bilateral', description: 'Sit in the machine with your back flat against the pad. Place your forearms on the pads or grab the handles. Squeeze your chest to bring the handles together in front of you.', pro_tip: 'Imagine you have a pen in the middle of your chest that you are trying to squeeze with your pecs on every single repetition. This mind-muscle connection is key.', video_url: 'https://www.youtube.com/embed/jiitI2ma3J4', workout_name: 'Push', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Tricep Rope Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Attach a rope to a high pulley. Grab the rope and push down until your arms are fully extended. At the bottom, pull the rope ends apart.', pro_tip: 'Keep your elbows pinned to your sides as if they were on a hinge. Do not let them drift forward as you push down; this turns the exercise into a chest press.', video_url: 'https://www.youtube.com/embed/2-LAMcpzODU', workout_name: 'Push', min_session_minutes: 45, bonus_for_time_group: 30 },
  { name: 'Incline Smith Machine Press', main_muscle: 'Chest, Shoulders', type: 'weight', category: 'Bilateral', description: 'Lie on an incline bench under the bar. Grip the bar slightly wider than your shoulders. Unrack it, lower it to your upper chest, and press it back up until your arms are extended.', pro_tip: 'Tuck your elbows to about a 45-75 degree angle relative to your torso. Flaring them out to 90 degrees puts unnecessary stress on your shoulder joints.', video_url: 'https://www.youtube.com/embed/tLB1XtM21Fk', workout_name: 'Push', min_session_minutes: 60, bonus_for_time_group: 45 },
  { name: 'Barbell Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Hinge at your hips with a slight bend in your knees, keeping your back straight. Pull the barbell from the floor towards your lower chest, squeezing your back muscles.', pro_tip: 'Drive your elbows up and back, thinking about pulling them towards the ceiling, not just lifting the weight with your arms.', video_url: 'https://www.youtube.com/embed/FWJR5Ve8bnQ', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Bench Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Lie on a flat bench, grip the barbell slightly wider than shoulder-width, and lower it to your mid-chest. Press the bar back up until your arms are fully extended.', pro_tip: 'Keep your shoulder blades retracted (squeezed together) and pinned to the bench throughout the entire lift to protect your shoulders and create a stable base.', video_url: 'https://www.youtube.com/embed/rT7DgCr-3pg', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Bicep Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Stand or sit holding a dumbbell in each hand with an underhand grip. Keeping your elbows pinned to your sides, curl the weights up towards your shoulders. Squeeze, then lower slowly.', pro_tip: 'Avoid swinging your body. Control the weight on the way down (the eccentric phase) for at least a 2-3 second count to maximize muscle growth.', video_url: 'https://www.youtube.com/embed/ykJmrZ5v0Oo', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Box Jumps', main_muscle: 'Quadriceps', type: 'timed', category: 'Bilateral', description: 'Stand in front of a sturdy box. Swing your arms and bend your knees to jump explosively onto the center of the box, landing softly in a squat position. Step back down.', pro_tip: 'Focus on a soft, quiet landing. The goal is explosive power on the way up, not a jarring impact on the way down. Step down, don\'t jump down.', video_url: 'https://www.youtube.com/embed/A8_OCd36-2s', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Burpees', main_muscle: 'Full Body', type: 'timed', category: 'Bilateral', description: 'From a standing position, drop into a squat, place your hands on the ground, kick your feet back into a plank, perform a push-up, jump your feet back to your hands, and jump up explosively.', pro_tip: 'Maintain a tight core when you kick your feet back to the plank position to prevent your lower back from sagging.', video_url: 'https://www.youtube.com/embed/auBLPXO8Fww', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Crunches', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Lie on your back with your knees bent and feet flat on the floor. Place your hands behind your head or across your chest and lift your upper back off the floor towards your knees.', pro_tip: 'Focus on lifting with your abs, not pulling with your neck. Keep a space the size of a fist between your chin and your chest.', video_url: 'https://www.youtube.com/embed/Xyd_fa5zoEU', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'With the barbell on the floor, hinge at your hips and bend your knees to grip the bar. Keeping your back straight, lift the weight by driving through your legs and extending your hips and knees simultaneously.', pro_tip: 'Think about \'pushing the floor away\' with your feet rather than \'pulling the bar up\' with your back. This helps engage your legs and glutes correctly.', video_url: 'https://www.youtube.com/embed/VL5Ab0T07e4', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Dips', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Grip parallel bars and press up to support your body weight with straight arms. Lower your body by bending your elbows until your shoulders are slightly below your elbows, then press back up.', pro_tip: 'To target your chest more, lean your torso forward. To target your triceps more, keep your torso as upright as possible.', video_url: 'https://www.youtube.com/embed/_cD4TAk2y0g', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Face Pull', main_muscle: 'Traps', type: 'weight', category: 'Bilateral', description: 'Set a cable pulley at chest height with a rope attachment. Grab the rope and pull it towards your face, aiming to bring your hands to either side of your head while externally rotating your shoulders.', pro_tip: 'Imagine trying to show off your biceps at the end of the movement. This encourages the proper external rotation that targets the rear delts and rotator cuff muscles.', video_url: 'https://www.youtube.com/embed/eIq5CB9vKd4', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Glute Bridge', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Lie on your back with your knees bent, feet flat on the floor close to your glutes. Drive through your heels to lift your hips off the floor until your body forms a straight line from your shoulders to your knees.', pro_tip: 'Squeeze your glutes powerfully at the top of the movement and hold for a second before slowly lowering your hips back down.', video_url: 'https://www.youtube.com/embed/wPM8icPu6H8', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Hammer Curl', main_muscle: 'Biceps', type: 'weight', category: 'Bilateral', description: 'Stand holding a dumbbell in each hand with a neutral (palms facing each other) grip, like you\'re holding a hammer. Curl the weights up towards your shoulders, keeping your elbows locked at your sides.', pro_tip: 'This exercise targets the brachialis muscle, which can help add thickness to your arm. Keep the neutral grip throughout the entire movement.', video_url: 'https://www.youtube.com/embed/zC3nLlEvin4', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Hamstring Curl', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Lie face down on a hamstring curl machine with the pad resting just above your ankles. Curl your legs up towards your glutes, squeezing your hamstrings.', pro_tip: 'Control the negative (lowering) part of the repetition. Resisting the weight on the way down is crucial for hamstring development.', video_url: 'https://www.youtube.com/embed/Fffb1g2iL4Y', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Incline Dumbbell Press', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Lie on a bench set at a 30-45 degree incline. Hold a dumbbell in each hand at chest level and press them upwards until your arms are fully extended.', pro_tip: 'Don\'t let the dumbbells touch at the top. Keep them slightly apart to maintain constant tension on your upper chest muscles.', video_url: 'https://www.youtube.com/embed/8iPEnn-ltC8', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Jumping Jacks', main_muscle: 'Full Body', type: 'timed', category: 'Bilateral', description: 'Stand with your feet together and arms at your sides. Simultaneously jump your feet out to the sides while raising your arms overhead. Jump back to the starting position.', pro_tip: 'Stay light on the balls of your feet to make the movement more efficient and reduce impact on your joints.', video_url: 'https://www.youtube.com/embed/1b98vrFRiMA', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Kettlebell Swings', main_muscle: 'Glutes', type: 'weight', category: 'Bilateral', description: 'Stand with feet shoulder-width apart, holding a kettlebell with both hands. Hinge at your hips, swing the kettlebell between your legs, then explosively drive your hips forward to swing the weight up to chest level.', pro_tip: 'The power comes from a powerful hip thrust, not from lifting with your arms. Your arms are just there to guide the kettlebell.', video_url: 'https://www.youtube.com/embed/sSESeQoM_1o', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Lateral Raise', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Stand holding a light dumbbell in each hand at your sides. With a slight bend in your elbows, raise your arms out to the sides until they are parallel with the floor.', pro_tip: 'Pour the dumbbells out slightly at the top of the movement, as if you\'re pouring a jug of water. This helps to better isolate the medial deltoid.', video_url: 'https://www.youtube.com/embed/3GFZpOYu0pQ', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Leg Extension', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Sit on the machine with your shins behind the pad. Extend your legs to lift the weight until they are straight out in front of you. Squeeze your quads at the top.', pro_tip: 'Point your toes slightly outwards to target the vastus medialis (teardrop muscle) near your knee, or slightly inwards to focus more on the outer quad sweep.', video_url: 'https://www.youtube.com/embed/YyvSfVjQeL0', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Leg Press', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Sit in the leg press machine with your feet shoulder-width apart on the platform. Lower the platform by bending your knees until they form a 90-degree angle, then press the weight back up.', pro_tip: 'Placing your feet higher on the platform will target your glutes and hamstrings more; placing them lower will target your quads more.', video_url: 'https://www.youtube.com/embed/IZ_9sZt31iA', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Lunges', main_muscle: 'Quadriceps', type: 'weight', category: 'Unilateral', description: 'Step forward with one leg and lower your hips until both knees are bent at a 90-degree angle. Your front knee should be directly above your ankle, and your back knee should hover just above the ground. Push off your front foot to return to the start.', pro_tip: 'Keep your torso upright and your core engaged to maintain balance throughout the movement.', video_url: 'https://www.youtube.com/embed/QOVaHwm-Q6U', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Overhead Press', main_muscle: 'Deltoids', type: 'weight', category: 'Bilateral', description: 'Stand with a barbell resting on your front shoulders. Press the bar directly overhead until your arms are fully locked out, keeping your core tight.', pro_tip: 'Squeeze your glutes and brace your core as if you\'re about to be punched. This creates a stable base and prevents you from arching your lower back.', video_url: 'https://www.youtube.com/embed/2yjwXTZQDDI', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Plank', main_muscle: 'Core', type: 'timed', category: 'Bilateral', description: 'Hold a push-up position, but with your weight resting on your forearms instead of your hands. Keep your body in a straight line from your head to your heels.', pro_tip: 'Actively squeeze your glutes and abs. Imagine you are trying to pull your elbows and toes towards each other to maximize core engagement.', video_url: 'https://www.youtube.com/embed/ASdvN_XEl_c', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Pull-up', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Hang from a bar with an overhand grip, slightly wider than your shoulders. Pull your body up until your chin is over the bar, then lower yourself back down with control.', pro_tip: 'Initiate the pull by depressing and retracting your shoulder blades, as if you\'re trying to put them in your back pockets. This engages your lats properly.', video_url: 'https://www.youtube.com/embed/eGo4IYlbE5g', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Push-ups', main_muscle: 'Pectorals', type: 'weight', category: 'Bilateral', description: 'Start in a high plank position. Lower your body until your chest nearly touches the floor, keeping your elbows tucked in at about a 45-degree angle. Push back up to the starting position.', pro_tip: 'Keep your body in a straight line from head to heels. Don\'t let your hips sag or rise too high.', video_url: 'https://www.youtube.com/embed/IODxDxX7oi4', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Romanian Deadlift', main_muscle: 'Hamstrings', type: 'weight', category: 'Bilateral', description: 'Stand holding a barbell or dumbbells in front of your thighs. Keeping your legs almost straight (a soft bend in the knee), hinge at your hips and lower the weight down the front of your legs. Go as low as you can without rounding your back, then drive your hips forward to return to the start.', pro_tip: 'Think about pushing your hips back as far as possible, rather than just bending over. The movement is a hip hinge, not a squat.', video_url: 'https://www.youtube.com/embed/JCX_A_BqR0A', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Russian Twists', main_muscle: 'Abdominals', type: 'weight', category: 'Bilateral', description: 'Sit on the floor, lean back with your torso at a 45-degree angle, and lift your feet off the ground. Clasp your hands or hold a weight and twist your torso from side to side.', pro_tip: 'Move slowly and deliberately. The goal is to rotate your torso, not just swing your arms from side to side.', video_url: 'https://www.youtube.com/embed/wkD8rjkodUI', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Seated Cable Row', main_muscle: 'Lats', type: 'weight', category: 'Bilateral', description: 'Sit at a cable row machine with your feet on the platform. Grab the handle and pull it towards your abdomen, squeezing your shoulder blades together.', pro_tip: 'Don\'t use momentum by leaning your torso too far back and forth. Keep your back relatively straight and focus on pulling with your back muscles.', video_url: 'https://www.youtube.com/embed/GZbfZ033f74', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Side Plank', main_muscle: 'Core', type: 'timed', category: 'Bilateral', description: 'Lie on your side and prop your body up on your forearm, keeping your feet stacked. Lift your hips until your body is in a straight line from your ankles to your shoulders.', pro_tip: 'Avoid letting your hips drop towards the floor. Actively push your supporting forearm into the ground to keep your shoulder stable and your hips high.', video_url: 'https://www.youtube.com/embed/NXr4Fw8q60o', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Squat', main_muscle: 'Quadriceps', type: 'weight', category: 'Bilateral', description: 'Stand with your feet shoulder-width apart. Hinge at your hips and bend your knees to lower your body as if you\'re sitting in an invisible chair. Keep your chest up and back straight. Go as low as you can comfortably, then drive through your heels to return to the start.', pro_tip: 'Imagine you are \'spreading the floor apart\' with your feet. This helps activate your glutes and keeps your knees from caving inward.', video_url: 'https://www.youtube.com/embed/U3mC6_o2o_c', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Standing Calf Raise', main_muscle: 'Calves', type: 'weight', category: 'Bilateral', description: 'Stand with the balls of your feet on an elevated surface. Lower your heels as far as comfortable, then press up onto your tiptoes, squeezing your calf muscles.', pro_tip: 'Pause and squeeze for a second at the very top of the movement to maximize the contraction in your calves.', video_url: 'https://www.youtube.com/embed/wxwY7GXxL4k', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Tricep Extension', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Sit or stand holding one dumbbell with both hands over your head. Lower the dumbbell behind your head by bending your elbows, then extend your arms to lift it back up.', pro_tip: 'Keep your elbows tucked in and pointing towards the ceiling as much as possible. Don\'t let them flare out to the sides.', video_url: 'https://www.youtube.com/embed/YbX7Wd3S4S4', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Tricep Pushdown', main_muscle: 'Triceps', type: 'weight', category: 'Bilateral', description: 'Stand in front of a cable machine with a high pulley. Grab the bar or rope attachment with an overhand grip. Keeping your elbows pinned to your sides, push the bar down until your arms are fully extended.', pro_tip: 'Take a step back from the machine and hinge slightly at your hips. This will give you a better range of motion and prevent the weight stack from hitting the top.', video_url: 'https://www.youtube.com/embed/2-LAMcpzODU', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
  { name: 'Wall Sit', main_muscle: 'Quadriceps', type: 'timed', category: 'Bilateral', description: 'Lean with your back flat against a wall. Slide down until your knees are at a 90-degree angle, as if you are sitting in an invisible chair. Hold this position.', pro_tip: 'Ensure your entire back is pressed against the wall and your weight is evenly distributed through your heels. Don\'t rest your hands on your thighs.', video_url: 'https://www.youtube.com/embed/y-wV4VnusdQ', workout_name: 'FALSE', min_session_minutes: null, bonus_for_time_group: null },
];

// ALL exercises from the CSV, regardless of workout_name. This populates exercise_definitions.
const uniqueExercisesMap = new Map<string, ExerciseDef>();
rawCsvData.forEach(row => {
  const exerciseId = 'ex_' + row.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (!uniqueExercisesMap.has(exerciseId)) {
    uniqueExercisesMap.set(exerciseId, {
      exercise_id: exerciseId,
      name: row.name,
      main_muscle: row.main_muscle,
      type: row.type,
      category: toNullIfEmpty(row.category),
      description: toNullIfEmpty(row.description),
      pro_tip: toNullIfEmpty(row.pro_tip),
      video_url: toNullIfEmpty(row.video_url),
    });
  }
});
const exerciseLibraryData: ExerciseDef[] = Array.from(uniqueExercisesMap.values());

// ONLY exercises that are part of default workouts. This populates workout_exercise_structure.
const workoutStructureData: WorkoutStructureEntry[] = [];
rawCsvData.forEach(row => {
  if (row.workout_name !== 'FALSE') {
    const exerciseId = 'ex_' + row.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    let workoutSplit = '';
    if (['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'].includes(row.workout_name)) {
      workoutSplit = 'ulul';
    } else if (['Push', 'Pull', 'Legs'].includes(row.workout_name)) {
      workoutSplit = 'ppl';
    }

    if (workoutSplit) { // Only add if a valid split is determined
      workoutStructureData.push({
        exercise_library_id: exerciseId, // Corrected property name
        workout_split: workoutSplit,
        workout_name: row.workout_name,
        min_session_minutes: row.min_session_minutes,
        bonus_for_time_group: row.bonus_for_time_group,
      });
    }
  }
});

// Helper to get max minutes from sessionLength string
function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90; // Default to longest if unknown or null
  }
}

// Helper function to initialize Supabase clients
const getSupabaseClients = (authHeader: string) => {
  // @ts-ignore
  const supabaseUrl = (Deno.env as any).get('SUPABASE_URL') ?? '';
  // @ts-ignore
  const supabaseAnonKey = (Deno.env as any).get('SUPABASE_ANON_KEY') ?? '';
  // @ts-ignore
  const supabaseServiceRoleKey = (Deno.env as any).get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabaseAuthClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    { global: { headers: { Authorization: authHeader } } }
  );

  const supabaseServiceRoleClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey
  );

  return { supabaseAuthClient, supabaseServiceRoleClient };
};

// Helper function to upsert exercise definitions manually
const upsertExerciseDefinitions = async (supabaseServiceRoleClient: any) => {
  console.log('Starting manual upsert of exercise_definitions...');
  for (const ex of exerciseLibraryData) {
    // 1. Check if an exercise with this library_id already exists
    const { data: existingExercise, error: selectError } = await supabaseServiceRoleClient
      .from('exercise_definitions')
      .select('id')
      .eq('library_id', ex.exercise_id)
      .is('user_id', null) // Ensure we're checking against global exercises
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
      console.error(`Error checking for existing exercise ${ex.name}:`, selectError.message);
      throw selectError;
    }

    const exerciseData = {
      library_id: ex.exercise_id,
      name: ex.name,
      main_muscle: ex.main_muscle,
      type: ex.type,
      category: ex.category,
      description: ex.description,
      pro_tip: ex.pro_tip,
      video_url: ex.video_url,
      user_id: null
    };

    if (existingExercise) {
      // 2a. If it exists, update it
      const { error: updateError } = await supabaseServiceRoleClient
        .from('exercise_definitions')
        .update(exerciseData)
        .eq('id', existingExercise.id);
      
      if (updateError) {
        console.error(`Error updating exercise definition ${ex.name}:`, updateError.message);
        throw updateError;
      }
    } else {
      // 2b. If it does not exist, insert it
      const { error: insertError } = await supabaseServiceRoleClient
        .from('exercise_definitions')
        .insert(exerciseData);

      if (insertError) {
        console.error(`Error inserting exercise definition ${ex.name}:`, insertError.message);
        throw insertError;
      }
    }
  }
  console.log('Finished manual upsert of exercise_definitions.');
};

// Helper function to upsert workout exercise structure
const upsertWorkoutExerciseStructure = async (supabaseServiceRoleClient: any) => {
  console.log('Starting upsert of workout_exercise_structure...');
  for (const ws of workoutStructureData) {
    const { error: upsertError } = await supabaseServiceRoleClient
      .from('workout_exercise_structure')
      .upsert({
        exercise_library_id: ws.exercise_library_id,
        workout_split: ws.workout_split,
        workout_name: ws.workout_name,
        min_session_minutes: ws.min_session_minutes,
        bonus_for_time_group: ws.bonus_for_time_group,
      }, { onConflict: 'exercise_library_id,workout_split,workout_name' });

    if (upsertError) {
      console.error(`Error upserting workout structure entry for ${ws.exercise_library_id} in ${ws.workout_name}:`, upsertError.message);
      throw upsertError;
    }
  }
  console.log('Finished upsert of workout_exercise_structure.');
};

// Helper function to clean up existing child workouts
const cleanupExistingChildWorkouts = async (supabaseServiceRoleClient: any, tPathId: string, userId: string) => {
  console.log(`Starting cleanup of existing child workouts for parent T-Path ID: ${tPathId} and user: ${userId}`);
  const { data: existingChildWorkouts, error: fetchChildWorkoutsError } = await supabaseServiceRoleClient
    .from('t_paths')
    .select('id')
    .eq('parent_t_path_id', tPathId)
    .eq('is_bonus', true)
    .eq('user_id', userId); // Added user_id filter for safety

  if (fetchChildWorkoutsError) {
    console.error('Error fetching existing child workouts for cleanup:', fetchChildWorkoutsError.message);
    throw fetchChildWorkoutsError;
  }

  if (existingChildWorkouts && existingChildWorkouts.length > 0) {
    const childWorkoutIdsToDelete = existingChildWorkouts.map((w: { id: string }) => w.id);
    console.log(`Found existing child workouts to delete: ${childWorkoutIdsToDelete.join(', ')}`);

    // Delete associated t_path_exercises first
    const { error: deleteTPathExercisesError } = await supabaseServiceRoleClient
      .from('t_path_exercises')
      .delete()
      .in('template_id', childWorkoutIdsToDelete);

    if (deleteTPathExercisesError) {
      console.error('Error deleting t_path_exercises for child workouts:', deleteTPathExercisesError.message);
      throw deleteTPathExercisesError;
    }
    console.log(`Deleted associated t_path_exercises.`);

    // Then delete the child workouts themselves
    const { error: deleteWorkoutsError } = await supabaseServiceRoleClient
      .from('t_paths')
      .delete()
      .in('id', childWorkoutIdsToDelete);

    if (deleteWorkoutsError) {
      console.error('Error deleting child workouts:', deleteWorkoutsError.message);
      throw deleteWorkoutsError;
    }
    console.log(`Deleted existing child workouts.`);
  } else {
    console.log('No existing child workouts found for cleanup.');
  }
};

// Main serve function
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Edge Function: generate-t-path started.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Authorization header missing.');
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { supabaseAuthClient, supabaseServiceRoleClient } = getSupabaseClients(authHeader);

    const { data: { user }, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !user) {
      console.error('Unauthorized: No user session found or user fetch error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`User authenticated: ${user.id}`);

    const { tPathId } = await req.json();
    console.log(`Received tPathId (main T-Path ID): ${tPathId}`);

    // --- Step 1: Ensure exercise_definitions and workout_exercise_structure are populated ---
    await upsertExerciseDefinitions(supabaseServiceRoleClient);
    await upsertWorkoutExerciseStructure(supabaseServiceRoleClient);

    // --- Step 2: Fetch T-Path details and user's preferred session length ---
    let tPath;
    let preferredSessionLength: string | null | undefined;

    try {
      console.log(`Fetching main T-Path with ID ${tPathId}...`);
      const { data: tPathData, error: tPathError } = await supabaseServiceRoleClient
        .from('t_paths')
        .select('id, template_name, settings, user_id')
        .eq('id', tPathId)
        .eq('user_id', user.id) // Ensure the main T-Path belongs to the user
        .single();

      if (tPathError) {
        console.error(`Error fetching main T-Path with ID ${tPathId}:`, tPathError.message);
        throw tPathError;
      }
      if (!tPathData) {
        throw new Error('Main T-Path not found in database or does not belong to user.');
      }
      tPath = tPathData;
      console.log(`Fetched main T-Path: ${JSON.stringify(tPath)}`);

      console.log(`Fetching profile for user ID: ${user.id}`);
      const { data: profileData, error: profileError } = await supabaseServiceRoleClient
        .from('profiles')
        .select('preferred_session_length')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error(`Error fetching profile for user ${user.id}:`, profileError.message);
        throw profileError;
      }
      if (!profileData) {
        console.warn(`Profile not found for user ${user.id}. Using default session length.`);
      }
      preferredSessionLength = profileData?.preferred_session_length;
      console.log(`Fetched preferredSessionLength from profile: ${preferredSessionLength}`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Error fetching T-Path or profile: ${errorMessage}`);
      return new Response(JSON.stringify({ error: `Error fetching T-Path or profile: ${errorMessage}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tPathSettings = tPath.settings as { tPathType?: string };
    
    if (!tPathSettings || !tPathSettings.tPathType) {
      console.warn('T-Path settings or tPathType is missing/invalid:', tPathSettings);
      return new Response(JSON.stringify({ error: 'Invalid T-Path settings. Please re-run onboarding.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const workoutSplit = tPathSettings.tPathType;
    const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);
    console.log(`Calculated maxAllowedMinutes: ${maxAllowedMinutes} based on preferredSessionLength: ${preferredSessionLength}`);

    let workoutNames: string[] = [];
    if (workoutSplit === 'ulul') {
      workoutNames = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
    } else if (workoutSplit === 'ppl') {
      workoutNames = ['Push', 'Pull', 'Legs'];
    } else {
      console.warn('Unknown workout split type:', workoutSplit);
      return new Response(JSON.stringify({ error: 'Unknown workout split type.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`Workout split: ${workoutSplit}, Workout names to generate: ${workoutNames.join(', ')}`);

    // --- Cleanup existing child workouts for this T-Path ---
    console.log(`Attempting to clean up existing child workouts for parent T-Path ID: ${tPath.id}`);
    await cleanupExistingChildWorkouts(supabaseServiceRoleClient, tPath.id, user.id); // Pass user.id
    console.log(`Cleanup of existing child workouts for parent T-Path ID: ${tPath.id} completed.`);

    // Create workouts for this T-Path
    const generatedWorkouts = [];
    for (const workoutName of workoutNames) {
      console.log(`Processing workout: ${workoutName}`);
      try {
        const { data: rawStructureEntries, error: structureError } = await supabaseServiceRoleClient
          .from('workout_exercise_structure')
          .select('exercise_library_id, min_session_minutes, bonus_for_time_group')
          .eq('workout_split', workoutSplit)
          .eq('workout_name', workoutName)
          .order('min_session_minutes', { ascending: true, nullsFirst: false })
          .order('bonus_for_time_group', { ascending: true, nullsFirst: false });

        if (structureError) {
          console.error(`Error fetching raw workout structure for ${workoutName}:`, structureError.message);
          throw structureError;
        }
        console.log(`Fetched ${rawStructureEntries?.length || 0} structure entries for ${workoutName}. Raw entries: ${JSON.stringify(rawStructureEntries)}`);

        const exercisesToInclude = [];
        let mainExerciseCount = 0;
        let bonusExerciseCount = 0;

        for (const entry of rawStructureEntries || []) {
          const { data: exerciseDefData, error: exerciseDefError } = await supabaseServiceRoleClient
            .from('exercise_definitions')
            .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id')
            .eq('library_id', entry.exercise_library_id)
            .single();

          if (exerciseDefError) {
            console.warn(`Could not find exercise definition for library_id: ${entry.exercise_library_id}. Error: ${exerciseDefError.message}`);
            continue;
          }
          if (!exerciseDefData) {
            console.warn(`Exercise definition data is null for library_id: ${entry.exercise_library_id}. Skipping.`);
            continue;
          }

          const actualExercise = exerciseDefData;

          // ** THE FIX: Simplified and corrected inclusion logic **
          const inclusionThreshold = entry.min_session_minutes;
          console.log(`  Exercise: ${actualExercise.name}, inclusionThreshold: ${inclusionThreshold}, maxAllowedMinutes: ${maxAllowedMinutes}`);

          if (inclusionThreshold !== null && inclusionThreshold <= maxAllowedMinutes) {
            const isBonus = entry.bonus_for_time_group !== null;
            const orderCriteriaValue = isBonus ? entry.bonus_for_time_group : entry.min_session_minutes;

            exercisesToInclude.push({
              exercise_id: actualExercise.id,
              is_bonus_exercise: isBonus,
              order_criteria: orderCriteriaValue,
              original_order: exercisesToInclude.length
            });

            if (isBonus) bonusExerciseCount++;
            else mainExerciseCount++;
            console.log(`    -> Included: ${actualExercise.name} (ID: ${actualExercise.id}) as ${isBonus ? 'Bonus' : 'Main'}`);
          } else {
            console.log(`    -> Excluded: ${actualExercise.name}`);
          }
        }

        exercisesToInclude.sort((a, b) => {
          if (a.is_bonus_exercise === b.is_bonus_exercise) {
            return (a.order_criteria || 0) - (b.order_criteria || 0) || a.original_order - b.original_order;
          }
          return a.is_bonus_exercise ? 1 : -1;
        });

        console.log(`Workout ${workoutName}: ${mainExerciseCount} main exercises, ${bonusExerciseCount} bonus exercises selected. Total: ${exercisesToInclude.length}. Exercises to include: ${JSON.stringify(exercisesToInclude)}`);

        if (exercisesToInclude.length === 0) {
          console.warn(`No exercises selected for workout ${workoutName} based on session length ${maxAllowedMinutes}. Skipping workout creation.`);
          continue;
        }

        console.log(`Inserting child workout ${workoutName}...`);
        const { data: workout, error: workoutError } = await supabaseServiceRoleClient
          .from('t_paths')
          .insert({
            user_id: user.id,
            parent_t_path_id: tPath.id,
            template_name: workoutName,
            is_bonus: true,
            version: 1,
            settings: tPathSettings
          })
          .select('id')
          .single();

        if (workoutError) {
          console.error(`Error inserting workout ${workoutName}:`, workoutError.message);
          throw workoutError;
        }
        if (!workout) {
          throw new Error(`Failed to retrieve new workout data for ${workoutName}.`);
        }
        generatedWorkouts.push(workout);
        console.log(`Child workout ${workoutName} inserted with ID: ${workout.id}`);

        const tPathExercisesToInsert = exercisesToInclude.map((ex, i) => ({
          template_id: workout.id,
          exercise_id: ex.exercise_id,
          order_index: i,
          is_bonus_exercise: ex.is_bonus_exercise,
        }));

        if (tPathExercisesToInsert.length > 0) {
          console.log(`Inserting ${tPathExercisesToInsert.length} exercises for workout ${workoutName}. Data: ${JSON.stringify(tPathExercisesToInsert)}`);
          const { error: insertTPathExercisesError } = await supabaseServiceRoleClient
            .from('t_path_exercises')
            .insert(tPathExercisesToInsert);
          if (insertTPathExercisesError) {
            console.error(`Error inserting t_path_exercises for ${workoutName}:`, insertTPathExercisesError.message);
            throw insertTPathExercisesError;
          }
          console.log(`Exercises for workout ${workoutName} inserted.`);
        } else {
          console.log(`No exercises to insert for workout ${workoutName}.`);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error creating workout ${workoutName} or its exercises: ${errorMessage}`);
        // Do not re-throw here, allow other workouts to be processed if one fails
        // Or, if we want strict failure, re-throw. For now, let's re-throw to ensure full success.
        throw err;
      }
    }

    console.log('Edge Function: generate-t-path finished successfully.');
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