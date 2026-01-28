-- This migration consolidates multiple main t-paths per user into ONE main t-path
-- Main t-paths should have gym_id = NULL and parent_t_path_id = NULL

DO $$
DECLARE
  user_record RECORD;
  main_tpath_record RECORD;
  keeper_tpath_id UUID;
  duplicate_tpath_id UUID;
  tpath_count INTEGER;
BEGIN
  -- Loop through each user who has main t-paths
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM t_paths 
    WHERE parent_t_path_id IS NULL
      AND user_id IS NOT NULL
  LOOP
    -- Count main t-paths for this user
    SELECT COUNT(*) INTO tpath_count
    FROM t_paths
    WHERE user_id = user_record.user_id
      AND parent_t_path_id IS NULL;
    
    -- Skip if user has only one main t-path
    CONTINUE WHEN tpath_count <= 1;
    
    RAISE NOTICE 'User % has % main t-paths - consolidating...', 
      user_record.user_id, tpath_count;
    
    -- Find the OLDEST main t-path (most likely to have data)
    -- Order by created_at ASC to get the oldest first
    SELECT id INTO keeper_tpath_id
    FROM t_paths
    WHERE user_id = user_record.user_id
      AND parent_t_path_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF keeper_tpath_id IS NULL THEN
      RAISE WARNING 'Could not find keeper t-path for user %', user_record.user_id;
      CONTINUE;
    END IF;
    
    -- Set keeper t-path's gym_id to NULL (in case it was set)
    UPDATE t_paths 
    SET gym_id = NULL
    WHERE id = keeper_tpath_id;
    
    RAISE NOTICE 'Keeping t-path % and setting gym_id to NULL', keeper_tpath_id;
    
    -- For each duplicate main t-path (all others)
    FOR main_tpath_record IN
      SELECT id
      FROM t_paths
      WHERE user_id = user_record.user_id
        AND parent_t_path_id IS NULL
        AND id != keeper_tpath_id
    LOOP
      duplicate_tpath_id := main_tpath_record.id;
      
      RAISE NOTICE 'Processing duplicate t-path %', duplicate_tpath_id;
      
      -- Re-parent all child workouts to the keeper t-path
      UPDATE t_paths
      SET parent_t_path_id = keeper_tpath_id
      WHERE parent_t_path_id = duplicate_tpath_id;
      
      -- Delete the duplicate main t-path
      DELETE FROM t_paths WHERE id = duplicate_tpath_id;
      
      RAISE NOTICE 'Deleted duplicate t-path %', duplicate_tpath_id;
    END LOOP;
    
    -- Update profile to point to keeper t-path (always update to ensure consistency)
    UPDATE profiles
    SET active_t_path_id = keeper_tpath_id
    WHERE id = user_record.user_id;
    
    RAISE NOTICE 'Updated profile for user % to use t-path %', 
      user_record.user_id, keeper_tpath_id;
  END LOOP;
  
  RAISE NOTICE 'Migration completed successfully';
END $$;
