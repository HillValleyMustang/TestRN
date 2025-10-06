/**
 * Utility Functions - Mobile App
 * Adapted from web app utils for React Native
 */

import { ViewStyle, TextStyle } from 'react-native';
import { Colors } from '../constants/Theme';

/**
 * Merge styles (React Native equivalent of cn/clsx)
 * Usage: cn(styles.base, condition && styles.active)
 */
export function cn(...styles: (ViewStyle | TextStyle | false | undefined | null)[]): ViewStyle | TextStyle {
  return Object.assign({}, ...styles.filter(Boolean));
}

/**
 * Get workout color from workout name
 */
export function getWorkoutColor(workoutName: string, variant: 'default' | 'light' = 'default'): string {
  const suffix = variant === 'light' ? 'Light' : '';
  
  switch (workoutName) {
    case 'Upper Body A':
    case 'Upper A':
    case '4-Day Upper/Lower':
      return Colors[`workoutUpperBodyA${suffix}`];
    case 'Lower Body A':
    case 'Lower A':
      return Colors[`workoutLowerBodyA${suffix}`];
    case 'Upper Body B':
    case 'Upper B':
      return Colors[`workoutUpperBodyB${suffix}`];
    case 'Lower Body B':
    case 'Lower B':
      return Colors[`workoutLowerBodyB${suffix}`];
    case 'Push':
    case '3-Day Push/Pull/Legs':
      return Colors[`workoutPush${suffix}`];
    case 'Pull':
      return Colors[`workoutPull${suffix}`];
    case 'Legs':
      return Colors[`workoutLegs${suffix}`];
    case 'Bonus':
      return Colors[`workoutBonus${suffix}`];
    case 'Ad Hoc Workout':
      return Colors[`workoutAdHoc${suffix}`];
    default:
      return Colors.mutedForeground;
  }
}

/**
 * Get workout icon name (for Lucide React Native icons)
 */
export function getWorkoutIconName(workoutName: string): string {
  switch (workoutName) {
    case 'Upper Body A':
    case 'Upper A':
    case 'Upper Body B':
    case 'Upper B':
      return 'arrow-up';
    case 'Lower Body A':
    case 'Lower A':
    case 'Lower Body B':
    case 'Lower B':
      return 'arrow-down';
    case 'Push':
      return 'arrow-up-right';
    case 'Pull':
      return 'arrow-down-left';
    case 'Legs':
      return 'footprints';
    case 'Bonus':
      return 'star';
    case '4-Day Upper/Lower':
    case '3-Day Push/Pull/Legs':
    case 'Ad Hoc Workout':
      return 'dumbbell';
    default:
      return 'activity';
  }
}

/**
 * Get activity color from activity name
 */
export function getActivityColor(activityName: string, variant: 'default' | 'light' = 'default'): string {
  const suffix = variant === 'light' ? 'Light' : '';
  
  switch (activityName) {
    case 'Running':
      return Colors[`activityRunning${suffix}`];
    case 'Swimming':
      return Colors[`activitySwimming${suffix}`];
    case 'Cycling':
      return Colors[`activityCycling${suffix}`];
    case 'Tennis':
      return Colors[`activityTennis${suffix}`];
    default:
      return Colors[`workoutActivity${suffix}`];
  }
}

/**
 * Format time ago (relative time)
 */
export function formatTimeAgo(date: Date | string | null): string {
  if (!date) return 'Never';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / 60000);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
}

/**
 * Format distance with units
 */
export function formatDistance(distanceKm: number | string | null, unit: 'metric' | 'imperial' = 'metric'): string {
  if (distanceKm === null || distanceKm === undefined) return '-';
  
  const distance = typeof distanceKm === 'string' ? parseFloat(distanceKm) : distanceKm;
  
  if (unit === 'imperial') {
    const miles = distance * 0.621371;
    return `${miles.toFixed(2)} mi`;
  }
  return `${distance.toFixed(2)} km`;
}

/**
 * Format time duration
 */
