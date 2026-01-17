-- Gym Analysis Rate Limiting
-- Migration: 20250117_add_gym_analysis_rate_limiting
-- Prevents spam and abuse of gym photo analysis feature

-- =========================================
-- TABLE: gym_analysis_usage_logs
-- Tracks gym photo analysis usage per user
-- =========================================
CREATE TABLE IF NOT EXISTS gym_analysis_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL,

    -- Usage details
    image_count INTEGER NOT NULL, -- Number of images analyzed
    analysis_successful BOOLEAN DEFAULT true,

    -- Metadata
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_gym_analysis_usage_user_time 
ON gym_analysis_usage_logs(user_id, used_at DESC);

-- =========================================
-- RLS (Row Level Security) Policies
-- =========================================

-- Enable RLS on the table
ALTER TABLE gym_analysis_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage logs
CREATE POLICY "Users can view own gym analysis usage" ON gym_analysis_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert logs (for edge function)
CREATE POLICY "Service role can insert gym analysis usage" ON gym_analysis_usage_logs
    FOR INSERT WITH CHECK (true);

-- =========================================
-- MIGRATION COMPLETE
-- =========================================
