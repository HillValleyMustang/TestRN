import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../app/_contexts/auth-context';
import { supabase } from '@data/supabase/client-mobile';

interface WeeklyVolumeData {
  [muscleGroup: string]: number;
}

interface WorkoutSession {
  id: string;
  sessionId?: string;
  template_name: string;
  completed_at?: string | null;
  exercise_count?: number;
  duration_string?: string;
  total_volume?: number;
  sync_status?: 'local_only' | 'syncing' | 'synced' | 'sync_failed';
  exercises?: Array<{
    exerciseId: string;
    exerciseName: string;
    muscleGroup?: string;
    sets: Array<{
      weight: string;
      reps: string;
      isCompleted: boolean;
    }>;
  }>;
}

interface WorkoutPerformanceData {
  weeklyVolumeTotals: WeeklyVolumeData;
  weeklySetsTotals: WeeklyVolumeData; // Sets per muscle group
  dailyVolumeData: { day: string; volume: number; date: Date }[]; // Daily volume for current week
  recentSessions: WorkoutSession[];
  totalWeeklyVolume: number;
  totalWeeklySets: number;
  weeklyWorkoutCount: number; // Number of workouts this week
  weeklyPRCount: number; // Number of PRs this week
  isLoading: boolean;
  error: string | null;
}

// Normalize muscle group names to match canonical Exercise Library names
const normalizeMuscleGroup = (muscleGroup: string, canonicalGroups: string[]): string => {
  const normalized = muscleGroup.toLowerCase().trim();

  // Map common variations to canonical Exercise Library names
  const muscleMap: { [key: string]: string } = {
    // Chest variations
    'chest': 'Chest',
    'pectorals': 'Pectorals',

    // Shoulders variations
    'shoulders': 'Shoulders',
    'deltoids': 'Deltoids',
    'shoulders (deltoids)': 'Shoulders (Deltoids)',
    'rear delts, traps': 'Shoulders', // Map compound to primary

    // Back variations
    'back': 'Lats', // Default to Lats if no specific back muscle
    'lats': 'Lats',
    'back, biceps': 'Biceps', // Map compound to secondary muscle

    // Arms variations
    'biceps': 'Biceps',
    'triceps': 'Triceps',
    'triceps, chest': 'Triceps',

    // Legs variations
    'quadriceps': 'Quadriceps',
    'quads': 'Quads',
    'quads, glutes': 'Glutes', // Map compound to secondary muscle
    'inner thighs': 'Quads',
    'hamstrings': 'Hamstrings',
    'glutes': 'Glutes',
    'outer glutes': 'Outer Glutes',
    'calves': 'Calves',

    // Core variations
    'abdominals': 'Abdominals',
    'abs': 'Abs',
    'abs, core': 'Abs',
    'core': 'Core',

    // Other
    'traps': 'Traps',
    'full body': 'Full Body'
  };

  const mappedGroup = muscleMap[normalized];

  // If we have a mapping and it exists in canonical groups, use it
  if (mappedGroup && canonicalGroups.includes(mappedGroup)) {
    return mappedGroup;
  }

  // For compound groups, try to find the primary muscle that exists in canonical groups
  if (normalized.includes(',')) {
    const parts = normalized.split(',').map(p => p.trim());
    for (const part of parts) {
      const partMapping = muscleMap[part];
      if (partMapping && canonicalGroups.includes(partMapping)) {
        return partMapping;
      }
      // Try direct match for each part
      const directMatch = canonicalGroups.find(group =>
        group.toLowerCase() === part
      );
      if (directMatch) {
        return directMatch;
      }
    }
  }

  // Otherwise, try to find the closest match in canonical groups
  const directMatch = canonicalGroups.find(group =>
    group.toLowerCase() === normalized
  );
  if (directMatch) {
    return directMatch;
  }

  // If no match found, return a reasonable default based on common patterns
  if (__DEV__) {
    console.warn(`[normalizeMuscleGroup] No mapping found for "${muscleGroup}", canonical groups:`, canonicalGroups);
  }

  // Try to find a reasonable fallback based on keywords
  if (normalized.includes('chest') || normalized.includes('pec')) return 'Chest';
  if (normalized.includes('shoulder') || normalized.includes('deltoid')) return 'Shoulders';
  if (normalized.includes('back') || normalized.includes('lat')) return 'Lats';
  if (normalized.includes('bicep')) return 'Biceps';
  if (normalized.includes('tricep')) return 'Triceps';
  if (normalized.includes('quad') || normalized.includes('thigh')) return 'Quads';
  if (normalized.includes('hamstring')) return 'Hamstrings';
  if (normalized.includes('glute')) return 'Glutes';
  if (normalized.includes('calf')) return 'Calves';
  if (normalized.includes('ab') || normalized.includes('core')) return 'Abs';

  // Last resort - return first available canonical group
  return canonicalGroups[0] || 'Chest';
};

