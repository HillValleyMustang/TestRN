import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ArrowUp, ArrowDown, ArrowRight, ArrowLeft, Footprints, LucideIcon, Star, Dumbbell, ChevronUp, ChevronDown, ArrowUpRight, ArrowDownLeft, Zap } from "lucide-react";

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

  // Use the single color variable for all types
  if (type === 'text') {
    return `text-workout-${colorKey}`;
  } else if (type === 'bg') {
    return `bg-workout-${colorKey}`;
  } else if (type === 'border') {
    return `border-workout-${colorKey}`;
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

// New utility function to format time ago
export const formatTimeAgo = (date: Date | null): string => {
  if (!date) return 'Never';
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

// New utility function to get color and icon classes for the new pill
type WorkoutPillCategory = 'upper' | 'lower' | 'push' | 'pull' | 'legs';
type WorkoutPillVariant = 'a' | 'b';

export const getPillStyles = (workoutType: 'upper-lower' | 'push-pull-legs', category: WorkoutPillCategory, variant?: WorkoutPillVariant) => {
  let Icon: LucideIcon = Zap; // Default
  let colorKey: string;
  let lightColorKey: string;

  if (workoutType === 'upper-lower') {
    if (category === 'upper') {
      Icon = ChevronUp;
      colorKey = variant === 'a' ? 'upper-body-a' : 'upper-body-b';
      lightColorKey = variant === 'a' ? 'upper-body-a-light' : 'upper-body-b-light';
    } else if (category === 'lower') {
      Icon = ChevronDown;
      colorKey = variant === 'a' ? 'lower-body-a' : 'lower-body-b';
      lightColorKey = variant === 'a' ? 'lower-body-a-light' : 'lower-body-b-light';
    } else { // Fallback, though should not happen with current data
      Icon = Dumbbell;
      colorKey = 'bonus';
      lightColorKey = 'bonus-light';
    }
  } else if (workoutType === 'push-pull-legs') {
    if (category === 'push') {
      Icon = ArrowUpRight;
      colorKey = 'push';
      lightColorKey = 'push-light';
    } else if (category === 'pull') {
      Icon = ArrowDownLeft;
      colorKey = 'pull';
      lightColorKey = 'pull-light';
    } else if (category === 'legs') {
      Icon = Footprints;
      colorKey = 'legs';
      lightColorKey = 'legs-light';
    } else { // Fallback, though should not happen with current data
      Icon = Dumbbell;
      colorKey = 'bonus';
      lightColorKey = 'bonus-light';
    }
  } else { // Default to a bonus color if no specific workout type/category matches
    Icon = Star; // Default bonus icon
    colorKey = 'bonus';
    lightColorKey = 'bonus-light';
  }

  const selectedBgClass = `bg-workout-${colorKey}`;
  const selectedTextClass = `text-white`;
  const selectedTimeTextClass = `text-white/70`; // Slightly muted white for time
  const selectedBorderClass = `border-transparent`;
  const selectedShadowClass = `shadow-workout-pill-selected`;

  const unselectedBgClass = `bg-white`;
  const unselectedTextClass = `text-workout-${colorKey}`;
  const unselectedTimeTextClass = `text-workout-${lightColorKey}`; // Use lighter shade for time
  const unselectedBorderClass = `border-workout-${colorKey}`;
  const unselectedShadowClass = `shadow-none`;

  return {
    Icon,
    selectedBgClass,
    selectedTextClass,
    selectedTimeTextClass,
    selectedBorderClass,
    selectedShadowClass,
    unselectedBgClass,
    unselectedTextClass,
    unselectedTimeTextClass,
    unselectedBorderClass,
    unselectedShadowClass,
  };
};