export function formatTime(seconds: number | string | null): string {
  if (seconds === null || seconds === undefined) return '-';
  
  const totalSeconds = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Get max minutes from session length
 */
export function getMaxMinutes(sessionLength: string | null | undefined): number {
  switch (sessionLength) {
    case '15-30': return 30;
    case '30-45': return 45;
    case '45-60': return 60;
    case '60-90': return 90;
    default: return 90;
  }
}

/**
 * Get exercise counts from session length
 */
export function getExerciseCounts(sessionLength: string | null | undefined): { main: number; bonus: number } {
  switch (sessionLength) {
    case '15-30': return { main: 3, bonus: 3 };
    case '30-45': return { main: 5, bonus: 3 };
    case '45-60': return { main: 7, bonus: 2 };
    case '60-90': return { main: 10, bonus: 2 };
    default: return { main: 5, bonus: 3 };
  }
}

/**
 * Get fitness level from points
 */
export function getLevelFromPoints(totalPoints: number): { level: string; color: string } {
  if (totalPoints < 100) {
    return { level: 'Rookie', color: Colors.chart3 };
  } else if (totalPoints < 300) {
    return { level: 'Warrior', color: Colors.actionPrimary };
  } else if (totalPoints < 600) {
    return { level: 'Champion', color: Colors.workoutLegs };
  } else {
    return { level: 'Legend', color: Colors.workoutBonus };
  }
}

/**
 * Format athlete name (Athlete + Initials)
 */
export function formatAthleteName(fullName: string | null | undefined): string {
  if (!fullName) return 'Athlete';
  
  const nameParts = fullName.split(' ').filter(part => part.length > 0);
  if (nameParts.length === 0) return 'Athlete';
  
  const initials = nameParts.map(part => part[0].toUpperCase());
  
  if (initials.length === 1) {
    return `Athlete ${initials[0]}`;
  } else if (initials.length === 2) {
    return `Athlete ${initials[0]}${initials[1]}`;
  } else {
    return `Athlete ${initials.slice(0, 3).join('')}`;
  }
}

/**
 * Get calendar display name (shortened workout names)
 */
export function getCalendarDisplayName(name: string | null | undefined, type: 'workout' | 'activity' | 'ad-hoc'): string {
  if (type === 'ad-hoc') return 'Ad Hoc Workout';
  if (!name) return 'Unknown';
  
  switch (name) {
    case 'Upper Body A': return 'Upper A';
    case 'Upper Body B': return 'Upper B';
    case 'Lower Body A': return 'Lower A';
    case 'Lower Body B': return 'Lower B';
    default: return name;
  }
}

/**
 * Get YouTube embed URL from any YouTube URL
 */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.includes('youtube.com/embed/')) return url;
  
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([a-zA-Z0-9_-]{11})(?:\S+)?/;
  const match = url.match(regExp);
  
  return match && match[1] ? `https://www.youtube.com/embed/${match[1]}` : url;
}

/**
 * Convert time string (MM:SS) to seconds
 */
export function timeStringToSeconds(timeString: string | null): number {
  if (!timeString) return 0;
  
  const parts = timeString.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Format seconds to time string (MM:SS)
 */
export function formatSecondsToTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get pill styles for workout selection (PPL/ULUL)
 */
type WorkoutPillCategory = 'upper' | 'lower' | 'push' | 'pull' | 'legs';
type WorkoutPillVariant = 'a' | 'b';

export function getPillStyles(
  workoutType: 'upper-lower' | 'push-pull-legs',
  category: WorkoutPillCategory,
  variant?: WorkoutPillVariant
): {
  iconName: string;
  selectedColor: string;
  unselectedColor: string;
} {
  let iconName = 'zap';
  let colorKey = '';
  
  if (workoutType === 'upper-lower') {
    if (category === 'upper') {
      iconName = 'arrow-up';
      colorKey = variant === 'a' ? 'workoutUpperBodyA' : 'workoutUpperBodyB';
    } else if (category === 'lower') {
      iconName = 'arrow-down';
      colorKey = variant === 'a' ? 'workoutLowerBodyA' : 'workoutLowerBodyB';
    }
  } else if (workoutType === 'push-pull-legs') {
    if (category === 'push') {
      iconName = 'arrow-up-right';
      colorKey = 'workoutPush';
    } else if (category === 'pull') {
      iconName = 'arrow-down-left';
      colorKey = 'workoutPull';
    } else if (category === 'legs') {
      iconName = 'footprints';
      colorKey = 'workoutLegs';
    }
  }
  
  if (!colorKey) {
    colorKey = 'workoutBonus';
    iconName = 'star';
  }
  
  return {
    iconName,
    selectedColor: Colors[colorKey as keyof typeof Colors] as string,
    unselectedColor: Colors[`${colorKey}Light` as keyof typeof Colors] as string || Colors[colorKey as keyof typeof Colors] as string,
  };
}

/**
 * Format weight with unit
 */
export function formatWeight(weight: number | string | null, unit: 'kg' | 'lb' = 'kg'): string {
  if (weight === null || weight === undefined) return '-';
  
  const weightNum = typeof weight === 'string' ? parseFloat(weight) : weight;
  return `${weightNum.toFixed(1)} ${unit}`;
}

/**
 * Format body fat percentage
 */
export function formatBodyFat(percentage: number | string | null): string {
  if (percentage === null || percentage === undefined) return '-';
  
  const percentNum = typeof percentage === 'string' ? parseFloat(percentage) : percentage;
  return `${percentNum.toFixed(1)}%`;
}

/**
 * Calculate BMI
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Format BMI with category
 */
export function formatBMI(bmi: number): { value: string; category: string; color: string } {
  const value = bmi.toFixed(1);
  
  if (bmi < 18.5) {
    return { value, category: 'Underweight', color: Colors.chart4 };
  } else if (bmi < 25) {
    return { value, category: 'Normal', color: Colors.success };
  } else if (bmi < 30) {
    return { value, category: 'Overweight', color: Colors.workoutBonus };
  } else {
    return { value, category: 'Obese', color: Colors.destructive };
  }
}

/**
 * Are sets equal (deep comparison)
 */
export function areSetsEqual(set1: Set<string>, set2: Set<string>): boolean {
  if (set1.size !== set2.size) return false;
  for (const item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
