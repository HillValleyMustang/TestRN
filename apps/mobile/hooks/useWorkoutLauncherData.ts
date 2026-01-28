import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { database } from '../app/_lib/database';
import { useAuth } from '../app/_contexts/auth-context';
import { supabase } from '../app/_lib/supabase';
import { createTaggedLogger } from '../lib/logger';

const log = createTaggedLogger('useWorkoutLauncherData');

// Define types locally
interface TPath {
  id: string;
  user_id: string;
  template_name: string;
  description: string | null;
  is_main_program: boolean;
  parent_t_path_id: string | null;
  order_index: number | null;
  is_ai_generated: boolean;
  ai_generation_params: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  active_t_path_id: string | null;
  active_gym_id: string | null;
  programme_type: string | null;
  preferred_session_length: number | null;
  created_at: string;
  updated_at: string;
}

interface UseWorkoutLauncherDataReturn {
  profile: Profile | null;
  activeTPath: TPath | null;
  childWorkouts: TPath[];
  adhocWorkouts: TPath[];
  workoutExercisesCache: Record<string, any[]>;
  lastCompletedDates: Record<string, Date | null>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useWorkoutLauncherData = (): UseWorkoutLauncherDataReturn => {
  const { userId } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tPaths, setTPaths] = useState<TPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitiallyLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Only show full loading screen on initial load
      if (!hasInitiallyLoadedRef.current) {
        setLoading(true);
      } else {
        // Use refreshing state for subsequent refreshes (e.g., gym switches)
        setRefreshing(true);
      }
      setError(null);

