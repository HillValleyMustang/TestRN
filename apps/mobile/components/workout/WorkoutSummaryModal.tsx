import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Dimensions,
  Image,
  TouchableOpacity,
  AccessibilityInfo,
  findNodeHandle,
  StatusBar
} from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { HapticPressable } from '../HapticPressable';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getWorkoutColor } from '../../lib/workout-colors';
import { useData } from '../../app/_contexts/data-context';
import { TextStyles as TypographyTextStyles, FontWeight as TypographyFontWeight } from '../../constants/Typography';

const { width } = Dimensions.get('window');

// ===== INTERFACES =====
interface ExerciseSet {
  weight: string;
  reps: string;
  isCompleted: boolean;
  isPR?: boolean;
}

interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string;
  iconUrl?: string;
  sets: ExerciseSet[];
}

interface HistoricalWorkout {
  exercises: WorkoutExercise[];
  duration: string;
  totalVolume: number;
  prCount: number;
  date: Date;
  workoutName?: string;
}

interface WeeklyVolumeData {
  [muscleGroup: string]: number;
}

interface NextWorkoutSuggestion {
  name: string;
  idealDate: Date;
}

interface WorkoutSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  exercises: WorkoutExercise[];
  workoutName: string;
  startTime: Date;
  duration?: string;
  onSaveWorkout: (rating?: number) => Promise<void>;
  onRateWorkout?: (rating: number) => void;
  showActions?: boolean;
  historicalRating?: number;
  historicalWorkout?: HistoricalWorkout;
  onAIAnalysis?: () => void;
  nextWorkoutSuggestion?: NextWorkoutSuggestion;
  isOnTPath?: boolean;
  historicalData?: boolean;
  weeklyVolumeData?: WeeklyVolumeData;
  allAvailableMuscleGroups?: string[];
  sessionId?: string; // Session ID for points calculation
}

// ===== CONSTANTS =====
const RATING_LABELS = [
  'Poor', 'Fair', 'Good', 'Great', 'Excellent'
] as const;

const Colors = {
  primary: '#007AFF',
  secondary: '#F2F2F7',
  background: '#FFFFFF',
  card: '#FFFFFF',
  foreground: '#000000',
  mutedForeground: '#8E8E93',
  border: '#C6C6C8',
  destructive: '#FF3B30',
  success: '#34C759',
  white: '#FFFFFF'
};

const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};

const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12
};

const TextStyles = TypographyTextStyles;
const FontWeight = TypographyFontWeight;

// ===== UTILITY FUNCTIONS =====
const formatDurationDisplay = (durationStr: string): string => {
  return durationStr
    .replace(' seconds', 's')
    .replace(' minutes', 'm')
    .replace(' minute', 'm');
};

const getPreselectedProgressTab = (workoutName: string): 'all' | 'upper' | 'lower' => {
  const workoutNameLower = workoutName.toLowerCase();
  
  // Upper body workouts
  if (workoutNameLower.includes('push') || 
      workoutNameLower.includes('pull') ||
      workoutNameLower.includes('upper body a') ||
      workoutNameLower.includes('upper body b')) {
    return 'upper';
  }
  
  // Lower body workouts
  if (workoutNameLower.includes('legs') ||
      workoutNameLower.includes('lower body a') ||
      workoutNameLower.includes('lower body b')) {
    return 'lower';
  }
  
  // Default to all for other workout types
  return 'all';
};

const parseDurationToSeconds = (durationStr: string | number): number => {
  if (!durationStr) return 0;
  if (typeof durationStr === 'number') return durationStr;

  const str = String(durationStr).trim();
  
  // MM:SS format
  const colonMatch = str.match(/^(\d+):(\d+)$/);
  if (colonMatch) {
    const minutes = parseInt(colonMatch[1], 10);
    const seconds = parseInt(colonMatch[2], 10);
    return minutes * 60 + seconds;
  }

  // Nm Ns format (e.g., "5m 30s")
  const formattedMatch = str.match(/(\d+)m\s*(\d+)s/);
  if (formattedMatch) {
    const minutes = parseInt(formattedMatch[1], 10);
    const seconds = parseInt(formattedMatch[2], 10);
    return minutes * 60 + seconds;
  }

  // Nm format (e.g., "5m")
  const minutesOnlyMatch = str.match(/^(\d+)m$/i);
  if (minutesOnlyMatch) {
    const minutes = parseInt(minutesOnlyMatch[1], 10);
    return minutes * 60;
  }

  // N seconds format (e.g., "23 seconds" or "23s")
  const secondsMatch = str.match(/^(\d+)\s*seconds?$/i) || str.match(/^(\d+)s$/i);
  if (secondsMatch) {
    return parseInt(secondsMatch[1], 10);
  }

  // Try just a number (assume seconds)
  const numberMatch = str.match(/^(\d+)$/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10);
  }

  // Last resort: extract first number from string
  const anyNumberMatch = str.match(/(\d+)/);
  if (anyNumberMatch) {
    return parseInt(anyNumberMatch[1], 10);
  }

  return 0;
};

const normalizeMuscleGroup = (muscle: string): string => {
  // This function is now a no-op to preserve the original muscle group name.
  return muscle;
};

const getMuscleCategory = (muscle: string): 'upper' | 'lower' | 'other' => {
  // Determine upper/lower based on muscle name patterns
  const muscleLower = muscle.toLowerCase();
  
  // Upper body muscles
  const upperBodyPatterns = ['abs', 'abdominals', 'core', 'back', 'lats', 'biceps', 'chest', 'pectorals', 'shoulders', 'deltoids', 'traps', 'rear delts', 'triceps', 'full body', 'forearms', 'neck'];
  
  // Lower body muscles
  const lowerBodyPatterns = ['calves', 'glutes', 'hamstrings', 'quads', 'quadriceps', 'inner thighs', 'adductors', 'gastrocnemius', 'soleus'];
  
  if (upperBodyPatterns.some(p => muscleLower.includes(p))) return 'upper';
  if (lowerBodyPatterns.some(p => muscleLower.includes(p))) return 'lower';
  
  return 'other';
};

const getStartOfWeek = (date: Date): Date => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

// ===== CUSTOM HOOKS =====
const useImageErrorHandling = () => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const imageErrorsRef = useRef<Set<string>>(new Set());
  
  // Keep ref in sync with state
  useEffect(() => {
    imageErrorsRef.current = imageErrors;
  }, [imageErrors]);

  const handleImageError = useCallback((exerciseId: string) => {
    setImageErrors(prev => {
      // Only update if this is a new error to prevent unnecessary re-renders
      if (prev.has(exerciseId)) {
        return prev;
      }
      const newSet = new Set([...prev, exerciseId]);
      imageErrorsRef.current = newSet;
      return newSet;
    });
  }, []);

  // CRITICAL FIX: Use ref-based check to prevent re-renders
  const hasImageError = useCallback((exerciseId: string) => {
    return imageErrorsRef.current.has(exerciseId);
  }, []); // Empty deps - uses ref so never changes

  return { handleImageError, hasImageError };
};

