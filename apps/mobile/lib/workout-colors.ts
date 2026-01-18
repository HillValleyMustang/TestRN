/**
 * Workout Color System
 * Maps workout types to their specific color schemes
 * Reference: apps/web/src/lib/utils.ts getWorkoutColorClass()
 */

export interface WorkoutColorScheme {
  main: string;
  light: string;
}

export const WORKOUT_COLORS: Record<string, WorkoutColorScheme> = {
  'Push': { main: '#3B82F6', light: '#60A5FA' },
  'Pull': { main: '#10B981', light: '#34D399' },
  'Legs': { main: '#F59E0B', light: '#FBBF24' },
  
  'Upper Body A': { main: '#1e3a8a', light: '#2563eb' },
  'Upper A': { main: '#1e3a8a', light: '#2563eb' },
  'Upper Body B': { main: '#EF4444', light: '#F87171' },
  'Upper B': { main: '#EF4444', light: '#F87171' },
  'Lower Body A': { main: '#0891b2', light: '#06b6d4' },
  'Lower A': { main: '#0891b2', light: '#06b6d4' },
  'Lower Body B': { main: '#6b21a8', light: '#9333ea' },
  'Lower B': { main: '#6b21a8', light: '#9333ea' },
  
  'Bonus': { main: '#F59E0B', light: '#FBBF24' },
  'Ad Hoc Workout': { main: '#64748B', light: '#94A3B8' },
  
  '3-Day Push/Pull/Legs': { main: '#3B82F6', light: '#60A5FA' },
  '4-Day Upper/Lower': { main: '#1e3a8a', light: '#2563eb' },
};

export function getWorkoutColor(workoutName: string): WorkoutColorScheme {
  const normalizedName = workoutName?.trim() || '';
  
  if (WORKOUT_COLORS[normalizedName]) {
    return WORKOUT_COLORS[normalizedName];
  }
  
  const lowerName = normalizedName.toLowerCase();
  if (lowerName.includes('push')) {
    return WORKOUT_COLORS['Push'];
  } else if (lowerName.includes('pull')) {
    return WORKOUT_COLORS['Pull'];
  } else if (lowerName.includes('leg')) {
    return WORKOUT_COLORS['Legs'];
  } else if (lowerName.includes('upper')) {
    const words = lowerName.split(/\s+/);
    const lastWord = words[words.length - 1];
    const letter = lastWord.match(/[a-z](?=[^a-z]*$)/)?.[0];
    if (letter === 'b') {
      return WORKOUT_COLORS['Upper Body B'];
    }
    return WORKOUT_COLORS['Upper Body A'];
  } else if (lowerName.includes('lower')) {
    const words = lowerName.split(/\s+/);
    const lastWord = words[words.length - 1];
    const letter = lastWord.match(/[a-z](?=[^a-z]*$)/)?.[0];
    if (letter === 'b') {
      return WORKOUT_COLORS['Lower Body B'];
    }
    return WORKOUT_COLORS['Lower Body A'];
  } else if (lowerName.includes('bonus')) {
    return WORKOUT_COLORS['Bonus'];
  } else if (lowerName.includes('ad hoc') || lowerName.includes('ad-hoc')) {
    return WORKOUT_COLORS['Ad Hoc Workout'];
  }
  
  return { main: '#9CA3AF', light: '#D1D5DB' };
}

export function getWorkoutIcon(workoutName: string): string {
  const normalizedName = workoutName?.toLowerCase() || '';
  
  if (normalizedName.includes('push')) {
    return 'arrow-up';
  } else if (normalizedName.includes('pull')) {
    return 'arrow-down';
  } else if (normalizedName.includes('leg')) {
    return 'walk';
  } else if (normalizedName.includes('upper')) {
    return 'body';
  } else if (normalizedName.includes('lower')) {
    return 'footsteps';
  } else if (normalizedName.includes('bonus')) {
    return 'star';
  }
  
  return 'barbell';
}
