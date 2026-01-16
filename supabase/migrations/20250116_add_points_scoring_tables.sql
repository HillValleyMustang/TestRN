-- Migration: Add points scoring tables
-- Creates tables for tracking workout volume PRs and weekly completion status

-- Table to track best workout volume per workout type for each user
CREATE TABLE IF NOT EXISTS user_workout_volume_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_type TEXT NOT NULL, -- 'Push', 'Pull', 'Legs', 'Upper Body A', 'Upper Body B', 'Lower Body A', 'Lower Body B'
  best_volume DECIMAL NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, workout_type)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_workout_volume_records_user_id ON user_workout_volume_records(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workout_volume_records_workout_type ON user_workout_volume_records(workout_type);

-- Table to track weekly completion status and point awards/penalties
CREATE TABLE IF NOT EXISTS user_weekly_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Monday of the week (ISO week start)
  programme_type TEXT NOT NULL, -- 'ppl' or 'ulul'
  completed BOOLEAN DEFAULT false,
  points_awarded BOOLEAN DEFAULT false, -- true if +10 bonus awarded
  penalty_applied BOOLEAN DEFAULT false, -- true if -5 penalty applied
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_weekly_completions_user_id ON user_weekly_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_weekly_completions_week_start ON user_weekly_completions(week_start);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_workout_volume_records_updated_at
  BEFORE UPDATE ON user_workout_volume_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_weekly_completions_updated_at
  BEFORE UPDATE ON user_weekly_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable pg_cron extension if not already enabled
-- Note: This requires superuser privileges and may need to be enabled separately
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly completion check to run every Monday at 8:00 AM UTC
-- This will check the previous week's completion status for all users
-- 
-- To enable this cron job, you need:
-- 1. pg_cron extension enabled (requires superuser)
-- 2. Uncomment and run the following command:
--
-- SELECT cron.schedule(
--   'check-weekly-completion',
--   '0 8 * * 1', -- Every Monday at 8:00 AM UTC
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.supabase_url') || '/functions/v1/check-weekly-completion',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
--     ),
--     body := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );
--
-- Note: The above uses Supabase's HTTP extension (net.http_post) which may need to be enabled.
-- Alternatively, you can set up an external cron service (like GitHub Actions, Vercel Cron, etc.)
-- to call the edge function via HTTP: POST to /functions/v1/check-weekly-completion
