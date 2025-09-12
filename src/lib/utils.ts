import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ArrowUp, ArrowDown, ArrowRight, ArrowLeft, Footprints, LucideIcon, Star, Dumbbell, ChevronUp, ChevronDown, ArrowUpRight, ArrowDownLeft, Zap, Sparkles, Building2 } from "lucide-react"; // Added Sparkles and Building2

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWorkoutColorClass(workoutName: string, type: 'text' | 'border' | 'bg' = 'text'): string {
  let colorKey: string;
  switch (workoutName) {
    case 'Upper Body A':
    case 'Upper A': // Shortened name
    case '4-Day Upper/Lower': // Map main T-Path to its first workout's color
      colorKey = 'upper-body-a';
      break;
    case 'Lower Body A':
    case 'Lower A': // Shortened name
      colorKey = 'lower-body-a'; // Distinct key for Lower Body A
      break;
    case 'Upper Body B':
    case 'Upper B': // Shortened name
      colorKey = 'upper-body-b';
      break;
    case 'Lower Body B':
    case 'Lower B': // Shortened name
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
    case 'AI': // NEW: For AI-identified exercises
      colorKey = 'bonus'; // Use bonus color for AI tag
      break;
    case 'Gym': // NEW: For gym location tags
      colorKey = 'gym'; // Use specific gym color
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
    case 'Upper A':
    case 'Upper Body B':
    case 'Upper B':
      return ArrowUp;
    case 'Lower Body A':
    case 'Lower A':
    case 'Lower Body B':
    case 'Lower B':
      return ArrowDown;
    case 'Push':
      return ArrowUpRight; // Swapped from ArrowDownLeft
    case 'Pull':
      return ArrowDownLeft; // Swapped from ArrowUpRight
    case 'Legs':
      return Footprints;
    case 'Bonus':
      return Star;
    case 'AI': // NEW: Icon for AI-identified exercises
      return Sparkles;
    case 'Gym': // NEW: Icon for gym location tags
      return Building2;
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
      Icon = ArrowUp; // Changed from ChevronUp
      colorKey = variant === 'a' ? 'upper-body-a' : 'upper-body-b';
    } else if (category === 'lower') {
      Icon = ArrowDown; // Changed from ChevronDown
      colorKey = variant === 'a' ? 'lower-body-a' : 'lower-body-b';
    }
  } else if (workoutType === 'push-pull-legs') {
    if (category === 'push') {
      Icon = ArrowUpRight; // Swapped from ArrowDownLeft
      colorKey = 'push';
    } else if (category === 'pull') {
      Icon = ArrowDownLeft; // Swapped from ArrowUpRight
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

  const unselectedBgClass = `bg-muted`; // Changed from `bg-card` to `bg-muted`
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

// NEW: Utility function to get the CSS variable for calendar item colors
export function getCalendarItemColorCssVar(name: string | null | undefined, type: 'workout' | 'activity' | 'ad-hoc'): string {
  let colorKey: string | undefined;
  let colorCategory: 'workout' | 'activity' = 'workout';

  if (type === 'workout') {
    colorCategory = 'workout';
    switch (name) {
      case 'Upper Body A':
      case 'Upper A':
        colorKey = 'upper-body-a';
        break;
      case 'Lower Body A':
      case 'Lower A':
        colorKey = 'lower-body-a';
        break;
      case 'Upper Body B':
      case 'Upper B':
        colorKey = 'upper-body-b';
        break;
      case 'Lower Body B':
      case 'Lower B':
        colorKey = 'lower-body-b';
        break;
      case 'Push':
        colorKey = 'push';
        break;
      case 'Pull':
        colorKey = 'pull';
        break;
      case 'Legs':
        colorKey = 'legs';
        break;
      case 'Bonus':
        colorKey = 'bonus';
        break;
      default:
        colorKey = 'ad-hoc'; // Fallback for unknown workout names
        break;
    }
  } else if (type === 'activity') {
    colorCategory = 'activity';
    switch (name) {
      case 'Running':
        colorKey = 'running';
        break;
      case 'Cycling':
        colorKey = 'cycling';
        break;
      case 'Swimming':
        colorKey = 'swimming';
        break;
      case 'Tennis':
        colorKey = 'tennis';
        break;
      default:
        colorKey = 'activity'; // Fallback for unknown activity types
        break;
    }
  } else if (type === 'ad-hoc') {
    colorCategory = 'workout'; // Ad-hoc uses workout colors
    colorKey = 'ad-hoc';
  }

  return `hsl(var(--${colorCategory}-${colorKey || 'ad-hoc'}))`;
}

// NEW: Utility function to get the display name for calendar items
export function getCalendarItemDisplayName(name: string | null | undefined, type: 'workout' | 'activity' | 'ad-hoc'): string {
  if (type === 'ad-hoc') return 'Ad Hoc Workout';
  if (!name) return 'Unknown';

  // Shorten workout names
  switch (name) {
    case 'Upper Body A': return 'Upper A';
    case 'Upper Body B': return 'Upper B';
    case 'Lower Body A': return 'Lower A';
    case 'Lower Body B': return 'Lower B';
    default: return name;
  }
}

// NEW: Utility function to get fitness level from points
export function getLevelFromPoints(totalPoints: number): { level: string; color: string } {
  if (totalPoints < 100) {
    return { level: 'Rookie', color: 'bg-gray-500' };
  } else if (totalPoints < 300) {
    return { level: 'Warrior', color: 'bg-blue-500' };
  } else if (totalPoints < 600) {
    return { level: 'Champion', color: 'bg-purple-500' };
  } else {
    return { level: 'Legend', color: 'bg-yellow-500' };
  }
}