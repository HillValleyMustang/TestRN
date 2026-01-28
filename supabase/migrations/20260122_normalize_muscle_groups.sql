-- Normalize muscle group names to match canonical list from exercise creation form
-- Canonical list: Pectorals, Deltoids, Lats, Traps, Biceps, Triceps, Quadriceps, Hamstrings, Glutes, Calves, Abdominals, Core, Full Body
-- This migration normalizes each muscle in comma-separated values and preserves the format

DO $$
DECLARE
  exercise_record RECORD;
  normalized_muscle TEXT;
  muscle_parts TEXT[];
  updated_muscle TEXT;
  i INTEGER;
BEGIN
  -- Loop through all exercises
  FOR exercise_record IN 
    SELECT id, main_muscle
    FROM exercise_definitions
    WHERE main_muscle IS NOT NULL
  LOOP
    -- Handle comma-separated muscle groups
    muscle_parts := string_to_array(exercise_record.main_muscle, ',');
    updated_muscle := '';
    
    -- Normalize each muscle group
    FOR i IN 1..array_length(muscle_parts, 1) LOOP
      normalized_muscle := TRIM(muscle_parts[i]);
      
      -- Map inconsistent names to canonical names
      CASE normalized_muscle
        WHEN 'Abs' THEN normalized_muscle := 'Abdominals';
        WHEN 'Chest' THEN normalized_muscle := 'Pectorals';
        WHEN 'Quads' THEN normalized_muscle := 'Quadriceps';
        WHEN 'Shoulders' THEN normalized_muscle := 'Deltoids';
        WHEN 'Shoulders (Deltoids)' THEN normalized_muscle := 'Deltoids';
        WHEN 'Rear Delts' THEN normalized_muscle := 'Deltoids';
        WHEN 'Outer Glutes' THEN normalized_muscle := 'Glutes';
        WHEN 'Inner Thighs' THEN normalized_muscle := 'Quadriceps';
        WHEN 'Back' THEN normalized_muscle := 'Lats';
        ELSE normalized_muscle := normalized_muscle; -- Keep as-is if already canonical
      END CASE;
      
      -- Build updated muscle string
      IF updated_muscle = '' THEN
        updated_muscle := normalized_muscle;
      ELSE
        updated_muscle := updated_muscle || ', ' || normalized_muscle;
      END IF;
    END LOOP;
    
    -- Update if changed
    IF updated_muscle != exercise_record.main_muscle THEN
      UPDATE exercise_definitions
      SET main_muscle = updated_muscle
      WHERE id = exercise_record.id;
      
      RAISE NOTICE 'Updated exercise %: "%" -> "%"', 
        exercise_record.id, exercise_record.main_muscle, updated_muscle;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Muscle group normalization complete';
END $$;
