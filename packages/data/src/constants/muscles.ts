// Muscle groups used in exercises
export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Abs',
  'Obliques',
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