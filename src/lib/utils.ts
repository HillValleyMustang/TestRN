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
  let selectedClass = '';
  let defaultTextClass = '';
  let borderColorVar = '';

  if (workoutType === 'upper-lower') {
    if (category === 'upper') {
      Icon = ChevronUp;
      if (variant === 'a') { // Upper Body A: Navy Blue
        selectedClass = 'workout-pill-selected-navy-blue';
        defaultTextClass = 'text-pill-navy-blue';
        borderColorVar = 'pill-navy-blue-start';
      } else { // Upper Body B: Coral Red
        selectedClass = 'workout-pill-selected-coral-red';
        defaultTextClass = 'text-pill-coral-red';
        borderColorVar = 'pill-coral-red-start';
      }
    } else if (category === 'lower') {
      Icon = ChevronDown;
      if (variant === 'a') { // Lower Body A: Teal
        selectedClass = 'workout-pill-selected-teal';
        defaultTextClass = 'text-pill-teal';
        borderColorVar = 'pill-teal-start';
      } else { // Lower Body B: Purple
        selectedClass = 'workout-pill-selected-purple';
        defaultTextClass = 'text-pill-purple';
        borderColorVar = 'pill-purple-start';
      }
    }
  } else if (workoutType === 'push-pull-legs') {
    if (category === 'push') { // Push: Coral Red
      Icon = ArrowUpRight;
      selectedClass = 'workout-pill-selected-coral-red';
      defaultTextClass = 'text-pill-coral-red';
      borderColorVar = 'pill-coral-red-start';
    } else if (category === 'pull') { // Pull: Teal
      Icon = ArrowDownLeft;
      selectedClass = 'workout-pill-selected-teal';
      defaultTextClass = 'text-pill-teal';
      borderColorVar = 'pill-teal-start';
    } else if (category === 'legs') { // Legs: Classic Adidas Green
      Icon = Footprints;
      selectedClass = 'workout-pill-selected-adidas-green';
      defaultTextClass = 'text-pill-adidas-green';
      borderColorVar = 'pill-adidas-green-start';
    }
  }

  return { Icon, selectedClass, defaultTextClass, borderColorVar };
};