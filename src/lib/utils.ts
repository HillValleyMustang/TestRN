import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { LucideIcon, Star, Dumbbell } from "lucide-react";
import { formatDistanceToNowStrict } from 'date-fns';
import { UpArrowInCircle } from "@/components/icons/UpArrowInCircle";
import { DownArrowInCircle } from "@/components/icons/DownArrowInCircle";

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

  if (type === 'text') {
    return `text-workout-${colorKey}-color`;
  } else if (type === 'border') {
    return `border-workout-${colorKey}-color`;
  } else if (type === 'bg') {
    return `bg-workout-${colorKey}-gradient-start`;
  }
  return '';
}

export function getWorkoutIcon(workoutName: string): LucideIcon | null {
  switch (workoutName) {
    case 'Upper Body A':
    case 'Upper Body B':
      return UpArrowInCircle;
    case 'Lower Body A':
    case 'Lower Body B':
      return DownArrowInCircle;
    case 'Push':
    case 'Pull':
    case 'Legs':
    case 'Bonus':
    case '4-Day Upper/Lower':
    case '3-Day Push/Pull/Legs':
      return Dumbbell;
    default:
      return null;
  }
}

export function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90;
  }
}

export const formatTimeAgoShort = (dateString: string | null): string => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes < 1) return '1m ago';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
};