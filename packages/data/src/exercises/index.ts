export interface Exercise {
  id: string;
  name: string;
  category: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
  equipment?: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
}

export const EXERCISES: Exercise[] = [
  {
    id: 'bench_press',
    name: 'Bench Press',
    category: 'chest',
    equipment: 'Barbell',
    primaryMuscles: ['Chest'],
    secondaryMuscles: ['Triceps', 'Shoulders'],
  },
  {
    id: 'squat',
    name: 'Squat',
    category: 'legs',
    equipment: 'Barbell',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Core'],
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    category: 'back',
    equipment: 'Barbell',
    primaryMuscles: ['Back', 'Hamstrings'],
    secondaryMuscles: ['Glutes', 'Core'],
  },
  {
    id: 'overhead_press',
    name: 'Overhead Press',
    category: 'shoulders',
    equipment: 'Barbell',
    primaryMuscles: ['Shoulders'],
    secondaryMuscles: ['Triceps', 'Core'],
  },
  {
    id: 'pull_up',
    name: 'Pull Up',
    category: 'back',
    equipment: 'Bodyweight',
    primaryMuscles: ['Lats', 'Back'],
    secondaryMuscles: ['Biceps'],
  },
  {
    id: 'dumbbell_curl',
    name: 'Dumbbell Curl',
    category: 'arms',
    equipment: 'Dumbbell',
    primaryMuscles: ['Biceps'],
  },
  {
    id: 'tricep_dips',
    name: 'Tricep Dips',
    category: 'arms',
    equipment: 'Bodyweight',
    primaryMuscles: ['Triceps'],
    secondaryMuscles: ['Chest', 'Shoulders'],
  },
  {
    id: 'leg_press',
    name: 'Leg Press',
    category: 'legs',
    equipment: 'Machine',
    primaryMuscles: ['Quadriceps', 'Glutes'],
  },
  {
    id: 'lat_pulldown',
    name: 'Lat Pulldown',
    category: 'back',
    equipment: 'Cable',
    primaryMuscles: ['Lats'],
    secondaryMuscles: ['Biceps'],
  },
  {
    id: 'dumbbell_row',
    name: 'Dumbbell Row',
    category: 'back',
    equipment: 'Dumbbell',
    primaryMuscles: ['Back', 'Lats'],
    secondaryMuscles: ['Biceps'],
  },
  {
    id: 'incline_bench_press',
    name: 'Incline Bench Press',
    category: 'chest',
    equipment: 'Barbell',
    primaryMuscles: ['Upper Chest'],
    secondaryMuscles: ['Shoulders', 'Triceps'],
  },
  {
    id: 'leg_curl',
    name: 'Leg Curl',
    category: 'legs',
    equipment: 'Machine',
    primaryMuscles: ['Hamstrings'],
  },
  {
    id: 'calf_raise',
    name: 'Calf Raise',
    category: 'legs',
    equipment: 'Machine',
    primaryMuscles: ['Calves'],
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    equipment: 'Bodyweight',
    primaryMuscles: ['Core', 'Abs'],
  },
  {
    id: 'crunch',
    name: 'Crunch',
    category: 'core',
    equipment: 'Bodyweight',
    primaryMuscles: ['Abs'],
  },
  {
    id: 'running',
    name: 'Running',
    category: 'cardio',
    equipment: 'Treadmill',
    primaryMuscles: ['Legs', 'Cardiovascular'],
  },
];

export const getExerciseById = (id: string): Exercise | undefined => {
  return EXERCISES.find(ex => ex.id === id);
};

export const getExercisesByCategory = (category: Exercise['category']): Exercise[] => {
  return EXERCISES.filter(ex => ex.category === category);
};

export const EXERCISE_CATEGORIES = [
  { id: 'chest', name: 'Chest', emoji: '💪' },
  { id: 'back', name: 'Back', emoji: '🔙' },
  { id: 'legs', name: 'Legs', emoji: '🦵' },
  { id: 'shoulders', name: 'Shoulders', emoji: '🏋️' },
  { id: 'arms', name: 'Arms', emoji: '💪' },
  { id: 'core', name: 'Core', emoji: '🎯' },
  { id: 'cardio', name: 'Cardio', emoji: '❤️' },
] as const;
