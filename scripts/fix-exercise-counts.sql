-- STEP 1: Apply the movement_pattern migration first
-- Run the migration file: 20260122_populate_movement_patterns.sql

-- STEP 2: After migration, verify exercise counts
SELECT 
  movement_pattern,
  COUNT(*) as exercise_count
FROM exercise_definitions
GROUP BY movement_pattern
ORDER BY movement_pattern;

-- Expected output:
-- Push: >= 12 exercises
-- Pull: >= 12 exercises
-- Legs: >= 12 exercises

-- STEP 3: Check current workout exercise counts (before fix)
SELECT 
  tp.template_name as workout_name,
  COUNT(tpe.id) as total_exercises,
  COUNT(CASE WHEN tpe.is_bonus_exercise = false THEN 1 END) as main_exercises,
  COUNT(CASE WHEN tpe.is_bonus_exercise = true THEN 1 END) as bonus_exercises
FROM t_paths tp
LEFT JOIN t_path_exercises tpe ON tp.id = tpe.template_id
WHERE tp.parent_t_path_id IS NOT NULL
GROUP BY tp.id, tp.template_name
ORDER BY tp.template_name;

-- STEP 4: To fix the exercise counts, you need to regenerate your workouts
-- This can be done by:
-- Option A: Call the generate-t-path edge function via your app
-- Option B: Use the mobile app to change your session length back and forth (triggers regeneration)
-- Option C: Delete and recreate child workouts manually (advanced)

-- Verify after regeneration:
-- Expected for 60-90 min workouts:
-- - Push: 10 main + 2 bonus = 12 total
-- - Pull: 10 main + 2 bonus = 12 total
-- - Legs: 10 main + 2 bonus = 12 total
