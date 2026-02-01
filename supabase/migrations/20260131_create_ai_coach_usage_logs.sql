-- Create ai_coach_usage_logs table for tracking daily AI coach usage
CREATE TABLE IF NOT EXISTS ai_coach_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for efficient daily usage queries
CREATE INDEX IF NOT EXISTS idx_ai_coach_usage_logs_user_date
  ON ai_coach_usage_logs(user_id, used_at DESC);

-- Enable RLS
ALTER TABLE ai_coach_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own usage logs
CREATE POLICY "Users can view own AI coach usage logs"
  ON ai_coach_usage_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert usage logs (edge functions)
CREATE POLICY "Service role can insert AI coach usage logs"
  ON ai_coach_usage_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
