-- Migration to update exercise definitions to use canonical muscle group names
-- This ensures consistency with the MUSCLE_GROUPS constant in the app

-- Update 'Chest' to 'Pectorals'
UPDATE exercise_definitions
SET main_muscle = REPLACE(main_muscle, 'Chest', 'Pectorals')
WHERE main_muscle LIKE '%Chest%';

-- Update 'Upper Chest' to 'Pectorals' (if any remain after the above)
UPDATE exercise_definitions
SET main_muscle = REPLACE(main_muscle, 'Upper Pectorals', 'Pectorals')
WHERE main_muscle LIKE '%Upper Pectorals%';

-- Update 'Shoulders' to 'Deltoids'
UPDATE exercise_definitions
SET main_muscle = REPLACE(main_muscle, 'Shoulders', 'Deltoids')
WHERE main_muscle LIKE '%Shoulders%'
AND main_muscle NOT LIKE '%Deltoids%';

-- Update 'Abs' to 'Abdominals' (but preserve 'Core' and 'Abdominals')
UPDATE exercise_definitions
SET main_muscle = REPLACE(main_muscle, ', Abs', ', Abdominals')
WHERE main_muscle LIKE '%, Abs%'
OR main_muscle LIKE '%, Abs';

UPDATE exercise_definitions
SET main_muscle = REPLACE(main_muscle, 'Abs,', 'Abdominals,')
WHERE main_muscle LIKE 'Abs,%';

UPDATE exercise_definitions
SET main_muscle = 'Abdominals'
WHERE main_muscle = 'Abs';

-- Clean up any double replacements or formatting issues
UPDATE exercise_definitions
SET main_muscle = TRIM(main_muscle)
WHERE main_muscle LIKE ' %' OR main_muscle LIKE '% ';

-- Log the changes (for verification)
-- You can check the results with:
-- SELECT id, name, main_muscle FROM exercise_definitions WHERE main_muscle LIKE '%Pectorals%' OR main_muscle LIKE '%Deltoids%' OR main_muscle LIKE '%Abdominals%';
