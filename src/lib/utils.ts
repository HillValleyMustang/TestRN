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
      return ArrowDownLeft; // Swapped from ArrowLeft
    case 'Pull':
      return ArrowUpRight; // Swapped from ArrowRight
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
  let colorKey = '';

  if (workoutType === 'upper-lower') {
    if (category === 'upper') {
      Icon = ChevronUp;
      colorKey = variant === 'a' ? 'upper-body-a' : 'upper-body-b';
    } else if (category === 'lower') {
      Icon = ChevronDown;
      colorKey = variant === 'a' ? 'lower-body-a' : 'lower-body-b';
    }
  } else if (workoutType === 'push-pull-legs') {
    if (category === 'push') {
      Icon = ArrowDownLeft; // Swapped from ArrowLeft
      colorKey = 'push';
    } else if (category === 'pull') {
      Icon = ArrowUpRight; // Swapped from ArrowRight
      colorKey = 'pull';
    } else if (category === 'legs') {
      Icon = Footprints;
      colorKey = 'legs';
    }
  }

  // Default to a bonus color if no specific workout type/category matches
  if (!colorKey) {
    colorKey = 'bonus';
    Icon = Star; // Default bonus icon
  }

  const selectedBgClass = `bg-workout-${colorKey}`;
  const selectedTextClass = `text-white`;
  const selectedBorderClass = `border-transparent`;
  const selectedShadowClass = `shadow-workout-pill-selected`;

  const unselectedBgClass = `bg-card`; // Changed from `bg-white` to `bg-card`
  const unselectedTextClass = `text-workout-${colorKey}`;
  const unselectedBorderClass = `border-workout-${colorKey}`;
  const unselectedShadowClass = `shadow-none`;

  return {
    Icon,
    selectedBgClass,
    selectedTextClass,
    selectedBorderClass,
    selectedShadowClass,
    unselectedBgClass,
    unselectedTextClass,
    unselectedBorderClass,
    unselectedShadowClass,
  };
};

// New utility function to get fitness level from total points
export function getLevelFromPoints(totalPoints: number): { level: string; color: string; } {
  if (totalPoints < 100) return { level: 'Rookie', color: 'bg-gray-500' };
  if (totalPoints < 300) return { level: 'Warrior', color: 'bg-blue-500' };
  if (totalPoints < 600) return { level: 'Champion', color: 'bg-purple-500' };
  return { level: 'Legend', color: 'bg-yellow-500' };
}