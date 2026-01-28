-- Migration to populate movement_pattern based on main_muscle
-- This ensures exercises are correctly categorized for Push/Pull/Legs workouts

-- Push exercises: Pectorals, Deltoids (front/side), Triceps
UPDATE exercise_definitions
SET movement_pattern = 'Push'
WHERE movement_pattern IS NULL
AND (
  main_muscle LIKE '%Pectorals%'
  OR main_muscle LIKE '%Deltoids%'
  OR main_muscle LIKE '%Triceps%'
  OR main_muscle LIKE '%Chest%' -- fallback for any missed normalizations
  OR main_muscle LIKE '%Shoulders%' -- fallback for any missed normalizations
);

-- Pull exercises: Lats, Traps, Biceps, Rear Deltoids
UPDATE exercise_definitions
SET movement_pattern = 'Pull'
WHERE movement_pattern IS NULL
AND (
  main_muscle LIKE '%Lats%'
  OR main_muscle LIKE '%Traps%'
  OR main_muscle LIKE '%Biceps%'
  OR main_muscle LIKE '%Back%' -- fallback
  OR main_muscle LIKE '%Rhomboids%'
  OR main_muscle LIKE '%Erector Spinae%'
);

-- Legs exercises: Quadriceps, Hamstrings, Glutes, Calves
UPDATE exercise_definitions
SET movement_pattern = 'Legs'
WHERE movement_pattern IS NULL
AND (
  main_muscle LIKE '%Quadriceps%'
  OR main_muscle LIKE '%Hamstrings%'
  OR main_muscle LIKE '%Glutes%'
  OR main_muscle LIKE '%Calves%'
  OR main_muscle LIKE '%Quads%' -- fallback
  OR main_muscle LIKE '%Hip Flexors%'
  OR main_muscle LIKE '%Adductors%'
  OR main_muscle LIKE '%Abductors%'
);

-- For Core/Abdominals: Assign to Push (common convention, or can be distributed)
UPDATE exercise_definitions
SET movement_pattern = 'Push'
WHERE movement_pattern IS NULL
AND (
  main_muscle LIKE '%Abdominals%'
  OR main_muscle LIKE '%Core%'
  OR main_muscle LIKE '%Abs%'
  OR main_muscle LIKE '%Obliques%'
);

-- Full Body exercises: Distribute or assign to Push as default
UPDATE exercise_definitions
SET movement_pattern = 'Push'
WHERE movement_pattern IS NULL
AND main_muscle LIKE '%Full Body%';

-- Any remaining exercises without movement_pattern: assign to Push as default
-- (This ensures no exercises are left unassigned)
UPDATE exercise_definitions
SET movement_pattern = 'Push'
WHERE movement_pattern IS NULL
AND main_muscle IS NOT NULL;

-- Verify the results
DO $$
DECLARE
  push_count INTEGER;
  pull_count INTEGER;
  legs_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO push_count FROM exercise_definitions WHERE movement_pattern = 'Push';
  SELECT COUNT(*) INTO pull_count FROM exercise_definitions WHERE movement_pattern = 'Pull';
  SELECT COUNT(*) INTO legs_count FROM exercise_definitions WHERE movement_pattern = 'Legs';
  SELECT COUNT(*) INTO null_count FROM exercise_definitions WHERE movement_pattern IS NULL;
  
  RAISE NOTICE 'Movement pattern assignment complete:';
  RAISE NOTICE '  Push exercises: %', push_count;
  RAISE NOTICE '  Pull exercises: %', pull_count;
  RAISE NOTICE '  Legs exercises: %', legs_count;
  RAISE NOTICE '  NULL movement_pattern: %', null_count;
  
  IF push_count < 12 THEN
    RAISE WARNING 'Push exercises (%) are below recommended count of 12 for 60-90 min workouts', push_count;
  END IF;
  
  IF pull_count < 12 THEN
    RAISE WARNING 'Pull exercises (%) are below recommended count of 12 for 60-90 min workouts', pull_count;
  END IF;
  
  IF legs_count < 12 THEN
    RAISE WARNING 'Legs exercises (%) are below recommended count of 12 for 60-90 min workouts', legs_count;
  END IF;
END $$;
