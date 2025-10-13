/**
 * Theme System - Mobile App
 * Complete parity with web app design system (apps/web/src/app/globals.css)
 * Uses HSL color system for consistency
 */

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return `rgb(${r}, ${g}, ${b})`;
}

// Core color definitions matching web globals.css
export const Colors = {
  // Base Colors
  background: '#FAFAFA', // Global default background for all screens (matches Dashboard BackgroundRoot)
  foreground: hslToRgb(0, 0, 3.9), // hsl(0 0% 3.9%) - Near black
  
  // Card
  card: hslToRgb(0, 0, 100), // hsl(0 0% 100%) - White
  cardForeground: hslToRgb(0, 0, 3.9),
  
  // Primary
  primary: hslToRgb(0, 0, 9), // hsl(0 0% 9%) - Near black
  primaryForeground: hslToRgb(0, 0, 98),
  
  // Secondary
  secondary: hslToRgb(0, 0, 96.1), // hsl(0 0% 96.1%)
  secondaryForeground: hslToRgb(0, 0, 9),
  
  // Muted
  muted: hslToRgb(0, 0, 96.1), // hsl(0 0% 96.1%)
  mutedForeground: hslToRgb(0, 0, 45.1), // hsl(0 0% 45.1%)
  
  // Accent
  accent: hslToRgb(0, 0, 96.1), // hsl(0 0% 96.1%)
  accentForeground: hslToRgb(0, 0, 9),
  
  // Action (Premium Blue)
  actionPrimary: hslToRgb(217, 91, 60), // hsl(217 91% 60%)
  actionPrimaryLight: hslToRgb(217, 91, 70), // hsl(217 91% 70%)
  actionPrimaryForeground: hslToRgb(0, 0, 100),
  
  // Status
  success: hslToRgb(142.1, 76.2, 36.3), // hsl(142.1 76.2% 36.3%)
  successForeground: hslToRgb(0, 0, 98),
  destructive: hslToRgb(0, 84.2, 60.2), // hsl(0 84.2% 60.2%)
  destructiveForeground: hslToRgb(0, 0, 98),
  
  // Borders & Inputs
  border: hslToRgb(0, 0, 89.8), // hsl(0 0% 89.8%)
  input: hslToRgb(0, 0, 89.8),
  ring: hslToRgb(0, 0, 3.9),
  
  // Chart Colors
  chart1: hslToRgb(12, 76, 61), // hsl(12 76% 61%)
  chart2: hslToRgb(173, 58, 39), // hsl(173 58% 39%)
  chart3: hslToRgb(197, 37, 24), // hsl(197 37% 24%)
  chart4: hslToRgb(43, 74, 66), // hsl(43 74% 66%)
  chart5: hslToRgb(27, 87, 67), // hsl(27 87% 67%)
  
  // Workout Colors - ULUL Split
  workoutUpperBodyA: hslToRgb(220, 68, 32), // hsl(220 68% 32%) - Blue
  workoutUpperBodyALight: hslToRgb(220, 68, 42),
  workoutUpperBodyB: hslToRgb(0, 84, 60), // hsl(0 84% 60%) - Red
  workoutUpperBodyBLight: hslToRgb(0, 84, 70),
  workoutLowerBodyA: hslToRgb(190, 86, 36), // hsl(190 86% 36%) - Cyan
  workoutLowerBodyALight: hslToRgb(190, 86, 46),
  workoutLowerBodyB: hslToRgb(270, 67, 40), // hsl(270 67% 40%) - Purple
  workoutLowerBodyBLight: hslToRgb(270, 67, 50),
  
  // Workout Colors - PPL Split
  workoutPush: hslToRgb(120, 60, 45), // hsl(120 60% 45%) - Forest Green
  workoutPushLight: hslToRgb(120, 60, 55),
  workoutPull: hslToRgb(35, 85, 55), // hsl(35 85% 55%) - Vintage Orange
  workoutPullLight: hslToRgb(35, 85, 65),
  workoutLegs: hslToRgb(280, 55, 50), // hsl(280 55% 50%) - Purple/Magenta
  workoutLegsLight: hslToRgb(280, 55, 60),
  
  // Workout Special
  workoutBonus: hslToRgb(50, 75, 60), // hsl(50 75% 60%) - Golden Yellow
  workoutBonusLight: hslToRgb(50, 75, 70),
  workoutAdHoc: hslToRgb(50, 75, 60), // Same as bonus
  workoutAdHocLight: hslToRgb(50, 75, 70),
  workoutActivity: hslToRgb(173, 58, 39), // Same as chart-2
  workoutActivityLight: hslToRgb(173, 58, 49),
  
  // Activity Colors
  activityRunning: hslToRgb(25, 80, 55), // hsl(25 80% 55%) - Coral/Salmon
  activityRunningLight: hslToRgb(25, 80, 65),
  activitySwimming: hslToRgb(200, 85, 45), // hsl(200 85% 45%) - Aqua Blue
  activitySwimmingLight: hslToRgb(200, 85, 55),
  activityCycling: hslToRgb(160, 70, 40), // hsl(160 70% 40%) - Sage Green
  activityCyclingLight: hslToRgb(160, 70, 50),
  activityTennis: hslToRgb(300, 70, 55), // hsl(300 70% 55%) - Bright Magenta
  activityTennisLight: hslToRgb(300, 70, 65),
  
  // Aurora Effects
  auroraBlue: hslToRgb(200, 100, 78), // hsl(200 100% 78%) - Sky Blue
  auroraPurple: hslToRgb(270, 50, 32), // hsl(270 50% 32%) - Deep Purple
  auroraOrange: hslToRgb(58, 98, 73), // hsl(58 98% 73%) - Pale Yellow
  auroraGreen: hslToRgb(160, 100, 43), // hsl(160 100% 43%) - Vibrant Mint
  auroraPink: hslToRgb(324, 100, 44), // hsl(324 100% 44%) - Hot Magenta
  auroraYellow: hslToRgb(58, 98, 73), // hsl(58 98% 73%) - Pale Yellow
  
  // Onboarding Theme
  onboardingPrimary: hslToRgb(220, 68, 32), // Same as Upper Body A
  onboardingPrimaryLight: hslToRgb(220, 68, 42),
  onboardingPrimaryFaint: hslToRgb(220, 68, 98),
  
  // Sidebar (for reference, may not be used in mobile)
  sidebarBackground: hslToRgb(0, 0, 98),
  sidebarForeground: hslToRgb(240, 5.3, 26.1),
  sidebarPrimary: hslToRgb(240, 5.9, 10),
  sidebarPrimaryForeground: hslToRgb(0, 0, 98),
  sidebarAccent: hslToRgb(240, 4.8, 95.9),
  sidebarAccentForeground: hslToRgb(240, 5.9, 10),
  sidebarBorder: hslToRgb(220, 13, 91),
  sidebarRing: hslToRgb(217.2, 91.2, 59.8),

  // Common UI Colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray Scale
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Blue Scale
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue200: '#BFDBFE',
  blue300: '#93C5FD',
  blue400: '#60A5FA',
  blue500: '#3B82F6',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue800: '#1E40AF',
  blue900: '#1E3A8A',
  
  // Purple Scale
  purple50: '#FAF5FF',
  purple100: '#F3E8FF',
  purple200: '#E9D5FF',
  purple300: '#D8B4FE',
  purple400: '#C084FC',
  purple500: '#A855F7',
  purple600: '#9333EA',
  purple700: '#7E22CE',
  purple800: '#6B21A8',
  purple900: '#581C87',
  
  // Cyan Scale
  cyan50: '#ECFEFF',
  cyan100: '#CFFAFE',
  cyan200: '#A5F3FC',
  cyan300: '#67E8F9',
  cyan400: '#22D3EE',
  cyan500: '#06B6D4',
  cyan600: '#0891B2',
  cyan700: '#0E7490',
  cyan800: '#155E75',
  cyan900: '#164E63',
  
  // Yellow Scale
  yellow50: '#FEFCE8',
  yellow100: '#FEF9C3',
  yellow200: '#FEF08A',
  yellow300: '#FDE047',
  yellow400: '#FACC15',
  yellow500: '#EAB308',
  yellow600: '#CA8A04',
  yellow700: '#A16207',
  yellow800: '#854D0E',
  yellow900: '#713F12',
  
  // Red Scale
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red200: '#FECACA',
  red300: '#FCA5A5',
  red400: '#F87171',
  red500: '#EF4444',
  red600: '#DC2626',
  red700: '#B91C1C',
  red800: '#991B1B',
  red900: '#7F1D1D',
};

// Convenient workout color exports (hex values for compatibility)
export const WorkoutColors = {
  push: '#228B22',
  pushLight: '#2ea32e',
  pull: '#F89C4D',
  pullLight: '#fab86d',
  legs: '#B645D9',
  legsLight: '#c966e3',
  upperA: '#1e3a8a',
  upperALight: '#2563eb',
  upperB: '#EF4444',
  upperBLight: '#F87171',
  lowerA: '#0891b2',
  lowerALight: '#06b6d4',
  lowerB: '#6b21a8',
  lowerBLight: '#9333ea',
  bonus: '#F59E0B',
  bonusLight: '#FBBF24',
  adHoc: '#F59E0B',
  adHocLight: '#FBBF24',
};

// Spacing scale matching web app
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,
  '5xl': 96,
  '6xl': 128,
};

// Border radius matching web app (0.75rem = 12px)
export const BorderRadius = {
  sm: 6,
  md: 12, // Default from web
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
};

// Shadows for elevation
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Animation durations
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700,
};

// Export default theme object
export const Theme = {
  colors: Colors,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  animation: Animation,
};

export default Theme;
