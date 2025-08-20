import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ArrowUp, ArrowDown, ArrowRight, ArrowLeft, Footprints, LucideIcon } from "lucide-react";

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
    case 'Lower Body B':
      colorKey = 'lower-body-a';
      break;
    case 'Upper Body B':
      colorKey = 'upper-body-b';
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
    default: return ''; // No specific color for other workouts or 'Ad Hoc Workout'
  }

  // Return the appropriate color variant based on the type
  if (type === 'text') {
    return `text-workout-${colorKey}-text`;
  } else if (type === 'bg') {
    return `bg-workout-${colorKey}-bg`;
  } else if (type === 'border') {
    return `border-workout-${colorKey}-border`; // Use the new border variant
  }
  return '';
}

export function getWorkoutIcon(workoutName: string): LucideIcon | null {
  switch (workoutName) {
    case 'Upper Body A':
    case 'Upper Body B':
      return ArrowUp; // Up arrow for Upper body
    case 'Lower Body A':
    case 'Lower Body B':
      return ArrowDown; // Down arrow for Lower body
    case 'Push':
      return ArrowRight; // Represents pushing forward/away
    case 'Pull':
      return ArrowLeft; // Represents pulling towards
    case 'Legs':
      return Footprints; // Represents leg movement
    default:
      return null; // No specific icon for other workouts or 'Ad Hoc Workout'
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