const useWorkoutMetrics = (exercises: WorkoutExercise[], providedDuration?: string) => {
  return useMemo(() => {
    const completedSets = exercises.flatMap(ex => ex.sets.filter(set => set.isCompleted));
    const totalVolume = completedSets.reduce((total, set) => {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseInt(set.reps, 10) || 0;
      return total + (weight * reps);
    }, 0);

    const prCount = completedSets.filter(set => set.isPR).length;
    const exerciseCount = exercises.length;
    const totalSets = completedSets.length;
    const totalDurationSeconds = providedDuration ? parseDurationToSeconds(providedDuration) : 
      totalSets > 0 ? totalSets * 150 : 0;
    const averageTimePerSet = totalDurationSeconds && totalSets > 0 ? Math.round(totalDurationSeconds / totalSets) : 0;

    const intensityScore = (() => {
      if (totalDurationSeconds <= 0) {
        return 0;
      }
      const minutes = totalDurationSeconds / 60;
      const volumePerMinute = totalVolume / minutes;
      const prRatio = totalSets > 0 ? prCount / totalSets : 0;
      const score = Math.round((volumePerMinute / 100) * 70 + prRatio * 30);
      
      if (__DEV__) {
        console.log('[WorkoutSummaryModal] IntensityScore calculation:', {
          totalDurationSeconds,
          minutes: minutes.toFixed(2),
          totalVolume,
          volumePerMinute: volumePerMinute.toFixed(2),
          prRatio: prRatio.toFixed(2),
          prCount,
          totalSets,
          score
        });
      }
      return score;
    })();

    return {
      totalVolume,
      prCount,
      exerciseCount,
      totalSets,
      totalDurationSeconds,
      averageTimePerSet,
      intensityScore,
      completedSets
    };
  }, [exercises, providedDuration]);
};

// ===== SUBCOMPONENTS =====
interface RatingStarsProps {
  rating: number;
  onRatingChange?: (rating: number) => void | undefined;
  readOnly?: boolean;
  historicalRating?: number;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  onRatingChange,
  readOnly = false,
  historicalRating
}) => {
  // Debug logging for rating - debounced to prevent spam
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[RatingStars] Rating data:', { rating, historicalRating, readOnly });
    }, 100); // 100ms debounce
    return () => clearTimeout(timer);
  }, [rating, historicalRating, readOnly]);

  const handleStarPress = useCallback((star: number) => {
    if (readOnly || !onRatingChange) return;
    onRatingChange(star);
  }, [readOnly, onRatingChange]);

  const handleStarAccessibility = useCallback((star: number) => {
    if (readOnly || !onRatingChange) return;
    onRatingChange(star);
  }, [readOnly, onRatingChange]);

  const renderStar = useCallback((star: number) => {
    const isActive = readOnly ? star <= (historicalRating ?? 0) : star <= rating;
    const iconName = isActive ? "star" : "star-outline";
    const color = isActive ? "#FFD700" : Colors.mutedForeground;

    return (
      <HapticPressable
        key={star}
        style={styles.starButton}
        onPress={() => handleStarPress(star)}
        accessibilityLabel={`${readOnly ? 'Historical rating' : 'Rate workout'}: ${star} ${RATING_LABELS[star - 1]}`}
        accessibilityRole="button"
        accessibilityHint={readOnly ? "Historical rating cannot be changed" : `Tap to rate workout ${star} out of 5`}
        disabled={readOnly}
      >
        <Ionicons
          name={iconName}
          size={32}
          color={color}
          accessible={false}
        />
      </HapticPressable>
    );
  }, [rating, historicalRating, readOnly, handleStarPress, handleStarAccessibility]);

  if (readOnly && historicalRating && historicalRating > 0) {
    return (
      <View style={styles.historicalRatingContainer}>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map(renderStar)}
        </View>
        <View style={styles.lockIndicator}>
          <Ionicons name="lock-closed" size={14} color="#F59E0B" />
          <Text style={styles.lockText}>Rating locked</Text>
        </View>
      </View>
    );
  }

  if (readOnly && (historicalRating === undefined || historicalRating === null)) {
    return (
      <View style={styles.unratedContainer}>
        <View style={styles.unratedMainContainer}>
          <View style={styles.unratedIconContainer}>
            <Ionicons name="lock-closed" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.unratedText}>
            No rating provided for this workout
          </Text>
        </View>
        <Text style={styles.unratedSubtext}>
          Ratings help the AI improve future workout recommendations
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(renderStar)}
    </View>
  );
};

interface ExerciseSummaryProps {
  exercises: WorkoutExercise[];
  readOnly?: boolean;
}

// CRITICAL FIX: Memoize icon component to prevent re-rendering
const ExerciseIcon = React.memo<{ exerciseId: string; iconUrl: string | number; exerciseName: string; onError: () => void; hasError: boolean }>(
  ({ exerciseId, iconUrl, exerciseName, onError, hasError }) => {
    if (hasError) {
      return <Ionicons name="fitness" size={24} color={Colors.foreground} />;
    }
    
    if (typeof iconUrl === 'string' && iconUrl.startsWith('http')) {
      return (
        <Image
          source={{ uri: iconUrl }}
          style={styles.exerciseIcon}
          onError={onError}
          accessible={true}
          accessibilityLabel={`${exerciseName} icon`}
          resizeMode="contain"
        />
      );
    }
    
    if (typeof iconUrl === 'number') {
      return (
        <Image
          source={iconUrl}
          style={styles.exerciseIcon}
          onError={onError}
          accessible={true}
          accessibilityLabel={`${exerciseName} icon`}
          resizeMode="contain"
        />
      );
    }
    
    return (
      <Ionicons 
        name={iconUrl as any} 
        size={24} 
        color={Colors.foreground}
        accessible={true}
        accessibilityLabel={`${exerciseName} icon`}
      />
    );
  },
  (prevProps, nextProps) => {
    // CRITICAL FIX: Only re-render if iconUrl or hasError actually changed
    // Include exerciseId in comparison to handle cases where same iconUrl might be used by different exercises
    const shouldSkip = prevProps.iconUrl === nextProps.iconUrl && 
                       prevProps.hasError === nextProps.hasError && 
                       prevProps.exerciseId === nextProps.exerciseId;
    
    if (!shouldSkip) {
    }
    return shouldSkip;
  }
);

ExerciseIcon.displayName = 'ExerciseIcon';

