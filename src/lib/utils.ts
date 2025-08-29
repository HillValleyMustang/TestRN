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

export const getPillStyles = (category: WorkoutPillCategory, variant?: WorkoutPillVariant) => {
  let Icon: LucideIcon = Zap;
  let selectedClass = 'workout-pill-selected-pink'; // Default to pink
  let defaultTextClass = 'text-pill-pink';
  let borderColorVar = 'pill-pink-start'; // Use the CSS variable name part

  if (category === 'upper') {
    Icon = ChevronUp;
    if (variant === 'a') { // Upper A is Pink
      selectedClass = 'workout-pill-selected-pink';
      defaultTextClass = 'text-pill-pink';
      borderColorVar = 'pill-pink-start';
    } else { // Upper B is Red
      selectedClass = 'workout-pill-selected-red';
      defaultTextClass = 'text-pill-red';
      borderColorVar = 'pill-red-start';
    }
  } else if (category === 'lower') {
    Icon = ChevronDown;
    if (variant === 'a') { // Lower A is Purple
      selectedClass = 'workout-pill-selected-purple';
      defaultTextClass = 'text-pill-purple';
      borderColorVar = 'pill-purple-start';
    } else { // Lower B is Pink
      selectedClass = 'workout-pill-selected-pink';
      defaultTextClass = 'text-pill-pink';
      borderColorVar = 'pill-pink-start';
    }
  } else if (category === 'push') { // Push is Red
    Icon = ArrowUpRight;
    selectedClass = 'workout-pill-selected-red';
    defaultTextClass = 'text-pill-red';
    borderColorVar = 'pill-red-start';
  } else if (category === 'pull') { // Pull is Purple
    Icon = ArrowDownLeft;
    selectedClass = 'workout-pill-selected-purple';
    defaultTextClass = 'text-pill-purple';
    borderColorVar = 'pill-purple-start';
  } else if (category === 'legs') { // Legs is Pink
    Icon = Zap;
    selectedClass = 'workout-pill-selected-pink';
    defaultTextClass = 'text-pill-pink';
    borderColorVar = 'pill-pink-start';
  }

  return { Icon, selectedClass, defaultTextClass, borderColorVar };
};