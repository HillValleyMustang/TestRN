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
import { TabView, SceneMap } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { HapticPressable } from '../HapticPressable';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getWorkoutColor } from '../../lib/workout-colors';

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
}

interface WeeklyVolumeData {
  [muscleGroup: string]: number[];
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
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'sync_failed';
  onRetrySync?: () => void;
  showActions?: boolean;
  showSyncStatus?: boolean;
  historicalRating?: number;
  historicalWorkout?: HistoricalWorkout;
  onAIAnalysis?: () => void;
  nextWorkoutSuggestion?: NextWorkoutSuggestion;
  isOnTPath?: boolean;
  historicalData?: boolean;
  weeklyVolumeData?: WeeklyVolumeData;
}

// ===== CONSTANTS =====
const MUSCLE_GROUPS = {
  UPPER_BODY: [
    'Abs', 'Abdominals', 'Core',
    'Back', 'Lats',
    'Biceps',
    'Chest', 'Pectorals',
    'Shoulders', 'Deltoids',
    'Traps', 'Rear Delts',
    'Triceps',
    'Full Body'
  ],
  LOWER_BODY: [
    'Calves',
    'Glutes', 'Outer Glutes',
    'Hamstrings',
    'Inner Thighs',
    'Quads', 'Quadriceps'
  ]
} as const;

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

const TextStyles = {
  h1: { fontSize: 32, fontWeight: '700' as const },
  h2: { fontSize: 24, fontWeight: '600' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  h4: { fontSize: 18, fontWeight: '600' as const },
  h5: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, fontWeight: '500' as const },
  small: { fontSize: 14, fontWeight: '400' as const },
  smallMedium: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  captionMedium: { fontSize: 12, fontWeight: '500' as const }
};

const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const
};

// ===== UTILITY FUNCTIONS =====
const formatDurationDisplay = (durationStr: string): string => {
  return durationStr
    .replace(' seconds', 's')
    .replace(' minutes', 'm')
    .replace(' minute', 'm');
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

  // Other formats...
  const formattedMatch = str.match(/(\d+)m\s*(\d+)s/);
  if (formattedMatch) {
    const minutes = parseInt(formattedMatch[1], 10);
    const seconds = parseInt(formattedMatch[2], 10);
    return minutes * 60 + seconds;
  }

  // Try just a number (assume seconds)
  const numberMatch = str.match(/^(\d+)$/);
  if (numberMatch) {
    return parseInt(numberMatch[1], 10);
  }

  return 0;
};

const normalizeMuscleGroup = (muscle: string): string => {
  const muscleLower = muscle.toLowerCase();
  
  if (muscleLower.includes('abs') || muscleLower.includes('abdominals')) return 'Abs';
  if (muscleLower.includes('core')) return 'Core';
  if (muscleLower.includes('back') || muscleLower.includes('lats')) return 'Back';
  if (muscleLower.includes('biceps')) return 'Biceps';
  if (muscleLower.includes('chest') || muscleLower.includes('pectorals')) return 'Chest';
  if (muscleLower.includes('shoulders') || muscleLower.includes('deltoids')) return 'Shoulders';
  if (muscleLower.includes('traps') || muscleLower.includes('rear delts')) return 'Traps';
  if (muscleLower.includes('triceps')) return 'Triceps';
  if (muscleLower.includes('calves')) return 'Calves';
  if (muscleLower.includes('glutes') || muscleLower.includes('outer glutes')) return 'Glutes';
  if (muscleLower.includes('hamstrings')) return 'Hamstrings';
  if (muscleLower.includes('inner thighs')) return 'Inner Thighs';
  if (muscleLower.includes('quads') || muscleLower.includes('quadriceps')) return 'Quads';
  if (muscleLower.includes('full body')) return 'Full Body';
  
  return muscle;
};