const ExerciseSummary: React.FC<ExerciseSummaryProps> = ({ exercises, readOnly = false }) => {
  const { handleImageError, hasImageError } = useImageErrorHandling();
  
  // CRITICAL FIX: Memoize icon rendering to prevent flashing
  // Use useMemo to ensure icons are only created once per exercise
  const exerciseIcons = useMemo(() => {
    return exercises.reduce((acc, exercise) => {
      if (!exercise.iconUrl) {
        acc[exercise.exerciseId] = null;
        return acc;
      }
      
      const exerciseId = exercise.exerciseId;
      const hasError = hasImageError(exerciseId);
      
      acc[exercise.exerciseId] = (
        <ExerciseIcon
          exerciseId={exerciseId}
          iconUrl={exercise.iconUrl}
          exerciseName={exercise.exerciseName}
          onError={() => handleImageError(exerciseId)}
          hasError={hasError}
        />
      );
      return acc;
    }, {} as Record<string, React.ReactNode | null>);
  }, [exercises, handleImageError, hasImageError]);
  
  const renderExerciseIcon = useCallback((exercise: WorkoutExercise) => {
    return exerciseIcons[exercise.exerciseId] || null;
  }, [exerciseIcons]);

  if (exercises.length === 0) return null;

  return (
    <Card style={[styles.exercisesCard, readOnly && styles.historicalExercisesCard]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Exercises Performed</Text>
      </View>
      <View style={styles.cardContent}>
        {exercises.map((exercise, index) => {
          const completedSets = exercise.sets.filter(set => set.isCompleted);
          const bestSet = completedSets.reduce((best, current) => {
            const currentVolume = (parseFloat(current.weight) || 0) * (parseInt(current.reps, 10) || 0);
            const bestVolume = (parseFloat(best.weight) || 0) * (parseInt(best.reps, 10) || 0);
            return currentVolume > bestVolume ? current : best;
          }, { weight: '0', reps: '0' });

          return (
            <View 
              key={`exercise-${exercise.exerciseId}`}
              style={styles.exerciseRow}
              accessible={true}
              accessibilityLabel={`${exercise.exerciseName}, ${completedSets.length} sets completed`}
            >
              <View style={styles.exerciseInfo}>
                {renderExerciseIcon(exercise)}
                <Text 
                  style={styles.exerciseName}
                  accessible={false}
                >
                  {exercise.exerciseName}
                </Text>
              </View>
              <View style={styles.exerciseStats}>
                <View style={styles.setsContainer}>
                  {completedSets.map((set, setIndex) => {
                    const weightNum = parseFloat(set.weight) || 0;
                    return (
                      <Text 
                        key={setIndex} 
                        style={styles.setText}
                        accessible={false}
                      >
                        {weightNum > 0 ? `${weightNum}kg × ${set.reps}` : `${set.reps} reps`}
                      </Text>
                    );
                  })}
                  {completedSets.some(set => set.isPR) && (
                    <Ionicons name="trophy" size={14} color="#F59E0B" />
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
};


// ===== MAIN COMPONENT =====
export function WorkoutSummaryModal({
  visible,
  onClose,
  exercises,
  workoutName,
  startTime,
  duration: providedDuration,
  onSaveWorkout,
  onRateWorkout,
  showActions = true,
  historicalRating,
  historicalWorkout,
  weeklyVolumeData,
  onAIAnalysis,
  nextWorkoutSuggestion,
  isOnTPath,
  allAvailableMuscleGroups,
  sessionId
}: WorkoutSummaryModalProps) {
  // ===== STATE =====
  const [isSaving, setIsSaving] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hasRatingChanged, setHasRatingChanged] = useState<boolean>(false);
  const [ratingSaved, setRatingSaved] = useState<boolean>(false);
  const [duration, setDuration] = useState<string>('');
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedVolumeTab, setSelectedVolumeTab] = useState<'all' | 'upper' | 'lower'>('all');
  const [selectedProgressTab, setSelectedProgressTab] = useState<'all' | 'upper' | 'lower'>('all');

  // ===== HOOKS =====
  const metrics = useWorkoutMetrics(exercises, providedDuration);
  const { handleImageError } = useImageErrorHandling();
  const { invalidateAllCaches, handleWorkoutCompletion, userId, getWorkoutSessions } = useData();

  // ===== CONSTANTS =====
  const [routes] = useState([
    { key: 'summary', title: 'Summary' },
    { key: 'insights', title: 'Insights' },
    { key: 'progress', title: 'Progress' },
  ]);

  // ===== EFFECTS =====
  useEffect(() => {
    if (visible) {
      // CRITICAL: Reset rating state when modal opens for a new workout (not historical)
      // Only use historicalRating if this is a read-only historical view
      if (showActions) {
        setRating(0);
        setHasRatingChanged(false);
        setRatingSaved(false);
      } else if (historicalRating !== undefined && historicalRating !== null) {
        // For historical views, use the historical rating
        setRating(historicalRating);
      }
      
      if (providedDuration) {
        setDuration(formatDurationDisplay(providedDuration));
      } else {
        const now = new Date();
        const diffMs = now.getTime() - startTime.getTime();
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }
  }, [visible, startTime, providedDuration, showActions, historicalRating]);

  // Preselect progress tab based on workout type
  useEffect(() => {
    if (visible && workoutName) {
      const preselectedTab = getPreselectedProgressTab(workoutName);
      setSelectedProgressTab(preselectedTab);
    }
  }, [visible, workoutName]);

  // ===== MEMOIZED VALUES =====
  // Extract muscle groups from exercises
  const allMuscleGroups = useMemo(() => {
    const groups: string[] = [];
    exercises.forEach((ex) => {
      if (ex.muscleGroup) {
        // Handle multi-muscle groups (comma-separated)
        const splitGroups = ex.muscleGroup.split(',').map(m => m.trim());
        groups.push(...splitGroups);
      }
    });
    return groups;
  }, [exercises]);

  // Get unique muscle groups - use allAvailableMuscleGroups if provided, otherwise extract from exercises
  const availableMuscleGroups = useMemo(() => {
    // If allAvailableMuscleGroups is provided, use it
    if (allAvailableMuscleGroups && allAvailableMuscleGroups.length > 0) {
      return Array.from(new Set(allAvailableMuscleGroups)).sort((a, b) => a.localeCompare(b));
    }
    // Otherwise, extract from exercises (fallback behavior)
    const muscles = new Set<string>();
    exercises.forEach(ex => {
      if (ex.muscleGroup) {
        // Handle multi-muscle groups (comma-separated)
        const groups = ex.muscleGroup.split(',').map(m => m.trim());
        groups.forEach(group => {
          muscles.add(group);
        });
      }
    });
    const result = Array.from(muscles).sort((a, b) => a.localeCompare(b));
    return result;
  }, [exercises, allAvailableMuscleGroups]);

  // Categorize muscle groups into upper/lower
  const { upperBodyMuscles, lowerBodyMuscles } = useMemo(() => {
    const upper: string[] = [];
    const lower: string[] = [];
    
    availableMuscleGroups.forEach(muscle => {
      const category = getMuscleCategory(muscle);
      if (category === 'upper') {
        upper.push(muscle);
      } else if (category === 'lower') {
        lower.push(muscle);
      }
    });
    
    return { upperBodyMuscles: upper, lowerBodyMuscles: lower };
  }, [availableMuscleGroups]);

  const volumeDistribution = useMemo(() => {
    // Filter muscles based on selected tab
    let musclesForTab: string[] = [];
    if (selectedVolumeTab === 'all') {
      musclesForTab = [...upperBodyMuscles, ...lowerBodyMuscles];
    } else if (selectedVolumeTab === 'upper') {
      musclesForTab = upperBodyMuscles;
    } else {
      musclesForTab = lowerBodyMuscles;
    }
    
    const acc: { [key: string]: number } = {};
    
    // Initialize with 0 for all muscles
    musclesForTab.forEach(muscle => {
      acc[muscle] = 0;
    });

    exercises.forEach(exercise => {
      const exerciseVolume = exercise.sets.filter(set => set.isCompleted).reduce((sum, set) => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps, 10) || 0;
        return sum + (weight * reps);
      }, 0);

      const muscleGroups = (exercise.muscleGroup || 'Other').split(',').map(m => m.trim());
      
      muscleGroups.forEach(muscleGroup => {
        const category = getMuscleCategory(muscleGroup);
        
        // Check if this muscle should be shown based on selected tab
        const shouldInclude = selectedVolumeTab === 'all' ||
          (selectedVolumeTab === 'upper' && category === 'upper') ||
          (selectedVolumeTab === 'lower' && category === 'lower');
        
        if (shouldInclude) {
          if (acc.hasOwnProperty(muscleGroup)) {
            acc[muscleGroup] += exerciseVolume / muscleGroups.length;
          } else {
            acc[muscleGroup] = exerciseVolume / muscleGroups.length;
          }
        }
      });
    });
    
    return acc;
  }, [exercises, selectedVolumeTab, upperBodyMuscles, lowerBodyMuscles]);

  const weeklyVolumeTotals = useMemo(() => {
    const acc: { [key: string]: number } = {};

    if (weeklyVolumeData) {
      Object.entries(weeklyVolumeData).forEach(([muscle, volume]) => {
        const category = getMuscleCategory(muscle);
        const shouldInclude = selectedProgressTab === 'all' ||
          (selectedProgressTab === 'upper' && category === 'upper') ||
          (selectedProgressTab === 'lower' && category === 'lower');

        if (shouldInclude) {
          // Handle both array format (from getWeeklyVolumeData) and number format
          let totalVolume = 0;
          if (Array.isArray(volume)) {
            // Sum the array values to get total weekly volume
            totalVolume = volume.reduce((sum, val) => sum + (typeof val === 'number' && !isNaN(val) ? val : 0), 0);
          } else if (typeof volume === 'number' && !isNaN(volume)) {
            totalVolume = volume;
          }
          
          // Include all muscles (even with 0 volume) to show complete muscle breakdown
          acc[muscle] = totalVolume;
        }
      });
    }
    
    return acc;
  }, [weeklyVolumeData, selectedProgressTab]);

  const historicalComparison = useMemo(() => {
    if (!historicalWorkout) return null;
    
    // Optimized: Compute completed sets count once instead of twice
    const completedSetsCount = historicalWorkout.exercises.flatMap(ex => ex.sets.filter(set => set.isCompleted)).length;
    
    return {
      volumeDiff: metrics.totalVolume - historicalWorkout.totalVolume,
      volumePercent: historicalWorkout.totalVolume > 0 
        ? ((metrics.totalVolume - historicalWorkout.totalVolume) / historicalWorkout.totalVolume) * 100 
        : 0,
      timeDiff: metrics.totalDurationSeconds - parseDurationToSeconds(historicalWorkout.duration),
      prDiff: metrics.prCount - historicalWorkout.prCount,
      avgTimePerSetDiff: metrics.averageTimePerSet - (
        completedSetsCount > 0
          ? Math.round(parseDurationToSeconds(historicalWorkout.duration) / completedSetsCount)
          : 0
      ),
    };
  }, [historicalWorkout, metrics]);

  // ===== HANDLERS =====
  const handleSave = useCallback(async () => {
    console.log('[WorkoutSummaryModal] handleSave called with rating:', rating);
    setIsSaving(true);
    try {
      await onSaveWorkout(rating);
      // Trigger dashboard refresh to ensure fresh data is loaded when user navigates back
      if (userId) {
        invalidateAllCaches();
        // Also trigger the global refresh mechanism for immediate effect
        if (typeof (global as any).triggerDashboardRefresh === 'function') {
          (global as any).triggerDashboardRefresh();
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
    } finally {
      setIsSaving(false);
    }
  }, [onSaveWorkout, rating, userId, invalidateAllCaches]);

  const handleRating = useCallback((newRating: number) => {
    setRating(newRating);
    setHasRatingChanged(true);
  }, []);

  const handleSaveRating = useCallback(async () => {
    if (hasRatingChanged) {
      setIsSaving(true);
      try {
        // CRITICAL: Await the rating save to ensure it completes
        await onRateWorkout?.(rating);
        setHasRatingChanged(false);
        setRatingSaved(true);
        // Trigger dashboard refresh when rating is saved
        if (userId) {
          invalidateAllCaches();
          if (typeof (global as any).triggerDashboardRefresh === 'function') {
            (global as any).triggerDashboardRefresh();
          }
        }
      } catch (error) {
        console.error('[WorkoutSummaryModal] Error saving rating:', error);
        Alert.alert('Error', 'Failed to save rating');
        // Re-throw to prevent marking as saved if there was an error
        throw error;
      } finally {
        setIsSaving(false);
      }
    }
  }, [hasRatingChanged, rating, onRateWorkout, userId, invalidateAllCaches]);

  const handleSaveAndClose = useCallback(async () => {
    // Save rating first if changed
    if (hasRatingChanged) {
      await handleSaveRating();
    }
    
    // Save workout (ensures any pending changes are saved)
    await handleSave();
    
    // CRITICAL: Ensure dashboard refresh happens immediately when closing the modal
    if (userId) {
      console.log('[WorkoutSummaryModal] Triggering immediate dashboard refresh after workout completion');
      
      // CRITICAL: Wait a brief moment to ensure database writes are committed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // First, trigger the data context's workout completion handler for immediate cache invalidation
      // CRITICAL: Pass the session ID to award points for workout completion
      try {
        if (sessionId && userId && getWorkoutSessions) {
          // Fetch the session data to pass to handleWorkoutCompletion
          // Retry a few times in case the session isn't immediately available
          let session = null;
          for (let attempt = 0; attempt < 3 && !session; attempt++) {
            const sessions = await getWorkoutSessions(userId);
            session = sessions.find(s => s.id === sessionId);
            if (!session && attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          if (session) {
            await handleWorkoutCompletion(session);
            console.log('[WorkoutSummaryModal] Points calculated and awarded for session:', sessionId);
          } else {
            console.warn('[WorkoutSummaryModal] Session not found after retries, calling without session ID (cache invalidation only)');
            await handleWorkoutCompletion(undefined);
          }
        } else {
          console.log('[WorkoutSummaryModal] No session ID provided, cache invalidation only (no points)');
          await handleWorkoutCompletion(undefined);
        }
        console.log('[WorkoutSummaryModal] Data context cache invalidation completed');
      } catch (error) {
        console.error('[WorkoutSummaryModal] Error during data context cache invalidation:', error);
      }
      
      // CRITICAL FIX: Invalidate cache immediately
      invalidateAllCaches();
      console.log('[WorkoutSummaryModal] Cache invalidated');
      
      // Then trigger the global refresh mechanism for immediate effect
      if (typeof (global as any).triggerDashboardRefresh === 'function') {
        (global as any).triggerDashboardRefresh();
        console.log('[WorkoutSummaryModal] Global dashboard refresh triggered');
      }
    }
    
    // Close the modal - the dashboard refresh will complete in the background
    onClose();
  }, [hasRatingChanged, handleSaveRating, handleSave, onClose, userId, invalidateAllCaches, handleWorkoutCompletion, sessionId, getWorkoutSessions]);

  // ===== TAB ROUTES =====
  const SummaryTab = useCallback(() => (
    <ScrollView
      style={[styles.historyScrollView, !showActions && styles.historyScrollViewHistorical]}
      contentContainerStyle={[
        styles.scrollContentContainer,
        !showActions && styles.scrollContentContainerHistorical
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      bounces={true}
    >
      {/* Your Next Workout — only when just finished (live summary), not historical */}
      {showActions && nextWorkoutSuggestion && (
        <View style={styles.nextWorkoutSection}>
          <Text style={styles.nextWorkoutLabel}>Your Next Workout</Text>
          <View
            style={[
              styles.nextWorkoutBadge,
              { backgroundColor: getWorkoutColor(nextWorkoutSuggestion.name).main }
            ]}
            accessible
            accessibilityLabel={`Next workout: ${nextWorkoutSuggestion.name}`}
          >
            <Text style={styles.nextWorkoutBadgeText} numberOfLines={1}>
              {nextWorkoutSuggestion.name}
            </Text>
          </View>
        </View>
      )}

      {/* Workout Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: getWorkoutColor(workoutName).main }]}
                accessible={true}
                accessibilityLabel={`Total volume: ${metrics.totalVolume.toFixed(0)} kilograms`}
              >
                {metrics.totalVolume.toFixed(0)}kg
              </Text>
              <Text style={styles.statLabel}>Total Volume</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: getWorkoutColor(workoutName).main }]}
                accessible={true}
                accessibilityLabel={`Personal records: ${metrics.prCount}`}
              >
                {metrics.prCount}
              </Text>
              <Text style={styles.statLabel}>PRs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: getWorkoutColor(workoutName).main }]}
                accessible={true}
                accessibilityLabel={`Exercises: ${metrics.exerciseCount}`}
              >
                {metrics.exerciseCount}
              </Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: getWorkoutColor(workoutName).main }]}
                accessible={true}
                accessibilityLabel={`Duration: ${duration}`}
              >
                {duration}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Exercise Summary */}
      <ExerciseSummary exercises={exercises} readOnly={!showActions} />

      {/* Rating Section */}
      <Card style={[styles.ratingCard, styles.historicalRatingCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {!showActions ? "Workout Rating" : "Rate Your Workout"}
          </Text>
        </View>
        <View style={[styles.cardContent, showActions && rating > 0 && styles.ratingCardContentWithButton]}>
          {showActions && (
            <Text style={styles.ratingDescription}>
              How did this workout feel?
            </Text>
          )}
          <RatingStars
            rating={rating}
            onRatingChange={showActions ? handleRating : undefined}
            readOnly={!showActions}
            historicalRating={historicalRating}
          />
          {showActions && rating > 0 && (
            <View style={styles.ratingActions}>
              <Button
                onPress={handleSaveRating}
                disabled={isSaving}
                style={[styles.saveRatingButton, ratingSaved && styles.saveRatingButtonSaved]}
              >
                <Text style={styles.saveRatingButtonText}>
                  {isSaving ? 'Saving...' : ratingSaved ? 'Saved ✓' : 'Save Rating'}
                </Text>
              </Button>
            </View>
          )}
        </View>
      </Card>

      {/* Motivational Message */}
      <View style={[styles.motivationalOuterContainer, { borderColor: getWorkoutColor(workoutName).main + '30' }]}>
        <View style={[styles.motivationalContainer, { borderColor: getWorkoutColor(workoutName).main }]}>
          <View style={[styles.motivationalIconContainer, { backgroundColor: getWorkoutColor(workoutName).main + '20' }]}>
            <Ionicons name="trophy-outline" size={24} color={getWorkoutColor(workoutName).main} />
          </View>
          <Text style={styles.motivationalText}>
            Nice work, keep going!
          </Text>
          <Ionicons name="flame" size={20} color={getWorkoutColor(workoutName).main} />
        </View>
      </View>

      {/* Success Message */}
      {metrics.prCount > 0 && (
        <Card style={styles.successCard}>
          <View style={styles.successContent}>
            <Ionicons name="trophy" size={24} color="#F59E0B" />
            <Text style={styles.successText}>
              🎉 {metrics.prCount} new PR{metrics.prCount > 1 ? 's' : ''} achieved!
            </Text>
          </View>
        </Card>
      )}

    </ScrollView>
  ), [
    showActions, metrics, duration, rating, ratingSaved, isSaving,
    exercises, historicalRating, handleRating, handleSaveRating,
    nextWorkoutSuggestion, workoutName
  ]);

  const ProgressTab = useCallback(() => (
    <ScrollView
      style={[styles.historyScrollView, styles.progressScrollView]}
      contentContainerStyle={styles.progressScrollViewContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      bounces={true}
    >
      {/* Weekly Muscle Volume Chart */}
      <Card style={styles.progressCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {weeklyVolumeData ? 'Weekly Muscle Volume' : 'Current Week Volume'}
          </Text>
          {weeklyVolumeData && (
            <Text style={styles.cardSubtitle}>
              Weekly totals - Week of {getStartOfWeek(startTime).toLocaleDateString()}
            </Text>
          )}
          {!weeklyVolumeData && (
            <Text style={styles.cardSubtitle}>
              Dynamic calculation - showing current week totals
            </Text>
          )}
        </View>
        <View style={styles.cardContent}>
          {/* Upper/Lower/All Body Tabs */}
          <View style={styles.volumeTabsContainer}>
            <TouchableOpacity
              style={[
                styles.volumeTab,
                styles.volumeTabLeft,
                selectedProgressTab === 'upper' && { backgroundColor: getWorkoutColor(workoutName).main }
              ]}
              onPress={() => setSelectedProgressTab('upper')}
              accessibilityState={{ selected: selectedProgressTab === 'upper' }}
            >
              <Text style={[
                styles.volumeTabText,
                selectedProgressTab === 'upper' && styles.volumeTabTextActive
              ]}>
                Upper Body
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.volumeTab,
                styles.volumeTabMiddle,
                selectedProgressTab === 'lower' && { backgroundColor: getWorkoutColor(workoutName).main }
              ]}
              onPress={() => setSelectedProgressTab('lower')}
              accessibilityState={{ selected: selectedProgressTab === 'lower' }}
            >
              <Text style={[
                styles.volumeTabText,
                selectedProgressTab === 'lower' && styles.volumeTabTextActive
              ]}>
                Lower Body
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.volumeTab,
                styles.volumeTabRight,
                selectedProgressTab === 'all' && { backgroundColor: getWorkoutColor(workoutName).main }
              ]}
              onPress={() => setSelectedProgressTab('all')}
              accessibilityState={{ selected: selectedProgressTab === 'all' }}
            >
              <Text style={[
                styles.volumeTabText,
                selectedProgressTab === 'all' && styles.volumeTabTextActive
              ]}>
                All
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weekly Volume Distribution Chart */}
          <View style={styles.volumeChartContainer}>
            {Object.entries(weeklyVolumeTotals).length > 0 ? (() => {
              // Calculate total volume for the selected category (upper/lower/all)
              const categoryTotalVolume = Object.values(weeklyVolumeTotals).reduce((sum, vol) => {
                const safeVol = typeof vol === 'number' && !isNaN(vol) ? vol : 0;
                return sum + safeVol;
              }, 0);

              return Object.entries(weeklyVolumeTotals)
                .sort(([,a], [,b]) => b - a)
                .map(([muscle, volume]) => {
                  const safeVolume = typeof volume === 'number' && !isNaN(volume) ? volume : 0;
                  // Calculate percentage of total category volume
                  const percentage = categoryTotalVolume > 0 ? (safeVolume / categoryTotalVolume) * 100 : 0;

                  return (
                    <View key={muscle} style={styles.volumeBarRow}>
                      <View style={styles.volumeBarLabel}>
                        <Text style={styles.volumeBarMuscle}>{muscle}</Text>
                        <Text style={styles.volumeBarValue}>
                          {safeVolume.toFixed(0)}kg{safeVolume > 0 ? ` • ${percentage.toFixed(1)}%` : ''}
                        </Text>
                      </View>
                      <View style={styles.volumeBarBackground}>
                        <View
                          style={[
                            styles.volumeBarFill,
                            { 
                              width: `${percentage}%`, 
                              backgroundColor: safeVolume > 0 ? getWorkoutColor(workoutName).main : Colors.secondary 
                            }
                          ]}
                        />
                      </View>
                    </View>
                  );
                });
            })() : (
              <View style={styles.emptyChartContainer}>
                <Text style={styles.emptyChartText}>
                  No volume data available for {selectedProgressTab === 'upper' ? 'Upper Body' : selectedProgressTab === 'lower' ? 'Lower Body' : 'All Muscles'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    </ScrollView>
  ), [
    selectedProgressTab, weeklyVolumeTotals, startTime, weeklyVolumeData
  ]);

  const InsightsTab = useCallback(() => (
    <ScrollView
      style={styles.insightsScrollView}
      contentContainerStyle={styles.insightsScrollViewContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      bounces={true}
    >
      {/* Historical Comparison */}
      {historicalComparison && (
        <Card style={styles.insightsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              vs Last {historicalWorkout?.workoutName || workoutName} Workout
            </Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Volume:</Text>
              <View style={styles.comparisonValue}>
                <Ionicons
                  name={historicalComparison.volumeDiff >= 0 ? "trending-up" : "trending-down"}
                  size={16}
                  color={getWorkoutColor(workoutName).main}
                />
                <Text style={[styles.comparisonText, { color: historicalComparison.volumeDiff >= 0 ? '#10B981' : '#EF4444' }]}>
                  {historicalComparison.volumeDiff >= 0 ? '+' : ''}{historicalComparison.volumeDiff.toFixed(0)}kg
                </Text>
                <Text style={styles.comparisonPercent}>
                  ({historicalComparison.volumePercent >= 0 ? '+' : ''}{historicalComparison.volumePercent.toFixed(1)}%)
                </Text>
              </View>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Time:</Text>
              <View style={styles.comparisonValue}>
                <Ionicons
                  name={historicalComparison.timeDiff <= 0 ? "trending-down" : "trending-up"}
                  size={16}
                  color={getWorkoutColor(workoutName).main}
                />
                <Text style={[styles.comparisonText, { color: historicalComparison.timeDiff <= 0 ? '#10B981' : '#EF4444' }]}>
                  {historicalComparison.timeDiff >= 0 ? '+' : ''}{Math.floor(Math.abs(historicalComparison.timeDiff) / 60)}:{(Math.abs(historicalComparison.timeDiff) % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>PRs:</Text>
              <View style={styles.comparisonValue}>
                <Ionicons
                  name={historicalComparison.prDiff >= 0 ? "trending-up" : "trending-down"}
                  size={16}
                  color={getWorkoutColor(workoutName).main}
                />
                <Text style={[styles.comparisonText, { color: historicalComparison.prDiff >= 0 ? '#10B981' : '#EF4444' }]}>
                  {historicalComparison.prDiff >= 0 ? '+' : ''}{historicalComparison.prDiff}
                </Text>
              </View>
            </View>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Avg Time/Set:</Text>
              <View style={styles.comparisonValue}>
                <Ionicons
                  name={historicalComparison.avgTimePerSetDiff <= 0 ? "trending-down" : "trending-up"}
                  size={16}
                  color={getWorkoutColor(workoutName).main}
                />
                <Text style={[styles.comparisonText, { color: historicalComparison.avgTimePerSetDiff <= 0 ? '#10B981' : '#EF4444' }]}>
                  {historicalComparison.avgTimePerSetDiff >= 0 ? '+' : ''}{historicalComparison.avgTimePerSetDiff}s
                </Text>
              </View>
            </View>
          </View>
        </Card>
      )}

      {/* Enhanced Metrics */}
      <Card style={styles.insightsCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Workout Metrics</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg Time per Set:</Text>
            <Text style={[styles.metricValue, { color: getWorkoutColor(workoutName).main }]}>{metrics.averageTimePerSet}s</Text>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricLabelContainer}>
              <Text style={styles.metricLabel}>Intensity Score:</Text>
              <HapticPressable
                onPress={() => Alert.alert(
                  'Intensity Score',
                  'Your Intensity Score measures how challenging your workout was on a scale of 0-100.\n\n' +
                  '📊 How it\'s calculated:\n' +
                  '• 70% from volume efficiency (total weight moved per minute)\n' +
                  '• 30% from PR achievement (percentage of sets that were personal records)\n\n' +
                  '💡 Tips to improve:\n' +
                  '• Lift heavier weights\n' +
                  '• Complete more sets\n' +
                  '• Reduce rest time between sets\n' +
                  '• Set new personal records\n\n' +
                  'Higher scores = more intense workouts!'
                )}
              >
                <Ionicons name="information-circle" size={16} color={Colors.mutedForeground} />
              </HapticPressable>
            </View>
            <Text style={[styles.metricValue, { color: getWorkoutColor(workoutName).main }]}>{metrics.intensityScore}/100</Text>
          </View>
        </View>
      </Card>

      {/* Upper/Lower Body Toggle */}
      <Card style={[styles.insightsCard, styles.muscleGroupsCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Muscle Group Volume Distribution</Text>
        </View>
        <View style={[styles.cardContent, styles.muscleGroupsCardContent]}>
          {/* Upper/Lower Body Tabs */}
          <View style={styles.volumeTabsContainer}>
            <TouchableOpacity
              style={[
                styles.volumeTab,
                styles.volumeTabLeft,
                (selectedVolumeTab === 'upper' || selectedVolumeTab === 'all') && { backgroundColor: getWorkoutColor(workoutName).main }
              ]}
              onPress={() => setSelectedVolumeTab('upper')}
              accessibilityState={{ selected: selectedVolumeTab === 'upper' }}
            >
              <Text style={[
                styles.volumeTabText,
                (selectedVolumeTab === 'upper' || selectedVolumeTab === 'all') && styles.volumeTabTextActive
              ]}>
                Upper Body
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.volumeTab,
                styles.volumeTabRight,
                (selectedVolumeTab === 'lower' || selectedVolumeTab === 'all') && { backgroundColor: getWorkoutColor(workoutName).main }
              ]}
              onPress={() => setSelectedVolumeTab('lower')}
              accessibilityState={{ selected: selectedVolumeTab === 'lower' }}
            >
              <Text style={[
                styles.volumeTabText,
                (selectedVolumeTab === 'lower' || selectedVolumeTab === 'all') && styles.volumeTabTextActive
              ]}>
                Lower Body
              </Text>
            </TouchableOpacity>
          </View>

          {/* Volume Distribution Chart */}
          <View style={styles.volumeChartContainer}>
            {Object.entries(volumeDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([muscle, volume]) => {
                const maxVolume = Math.max(...Object.values(volumeDistribution), 0.001); // Prevent division by 0
                const barWidth = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;
                const percentage = metrics.totalVolume > 0 ? (volume / metrics.totalVolume) * 100 : 0;
                
                return (
                  <View key={`insights-${muscle}`} style={styles.volumeBarRow}>
                    <View style={styles.volumeBarLabel}>
                      <Text style={styles.volumeBarMuscle}>{muscle}</Text>
                      <Text style={styles.volumeBarValue}>
                        {volume.toFixed(0)}kg • {percentage.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.volumeBarBackground}>
                      {volume > 0 && (
                        <View
                          style={[
                            styles.volumeBarFill,
                            { width: `${barWidth}%`, backgroundColor: getWorkoutColor(workoutName).main }
                          ]}
                        />
                      )}
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      </Card>

      {/* Exercise Performance Graph */}
      <View style={styles.graphContainer}>
        <Text style={styles.graphTitle}>Exercise Performance</Text>
        {exercises.map((exercise, index) => {
          const completedSets = exercise.sets.filter(set => set.isCompleted);
          const exerciseVolume = completedSets.reduce((sum, set) =>
            sum + ((parseFloat(set.weight) || 0) * (parseInt(set.reps, 10) || 0)), 0
          );
          const maxVolume = Math.max(...exercises.map(ex =>
            ex.sets.filter(set => set.isCompleted).reduce((sum, set) =>
              sum + ((parseFloat(set.weight) || 0) * (parseInt(set.reps, 10) || 0)), 0
            ), 0
          ));

          return (
            <View key={`insights-${exercise.exerciseId}-${index}`} style={styles.graphBarContainer}>
              <Text 
                style={styles.graphExerciseName} 
                numberOfLines={1}
                accessible={true}
                accessibilityLabel={`${exercise.exerciseName}: ${exerciseVolume.toFixed(0)} kilograms`}
              >
                {exercise.exerciseName}
              </Text>
              <View style={styles.graphBar}>
                <View
                  style={[
                    styles.graphBarFill,
                    { width: maxVolume > 0 ? `${(exerciseVolume / maxVolume) * 100}%` : '0%', backgroundColor: getWorkoutColor(workoutName).main }
                  ]}
                />
              </View>
              <Text 
                style={styles.graphValue}
                accessible={true}
                accessibilityLabel={`${exerciseVolume.toFixed(0)} kilograms`}
              >
                {exerciseVolume.toFixed(0)}kg
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  ), [
    historicalComparison, metrics, selectedVolumeTab, volumeDistribution, exercises, workoutName
  ]);

  // ===== RENDER =====
  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="slide" 
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, !showActions && styles.historicalModalContainer]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View
                style={[styles.workoutNameBadge, { backgroundColor: getWorkoutColor(workoutName).main }]}
                accessible={true}
                accessibilityLabel={`Workout: ${workoutName}`}
              >
                <Text
                  style={styles.workoutNameText}
                  accessible={false}
                >
                  {workoutName}
                </Text>
              </View>
              <View style={styles.modalHeaderInfo}>
                <Text 
                  style={styles.modalHeaderDate}
                  accessible={true}
                  accessibilityLabel={`Workout date: ${startTime.toLocaleDateString('en-US', { weekday: 'short' })} ${startTime.toLocaleDateString()}`}
                >
                  {startTime.toLocaleDateString('en-US', { weekday: 'short' })} {startTime.toLocaleDateString()}
                </Text>
                <Text 
                  style={styles.modalHeaderTime}
                  accessible={true}
                  accessibilityLabel={`Workout time: ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                >
                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
            <HapticPressable 
              onPress={showActions ? handleSaveAndClose : onClose} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors.foreground} />
            </HapticPressable>
          </View>

          <TabView
            navigationState={{ index: tabIndex, routes }}
            renderScene={SceneMap({
              summary: SummaryTab,
              progress: ProgressTab,
              insights: InsightsTab,
            })}
            onIndexChange={setTabIndex}
            initialLayout={{ width: Dimensions.get('window').width }}
            swipeEnabled={true}
            animationEnabled={true}
            accessible={true}
            renderTabBar={(props) => (
              <View style={[styles.defaultTabBarContainer, { backgroundColor: getWorkoutColor(workoutName).main }]}>
                <TabBar
                  {...props}
                  style={styles.defaultTabBar}
                  indicatorStyle={[{ backgroundColor: Colors.foreground }, styles.defaultTabIndicator]}
                  activeColor={Colors.white}
                  inactiveColor={'#FFFFFFCC'}
                />
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.lg,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historicalModalContainer: {
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  workoutNameBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  workoutNameText: {
    ...TextStyles.h4,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  modalHeaderInfo: {
    gap: Spacing.xs,
  },
  modalHeaderDate: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  modalHeaderTime: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  historyScrollView: {
    maxHeight: 500,
  },
  historyScrollViewHistorical: {
    maxHeight: undefined,
    flex: 0,
  },
  scrollContentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  scrollContentContainerHistorical: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  nextWorkoutSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  nextWorkoutLabel: {
    ...TextStyles.bodyMedium,
    fontWeight: FontWeight.semiBold,
    color: Colors.foreground,
  },
  nextWorkoutBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  nextWorkoutBadgeText: {
    ...TextStyles.bodyMedium,
    fontWeight: FontWeight.semiBold,
    color: Colors.white,
  },
  statsContainer: {
    marginBottom: Spacing.md,
  },
  statsCard: {
    padding: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...TextStyles.h4,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  ratingCard: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  ratingActions: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveRatingButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  saveRatingButtonSaved: {
    backgroundColor: Colors.success,
  },
  saveRatingButtonText: {
    ...TextStyles.bodyMedium,
    fontWeight: FontWeight.bold,
    color: Colors.white,
  },
  cardHeader: {
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  cardTitle: {
    ...TextStyles.h5,
    color: Colors.foreground,
    textAlign: 'center',
  },
  cardContent: {
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  ratingCardContentWithButton: {
    paddingBottom: Spacing.md,
  },
  ratingDescription: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  historicalRatingContainer: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  lockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  lockText: {
    ...TextStyles.smallMedium,
    color: Colors.mutedForeground,
  },
  unratedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  unratedMainContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  unratedIconContainer: {
    alignItems: 'center',
  },
  unratedText: {
    ...TextStyles.caption,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  unratedSubtext: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  exercisesCard: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  historicalExercisesCard: {
    // No shadow for cleaner look
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  exerciseIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  exerciseName: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
  },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  setsContainer: {
    gap: Spacing.xs,
  },
  setText: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  successCard: {
    marginBottom: Spacing.lg,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  successText: {
    ...TextStyles.bodyMedium,
    color: '#92400E',
  },
  motivationalOuterContainer: {
    marginBottom: Spacing.md,
    padding: 2,
    borderRadius: BorderRadius.lg + 2,
    borderWidth: 2,
  },
  motivationalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  motivationalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '20',
  },
  motivationalText: {
    ...TextStyles.bodyMedium,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  progressCard: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  progressScrollView: {
    // No maxHeight constraint to allow expansion like summary tab
  },
  progressScrollViewContent: {
    justifyContent: 'space-between',
  },
  cardSubtitle: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  volumeTabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: 2,
    marginBottom: Spacing.md,
  },
  volumeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  volumeTabLeft: {
    marginRight: 2,
  },
  volumeTabMiddle: {
    marginLeft: 2,
    marginRight: 2,
  },
  volumeTabRight: {
    marginLeft: 2,
  },
  volumeTabActive: {
    // Removed hardcoded backgroundColor to allow dynamic workout colors
  },
  mainTabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    padding: 2,
    marginBottom: Spacing.md,
  },
  mainTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  mainTabText: {
    ...TextStyles.smallMedium,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  mainTabTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  defaultTabBarContainer: {
    marginBottom: Spacing.md,
  },
  defaultTabBar: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  defaultTabIndicator: {
    height: 3,
    borderRadius: 2,
  },
  tabViewContainer: {
    flex: 1,
  },
  volumeTabText: {
    ...TextStyles.smallMedium,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  volumeTabTextActive: {
    color: Colors.white,
  },
  volumeChartContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    minHeight: 100,
  },
  emptyChartContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    ...TextStyles.bodyMedium,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  volumeBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  volumeBarLabel: {
    flex: 1,
    minWidth: 100,
  },
  volumeBarMuscle: {
    ...TextStyles.smallMedium,
    color: Colors.foreground,
    fontWeight: '600',
  },
  volumeBarValue: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  volumeBarBackground: {
    flex: 2,
    height: 12,
    backgroundColor: Colors.secondary,
    borderRadius: 6,
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  graphContainer: {
    padding: Spacing.md,
  },
  graphTitle: {
    ...TextStyles.h3,
    fontWeight: FontWeight.bold,
    color: Colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  graphBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  graphExerciseName: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
    flex: 1,
    marginRight: Spacing.sm,
  },
  graphBar: {
    width: 150,
    height: 20,
    backgroundColor: Colors.secondary,
    borderRadius: 4,
    justifyContent: 'flex-start',
    marginVertical: Spacing.xs,
  },
  graphBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  graphValue: {
    ...TextStyles.smallMedium,
    color: Colors.foreground,
    marginLeft: Spacing.sm,
    minWidth: 50,
    textAlign: 'right',
  },
  insightsCard: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  comparisonLabel: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
  },
  comparisonValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  comparisonText: {
    ...TextStyles.bodyMedium,
    fontWeight: FontWeight.bold,
  },
  comparisonPercent: {
    ...TextStyles.small,
    color: Colors.mutedForeground,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  metricLabel: {
    ...TextStyles.bodyMedium,
    color: Colors.foreground,
  },
  metricLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metricValue: {
    ...TextStyles.bodyMedium,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  muscleGroupsCard: {
    flex: 1,
    minHeight: 200,
  },
  muscleGroupsCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  insightsScrollView: {
    // No maxHeight constraint to allow expansion like summary tab
  },
  insightsScrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  historicalRatingCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});