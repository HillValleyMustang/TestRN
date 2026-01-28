-- Ensure each user can only have ONE main t-path
-- Main t-paths are identified by parent_t_path_id IS NULL

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_main_tpath_per_user 
ON t_paths (user_id) 
WHERE parent_t_path_id IS NULL;

-- Add comment for future developers
COMMENT ON INDEX idx_one_main_tpath_per_user IS 
'Ensures each user has exactly one main t-path (parent_t_path_id IS NULL). Main t-paths should have gym_id = NULL.';