const getMuscleCategory = (muscle: string): 'upper' | 'lower' | 'other' => {
  if (MUSCLE_GROUPS.UPPER_BODY.includes(muscle as any)) return 'upper';
  if (MUSCLE_GROUPS.LOWER_BODY.includes(muscle as any)) return 'lower';
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

  const handleImageError = useCallback((exerciseId: string) => {
    setImageErrors(prev => new Set([...prev, exerciseId]));
  }, []);

  const hasImageError = useCallback((exerciseId: string) => {
    return imageErrors.has(exerciseId);
  }, [imageErrors]);

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
      if (totalDurationSeconds <= 0) return 0;
      const minutes = totalDurationSeconds / 60;
      const volumePerMinute = totalVolume / minutes;
      const prRatio = totalSets > 0 ? prCount / totalSets : 0;
      return Math.round((volumePerMinute / 100) * 70 + prRatio * 30);
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
  // Debug logging for rating
  useEffect(() => {
    console.log('[RatingStars] Rating data:', { rating, historicalRating, readOnly });
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

const ExerciseSummary: React.FC<ExerciseSummaryProps> = ({ exercises, readOnly = false }) => {
  const { handleImageError, hasImageError } = useImageErrorHandling();

  const renderExerciseIcon = useCallback((exercise: WorkoutExercise) => {
    if (!exercise.iconUrl) return null;
    
    const exerciseId = exercise.exerciseId;
    if (hasImageError(exerciseId)) {
      return <Ionicons name="fitness" size={24} color={Colors.foreground} />;
    }

    if (typeof exercise.iconUrl === 'string' && exercise.iconUrl.startsWith('http')) {
      return (
        <Image
          source={{ uri: exercise.iconUrl }}
          style={styles.exerciseIcon}
          onError={() => handleImageError(exerciseId)}
          accessible={true}
          accessibilityLabel={`${exercise.exerciseName} icon`}
        />
      );
    }

    if (typeof exercise.iconUrl === 'number') {
      return (
        <Image
          source={exercise.iconUrl}
          style={styles.exerciseIcon}
          onError={() => handleImageError(exerciseId)}
          accessible={true}
          accessibilityLabel={`${exercise.exerciseName} icon`}
        />
      );
    }

    return (
      <Ionicons 
        name={exercise.iconUrl as any} 
        size={24} 
        color={Colors.foreground}
        accessible={true}
        accessibilityLabel={`${exercise.exerciseName} icon`}
      />
    );
  }, [handleImageError, hasImageError]);

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
              key={`${exercise.exerciseId}-${index}`} 
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

interface SyncStatusProps {
  syncStatus: 'idle' | 'syncing' | 'synced' | 'sync_failed';
  onRetrySync?: (() => void) | undefined;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ syncStatus, onRetrySync }) => {
  const getSyncStatusDisplay = useCallback(() => {
    switch (syncStatus) {
      case 'syncing':
        return { text: 'Syncing...', color: Colors.mutedForeground, icon: 'sync' as const };
      case 'synced':
        return { text: 'Synced', color: Colors.success || '#10B981', icon: 'checkmark-circle' as const };
      case 'sync_failed':
        return { text: 'Sync Failed', color: Colors.destructive, icon: 'close-circle' as const };
      default:
        return { text: 'Saved Locally', color: Colors.mutedForeground, icon: 'cloud-offline' as const };
    }
  }, [syncStatus]);

  const statusDisplay = getSyncStatusDisplay();

  return (
    <Card style={styles.syncStatusCard}>
      <View style={styles.syncStatusContent}>
        <Ionicons
          name={statusDisplay.icon}
          size={20}
          color={statusDisplay.color}
          accessible={true}
          accessibilityLabel={`Sync status: ${statusDisplay.text}`}
        />
        <Text 
          style={[styles.syncStatusText, { color: statusDisplay.color }]}
          accessible={true}
          accessibilityLabel={`Sync status: ${statusDisplay.text}`}
        >
          {statusDisplay.text}
        </Text>
        {syncStatus === 'sync_failed' && onRetrySync && (
          <HapticPressable
            style={styles.retryButton}
            onPress={onRetrySync}
            accessibilityLabel="Retry sync"
          >
            <Ionicons name="refresh" size={16} color={Colors.primary} />
            <Text style={styles.retryText}>Retry</Text>
          </HapticPressable>
        )}
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
  syncStatus = 'idle',
  onRetrySync,
  showActions = true,
  showSyncStatus = true,
  historicalRating,
  historicalWorkout,
  weeklyVolumeData,
  onAIAnalysis,
  nextWorkoutSuggestion,
  isOnTPath
}: WorkoutSummaryModalProps) {
  // Debug logging
  useEffect(() => {
    if (visible) {
      console.log('[WorkoutSummaryModal] Modal opened with data:');
      console.log('[WorkoutSummaryModal] exercises count:', exercises.length);
      console.log('[WorkoutSummaryModal] exercises:', exercises.map(e => ({ name: e.exerciseName, sets: e.sets.length })));
      console.log('[WorkoutSummaryModal] historicalRating:', historicalRating);
      console.log('[WorkoutSummaryModal] historicalRating type:', typeof historicalRating);
      console.log('[WorkoutSummaryModal] workoutName:', workoutName);
      console.log('[WorkoutSummaryModal] showActions:', showActions);
    }
  }, [visible, exercises, historicalRating, workoutName, showActions]);
  // Debug logging
  useEffect(() => {
    if (visible) {
      console.log('[WorkoutSummaryModal] Modal opened with data:');
      console.log('[WorkoutSummaryModal] exercises count:', exercises.length);
      console.log('[WorkoutSummaryModal] exercises:', exercises.map(e => ({ name: e.exerciseName, sets: e.sets.length })));
      console.log('[WorkoutSummaryModal] historicalRating:', historicalRating);
      console.log('[WorkoutSummaryModal] workoutName:', workoutName);
      console.log('[WorkoutSummaryModal] showActions:', showActions);
    }
  }, [visible, exercises, historicalRating, workoutName, showActions]);
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
  const { handleImageError, hasImageError } = useImageErrorHandling();

  // ===== CONSTANTS =====
  const [routes] = useState([
    { key: 'summary', title: 'Summary' },
    { key: 'progress', title: 'Progress' },
    { key: 'insights', title: 'Insights' },
  ]);

  // ===== EFFECTS =====
  useEffect(() => {
    if (visible) {
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
  }, [visible, startTime, providedDuration]);

  // ===== MEMOIZED VALUES =====
  const volumeDistribution = useMemo(() => {
    const allMusclesForTab = selectedVolumeTab === 'all' 
      ? [...MUSCLE_GROUPS.UPPER_BODY, ...MUSCLE_GROUPS.LOWER_BODY]
      : selectedVolumeTab === 'upper' 
        ? MUSCLE_GROUPS.UPPER_BODY
        : MUSCLE_GROUPS.LOWER_BODY;
    
    const acc: { [key: string]: number } = {};
    allMusclesForTab.forEach(muscle => {
      acc[muscle] = 0;
    });

    exercises.forEach(exercise => {
      const exerciseVolume = exercise.sets.filter(set => set.isCompleted).reduce((sum, set) => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps, 10) || 0;
        return sum + (weight * reps);
      }, 0);

      const muscleGroup = exercise.muscleGroup || 'Other';
      const normalizedMuscle = normalizeMuscleGroup(muscleGroup);
      const category = getMuscleCategory(normalizedMuscle);
      
      if (selectedVolumeTab === 'all' ||
          (selectedVolumeTab === 'upper' && category === 'upper') ||
          (selectedVolumeTab === 'lower' && category === 'lower')) {
        if (acc.hasOwnProperty(normalizedMuscle)) {
          acc[normalizedMuscle] += exerciseVolume;
        } else {
          acc[normalizedMuscle] = exerciseVolume;
        }
      }
    });
    
    return acc;
  }, [exercises, selectedVolumeTab]);

  const weeklyVolumeTotals = useMemo(() => {
    const allMusclesForTab = selectedProgressTab === 'all' 
      ? [...MUSCLE_GROUPS.UPPER_BODY, ...MUSCLE_GROUPS.LOWER_BODY]
      : selectedProgressTab === 'upper' 
        ? MUSCLE_GROUPS.UPPER_BODY
        : MUSCLE_GROUPS.LOWER_BODY;
    
    const acc: { [key: string]: number } = {};
    allMusclesForTab.forEach(muscle => {
      acc[muscle] = 0;
    });

    if (weeklyVolumeData) {
      const isAllZeros = Object.values(weeklyVolumeData).every(
        dailyVolumes => Array.isArray(dailyVolumes) && dailyVolumes.every(value => value === 0)
      );
      
      if (isAllZeros) {
        // Fallback to current workout data
        exercises.forEach(exercise => {
          const exerciseVolume = exercise.sets.filter(set => set.isCompleted).reduce((sum, set) => {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps, 10) || 0;
            return sum + (weight * reps);
          }, 0);

          const muscleGroup = exercise.muscleGroup || 'Other';
          const normalizedMuscle = normalizeMuscleGroup(muscleGroup);
          const category = getMuscleCategory(normalizedMuscle);
          
          if (selectedProgressTab === 'all' ||
              (selectedProgressTab === 'upper' && category === 'upper') ||
              (selectedProgressTab === 'lower' && category === 'lower')) {
            if (acc.hasOwnProperty(normalizedMuscle)) {
              acc[normalizedMuscle] += exerciseVolume;
            } else {
              acc[normalizedMuscle] = exerciseVolume;
            }
          }
        });
      } else {
        Object.entries(weeklyVolumeData).forEach(([muscle, dailyVolumes]) => {
          const normalizedMuscle = normalizeMuscleGroup(muscle);
          const category = getMuscleCategory(normalizedMuscle);
          
          if (selectedProgressTab === 'all' ||
              (selectedProgressTab === 'upper' && category === 'upper') ||
              (selectedProgressTab === 'lower' && category === 'lower')) {
            const weeklyTotal = dailyVolumes.reduce((sum, dailyVolume) => sum + (dailyVolume || 0), 0);
            if (acc.hasOwnProperty(normalizedMuscle)) {
              acc[normalizedMuscle] += weeklyTotal;
            } else {
              acc[normalizedMuscle] = weeklyTotal;
            }
          }
        });
      }
    } else {
      // Calculate from current workout
      exercises.forEach(exercise => {
        const exerciseVolume = exercise.sets.filter(set => set.isCompleted).reduce((sum, set) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps, 10) || 0;
          return sum + (weight * reps);
        }, 0);

        const muscleGroup = exercise.muscleGroup || 'Other';
        const normalizedMuscle = normalizeMuscleGroup(muscleGroup);
        const category = getMuscleCategory(normalizedMuscle);
        
        if (selectedProgressTab === 'all' ||
            (selectedProgressTab === 'upper' && category === 'upper') ||
            (selectedProgressTab === 'lower' && category === 'lower')) {
          if (acc.hasOwnProperty(normalizedMuscle)) {
            acc[normalizedMuscle] += exerciseVolume;
          } else {
            acc[normalizedMuscle] = exerciseVolume;
          }
        }
      });
    }
    
    return acc;
  }, [exercises, weeklyVolumeData, selectedProgressTab]);

  const historicalComparison = useMemo(() => {
    if (!historicalWorkout) return null;
    
    return {
      volumeDiff: metrics.totalVolume - historicalWorkout.totalVolume,
      volumePercent: historicalWorkout.totalVolume > 0 
        ? ((metrics.totalVolume - historicalWorkout.totalVolume) / historicalWorkout.totalVolume) * 100 
        : 0,
      timeDiff: metrics.totalDurationSeconds - parseDurationToSeconds(historicalWorkout.duration),
      prDiff: metrics.prCount - historicalWorkout.prCount,
      avgTimePerSetDiff: metrics.averageTimePerSet - (
        historicalWorkout.exercises.flatMap(ex => ex.sets.filter(set => set.isCompleted)).length > 0
          ? Math.round(parseDurationToSeconds(historicalWorkout.duration) / 
              historicalWorkout.exercises.flatMap(ex => ex.sets.filter(set => set.isCompleted)).length)
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
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
    } finally {
      setIsSaving(false);
    }
  }, [onSaveWorkout, rating]);

  const handleRating = useCallback((newRating: number) => {
    setRating(newRating);
    setHasRatingChanged(true);
  }, []);

  const handleSaveRating = useCallback(async () => {
    if (hasRatingChanged) {
      setIsSaving(true);
      try {
        onRateWorkout?.(rating);
        setHasRatingChanged(false);
        setRatingSaved(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to save rating');
      } finally {
        setIsSaving(false);
      }
    }
  }, [hasRatingChanged, rating, onRateWorkout]);

  const handleSaveAndClose = useCallback(async () => {
    if (hasRatingChanged) {
      await handleSaveRating();
    }
    await handleSave();
    onClose();
  }, [hasRatingChanged, handleSaveRating, handleSave, onClose]);

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
      {/* Workout Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text 
                style={styles.statValue}
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
                style={styles.statValue}
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
                style={styles.statValue}
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
                style={styles.statValue}
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

      {/* Rating Section */}
      <Card style={[styles.ratingCard, styles.historicalRatingCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {!showActions ? "Workout Rating" : "Rate Your Workout"}
          </Text>
        </View>
        <View style={styles.cardContent}>
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
                accessibilityLabel={isSaving ? 'Saving rating...' : ratingSaved ? 'Rating saved' : 'Save rating'}
              >
                <Text style={styles.saveRatingButtonText}>
                  {isSaving ? 'Saving...' : ratingSaved ? 'Saved ✓' : 'Save Rating'}
                </Text>
              </Button>
            </View>
          )}
        </View>
      </Card>

      {/* Exercise Summary */}
      <ExerciseSummary exercises={exercises} readOnly={!showActions} />

      {/* Motivational Message */}
      <View style={styles.motivationalContainer}>
        <Text style={styles.motivationalText}>
          Nice work, keep going! 💪
        </Text>
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

      {/* Sync Status */}
      {showSyncStatus && (
        <SyncStatus syncStatus={syncStatus} onRetrySync={onRetrySync} />
      )}
    </ScrollView>
  ), [
    showActions, showSyncStatus, metrics, duration, rating, ratingSaved, isSaving, 
    exercises, syncStatus, onRetrySync, historicalRating, handleRating, handleSaveRating
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
          {/* Upper/Lower Body Tabs */}
          <View style={styles.volumeTabsContainer}>
            <TouchableOpacity
              style={[
                styles.volumeTab,
                styles.volumeTabLeft,
                selectedProgressTab === 'upper' && styles.volumeTabActive
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
                styles.volumeTabRight,
                selectedProgressTab === 'lower' && styles.volumeTabActive
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
          </View>

          {/* Weekly Volume Distribution Chart */}
          <View style={styles.volumeChartContainer}>
            {Object.entries(weeklyVolumeTotals)
              .sort(([,a], [,b]) => b - a)
              .map(([muscle, volume]) => (
                <View key={muscle} style={styles.volumeBarRow}>
                  <View style={styles.volumeBarLabel}>
                    <Text style={styles.volumeBarMuscle}>{muscle}</Text>
                    <Text style={styles.volumeBarValue}>
                      {volume.toFixed(0)}kg • {((volume / Math.max(...Object.values(weeklyVolumeTotals), 1)) * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.volumeBarBackground}>
                    <View
                      style={[
                        styles.volumeBarFill,
                        { width: `${(volume / Math.max(...Object.values(weeklyVolumeTotals), 1)) * 100}%` }
                      ]}
                    />
                  </View>
                </View>
              ))}
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
            <View key={`progress-${exercise.exerciseId}-${index}`} style={styles.graphBarContainer}>
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
                    { width: maxVolume > 0 ? `${(exerciseVolume / maxVolume) * 100}%` : '0%' }
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
    selectedProgressTab, weeklyVolumeTotals, startTime, weeklyVolumeData, exercises
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
            <Text style={styles.cardTitle}>vs Last Workout</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonLabel}>Volume:</Text>
              <View style={styles.comparisonValue}>
                <Ionicons
                  name={historicalComparison.volumeDiff >= 0 ? "trending-up" : "trending-down"}
                  size={16}
                  color={historicalComparison.volumeDiff >= 0 ? '#10B981' : '#EF4444'}
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
                  color={historicalComparison.timeDiff <= 0 ? '#10B981' : '#EF4444'}
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
                  color={historicalComparison.prDiff >= 0 ? '#10B981' : '#EF4444'}
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
                  color={historicalComparison.avgTimePerSetDiff <= 0 ? '#10B981' : '#EF4444'}
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
            <Text style={styles.metricValue}>{metrics.averageTimePerSet}s</Text>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricLabelContainer}>
              <Text style={styles.metricLabel}>Intensity Score:</Text>
              <HapticPressable
                onPress={() => Alert.alert('Intensity Score', 'Calculated based on volume efficiency (70%) and PR achievement (30%). Higher scores indicate more intense workouts.')}
                accessibilityLabel="Intensity score information"
              >
                <Ionicons name="information-circle" size={16} color={Colors.mutedForeground} />
              </HapticPressable>
            </View>
            <Text style={styles.metricValue}>{metrics.intensityScore}/100</Text>
          </View>
        </View>
      </Card>

      {/* Upper/Lower Body Toggle */}
      <Card style={[styles.insightsCard, styles.muscleGroupsCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Muscle Groups</Text>
        </View>
        <View style={[styles.cardContent, styles.muscleGroupsCardContent]}>
          {/* Upper/Lower Body Tabs */}
          <View style={styles.volumeTabsContainer}>
            <TouchableOpacity
              style={[
                styles.volumeTab,
                styles.volumeTabLeft,
                selectedVolumeTab === 'upper' && styles.volumeTabActive
              ]}
              onPress={() => setSelectedVolumeTab('upper')}
              accessibilityState={{ selected: selectedVolumeTab === 'upper' }}
            >
              <Text style={[
                styles.volumeTabText,
                selectedVolumeTab === 'upper' && styles.volumeTabTextActive
              ]}>
                Upper Body
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.volumeTab,
                styles.volumeTabRight,
                selectedVolumeTab === 'lower' && styles.volumeTabActive
              ]}
              onPress={() => setSelectedVolumeTab('lower')}
              accessibilityState={{ selected: selectedVolumeTab === 'lower' }}
            >
              <Text style={[
                styles.volumeTabText,
                selectedVolumeTab === 'lower' && styles.volumeTabTextActive
              ]}>
                Lower Body
              </Text>
            </TouchableOpacity>
          </View>

          {/* Volume Distribution Chart */}
          <View style={styles.volumeChartContainer}>
            {Object.entries(volumeDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([muscle, volume]) => (
                <View key={`insights-${muscle}`} style={styles.volumeBarRow}>
                  <View style={styles.volumeBarLabel}>
                    <Text style={styles.volumeBarMuscle}>{muscle}</Text>
                    <Text style={styles.volumeBarValue}>
                      {volume.toFixed(0)}kg • {((volume / metrics.totalVolume) * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.volumeBarBackground}>
                    <View
                      style={[
                        styles.volumeBarFill,
                        { width: `${(volume / Math.max(...Object.values(volumeDistribution))) * 100}%` }
                      ]}
                    />
                  </View>
                </View>
              ))}
          </View>
        </View>
      </Card>
    </ScrollView>
  ), [
    historicalComparison, metrics, selectedVolumeTab, volumeDistribution
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
                style={[styles.workoutNameBadge, { backgroundColor: Colors.primary }]}
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
                  accessibilityLabel={`Workout date: ${startTime.toLocaleDateString()}`}
                >
                  {startTime.toLocaleDateString()}
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
    gap: Spacing.sm,
  },
  lockIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
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
  syncStatusCard: {
    marginBottom: Spacing.lg,
  },
  syncStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  syncStatusText: {
    ...TextStyles.captionMedium,
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.secondary,
    borderRadius: 6,
  },
  retryText: {
    ...TextStyles.smallMedium,
    color: Colors.primary,
  },
  motivationalContainer: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#000000',
    alignItems: 'center',
  },
  motivationalText: {
    ...TextStyles.body,
    color: Colors.foreground,
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
  volumeTabRight: {
    marginLeft: 2,
  },
  volumeTabActive: {
    backgroundColor: Colors.primary,
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