import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ArrowUp, ArrowDown, ArrowRight, ArrowLeft, Footprints, LucideIcon, Star, Dumbbell } from "lucide-react"; // Import Star and Dumbbell icons

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWorkoutColorClass(workoutName: string, type: 'text' | 'border' | 'bg' = 'text'): string {
  let colorKey: string;
  switch (workoutName) {
    case 'Upper Body A':
    case '4-Day Upper/Lower': // Map main T-Path to its first workout's color
      colorKey = 'upper-body-a';
      break;
    case 'Lower Body A':
      colorKey = 'lower-body-a'; // Distinct key for Lower Body A
      break;
    case 'Upper Body B':
      colorKey = 'upper-body-b';
      break;
    case 'Lower Body B': // Distinct key for Lower Body B
      colorKey = 'lower-body-b';
      break;
    case 'Push':
    case '3-Day Push/Pull/Legs': // Map main T-Path to its first workout's color
      colorKey = 'push';
      break;
    case 'Pull':
      colorKey = 'pull';
      break;
    case 'Legs':
      colorKey = 'legs';
      break;
    case 'Bonus': // New case for bonus exercises
      colorKey = 'bonus';
      break;
    default: return ''; // No specific color for other workouts or 'Ad Hoc Workout'
  }

  // Return the appropriate color variant based on the type
  if (type === 'text') {
    return `text-workout-${colorKey}-text`;
  } else if (type === 'bg') {
    return `bg-workout-${colorKey}-bg`;
  } else if (type === 'border') {
    return `border-workout-${colorKey}-base`; // Changed to use the -base color for borders
  }
  return '';
}

export function getWorkoutIcon(workoutName: string): LucideIcon | null {
  switch (workoutName) {
    case 'Upper Body A':
    case 'Upper Body B':
      return ArrowUp;
    case 'Lower Body A':
    case 'Lower Body B':
      return ArrowDown;
    case 'Push':
      return ArrowRight;
    case 'Pull':
      return ArrowLeft;
    case 'Legs':
      return Footprints;
    case 'Bonus':
      return Star;
    case '4-Day Upper/Lower':
    case '3-Day Push/Pull/Legs':
      return Dumbbell; // Generic icon for main T-Paths
    default:
      return null;
  }
}

// Helper to get max minutes from sessionLength string
export function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90; // Default to longest if unknown or null
  }
}

// New function for pill button props
export function getWorkoutPillProps(workoutName: string): { accent: 'blue' | 'red' | 'yellow' | 'green', direction: 'up' | 'down' } {
  const lowerCaseName = workoutName.toLowerCase();

  if (lowerCaseName.includes('upper body a') || lowerCaseName.includes('push')) {
    return { accent: 'blue', direction: 'up' };
  }
  if (lowerCaseName.includes('lower body a') || lowerCaseName.includes('pull')) {
    return { accent: 'red', direction: 'down' };
  }
  if (lowerCaseName.includes('upper body b')) {
    return { accent: 'yellow', direction: 'up' };
  }
  if (lowerCaseName.includes('lower body b') || lowerCaseName.includes('legs')) {
    return { accent: 'green', direction: 'down' };
  }
  // Default for other cases
  return { accent: 'blue', direction: 'up' };
}