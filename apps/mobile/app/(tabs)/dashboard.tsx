import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Pressable,
  Text,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../_contexts/auth-context';
import {
  useData,
  type DashboardProfile,
  type DashboardProgram,
  type DashboardVolumePoint,
  type DashboardWeeklySummary,
  type DashboardWorkoutSummary,
} from '../_contexts/data-context';
import { database } from '../_lib/database';
import { supabase } from '../_lib/supabase';
import type { Gym } from '@data/storage/models';
import { getExerciseById } from '@data/exercises';

// DEVELOPMENT AUTO-LOGIN - Set to true to auto-login during development
const AUTO_LOGIN_FOR_DEVELOPMENT = true;
import { Spacing } from '../../constants/Theme';
import { BackgroundRoot } from '../../components/BackgroundRoot';
import {
  WelcomeHeader,
  WeeklyTargetWidget,
  ActionHubWidget,
  GymToggle,
  NextWorkoutCard,
  AllWorkoutsQuickStart,
  SimpleVolumeChart,
  PreviousWorkoutsWidget,
} from '../../components/dashboard';
import { WorkoutSummaryModal } from '../../components/workout/WorkoutSummaryModal';

export default function DashboardScreen() {
  const { session, userId, loading: authLoading } = useAuth();
  const { loadDashboardSnapshot, deleteWorkoutSession, setActiveGym, isSyncing, queueLength, isOnline, forceRefreshProfile, getWorkoutSessions, getSetLogs } = useData();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !session && !AUTO_LOGIN_FOR_DEVELOPMENT) {
      console.log('[Dashboard] No session, redirecting to login');
      router.replace('/login');
      return;
    }
  }, [session, authLoading, router]);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const hasFetchedDataRef = useRef(false);
  const lastRefreshRef = useRef<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstFocusRef = useRef(true);

  // Dashboard data state
  const [userProfile, setUserProfile] = useState<DashboardProfile | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);

  const [weeklySummary, setWeeklySummary] = useState<DashboardWeeklySummary>({
    completed_workouts: [],
    goal_total: 3,
    programme_type: 'ppl',
    total_sessions: 0,
  });
  const [activeGym, setActiveGymState] = useState<Gym | null>(null);
  const [activeTPath, setActiveTPath] = useState<DashboardProgram | null>(null);
  const [tpathWorkouts, setTpathWorkouts] = useState<DashboardProgram[]>([]);
  const [volumeData, setVolumeData] = useState<DashboardVolumePoint[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<
    DashboardWorkoutSummary[]
  >([]);
  const [nextWorkout, setNextWorkout] = useState<DashboardProgram | null>(null);

  // Workout summary modal state
  const [workoutSummaryModalVisible, setWorkoutSummaryModalVisible] = useState(false);
  const [selectedSessionData, setSelectedSessionData] = useState<{
    exercises: any[];
    workoutName: string;
    startTime: Date;
    duration?: string;
    historicalWorkout?: any;
    weeklyVolumeData?: any;
    nextWorkoutSuggestion?: any;
    isOnTPath?: boolean;
    historicalRating?: number | null;
    sessionId?: string;
  } | null>(null);



  const fetchDashboardData = useCallback(async () => {
    if (!userId || isRefreshing) return;

    try {
      if (isInitialLoad) {
        setLoading(true);
      }

      console.log('[Dashboard] Fetching dashboard data...');
      const snapshot = await loadDashboardSnapshot();
      console.log('[Dashboard] Dashboard data fetched:', {
        profile: snapshot.profile,
        onboarding_completed: snapshot.profile?.onboarding_completed
      });

      // Update individual state variables
      setUserProfile(snapshot.profile);
      setGyms(snapshot.gyms);
      console.log('[Dashboard] Setting gyms state:', snapshot.gyms.length, 'gyms');
      setWeeklySummary(snapshot.weeklySummary);
      console.log('[Dashboard] Setting activeGym state:', snapshot.activeGym);
      setActiveGymState(snapshot.activeGym);
      setActiveTPath(snapshot.activeTPath);
      setTpathWorkouts(snapshot.tPathWorkouts);
      setVolumeData(snapshot.volumeHistory);
      setRecentWorkouts(snapshot.recentWorkouts);
      setNextWorkout(snapshot.nextWorkout);
    } catch (error) {
      console.error('[Dashboard] Failed to load data', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
        setInitialLoadComplete(true);
      }
    }
  }, [userId, isRefreshing]);

  // Initial data load effect - only run once
  useEffect(() => {
    if (!authLoading && session && userId && !hasFetchedDataRef.current) {
      hasFetchedDataRef.current = true;
      fetchDashboardData();
    }
  }, [session, userId, authLoading, fetchDashboardData]);

  // Onboarding check effect - only runs once per profile state
  useEffect(() => {
    if (!authLoading && session && userId && userProfile && userProfile.onboarding_completed !== undefined) {
      const needsOnboarding = !userProfile.onboarding_completed;
      console.log('[Dashboard] Onboarding check - userProfile:', userProfile, 'needsOnboarding:', needsOnboarding);
      if (needsOnboarding) {
        console.log('[Dashboard] User needs onboarding, redirecting...');
        router.replace('/onboarding');
        return;
      } else {
        console.log('[Dashboard] User has completed onboarding, showing dashboard');
      }
    }
  }, [session, authLoading, userId, userProfile?.onboarding_completed, router]);

  // Debounced refresh on screen focus with better frequency control
  useFocusEffect(
    useCallback(() => {
      console.log('[Dashboard] Dashboard screen focused - userProfile:', userProfile, 'onboarding_completed:', userProfile?.onboarding_completed);
      if (userProfile?.onboarding_completed && initialLoadComplete) {
        const now = Date.now();
        // Skip refresh on first focus to prevent duplicate initial loads
        if (isFirstFocusRef.current) {
          console.log('[Dashboard] Skipping refresh on first focus');
          isFirstFocusRef.current = false;
          return;
        }
        // Increased minimum interval to 10 seconds to prevent excessive refreshes
        if (now - lastRefreshRef.current > 10000 && !isRefreshing) {
          console.log('[Dashboard] Dashboard focused, scheduling refresh...');
          
          // Clear any existing timeout
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          
          // Debounce the refresh by 500ms to prevent rapid firing
          refreshTimeoutRef.current = setTimeout(() => {
            console.log('[Dashboard] Debounced refresh executing...');
            setIsRefreshing(true);
            fetchDashboardData().finally(() => {
              setIsRefreshing(false);
              lastRefreshRef.current = Date.now();
              refreshTimeoutRef.current = null;
            });
          }, 500);
        } else {
          console.log('[Dashboard] Skipping refresh - too soon or already refreshing');
        }
      }
    }, [userProfile?.onboarding_completed, initialLoadComplete, isRefreshing, fetchDashboardData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Force clear any cached data and refresh using the data context
      console.log('[Dashboard] Manual refresh triggered - forcing data context refresh');
      forceRefreshProfile();
       
      // Small delay to let the cache clear, then fetch fresh data
      setTimeout(() => {
        fetchDashboardData();
        console.log('[Dashboard] Refresh completed');
      }, 200);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData, forceRefreshProfile]);

  const userName =
    userProfile?.full_name ||
    userProfile?.first_name ||
    session?.user?.user_metadata?.first_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Athlete';

  const accountCreatedAt = session?.user?.created_at;

  // Optimized historical workout loading - only loads when modal tab is opened
  const getHistoricalWorkout = async (workoutName: string): Promise<any | null> => {
    if (!userId || !workoutName) return null;

    try {
      console.log('[Dashboard] Fetching historical workout for:', workoutName, 'userId:', userId);
      
      // Check if Supabase client is available
      if (!supabase) {
        console.error('[Dashboard] Supabase client not available');
        return null;
      }
      
      // Check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('[Dashboard] Auth error:', authError);
        return null;
      }
      if (!session) {
        console.error('[Dashboard] No active session found');
        return null;
      }
      
      // Get previous workouts of the same type from Supabase
      const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          session_date,
          duration_string,
          rating,
          set_logs (
            exercise_id,
            weight_kg,
            reps,
            is_pb
          )
        `)
        .eq('user_id', userId)
        .eq('template_name', workoutName)
        .order('session_date', { ascending: false })
        .limit(2); // Get current + previous

      if (error) {
        console.error('[Dashboard] Error fetching historical workouts:', error);
        console.error('[Dashboard] Query details - userId:', userId, 'workoutName:', workoutName);
        console.error('[Dashboard] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      if (!sessions) {
        console.log('[Dashboard] No sessions found for historical query');
        return null;
      }
      
      // Additional validation
      if (!Array.isArray(sessions)) {
        console.error('[Dashboard] Invalid sessions data type:', typeof sessions);
        return null;
      }

      console.log('[Dashboard] Historical sessions fetched:', sessions?.length || 0);

      if (sessions && sessions.length > 1) {
        const previousSession = sessions[1]; // Skip current session
        const previousSets = previousSession.set_logs || [];
        
        console.log('[Dashboard] Previous session sets:', previousSets.length);
        
        // Group sets by exercise
        const exerciseMap = new Map();
        previousSets.forEach((set: any) => {
          if (!exerciseMap.has(set.exercise_id)) {
            exerciseMap.set(set.exercise_id, {
              exerciseId: set.exercise_id,
              exerciseName: `Exercise ${set.exercise_id?.slice(-4) || 'Ex'}`,
              sets: [],
            });
          }
          
          const exerciseData = exerciseMap.get(set.exercise_id);
          exerciseData.sets.push({
            weight: set.weight_kg?.toString() || '0',
            reps: set.reps?.toString() || '0',
            isCompleted: true,
            isPR: set.is_pb || false,
          });
        });

        const exercises = Array.from(exerciseMap.values());
        const totalVolume = exercises.flatMap(ex => ex.sets).reduce((total, set) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps, 10) || 0;
          return total + (weight * reps);
        }, 0);

        const result = {
          exercises,
          duration: previousSession.duration_string || '45:00',
          totalVolume,
          prCount: exercises.flatMap(ex => ex.sets).filter(set => set.isPR).length,
          date: new Date(previousSession.session_date),
        };
        
        console.log('[Dashboard] Historical workout result:', result);
        return result;
      } else {
        console.log('[Dashboard] No historical data found - sessions:', sessions?.length || 0);
      }
    } catch (error) {
      console.error('[Dashboard] Error getting historical workout:', error);
    }
    
    return null;
  };

  // Helper function to get weekly volume data
  const getWeeklyVolumeData = async (): Promise<any> => {
    if (!userId) return {};

    try {
      console.log('[Dashboard] Fetching weekly volume data for userId:', userId);
      
      // Check if Supabase client is available
      if (!supabase) {
        console.error('[Dashboard] Supabase client not available');
        return {};
      }
      
      // Check if user is authenticated
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.error('[Dashboard] Auth error:', authError);
        return {};
      }
      if (!session) {
        console.error('[Dashboard] No active session found');
        return {};
      }
      
      const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select(`
          session_date,
          set_logs (
            exercise_id,
            weight_kg,
            reps
          )
        `)
        .eq('user_id', userId)
        .gte('session_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('session_date', { ascending: true });

      if (error) {
        console.error('[Dashboard] Error fetching weekly volume data:', error);
        console.error('[Dashboard] Query details - userId:', userId);
        console.error('[Dashboard] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return {};
      }

      console.log('[Dashboard] Weekly sessions fetched:', sessions?.length || 0);

      if (!sessions) {
        console.log('[Dashboard] No sessions found for weekly volume query');
        return {};
      }
      
      // Additional validation
      if (!Array.isArray(sessions)) {
        console.error('[Dashboard] Invalid sessions data type:', typeof sessions);
        return {};
      }

      // Get exercise definitions to map muscle groups
      const { data: exercises, error: exError } = await supabase
        .from('exercise_definitions')
        .select('id, category')
        .or(`user_id.eq.${userId},user_id.is.null`);

      if (exError) {
        console.error('[Dashboard] Error fetching exercise definitions:', exError);
        console.error('[Dashboard] Query details - userId:', userId);
        return {};
      }

      console.log('[Dashboard] Exercise definitions fetched:', exercises?.length || 0);

      if (!exercises) {
        console.log('[Dashboard] No exercise definitions found');
        return {};
      }

      const exerciseLookup = new Map();
      exercises?.forEach((ex: any) => {
        // Map the category to proper muscle groups
        let muscleGroup = ex.category;
        
        // Convert category to proper muscle group names
        if (muscleGroup === 'Bilateral' || muscleGroup === 'Unilateral') {
          // For now, map these to Chest as a fallback, but we should use the exercise name
          muscleGroup = 'Chest';
        }
        
        exerciseLookup.set(ex.id, muscleGroup);
      });

      console.log('[Dashboard] Exercise lookup map created with', exerciseLookup.size, 'entries');
      console.log('[Dashboard] Sample exercise mappings:', Array.from(exerciseLookup.entries()).slice(0, 5));

      // Calculate daily volume by muscle group
      const dailyVolumes: { [date: string]: { [muscle: string]: number } } = {};
      const muscleGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

      sessions?.forEach((session: any) => {
        const date = new Date(session.session_date).toDateString();
        if (!dailyVolumes[date]) {
          dailyVolumes[date] = {};
          muscleGroups.forEach(group => {
            dailyVolumes[date][group] = 0;
          });
        }

        session.set_logs?.forEach((set: any) => {
          const muscleGroup = exerciseLookup.get(set.exercise_id) || 'Other';
          const volume = (parseFloat(set.weight_kg) || 0) * (parseInt(set.reps) || 0);
          
          console.log('[Dashboard] Processing set:', {
            exerciseId: set.exercise_id,
            muscleGroup,
            weight: set.weight_kg,
            reps: set.reps,
            volume
          });
          
          dailyVolumes[date][muscleGroup] = (dailyVolumes[date][muscleGroup] || 0) + volume;
        });
      });

      console.log('[Dashboard] Daily volumes calculated:', dailyVolumes);

      // Convert to 7-day array format
      const result: any = {};
      muscleGroups.forEach(group => {
        result[group] = [];
      });

      // Fill in last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toDateString();
        muscleGroups.forEach(group => {
          const volume = dailyVolumes[date]?.[group] || 0;
          result[group].push(volume);
          
          if (volume > 0) {
            console.log('[Dashboard] Found volume for', group, 'on', date, ':', volume);
          }
        });
      }

      console.log('[Dashboard] Weekly volume data result:', result);
      return result;
    } catch (error) {
      console.error('[Dashboard] Error getting weekly volume data:', error);
      return {};
    }
  };

  // Helper function to get next workout suggestion
  const getNextWorkoutSuggestion = async (currentWorkoutName: string): Promise<any | null> => {
    if (!userId || !activeTPath) return null;

    try {
      console.log('[Dashboard] Fetching next workout suggestion for:', currentWorkoutName, 'T-path:', activeTPath.id);
      
      // Get T-path child workouts
      const { data: childWorkouts, error } = await supabase
        .from('t_paths')
        .select('id, template_name')
        .eq('parent_t_path_id', activeTPath.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Dashboard] Error fetching T-path workouts:', error);
        console.error('[Dashboard] Query details - parent_t_path_id:', activeTPath.id);
        console.error('[Dashboard] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return null;
      }

      console.log('[Dashboard] T-path child workouts fetched:', childWorkouts?.length || 0);

      if (!childWorkouts) {
        console.log('[Dashboard] No T-path child workouts found');
        return null;
      }
      
      // Additional validation
      if (!Array.isArray(childWorkouts)) {
        console.error('[Dashboard] Invalid childWorkouts data type:', typeof childWorkouts);
        return null;
      }

      if (childWorkouts && childWorkouts.length > 0) {
        // Find current workout index
        const currentIndex = childWorkouts.findIndex(w => w.template_name === currentWorkoutName);
        const nextIndex = (currentIndex + 1) % childWorkouts.length;
        
        // Calculate ideal next workout date (2 days from now)
        const idealDate = new Date();
        idealDate.setDate(idealDate.getDate() + 2);

        const result = {
          name: childWorkouts[nextIndex].template_name,
          idealDate,
        };
        
        console.log('[Dashboard] Next workout suggestion result:', result);
        return result;
      } else {
        console.log('[Dashboard] No T-path child workouts found');
      }
    } catch (error) {
      console.error('[Dashboard] Error getting next workout suggestion:', error);
    }

    return null;
  };

  // Helper function to check if user is on T-path
  const checkIfOnTPath = async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Check if user has an active T-path in their profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_t_path_id')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[Dashboard] Error checking profile for active T-path:', profileError);
        return false;
      }

      return !!(profileData && profileData.active_t_path_id);
    } catch (error) {
      console.error('[Dashboard] Error checking T-path status:', error);
      return false;
    }
  };

  const handleViewSummary = async (sessionId: string) => {
    console.log('[Dashboard] handleViewSummary called with sessionId:', sessionId);
    if (!userId) {
      console.log('[Dashboard] No userId, returning');
      return;
    }

    try {
      console.log('[Dashboard] Loading session data for sessionId:', sessionId);
      
      // Use direct database lookup to ensure we get the session data regardless of cache state
      const foundSession = await database.getWorkoutSessionById(sessionId);
      console.log('[Dashboard] Found session via direct lookup:', !!foundSession);
      
      if (!foundSession) {
        console.log('[Dashboard] Session not found via direct lookup, showing error');
        Alert.alert('Error', 'Workout session not found. Please try again.');
        return;
      }

      if (foundSession) {
        // Debug: Log the found session data including rating
        console.log('[Dashboard] Found session data:', {
          sessionId: foundSession.id,
          workoutName: foundSession.template_name,
          rating: foundSession.rating,
          sessionDate: foundSession.session_date,
          completedAt: foundSession.completed_at
        });
        
        // Load set logs
        const setLogs = await getSetLogs(sessionId);

        // Load exercise definitions from Supabase to get proper names
        let exerciseDefinitions: any[] = [];
        try {
          const { data, error } = await supabase
            .from('exercise_definitions')
            .select('id, name, category, icon_url')
            .or(`user_id.eq.${userId},user_id.is.null`); // Get user's exercises + global exercises

          if (error) {
            console.error('[Dashboard] Failed to load exercise definitions from Supabase:', error);
          } else {
            exerciseDefinitions = data || [];
            console.log('[Dashboard] Loaded exercise definitions from Supabase:', exerciseDefinitions.length);
          }
        } catch (error) {
          console.error('[Dashboard] Failed to load exercise definitions:', error);
        }
        const exerciseLookup = new Map();
        exerciseDefinitions.forEach((ex: any) => {
          exerciseLookup.set(ex.id, ex);
        });

        // Helper function to map exercise names to muscle groups
        const getMuscleGroupFromExercise = (ex: any, staticEx: any): string => {
          const name = (ex?.name || staticEx?.name || '').toLowerCase();
         
          // Chest exercises
          if (name.includes('bench') || name.includes('press') || name.includes('fly') ||
              name.includes('push up') || name.includes('dip') || name.includes('pec')) {
            return 'Chest';
          }
         
          // Back exercises
          if (name.includes('row') || name.includes('pull') || name.includes('lat') ||
              name.includes('deadlift') || name.includes('shrug') || name.includes('face pull')) {
            return 'Back';
          }
         
          // Legs exercises
          if (name.includes('squat') || name.includes('lunge') || name.includes('leg') ||
              name.includes('deadlift') || name.includes('hip') || name.includes('calf')) {
            return 'Legs';
          }
         
          // Shoulders exercises
          if (name.includes('shoulder') || name.includes('overhead') || name.includes('raise') ||
              name.includes('arnold') || name.includes('upright')) {
            return 'Shoulders';
          }
         
          // Arms exercises
          if (name.includes('curl') || name.includes('extension') || name.includes('tricep') ||
              name.includes('bicep') || name.includes('hammer')) {
            return 'Arms';
          }
         
          // Core exercises
          if (name.includes('crunch') || name.includes('plank') || name.includes('sit') ||
              name.includes('leg raise') || name.includes('Russian twist')) {
            return 'Core';
          }
         
          // Default to Unknown if we can't determine
          return 'Unknown';
        };

        // Transform data to modal format
        const exerciseMap = new Map();
        setLogs.forEach((set: any) => {
          // Try database exercise first, then fallback to static exercises
          const dbExercise = exerciseLookup.get(set.exercise_id);
          const staticExercise = getExerciseById(set.exercise_id);
          const exercise = dbExercise || staticExercise;
          const exerciseName = exercise?.name || `Exercise ${set.exercise_id?.slice(-4) || `Ex`}`;

          if (!exerciseMap.has(set.exercise_id)) {
            exerciseMap.set(set.exercise_id, {
              exerciseId: set.exercise_id,
              exerciseName,
              muscleGroup: getMuscleGroupFromExercise(exercise, staticExercise),
              iconUrl: exercise?.icon_url,
              sets: [],
            });
          }

          const exerciseData = exerciseMap.get(set.exercise_id);
          exerciseData.sets.push({
            weight: set.weight_kg?.toString() || '0',
            reps: set.reps?.toString() || '0',
            isCompleted: true, // Assume completed since it's saved
            isPR: set.is_pb || false,
          });
        });

        const exercises = Array.from(exerciseMap.values());
        const startTime = new Date(foundSession.session_date);

        // Fetch all required data for advanced features
        console.log('[Dashboard] Fetching advanced modal data...');
        
        // First, verify Supabase is working
        try {
          const { data: { session }, error: authError } = await supabase.auth.getSession();
          console.log('[Dashboard] Supabase auth check:', { hasSession: !!session, authError });
          
          if (authError) {
            console.error('[Dashboard] Auth error:', authError);
            return;
          }
          if (!session) {
            console.error('[Dashboard] No active session found');
            return;
          }
        } catch (authCheckError) {
          console.error('[Dashboard] Auth check failed:', authCheckError);
          return;
        }
        
        console.log('[Dashboard] Starting data fetch calls...');
        
        // Call each function individually to see which one fails
        console.log('[Dashboard] Calling getHistoricalWorkout...');
        const historicalWorkout = await getHistoricalWorkout(foundSession.template_name || 'Workout');
        console.log('[Dashboard] getHistoricalWorkout result:', !!historicalWorkout);
        
        console.log('[Dashboard] Calling getWeeklyVolumeData...');
        const weeklyVolumeData = await getWeeklyVolumeData();
        console.log('[Dashboard] getWeeklyVolumeData result:', Object.keys(weeklyVolumeData || {}));
        
        console.log('[Dashboard] Calling getNextWorkoutSuggestion...');
        const nextWorkoutSuggestion = await getNextWorkoutSuggestion(foundSession.template_name || 'Workout');
        console.log('[Dashboard] getNextWorkoutSuggestion result:', !!nextWorkoutSuggestion);
        
        console.log('[Dashboard] Calling checkIfOnTPath...');
        const isOnTPath = await checkIfOnTPath();
        console.log('[Dashboard] checkIfOnTPath result:', isOnTPath);
        
        console.log('[Dashboard] Data fetch completed, results:', {
          historicalWorkout: !!historicalWorkout,
          weeklyVolumeData: Object.keys(weeklyVolumeData || {}),
          nextWorkoutSuggestion: !!nextWorkoutSuggestion,
          isOnTPath
        });

        // Debug: Log the data being passed to modal
        console.log('[Dashboard] Setting modal data with:', {
          exercisesCount: exercises.length,
          workoutName: foundSession.template_name || 'Workout',
          historicalWorkout: !!historicalWorkout,
          weeklyVolumeData: Object.keys(weeklyVolumeData || {}),
          nextWorkoutSuggestion: !!nextWorkoutSuggestion,
          isOnTPath,
        });

        // Debug: Log what we're about to set
        console.log('[Dashboard] About to set session data:', {
          exercisesCount: exercises.length,
          workoutName: foundSession.template_name || 'Workout',
          historicalWorkout: !!historicalWorkout,
          weeklyVolumeData: Object.keys(weeklyVolumeData || {}),
          nextWorkoutSuggestion: !!nextWorkoutSuggestion,
          isOnTPath
        });

        setSelectedSessionData({
          exercises,
          workoutName: foundSession.template_name || 'Workout',
          startTime,
          duration: foundSession.duration_string || 'Completed',
          historicalWorkout,
          weeklyVolumeData,
          nextWorkoutSuggestion,
          isOnTPath,
          ...(foundSession.rating !== null && foundSession.rating !== undefined && foundSession.rating !== 0 && { historicalRating: foundSession.rating }),
          sessionId: foundSession.id,
        });

        console.log('[Dashboard] Session data set successfully');

        console.log('[Dashboard] Setting modal visible to true');
        setWorkoutSummaryModalVisible(true);
      } else {
        console.log('[Dashboard] No session found, not opening modal');
      }
    } catch (error) {
      console.error('Failed to load workout summary:', error);
      Alert.alert('Error', 'Failed to load workout summary');
    }
  };

  const handleDeleteWorkout = useCallback(
    async (sessionId: string, templateName: string) => {
      try {
        await deleteWorkoutSession(sessionId);
        // Refresh dashboard data after deletion
        await fetchDashboardData();
      } catch (error) {
        console.error('Failed to delete workout session:', error);
        Alert.alert('Error', 'Failed to delete workout session');
      }
    },
    [deleteWorkoutSession, fetchDashboardData]
  );

  // Handle session rating updates and refresh dashboard
  const handleSessionRatingUpdate = useCallback(async (sessionId: string, rating: number) => {
    try {
      console.log('[Dashboard] Updating session rating:', sessionId, rating);
      
      // Update the session rating in the local database
      await database.updateWorkoutSession(sessionId, {
        rating: rating
      });
      
      // Check if session exists in Supabase before trying to update
      const { data: sessionData, error: checkError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('id', sessionId)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[Dashboard] Failed to check session existence in Supabase:', checkError);
        // Don't show error to user since local update succeeded, but log it for debugging
      } else if (sessionData) {
        // Session exists in Supabase, update the rating
        const { data, error: supabaseError } = await supabase
          .from('workout_sessions')
          .update({ rating: rating })
          .eq('id', sessionId)
          .select();
        
        if (supabaseError) {
          console.error('[Dashboard] Failed to update rating in Supabase:', supabaseError);
        } else {
          console.log('[Dashboard] Successfully updated rating in Supabase:', data);
        }
      } else {
        console.log('[Dashboard] Session not yet synced to Supabase, rating will be synced later');
      }
      
      // Force refresh the dashboard data to update the cache
      await fetchDashboardData();
      
      console.log('[Dashboard] Session rating updated and dashboard refreshed');
    } catch (error) {
      console.error('[Dashboard] Failed to update session rating:', error);
      Alert.alert('Error', 'Failed to update workout rating');
    }
  }, [fetchDashboardData]);

  

  // Show loading screen while checking onboarding status or data is being fetched
  if (!authLoading && session && userId && (!userProfile || loading)) {
    console.log('[Dashboard] Profile loading or data fetching, showing loading screen...');
    return (
      <View style={styles.loadingContainer}>
        <BackgroundRoot />
        {/* Loading state while profile loads */}
      </View>
    );
  }

  // Show loading screen if we have profile but no dashboard data yet
  if (!authLoading && session && userId && userProfile && !userProfile.onboarding_completed) {
    console.log('[Dashboard] User needs onboarding, redirecting...');
    return (
      <View style={styles.loadingContainer}>
        <BackgroundRoot />
        {/* Loading state while redirecting to onboarding */}
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Aurora Background with 3 animated blobs */}
        <BackgroundRoot />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >

          {/* 1. Welcome Header */}
          <View>
            <WelcomeHeader
              userName={userName}
              accountCreatedAt={accountCreatedAt}
            />
          </View>

          {/* 2. Weekly Target */}
          <View>
            <WeeklyTargetWidget
              completedWorkouts={weeklySummary.completed_workouts}
              goalTotal={weeklySummary.goal_total}
              programmeType={weeklySummary.programme_type}
              totalSessions={weeklySummary.total_sessions}
              onViewCalendar={() => router.push('/workout-history')}
              onViewWorkoutSummary={handleViewSummary}
              loading={loading}
            />
          </View>

          {/* 3. Action Hub */}
          <View>
            <ActionHubWidget
              onLogActivity={() => {}}
              onAICoach={() => {}}
              onWorkoutLog={() => {}}
              onConsistencyCalendar={() => {}}
            />
          </View>

          {/* 4. Gym Toggle (only show if 2+ gyms) */}
          {gyms.length > 1 && (
            <View>
              <GymToggle
                gyms={gyms}
                activeGym={activeGym}
                onGymChange={async (gymId: string, newActiveGym: Gym | null) => {
                  if (userId) {
                    // Update dashboard state immediately for UI consistency
                    setActiveGymState(newActiveGym);

                    // Update the database
                    await setActiveGym(userId, gymId);

                    // Trigger a data refresh to sync all components
                    setTimeout(() => {
                      fetchDashboardData();
                    }, 100);
                  }
                }}
              />
            </View>
          )}

          {/* 5. Next Workout Card */}
          <View>
            <NextWorkoutCard
              workoutId={nextWorkout?.id}
              workoutName={nextWorkout?.template_name}
              estimatedDuration={
                userProfile?.preferred_session_length || '45 minutes'
              }
              loading={loading}
              noActiveGym={!activeGym}
              noActiveTPath={!activeTPath}
            />
          </View>

          {/* 6. All Workouts Quick Start */}
          <View>
            <AllWorkoutsQuickStart
              programName={activeTPath?.template_name}
              workouts={tpathWorkouts}
              loading={loading}
            />
          </View>

          {/* 7. Weekly Volume Chart */}
          <View>
            <SimpleVolumeChart data={volumeData} />
          </View>

          {/* 8. Previous Workouts */}
          <View>
            <PreviousWorkoutsWidget
              workouts={recentWorkouts.map(workout => ({
                id: workout.id,
                sessionId: workout.id,
                template_name: workout.template_name || 'Ad Hoc Workout',
                completed_at: workout.completed_at || workout.session_date,
                exercise_count: workout.exercise_count,
                duration_string: workout.duration_string ?? undefined,
              }))}
              onViewSummary={handleViewSummary}
              onDelete={handleDeleteWorkout}
              loading={loading}
            />
          </View>

          {/* Debug: Force Refresh Button */}
          <View style={{ marginTop: 20, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
            <Pressable
              onPress={onRefresh}
              style={{ padding: 10, backgroundColor: '#007AFF', borderRadius: 6 }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
                🔄 Force Refresh Data
              </Text>
            </Pressable>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 5, textAlign: 'center' }}>
              Debug: Force refresh to apply workout progression fix
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Workout Summary Modal */}
      <WorkoutSummaryModal
        visible={workoutSummaryModalVisible}
        onClose={() => setWorkoutSummaryModalVisible(false)}
        exercises={selectedSessionData?.exercises || []}
        workoutName={selectedSessionData?.workoutName || ''}
        startTime={selectedSessionData?.startTime || new Date()}
        {...(selectedSessionData?.duration && { duration: selectedSessionData.duration })}
        {...(selectedSessionData?.historicalRating !== null && selectedSessionData?.historicalRating !== undefined && { historicalRating: selectedSessionData.historicalRating })}
        showActions={false}
        showSyncStatus={false}
        onSaveWorkout={async () => {
          // Since this is a view-only modal for past workouts, we don't need to save anything
          setWorkoutSummaryModalVisible(false);
        }}
        onRateWorkout={async (rating) => {
          if (!selectedSessionData || !selectedSessionData.sessionId) return;
          
          try {
            console.log('[Dashboard] Saving workout rating:', rating);
            
            // Use the new refresh function
            await handleSessionRatingUpdate(selectedSessionData.sessionId, rating);
            
            console.log('[Dashboard] Workout rating saved successfully');
          } catch (error) {
            console.error('[Dashboard] Failed to save workout rating:', error);
            Alert.alert('Error', 'Failed to save workout rating');
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
});