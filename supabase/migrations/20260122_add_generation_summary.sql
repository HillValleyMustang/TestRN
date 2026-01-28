-- Add t_path_generation_summary column to profiles table to store AI insights about workout regeneration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS t_path_generation_summary JSONB;
