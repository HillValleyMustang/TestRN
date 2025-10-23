// Common types shared across the mobile app

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface User extends BaseEntity {
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface Exercise {
  id: string;
  name: string;
  category?: string;
  equipment?: string[];
  instructions?: string;
}

export interface WorkoutSet {
  id?: string;
  reps: number;
  weight_kg?: number;
  completed: boolean;
  rest_time_seconds?: number;
}

export interface WorkoutExercise {
  id: string;
  exercise_id: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout extends BaseEntity {
  name: string;
  exercises: WorkoutExercise[];
  duration_minutes?: number;
  completed_at?: string;
  notes?: string;
}

export interface WorkoutTemplate extends BaseEntity {
  name: string;
  description?: string;
  exercises: {
    exercise_id: string;
    default_sets: number;
    default_weight_kg?: number;
    default_reps?: number;
  }[];
  user_id: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form types
export interface FormField {
  value: any;
  error?: string;
  touched?: boolean;
}

export interface FormState {
  [key: string]: FormField;
}

// Navigation types
export type RootStackParamList = {
  Dashboard: undefined;
  Workout: { workoutId?: string; templateId?: string };
  Profile: undefined;
  Settings: undefined;
  // Add other screens as needed
};

// Theme types
export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  card: string;
  popover: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
}

export interface ThemeTypography {
  fontFamily: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}