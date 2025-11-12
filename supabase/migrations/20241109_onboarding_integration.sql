-- Onboarding Integration Migration
-- Migration: 20241109_onboarding_integration
-- Adds onboarding completion tracking to profiles table

-- Add onboarding_completed field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON profiles(onboarding_completed);

-- Add comment for documentation
COMMENT ON COLUMN profiles.onboarding_completed IS 'Tracks whether user has completed the onboarding flow. Once true, onboarding never shows again.';

-- Migration complete