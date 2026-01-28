// Canonical muscle groups - matches exercise creation form
// This is the single source of truth for all muscle groups in the app
export const MUSCLE_GROUPS = [
  'Pectorals',
  'Deltoids',
  'Lats',
  'Traps',
  'Biceps',
  'Triceps',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Abdominals',
  'Core',
  'Full Body',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

// Helper function to get display name for muscle group
export const getMuscleGroupDisplayName = (muscle: string): string => {
  // Convert snake_case or other formats to Title Case
  return muscle
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};