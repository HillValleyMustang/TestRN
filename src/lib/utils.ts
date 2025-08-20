import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWorkoutColorClass(workoutName: string, type: 'text' | 'border' | 'bg' = 'text'): string {
  let colorKey: string;
  switch (workoutName) {
    case 'Upper Body A': colorKey = 'upper-body-a'; break;
    case 'Lower Body A': colorKey = 'lower-body-a'; break;
    case 'Upper Body B': colorKey = 'upper-body-b'; break;
    case 'Lower Body B': colorKey = 'lower-body-b'; break;
    case 'Push': colorKey = 'push'; break;
    case 'Pull': colorKey = 'pull'; break;
    case 'Legs': colorKey = 'legs'; break;
    default: return ''; // No specific color for other workouts
  }
  return `${type}-workout-${colorKey}`;
}