// Design System - Mobile App
// Matches web app's color scheme and design patterns

export const Colors = {
  // Base Colors
  background: '#000000',
  foreground: '#FFFFFF',
  
  // Primary Action Colors (matching web app)
  actionPrimary: '#4186f5', // hsl(217 91% 60%)
  actionPrimaryLight: '#6ba0f7', // hsl(217 91% 70%)
  actionPrimaryDark: '#2968d9',
  
  // Success & States
  success: '#10B981', // Emerald green
  successLight: '#34D399',
  destructive: '#EF4444', // Red
  destructiveLight: '#F87171',
  warning: '#F59E0B',
  
  // Workout Colors (PPL/ULUL)
  workoutPush: '#228B22', // Forest green - hsl(120 60% 45%)
  workoutPushLight: '#2ea32e',
  workoutPull: '#F89C4D', // Vintage orange - hsl(35 85% 55%)
  workoutPullLight: '#fab86d',
  workoutLegs: '#B645D9', // Purple/magenta - hsl(280 55% 50%)
  workoutLegsLight: '#c966e3',
  workoutUpperA: '#1e3a8a', // Dark blue
  workoutUpperALight: '#2563eb',
  workoutUpperB: '#EF4444', // Red
  workoutUpperBLight: '#F87171',
  workoutLowerA: '#0891b2', // Cyan
  workoutLowerALight: '#06b6d4',
  workoutLowerB: '#6b21a8', // Purple
  workoutLowerBLight: '#9333ea',
  workoutBonus: '#F59E0B', // Golden yellow
  workoutBonusLight: '#FBBF24',
  
  // Onboarding
  onboardingPrimary: '#14B8A6', // Teal
  onboardingPrimaryLight: '#2DD4BF',
  
  // Photo Upload
  photoPrimary: '#8B5CF6', // Purple
  photoPrimaryLight: '#A78BFA',
  
  // Gray Scale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  
  // Card & Surface Colors
  cardBackground: '#0a0a0a',
  cardBorder: '#1a1a1a',
  surfaceLight: '#111111',
  surfaceDark: '#050505',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
};

export const Typography = {
  // Font Families (Poppins from Expo Google Fonts)
  fontFamily: {
    light: 'Poppins_300Light',
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semibold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
  },

  // Font Sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,

  // Font Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,

  // Line Heights
  tight: 1.1,
  normal: 1.5,
  relaxed: 1.75,
};

export const Shadows = {
  sm: {
    shadowColor: Colors.actionPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.actionPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.actionPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  success: {
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  destructive: {
    shadowColor: Colors.destructive,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Animation = {
  // Durations (ms)
  fast: 150,
  normal: 300,
  slow: 500,
  
  // Spring configs
  spring: {
    damping: 15,
    stiffness: 150,
  },
  springBouncy: {
    damping: 10,
    stiffness: 100,
  },
};

// Button Presets
export const ButtonStyles = {
  primary: {
    backgroundColor: Colors.actionPrimary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    ...Shadows.md,
  },
  success: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    ...Shadows.success,
  },
  destructive: {
    backgroundColor: Colors.destructive,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    ...Shadows.destructive,
  },
  outline: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.gray700,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
};

// Card Presets
export const CardStyles = {
  default: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.lg,
  },
  elevated: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
};