export const useWorkoutPerformanceData = (): WorkoutPerformanceData => {
  const { userId } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [canonicalMuscleGroups, setCanonicalMuscleGroups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkoutData = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get canonical muscle groups from Exercise Library (excluding compound groups with commas)
        const { data: exercises, error: exercisesError } = await supabase
          .from('exercise_definitions')
          .select('main_muscle')
          .not('main_muscle', 'is', null)
          .neq('main_muscle', '');

        // Load canonical groups into a local variable that will be used during transformation
        let loadedCanonicalGroups: string[] = [];
        if (exercisesError) {
          if (__DEV__) {
            console.warn('[useWorkoutPerformanceData] Could not fetch muscle groups:', exercisesError);
          }
          // Use fallback if fetch fails
          loadedCanonicalGroups = [
            'Chest', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Lats'
          ];
        } else {
          // Filter out compound muscle groups (those containing commas) to match Exercise Library behavior
          loadedCanonicalGroups = [...new Set(
            exercises
              ?.filter(ex => !ex.main_muscle.includes(','))
              ?.map(ex => ex.main_muscle.trim())
              .sort() || []
          )];
          // Use fallback if no groups found
          if (loadedCanonicalGroups.length === 0) {
            loadedCanonicalGroups = [
              'Chest', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Lats'
            ];
          }
          if (__DEV__) {
            console.log('[useWorkoutPerformanceData] Loaded canonical muscle groups:', loadedCanonicalGroups);
          }
        }
        
        // Update state for later use (but use local variable during transformation)
        setCanonicalMuscleGroups(loadedCanonicalGroups);

        // Get recent workout sessions with complete exercise data (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Fetch sessions with their exercises and sets
        const { data: workoutSessions, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select(`
            id,
            user_id,
            template_name,
            session_date,
            completed_at,
            duration_string,
            t_path_id,
            set_logs (
              id,
              exercise_id,
              weight_kg,
              reps,
              reps_l,
              reps_r,
              time_seconds,
              is_pb,
              created_at,
              exercise_definitions (
                id,
                name,
                main_muscle
              )
            )
          `)
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .gte('completed_at', thirtyDaysAgo.toISOString())
          .order('completed_at', { ascending: false })
          .limit(20);

        if (sessionsError) {
          throw sessionsError;
        }

        // Transform the data to match the expected structure
        // Use loadedCanonicalGroups (local variable) instead of canonicalMuscleGroups (state) 
        // to avoid warnings when state is still empty
        const transformedSessions: WorkoutSession[] = (workoutSessions || []).map(session => {
          // Group sets by exercise
          const exerciseMap = new Map();

          session.set_logs?.forEach((setLog: any) => {
            const exerciseId = setLog.exercise_id;
            const exercise = setLog.exercise_definitions;

            if (!exerciseMap.has(exerciseId)) {
              exerciseMap.set(exerciseId, {
                exerciseId,
                exerciseName: exercise?.name || 'Unknown Exercise',
                muscleGroup: normalizeMuscleGroup(exercise?.main_muscle || 'other', loadedCanonicalGroups),
                sets: []
              });
            }

            // Add set to exercise (only if completed - weight and reps exist)
            if (setLog.weight_kg && setLog.reps) {
              exerciseMap.get(exerciseId).sets.push({
                weight: setLog.weight_kg.toString(),
                reps: setLog.reps.toString(),
                isCompleted: true
              });
            }
          });

          return {
            id: session.id,
            sessionId: session.id, // For compatibility
            template_name: session.template_name || '',
            completed_at: session.completed_at,
            exercise_count: exerciseMap.size,
            duration_string: session.duration_string,
            total_volume: 0, // Will be calculated below
            sync_status: 'synced' as const,
            exercises: Array.from(exerciseMap.values())
          };
        });

        // Calculate total volume for each session
        transformedSessions.forEach(session => {
          let sessionVolume = 0;
          session.exercises?.forEach(exercise => {
            exercise.sets.forEach(set => {
              const weight = parseFloat(set.weight) || 0;
              const reps = parseInt(set.reps, 10) || 0;
              sessionVolume += weight * reps;
            });
          });
          session.total_volume = sessionVolume;
        });

        setSessions(transformedSessions);
      } catch (err) {
        console.error('[useWorkoutPerformanceData] Error loading workout data:', err);
        setError('Failed to load workout data');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkoutData();
  }, [userId]);

  const workoutData = useMemo(() => {
    // Calculate weekly volume totals by muscle group
    const weeklyVolumeTotals: WeeklyVolumeData = {};
    const weeklySetsTotals: WeeklyVolumeData = {};
    let totalWeeklyVolume = 0;
    let totalWeeklySets = 0;
    let weeklyWorkoutCount = 0;
    let weeklyPRCount = 0;
    const processedSessionIds = new Set<string>();

    // Get start of current week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    // Initialize daily volume data for current week
    const dailyVolumeData: { day: string; volume: number; date: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      dailyVolumeData.push({ day: dayName, volume: 0, date: new Date(dayDate) });
    }

    // Process recent sessions within this week
    sessions.forEach(session => {
      if (!session.completed_at || !session.exercises) return;

      const sessionDate = new Date(session.completed_at);
      if (sessionDate < startOfWeek) return; // Only include this week's workouts

      // Determine which day of the week this session belongs to
      const dayIndex = Math.floor((sessionDate.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
      let sessionVolume = 0;

      // Count this workout
      if (!processedSessionIds.has(session.id)) {
        processedSessionIds.add(session.id);
        weeklyWorkoutCount++;
      }

      session.exercises.forEach(exercise => {
        const muscleGroup = exercise.muscleGroup || 'other';

        exercise.sets.forEach(set => {
          if (set.isCompleted) {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps, 10) || 0;
            const volume = weight * reps;

            if (volume > 0) {
              weeklyVolumeTotals[muscleGroup] = (weeklyVolumeTotals[muscleGroup] || 0) + volume;
              weeklySetsTotals[muscleGroup] = (weeklySetsTotals[muscleGroup] || 0) + 1; // Count sets
              totalWeeklyVolume += volume;
              totalWeeklySets += 1;
              sessionVolume += volume;

              // Count PRs - TODO: Add PR tracking when available in data
              // if (set.isPR) {
              //   weeklyPRCount++;
              // }
            }
          }
        });
      });

      // Add session volume to the appropriate day
      if (dayIndex >= 0 && dayIndex < 7) {
        dailyVolumeData[dayIndex].volume += sessionVolume;
      }
    });

    // Initialize all canonical muscle groups with 0 volume and sets (whether worked out or not)
    canonicalMuscleGroups.forEach(muscleGroup => {
      if (!(muscleGroup in weeklyVolumeTotals)) {
        weeklyVolumeTotals[muscleGroup] = 0;
      }
      if (!(muscleGroup in weeklySetsTotals)) {
        weeklySetsTotals[muscleGroup] = 0;
      }
    });

    return {
      weeklyVolumeTotals,
      weeklySetsTotals,
      dailyVolumeData,
      totalWeeklyVolume,
      totalWeeklySets,
      weeklyWorkoutCount,
      weeklyPRCount,
    };
  }, [sessions, canonicalMuscleGroups]);

  return {
    weeklyVolumeTotals: workoutData.weeklyVolumeTotals,
    weeklySetsTotals: workoutData.weeklySetsTotals,
    dailyVolumeData: workoutData.dailyVolumeData,
    recentSessions: sessions,
    totalWeeklyVolume: workoutData.totalWeeklyVolume,
    totalWeeklySets: workoutData.totalWeeklySets,
    weeklyWorkoutCount: workoutData.weeklyWorkoutCount,
    weeklyPRCount: workoutData.weeklyPRCount,
    isLoading,
    error,
  };
};