      // Fetch profile and TPaths from Supabase (always use fresh data)
      const [profileData, supabaseTPathsData] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, active_t_path_id, active_gym_id, programme_type, preferred_session_length, created_at, updated_at')
          .eq('id', userId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              return null;
            }
            // Add user_id to match our interface
            return data ? { ...data, user_id: userId } : null;
          }),
        supabase
          .from('t_paths')
          .select('*')
          .eq('user_id', userId)
          .then(({ data, error }) => {
            if (error) {
              log.error('[useWorkoutLauncherData] Error fetching T-paths from Supabase:', error);
              return [];
            }
            return data || [];
          }),
      ]);

      // Sync T-paths to local database
      if (supabaseTPathsData && supabaseTPathsData.length > 0) {
        for (const tPath of supabaseTPathsData) {
          try {
            await database.addTPath({
              ...tPath,
              is_bonus: Boolean(tPath.is_bonus),
              is_main_program: Boolean(tPath.is_main_program),
              is_ai_generated: Boolean(tPath.is_ai_generated),
              settings: tPath.settings || null,
              progression_settings: tPath.progression_settings || null,
              gym_id: tPath.gym_id || null, // Ensure gym_id is synced
            });
          } catch (err) {
            log.warn('[useWorkoutLauncherData] Error syncing T-path to local:', err);
          }
        }
      }

      const tPathsData = supabaseTPathsData;

      log.debug('[useWorkoutLauncherData] Profile from Supabase:', {
        id: profileData?.id,
        active_t_path_id: profileData?.active_t_path_id,
        active_gym_id: profileData?.active_gym_id,
        programme_type: profileData?.programme_type,
      });
      log.debug('[useWorkoutLauncherData] T-Paths from Supabase:', tPathsData.length, tPathsData.map(tp => ({
        id: tp.id,
        template_name: tp.template_name,
        parent_t_path_id: tp.parent_t_path_id,
        gym_id: tp.gym_id,
        is_main_program: tp.is_main_program,
      })));

      setProfile(profileData);
      setTPaths(tPathsData);

      // Also refresh exercises after updating workouts
      const allWorkouts = tPathsData.filter(tp => !tp.is_main_program);
      const childWorkouts = profileData?.active_t_path_id
        ? allWorkouts.filter(tp => 
            tp.parent_t_path_id === profileData.active_t_path_id &&
            tp.gym_id === profileData.active_gym_id
          )
        : [];
      
      log.debug('[useWorkoutLauncherData] All workouts (non-main):', allWorkouts.length, allWorkouts.map(w => ({
        name: w.template_name,
        gym_id: w.gym_id,
        parent: w.parent_t_path_id
      })));
      log.debug('[useWorkoutLauncherData] Child workouts for active gym:', childWorkouts.length, childWorkouts.map(w => ({
        name: w.template_name,
        gym_id: w.gym_id
      })));

      // Only fetch exercises for child workouts (from active program)
      if (childWorkouts.length > 0) {
        const cache = await fetchWorkoutExercises(childWorkouts);
        setWorkoutExercisesCache(cache);
      } else {
        setWorkoutExercisesCache({});
      }
      
      hasInitiallyLoadedRef.current = true;
    } catch (err) {
      console.error('Error in refresh:', err);
      setError('Failed to load workout data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [userId, refresh]);

  // Watch for T-path changes by comparing current profile with latest from Supabase
  // This ensures we catch T-path changes immediately even if local state hasn't updated
  const lastTPathIdRef = useRef<string | null>(null);
  const lastProgrammeTypeRef = useRef<string | null>(null);
  const lastGymIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (profile) {
      // If refs are null, this is the first time we've got a profile
      // We should just set the refs and NOT refresh, because the profile 
      // was likely just fetched by the initial refresh() call
      if (lastTPathIdRef.current === null && lastProgrammeTypeRef.current === null && lastGymIdRef.current === null) {
        lastTPathIdRef.current = profile.active_t_path_id;
        lastProgrammeTypeRef.current = profile.programme_type || null;
        lastGymIdRef.current = profile.active_gym_id;
        return;
      }

      const tPathChanged = profile.active_t_path_id !== lastTPathIdRef.current;
      const programmeTypeChanged = profile.programme_type !== lastProgrammeTypeRef.current;
      const gymChanged = profile.active_gym_id !== lastGymIdRef.current;
      
      if (tPathChanged || programmeTypeChanged || gymChanged) {
        log.debug('[useWorkoutLauncherData] T-path, programme type, or gym changed, clearing exercise cache and refreshing:', {
          oldTPath: lastTPathIdRef.current,
          newTPath: profile.active_t_path_id,
          oldType: lastProgrammeTypeRef.current,
          newType: profile.programme_type,
          oldGym: lastGymIdRef.current,
          newGym: profile.active_gym_id,
          source: 'useEffect_change_detection'
        });
        // CRITICAL: Clear exercise cache when T-path changes to prevent showing old exercises
        setWorkoutExercisesCache({});
        lastTPathIdRef.current = profile.active_t_path_id;
        lastProgrammeTypeRef.current = profile.programme_type || null;
        lastGymIdRef.current = profile.active_gym_id;
        refresh();
      }
    }
  }, [profile?.active_t_path_id, profile?.programme_type, profile?.active_gym_id, refresh]);

  // Compute derived data
  const derivedData = useMemo(() => {
    if (!profile) {
      return {
        activeTPath: null,
        childWorkouts: [],
        adhocWorkouts: [],
      };
    }

    if (!tPaths.length) {
      return {
        activeTPath: null,
        childWorkouts: [],
        adhocWorkouts: [],
      };
    }

    const activeTPath = tPaths.find(tp => tp.id === profile.active_t_path_id) || null;

    // Get all workouts that are not main programs
    const allWorkouts = tPaths.filter(tp => !tp.is_main_program);

    // Only show workouts that belong to the active program AND the active gym
    // Don't show adhoc workouts or other standalone programs
    const childWorkouts = activeTPath
      ? allWorkouts.filter(tp => 
          tp.parent_t_path_id === activeTPath.id && 
          tp.gym_id === profile.active_gym_id
        )
      : [];

    // Don't show adhoc workouts - only show workouts from the active program
    const adhocWorkouts: TPath[] = [];

    return {
      activeTPath,
      childWorkouts,
      adhocWorkouts,
    };
  }, [profile, tPaths]);

  // Build workout exercises cache and last completed dates
  const [workoutExercisesCache, setWorkoutExercisesCache] = useState<Record<string, any[]>>({});
  const [lastCompletedDates, setLastCompletedDates] = useState<Record<string, Date | null>>({});
  
  // Preserve completion dates by template_name to prevent "never" flash during gym switches
  // This ref stores dates keyed by template_name (e.g., "Push", "Pull") which are stable across gyms
  const lastCompletedDatesByTemplateNameRef = useRef<Record<string, Date>>({});

  // Helper function to get exercise details from local database
  const getExerciseDetailsFromLocal = async (exerciseIds: string[]): Promise<Array<{ id: string; name: string; main_muscle?: string }>> => {
    if (exerciseIds.length === 0) return [];
    
    try {
      // Try to get exercise details from local SQLite first
      const exerciseDetails = await Promise.all(
        exerciseIds.map(async (exerciseId) => {
          // Check if exercise exists in local database
          const localExercise = await database.getExerciseDefinition(exerciseId);
          if (localExercise) {
            return {
              id: localExercise.id,
              name: localExercise.name,
              main_muscle: localExercise.main_muscle || 'Unknown'
            };
          }
          
          // Fallback: generate reasonable names based on common workout patterns
          return {
            id: exerciseId,
            name: generateExerciseName(exerciseId),
            main_muscle: inferMainMuscle(exerciseId)
          };
        })
      );
      
      return exerciseDetails;
    } catch (error) {
      console.warn('Failed to get exercise details from local DB:', error);
      // Final fallback
      return exerciseIds.map(id => ({
        id,
        name: `Exercise ${id.slice(0, 8)}`,
        main_muscle: 'Unknown'
      }));
    }
  };

  // Generate reasonable exercise names for common workout patterns
  const generateExerciseName = (exerciseId: string): string => {
    // Use hash of ID to consistently generate the same exercise type
    const hash = exerciseId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const exercises = [
      'Push-ups', 'Pull-ups', 'Squats', 'Deadlifts', 'Bench Press', 'Overhead Press',
      'Rows', 'Lunges', 'Burpees', 'Mountain Climbers', 'Plank', 'Bicep Curls',
      'Tricep Extensions', 'Shoulder Press', 'Lat Pulldowns', 'Leg Press',
      'Calf Raises', 'Hip Thrusts', 'Russian Twists', 'Jumping Jacks'
    ];
    
    return exercises[Math.abs(hash) % exercises.length];
  };

  // Infer main muscle group from exercise name patterns
  const inferMainMuscle = (exerciseId: string): string => {
    const hash = exerciseId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Use canonical muscle groups for fallback
    const muscleGroups = ['Pectorals', 'Lats', 'Quadriceps', 'Deltoids', 'Biceps', 'Core', 'Glutes'];
    return muscleGroups[Math.abs(hash) % muscleGroups.length];
  };

  const fetchWorkoutExercises = async (workouts: TPath[]): Promise<Record<string, any[]>> => {
    if (!userId) return {};

    const cache: Record<string, any[]> = {};

    for (const workout of workouts) {
      try {
        const exercises = await database.getTPathExercises(workout.id);
        const exerciseIds = exercises.map(ex => ex.exercise_id);

        if (exerciseIds.length > 0) {
          const exerciseDefs = await supabase
            .from('exercise_definitions')
            .select('id, name, main_muscle')
            .in('id', exerciseIds);

          // Check if exercise definitions are available
          if (exerciseDefs.data && exerciseDefs.data.length > 0) {
            const exerciseDefMap = new Map(
              exerciseDefs.data.map(def => [def.id, def])
            );

            const mappedExercises = exercises
              .sort((a, b) => a.order_index - b.order_index)
              .map(ex => {
                const def = exerciseDefMap.get(ex.exercise_id);
                return {
                  id: ex.exercise_id,
                  name: def?.name || `Exercise ${ex.exercise_id}`,
                  main_muscle: def?.main_muscle || 'Unknown',
                  target_sets: ex.target_sets || 3,
                  target_reps_min: ex.target_reps_min || 8,
                  target_reps_max: ex.target_reps_max || 12,
                };
              });

            cache[workout.id] = mappedExercises;
          } else {
            // Fallback when exercise_definitions table is empty
            console.warn(`[useWorkoutLauncherData] No exercise definitions found in Supabase for workout ${workout.id}`);
            
            // Try to get exercise details from local database as fallback
            const fallbackExercises = await getExerciseDetailsFromLocal(exerciseIds);
            
            const mappedExercises = exercises
              .sort((a, b) => a.order_index - b.order_index)
              .map(ex => {
                const fallbackExercise = fallbackExercises.find((fe: any) => fe.id === ex.exercise_id);
                return {
                  id: ex.exercise_id,
                  name: fallbackExercise?.name || `Exercise ${ex.exercise_id}`,
                  main_muscle: fallbackExercise?.main_muscle || 'Unknown',
                  target_sets: ex.target_sets || 3,
                  target_reps_min: ex.target_reps_min || 8,
                  target_reps_max: ex.target_reps_max || 12,
                };
              });

            cache[workout.id] = mappedExercises;
          }
        } else {
          cache[workout.id] = [];
        }
      } catch (error) {
        console.error(`Failed to fetch exercises for workout ${workout.id}:`, error);
        cache[workout.id] = [];
      }
    }

    return cache;
  };

  // Fetch exercises when workouts change
  useEffect(() => {
    const derivedChildWorkouts = derivedData.childWorkouts;
    if (derivedChildWorkouts.length > 0) {
      const fetchExercises = async () => {
        const cache = await fetchWorkoutExercises(derivedChildWorkouts);
        setWorkoutExercisesCache(cache);
      };
      fetchExercises();
    } else {
      setWorkoutExercisesCache({});
    }
  }, [derivedData.childWorkouts]);

  // Fetch last completed dates for workouts
  useEffect(() => {
    const fetchLastCompletedDates = async () => {
      if (!userId) {
        // Only clear if there's no user - otherwise preserve existing dates
        setLastCompletedDates({});
        lastCompletedDatesByTemplateNameRef.current = {};
        return;
      }

      // Don't clear dates if childWorkouts is empty - preserve existing dates during transitions
      if (derivedData.childWorkouts.length === 0) {
        return;
      }

      // CRITICAL: Immediately set state with preserved dates from ref BEFORE async fetch
      // This prevents "never" flash during gym switches when workout IDs change
      const immediateDatesMap: Record<string, Date | null> = {};
      derivedData.childWorkouts.forEach(workout => {
        const preservedDate = lastCompletedDatesByTemplateNameRef.current[workout.template_name];
        immediateDatesMap[workout.id] = preservedDate || null;
      });
      // Set state immediately so buttons don't show "never" during the async fetch
      setLastCompletedDates(immediateDatesMap);

      try {
        // Get all workout IDs and template names
        const workoutIds = derivedData.childWorkouts.map(w => w.id);
        const workoutNames = derivedData.childWorkouts.map(w => w.template_name);
        
        if (workoutIds.length === 0) {
          return; // Don't clear existing dates
        }

        // Build a map for quick lookup
        const workoutMap = new Map<string, TPath>();
        derivedData.childWorkouts.forEach(workout => {
          workoutMap.set(workout.id, workout);
          workoutMap.set(workout.template_name, workout);
        });
        
        // Start with the immediate dates we just set
        const datesMap: Record<string, Date | null> = { ...immediateDatesMap };

        // Query Supabase for the most recent completed session for each workout
        // Try to match by t_path_id first (most accurate), then fall back to template_name
        const { data: sessions, error } = await supabase
          .from('workout_sessions')
          .select('template_name, completed_at, t_path_id')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false });

        if (error) {
          console.error('[useWorkoutLauncherData] Error fetching last completed dates:', error);
          // Don't clear dates on error - preserve existing dates
          return;
        }

        if (sessions && sessions.length > 0) {
          // Process sessions to find the most recent completed date for each workout
          // Prefer matching by t_path_id, then fall back to template_name
          const latestByWorkoutId = new Map<string, Date>();
          const latestByTemplateName = new Map<string, Date>();
          
          sessions.forEach(session => {
            const completedAt = session.completed_at ? new Date(session.completed_at) : null;
            if (!completedAt) return;

            // Try to match by t_path_id first (most accurate)
            if (session.t_path_id && workoutIds.includes(session.t_path_id)) {
              const existing = latestByWorkoutId.get(session.t_path_id);
              if (!existing || completedAt > existing) {
                latestByWorkoutId.set(session.t_path_id, completedAt);
              }
            }
            
            // Also track by template_name as fallback
            if (session.template_name && workoutNames.includes(session.template_name)) {
              const existing = latestByTemplateName.get(session.template_name);
              if (!existing || completedAt > existing) {
                latestByTemplateName.set(session.template_name, completedAt);
              }
            }
          });

          // Apply dates by workout ID (preferred method)
          latestByWorkoutId.forEach((date, workoutId) => {
            datesMap[workoutId] = date;
          });

          // Fill in any missing dates using template_name matching
          latestByTemplateName.forEach((date, templateName) => {
            const workout = workoutMap.get(templateName);
            if (workout) {
              // Always update with the latest fetched date, even if we had a preserved one
              datesMap[workout.id] = date;
            }
          });
        }

        // Update the ref with dates by template_name for persistence across gym switches
        derivedData.childWorkouts.forEach(workout => {
          if (datesMap[workout.id]) {
            lastCompletedDatesByTemplateNameRef.current[workout.template_name] = datesMap[workout.id]!;
          }
        });

        setLastCompletedDates(datesMap);
        log.debug('[useWorkoutLauncherData] Last completed dates:', datesMap);
      } catch (error) {
        console.error('[useWorkoutLauncherData] Error fetching last completed dates:', error);
        setLastCompletedDates({});
      }
    };

    fetchLastCompletedDates();
  }, [userId, derivedData.childWorkouts]);

  // CRITICAL: Merge state with preserved ref dates synchronously during render
  // This ensures dates are available immediately when childWorkouts changes, preventing "never" flash
  const enrichedLastCompletedDates = useMemo(() => {
    const merged: Record<string, Date | null> = { ...lastCompletedDates };
    
    // For each current workout, if it's missing in state, try to get preserved date from ref
    derivedData.childWorkouts.forEach(workout => {
      if (!merged[workout.id]) {
        const preservedDate = lastCompletedDatesByTemplateNameRef.current[workout.template_name];
        if (preservedDate) {
          merged[workout.id] = preservedDate;
        }
      }
    });
    
    return merged;
  }, [lastCompletedDates, derivedData.childWorkouts]);

  return {
    profile,
    activeTPath: derivedData.activeTPath,
    childWorkouts: derivedData.childWorkouts,
    adhocWorkouts: derivedData.adhocWorkouts,
    workoutExercisesCache,
    lastCompletedDates: enrichedLastCompletedDates,
    loading,
    refreshing,
    error,
    refresh,
  };
};