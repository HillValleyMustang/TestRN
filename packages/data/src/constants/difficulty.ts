// Exercise difficulty levels
export const DIFFICULTY_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
] as const;

export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

// Helper function to determine difficulty based on exercise properties
export const getExerciseDifficulty = (exercise: {
  type?: string;
  category?: string;
  main_muscle?: string;
}): DifficultyLevel => {
  // Simple heuristic - can be expanded
  const compoundMovements = ['compound', 'full_body'];
  const advancedMuscles = ['Forearms', 'Calves'];

  if (compoundMovements.includes(exercise.type || '')) {
    return 'advanced';
  }

  if (advancedMuscles.includes(exercise.main_muscle || '')) {
    return 'intermediate';
  }

  return 'beginner';
};

// Display names for difficulty levels
export const DIFFICULTY_DISPLAY_NAMES: Record<DifficultyLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};