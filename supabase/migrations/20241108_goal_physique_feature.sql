-- Goal Physique Feature Database Schema
-- Migration: 20241108_goal_physique_feature

-- =========================================
-- TABLE: goal_physiques
-- Stores user's uploaded goal physique photos
-- =========================================
CREATE TABLE IF NOT EXISTS goal_physiques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_photo_path TEXT, -- Local file path on device (for local storage)
  display_name TEXT, -- User-defined name for this goal physique
  is_active BOOLEAN DEFAULT true, -- Whether this is the user's current active goal
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT goal_physiques_user_local_path_unique UNIQUE(user_id, local_photo_path)
);

-- =========================================
-- TABLE: physique_analyses
-- Caches AI analysis results to avoid re-analysis
-- =========================================
CREATE TABLE IF NOT EXISTS physique_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_physique_id UUID NOT NULL REFERENCES goal_physiques(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- AI Analysis Results (structured JSON)
    muscle_mass_level TEXT CHECK (muscle_mass_level IN ('Low', 'Athletic', 'Bodybuilder Elite')),
    body_fat_estimated_range TEXT CHECK (body_fat_estimated_range IN ('<10%', '10-15%', '15%+')),
    dominant_muscle_groups JSONB, -- Array of muscle group names
    physique_archetype TEXT, -- e.g., 'V-Taper', 'Powerlifter', 'Endurance Runner'
    required_training_style TEXT CHECK (required_training_style IN ('Hypertrophy', 'Strength', 'HIIT', 'Mixed')),
    weakness_areas JSONB, -- Array of areas needing development
    estimated_timeframe_months INTEGER,
    difficulty_level TEXT CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced', 'Elite')),
    genetic_considerations TEXT,

    -- AI Safety Flags
    is_elite_physique BOOLEAN DEFAULT false,
    reality_check_notes TEXT,

    -- Metadata
    analysed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_model_version TEXT DEFAULT 'gpt-4-vision',
    analysis_confidence DECIMAL(3,2), -- 0.00 to 1.00

    -- Raw AI response for debugging
    raw_ai_response JSONB,

    -- Constraints and indexes
    CONSTRAINT physique_analyses_goal_unique UNIQUE(goal_physique_id)
);

-- =========================================
-- TABLE: goal_recommendations
-- Stores personalised training recommendations
-- =========================================
CREATE TABLE IF NOT EXISTS goal_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    physique_analysis_id UUID NOT NULL REFERENCES physique_analyses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Recommendation Categories
    category TEXT NOT NULL CHECK (category IN ('training_style', 'exercise_addition', 'rep_range_adjustment', 'frequency_change')),

    -- Recommendation Details
    recommendation_type TEXT NOT NULL, -- e.g., 'add_exercise', 'change_reps', 'switch_style'
    title TEXT NOT NULL, -- Human-readable title
    description TEXT NOT NULL, -- Detailed explanation
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),

    -- Exercise-specific recommendations
    target_muscle_group TEXT, -- e.g., 'Lateral Delts', 'Upper Chest'
    suggested_exercises JSONB, -- Array of exercise IDs/names with rationale
    current_rep_range TEXT, -- e.g., '3-5 reps'
    recommended_rep_range TEXT, -- e.g., '8-12 reps'

    -- Training style changes
    current_training_style TEXT,
    recommended_training_style TEXT,

    -- Implementation status
    is_accepted BOOLEAN DEFAULT false,
    is_implemented BOOLEAN DEFAULT false,
    implemented_at TIMESTAMP WITH TIME ZONE,
    user_feedback TEXT, -- User's notes on the recommendation

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- TABLE: physique_progress_logs
-- Tracks progress towards goal physique over time
-- =========================================
CREATE TABLE IF NOT EXISTS physique_progress_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_physique_id UUID REFERENCES goal_physiques(id) ON DELETE SET NULL,

    -- Progress Metrics
    progress_photo_id UUID, -- Links to progress_photos table
    current_weight_kg DECIMAL(5,2),
    current_body_fat_pct DECIMAL(4,1),

    -- AI Comparison Results
    similarity_score DECIMAL(3,2), -- 0.00 to 1.00 (how close current physique is to goal)
    muscle_mass_progress TEXT CHECK (muscle_mass_progress IN ('decreasing', 'stable', 'increasing')),
    body_fat_progress TEXT CHECK (body_fat_progress IN ('increasing', 'stable', 'decreasing')),

    -- Specific muscle group progress
    muscle_group_progress JSONB, -- e.g., {"Lateral Delts": "improving", "Upper Chest": "stable"}

    -- Re-analysis triggers
    workouts_since_last_analysis INTEGER DEFAULT 0,
    photos_since_last_analysis INTEGER DEFAULT 0,
    should_trigger_reanalysis BOOLEAN DEFAULT false,

    -- User notes
    user_notes TEXT,

    -- Metadata
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    analysis_version TEXT
);

-- =========================================
-- TABLE: ai_physique_usage_logs
-- Tracks AI service usage for billing/analytics
-- =========================================
CREATE TABLE IF NOT EXISTS ai_physique_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_physique_id UUID REFERENCES goal_physiques(id) ON DELETE SET NULL,

    -- Usage details
    service_type TEXT NOT NULL CHECK (service_type IN ('goal_analysis', 'progress_comparison')),
    tokens_used INTEGER,
    api_cost_cents INTEGER, -- Cost in cents for billing

    -- Metadata
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- FUNCTIONS & TRIGGERS
-- =========================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_goal_physiques_updated_at
    BEFORE UPDATE ON goal_physiques
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goal_recommendations_updated_at
    BEFORE UPDATE ON goal_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one active goal physique per user
CREATE OR REPLACE FUNCTION ensure_single_active_goal()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a goal as active, deactivate all others for this user
    IF NEW.is_active = true THEN
        UPDATE goal_physiques
        SET is_active = false, updated_at = NOW()
        WHERE user_id = NEW.user_id AND id != NEW.id AND is_active = true;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_single_active_goal_trigger
    BEFORE INSERT OR UPDATE ON goal_physiques
    FOR EACH ROW EXECUTE FUNCTION ensure_single_active_goal();

-- =========================================
-- RLS (Row Level Security) Policies
-- =========================================

-- Enable RLS on all tables
ALTER TABLE goal_physiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE physique_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE physique_progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_physique_usage_logs ENABLE ROW LEVEL SECURITY;

-- Goal Physiques: Users can only access their own goals
CREATE POLICY "Users can view own goal physiques" ON goal_physiques
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal physiques" ON goal_physiques
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal physiques" ON goal_physiques
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal physiques" ON goal_physiques
    FOR DELETE USING (auth.uid() = user_id);

-- Physique Analyses: Users can only access analyses of their goals
CREATE POLICY "Users can view own physique analyses" ON physique_analyses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own physique analyses" ON physique_analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Goal Recommendations: Users can only access recommendations for their analyses
CREATE POLICY "Users can view own goal recommendations" ON goal_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal recommendations" ON goal_recommendations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal recommendations" ON goal_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

-- Progress Logs: Users can only access their own progress
CREATE POLICY "Users can view own progress logs" ON physique_progress_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress logs" ON physique_progress_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress logs" ON physique_progress_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- AI Usage Logs: Users can view their own usage, service role can insert
CREATE POLICY "Users can view own AI usage" ON ai_physique_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- =========================================
-- INITIAL DATA & SEEDING
-- =========================================

-- Note: No initial data seeding needed for this feature
-- Users will create their own goal physiques through the app

-- =========================================
-- MIGRATION COMPLETE
-- =========================================