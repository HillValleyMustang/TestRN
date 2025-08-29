import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ArrowUp, ArrowDown, ArrowRight, ArrowLeft, Footprints, LucideIcon, Star, Dumbbell } from "lucide-react"; // Import Star and Dumbbell icons
import { formatDistanceToNowStrict } from 'date-fns'; // Import formatDistanceToNowStrict

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWorkoutColorClass(workoutName: string, type: 'text' | 'border' | 'bg' = 'text'): string {
  let colorKey: string;
  switch (workoutName) {
    case 'Upper Body A':
    case '4-Day Upper/Lower':
      colorKey = 'upper-body-a';
      break;
    case 'Lower Body A':
      colorKey = 'lower-body-a';
      break;
    case 'Upper Body B':
      colorKey = 'upper-body-b';
      break;
    case 'Lower Body B':
      colorKey = 'lower-body-b';
      break;
    case 'Push':
    case '3-Day Push/Pull/Legs':
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
    default: return '';
  }

  // Return the appropriate color variant based on the type
  if (type === 'text') {
    return `text-workout-${colorKey}-color`;
  } else if (type === 'border') {
    return `border-workout-${colorKey}-color`;
  } else if (type === 'bg') {
    // For background, we might use gradient-start if a solid color is needed,
    // but the new design uses gradients for selected state, not a simple bg.
    // This might need adjustment depending on where 'bg' type is used.
    return `bg-workout-${colorKey}-gradient-start`;
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

// New function to format last completed date without "Last: " prefix
export const formatLastCompletedShort = (dateString: string | null): string => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return formatDistanceToNowStrict(date, { addSuffix: false });
};

interface WorkoutPillClasses {
  buttonClasses: string;
  beforeClasses: string;
  iconClasses: string;
  titleClasses: string;
  timeClasses: string;
}

export function getWorkoutPillClasses(workoutName: string, isSelected: boolean): WorkoutPillClasses {
  let colorKey: string;

  switch (workoutName) {
    case 'Upper Body A':
    case '4-Day Upper/Lower':
      colorKey = 'upper-body-a';
      break;
    case 'Lower Body A':
      colorKey = 'lower-body-a';
      break;
    case 'Upper Body B':
      colorKey = 'upper-body-b';
      break;
    case 'Lower Body B':
      colorKey = 'lower-body-b';
      break;
    case 'Push':
    case '3-Day Push/Pull/Legs':
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
      // Default classes for unknown workout names
      return {
        buttonClasses: "flex items-center gap-3 p-[12px_18px] rounded-[20px] font-semibold border-0 cursor-pointer transition-all duration-200 ease-in-out min-w-[200px] h-12 relative bg-white shadow-sm opacity-70 scale-[0.98] hover:scale-[1.02] hover:shadow-md",
        beforeClasses: "absolute inset-0.5 rounded-[18px] border-[1.5px] border-transparent pointer-events-none transition-all duration-200 ease-in-out",
        iconClasses: "w-5 h-5 flex-shrink-0 transition-all duration-200 ease-in-out text-muted-foreground",
        titleClasses: "text-[15px] font-semibold leading-tight transition-colors duration-200 ease-in-out text-foreground",
        timeClasses: "text-[11px] opacity-60 font-medium transition-opacity duration-200 ease-in-out text-muted-foreground",
      };
  }

  const buttonClasses = cn(
    "flex items-center gap-3 p-[12px_18px] rounded-[20px] font-semibold border-0 cursor-pointer transition-all duration-200 ease-in-out min-w-[200px] h-12 relative",
    isSelected ? 
      `bg-gradient-to-br from-workout-${colorKey}-gradient-start to-workout-${colorKey}-gradient-end text-white opacity-100 scale-100 shadow-md hover:scale-[1.05]` :
      `bg-white shadow-sm opacity-70 scale-[0.98] hover:scale-[1.02] hover:shadow-md`
  );

  const beforeClasses = cn(
    "absolute inset-0.5 rounded-[18px] border-[1.5px] pointer-events-none transition-all duration-200 ease-in-out",
    isSelected ? `border-white/30` : `border-workout-${colorKey}-color`
  );

  const iconClasses = cn(
    "w-5 h-5 flex-shrink-0 transition-all duration-200 ease-in-out",
    isSelected ? "text-white" : `text-workout-${colorKey}-color`
  );

  const titleClasses = cn(
    "text-[15px] font-semibold leading-tight transition-colors duration-200 ease-in-out",
    isSelected ? "text-white" : `text-workout-${colorKey}-color`
  );

  const timeClasses = cn(
    "text-[11px] font-medium transition-opacity duration-200 ease-in-out",
    isSelected ? "opacity-80 text-white" : `opacity-60 text-workout-${colorKey}-color`
  );

  return { buttonClasses, beforeClasses, iconClasses, titleClasses, timeClasses };
}