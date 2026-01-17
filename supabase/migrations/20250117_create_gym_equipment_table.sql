-- Gym Equipment Storage
-- Migration: 20250117_create_gym_equipment_table
-- Stores detected equipment from AI photo analysis for analytics and future features

-- =========================================
-- TABLE: gym_equipment
-- Tracks equipment detected in gym photos
-- =========================================
CREATE TABLE IF NOT EXISTS gym_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    
    -- Equipment details
    equipment_name TEXT NOT NULL,
    category TEXT, -- Category from AI analysis (e.g., "Free Weights", "Cardio Equipment")
    
    -- Metadata
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient queries by gym
CREATE INDEX IF NOT EXISTS idx_gym_equipment_gym_id 
ON gym_equipment(gym_id);

-- Index for efficient queries by category
CREATE INDEX IF NOT EXISTS idx_gym_equipment_category 
ON gym_equipment(category) 
WHERE category IS NOT NULL;

-- Unique constraint to prevent duplicate equipment entries per gym
-- (same equipment name in same gym)
-- Using a named constraint so upsert can reference it
ALTER TABLE gym_equipment 
ADD CONSTRAINT gym_equipment_gym_name_unique 
UNIQUE (gym_id, equipment_name);

-- =========================================
-- RLS (Row Level Security) Policies
-- =========================================

-- Enable RLS on the table
ALTER TABLE gym_equipment ENABLE ROW LEVEL SECURITY;

-- Users can view equipment for their own gyms
CREATE POLICY "Users can view own gym equipment" ON gym_equipment
    FOR SELECT USING (
        gym_id IN (
            SELECT id FROM gyms WHERE user_id = auth.uid()
        )
    );

-- Users can insert equipment for their own gyms
CREATE POLICY "Users can insert own gym equipment" ON gym_equipment
    FOR INSERT WITH CHECK (
        gym_id IN (
            SELECT id FROM gyms WHERE user_id = auth.uid()
        )
    );

-- Users can update equipment for their own gyms
CREATE POLICY "Users can update own gym equipment" ON gym_equipment
    FOR UPDATE USING (
        gym_id IN (
            SELECT id FROM gyms WHERE user_id = auth.uid()
        )
    );

-- Users can delete equipment for their own gyms
CREATE POLICY "Users can delete own gym equipment" ON gym_equipment
    FOR DELETE USING (
        gym_id IN (
            SELECT id FROM gyms WHERE user_id = auth.uid()
        )
    );

-- =========================================
-- MIGRATION COMPLETE
-- =========================================
