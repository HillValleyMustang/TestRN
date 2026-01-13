import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
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
  WorkoutPerformanceModal,
  SyncStatusBanner,
} from '../../components/dashboard';
import { WorkoutSummaryModal } from '../../components/workout/WorkoutSummaryModal';
import { ActivityLoggingModal_new as ActivityLoggingModal } from '../../components/dashboard/ActivityLoggingModal_new';

export default function DashboardScreen() {
  const { session, userId, loading: authLoading } = useAuth();
  const { loadDashboardSnapshot, deleteWorkoutSession, setActiveGym, isSyncing, queueLength, isOnline, forceRefreshProfile, getWorkoutSessions, getSetLogs, shouldRefreshDashboard, setShouldRefreshDashboard, lastWorkoutCompletionTime, setLastWorkoutCompletionTime, handleWorkoutCompletion } = useData();
  
  const router = useRouter();
  
  // Cache for expensive operations
  const [dataCache, setDataCache] = useState<{
    lastFetch: number;
    data: any | null;
  }>({ lastFetch: 0, data: null });
  
  const [modalDataCache, setModalDataCache] = useState<{
    [sessionId: string]: {
      historicalWorkout: any;
      weeklyVolumeData: any;
      nextWorkoutSuggestion: any;
      isOnTPath: boolean;
      allAvailableMuscleGroups: string[];
      timestamp: number;
    };
  }>({});

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
    allAvailableMuscleGroups?: string[];
  } | null>(null);

  // Activity logging modal state
  const [activityModalVisible, setActivityModalVisible] = useState(false);

  // Workout performance modal state
  const [workoutPerformanceModalVisible, setWorkoutPerformanceModalVisible] = useState(false);

  // State variables that need to be declared before fetchDashboardData
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [deletionInProgress, setDeletionInProgress] = useState<string | null>(null);
  const hasFetchedDataRef = useRef(false);
  const lastRefreshRef = useRef<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstFocusRef = useRef(true);
  const lastDeletionTimeRef = useRef<number>(0);
  const loadingStartTimeRef = useRef<number>(0);
  const LOADING_TIMEOUT = 15000; // 15 seconds max loading time
  
  // Refresh mutex to prevent concurrent refresh calls causing race conditions
  const refreshInProgressRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  // Enhanced cache invalidation function - now calls data context's handleWorkoutCompletion
  const dashboardInvalidateAllCaches = useCallback(async () => {
    console.log('[Dashboard] Starting atomic cache invalidation');
    
    // Invalidate all dashboard-related caches
    setDataCache({ lastFetch: 0, data: null });
    setShouldRefreshDashboard(true);
    
    // Only call setLastWorkoutCompletionTime if it's available (safety check)
    if (typeof setLastWorkoutCompletionTime === 'function') {
      setLastWorkoutCompletionTime(Date.now());
    }
    
    // Clear the modal data cache
    setModalDataCache({});
    
    // Call the data context's invalidateAllCaches to clear database-level caches
    try {
      console.log('[Dashboard] Calling data context invalidateAllCaches');
      // Use the data context's invalidateAllCaches function
      await handleWorkoutCompletionRefresh();
      console.log('[Dashboard] Data context cache invalidation completed successfully');
    } catch (error) {
      console.error('[Dashboard] Error during data context cache invalidation:', error);
    }
  }, [userId, setShouldRefreshDashboard, handleWorkoutCompletion, setLastWorkoutCompletionTime]);

  // Enhanced coordinated refresh function
  const triggerCoordinatedRefresh = useCallback(async () => {
    console.log('[Dashboard] Starting coordinated refresh');
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Use debounced refresh to prevent multiple rapid calls
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        await fetchDashboardData();
        console.log('[Dashboard] Coordinated refresh completed');
      } catch (error) {
        console.error('[Dashboard] Coordinated refresh failed:', error);
      }
    }, 100); // Small delay to ensure all caches are cleared
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!userId || isRefreshing) return;
    
    // Additional safeguard: prevent rapid successive calls
    const currentTimestamp = Date.now();
    const timeSinceLastRefresh = currentTimestamp - lastRefreshRef.current;
    if (timeSinceLastRefresh < 1000) { // Minimum 1 second between refreshes
      return;
    }

    const now = Date.now();
    const cacheDuration = 60000; // 60 seconds (increased from 30)

    // Check cache first, but bypass if force refresh is needed
    const hasValidCache = dataCache.data && (currentTimestamp - dataCache.lastFetch < cacheDuration);
    
    if (hasValidCache) {
      // Enhanced force refresh conditions - include empty state and deletion scenarios
      const timeSinceLastCompletion = currentTimestamp - lastWorkoutCompletionTime;
      const timeSinceLastDeletion = currentTimestamp - lastDeletionTimeRef.current;
      const shouldForceRefresh = shouldRefreshDashboard ||
                               timeSinceLastCompletion < 5 * 60 * 1000 ||
                               timeSinceLastDeletion < 10000 || // Force refresh for 10 seconds after deletion
                               recentWorkouts.length === 0 || // Empty state after deletion
                               (dataCache.data && recentWorkouts.length === 0) || // Cache shows data but UI is empty
                               dataCache.lastFetch === 0 || // Cache was explicitly cleared
                               !dataCache.data; // Cache is null/undefined
      
      console.log('[Dashboard] Cache check:', {
        hasCache: !!dataCache.data,
        cacheAge: currentTimestamp - dataCache.lastFetch,
        cacheLastFetch: dataCache.lastFetch,
        hasValidCache,
        shouldForceRefresh,
        shouldRefreshDashboard,
        timeSinceLastCompletion,
        timeSinceLastDeletion,
        recentWorkoutsCount: recentWorkouts.length,
        deletionDetected: dataCache.lastFetch === 0,
        lastDeletionTime: lastDeletionTimeRef.current
      });
      
      if (shouldForceRefresh) {
        console.log('[Dashboard] Bypassing cache due to force refresh conditions');
        // Bypass cache due to recent workout completion, refresh flag, or empty state
      } else {
        // Only update state if data has actually changed to prevent infinite loops
        if (JSON.stringify(dataCache.data.profile) !== JSON.stringify(userProfile)) {
          setUserProfile(dataCache.data.profile);
        }
        if (JSON.stringify(dataCache.data.gyms) !== JSON.stringify(gyms)) {
          setGyms(dataCache.data.gyms);
        }
        if (JSON.stringify(dataCache.data.weeklySummary) !== JSON.stringify(weeklySummary)) {
          console.log('[Dashboard] Weekly summary changed, updating state:', {
            oldSummary: weeklySummary,
            newSummary: dataCache.data.weeklySummary,
            completedWorkoutsCount: dataCache.data.weeklySummary.completed_workouts.length,
            totalSessions: dataCache.data.weeklySummary.total_sessions
          });
          setWeeklySummary(dataCache.data.weeklySummary);
        }
        if (JSON.stringify(dataCache.data.activeGym) !== JSON.stringify(activeGym)) {
          setActiveGymState(dataCache.data.activeGym);
        }
        if (JSON.stringify(dataCache.data.activeTPath) !== JSON.stringify(activeTPath)) {
          setActiveTPath(dataCache.data.activeTPath);
        }
        if (JSON.stringify(dataCache.data.tPathWorkouts) !== JSON.stringify(tpathWorkouts)) {
          setTpathWorkouts(dataCache.data.tPathWorkouts);
        }
        if (JSON.stringify(dataCache.data.volumeHistory) !== JSON.stringify(volumeData)) {
          console.log('[Dashboard] Volume data changed, updating state:', {
            oldVolumeData: volumeData,
            newVolumeData: dataCache.data.volumeHistory,
            difference: dataCache.data.volumeHistory.length - volumeData.length
          });
          setVolumeData(dataCache.data.volumeHistory);
        }
        if (JSON.stringify(dataCache.data.recentWorkouts) !== JSON.stringify(recentWorkouts)) {
          setRecentWorkouts(dataCache.data.recentWorkouts);
        }
        if (JSON.stringify(dataCache.data.nextWorkout) !== JSON.stringify(nextWorkout)) {
          setNextWorkout(dataCache.data.nextWorkout);
        }
        return;
      }
    } else {
      console.log('[Dashboard] No valid cache data available, proceeding with fetch');
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
      }

      const snapshot = await loadDashboardSnapshot();

      // Only update state if data has actually changed to prevent infinite loops
      if (JSON.stringify(snapshot.profile) !== JSON.stringify(userProfile)) {
        setUserProfile(snapshot.profile);
      }
      if (JSON.stringify(snapshot.gyms) !== JSON.stringify(gyms)) {
        setGyms(snapshot.gyms);
      }
      if (JSON.stringify(snapshot.weeklySummary) !== JSON.stringify(weeklySummary)) {
        console.log('[Dashboard] Weekly summary changed, updating state:', {
          oldSummary: weeklySummary,
          newSummary: snapshot.weeklySummary,
          completedWorkoutsCount: snapshot.weeklySummary.completed_workouts.length,
          totalSessions: snapshot.weeklySummary.total_sessions
        });
        setWeeklySummary(snapshot.weeklySummary);
      }
      if (JSON.stringify(snapshot.activeGym) !== JSON.stringify(activeGym)) {
        setActiveGymState(snapshot.activeGym);
      }
      if (JSON.stringify(snapshot.activeTPath) !== JSON.stringify(activeTPath)) {
        setActiveTPath(snapshot.activeTPath);
      }
      if (JSON.stringify(snapshot.tPathWorkouts) !== JSON.stringify(tpathWorkouts)) {
        setTpathWorkouts(snapshot.tPathWorkouts);
      }
      if (JSON.stringify(snapshot.volumeHistory) !== JSON.stringify(volumeData)) {
        console.log('[Dashboard] Volume data changed, updating state from snapshot:', {
          oldVolumeData: volumeData,
          newVolumeData: snapshot.volumeHistory,
          difference: snapshot.volumeHistory.length - volumeData.length
        });
        setVolumeData(snapshot.volumeHistory);
      } else {
        console.log('[Dashboard] Volume data unchanged after snapshot fetch. Current:', volumeData.length, 'Snapshot:', snapshot.volumeHistory.length);
      }
      if (JSON.stringify(snapshot.recentWorkouts) !== JSON.stringify(recentWorkouts)) {
        setRecentWorkouts(snapshot.recentWorkouts);
      }
      if (JSON.stringify(snapshot.nextWorkout) !== JSON.stringify(nextWorkout)) {
        setNextWorkout(snapshot.nextWorkout);
      }
      
      // Cache the data
      setDataCache({
        lastFetch: currentTimestamp,
        data: snapshot
      });
      
      // Sync local state with cached data from data context
      if (snapshot.profile && !userProfile) {
        console.log('[Dashboard] Syncing userProfile from cached data');
        setUserProfile(snapshot.profile);
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load data', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
        setInitialLoadComplete(true);
      }
    }
  }, [userId, isRefreshing, dataCache, isInitialLoad, shouldRefreshDashboard, lastWorkoutCompletionTime, userProfile, gyms, weeklySummary, activeGym, activeTPath, tpathWorkouts, volumeData, recentWorkouts, nextWorkout]);

  // Global refresh function that can be called from anywhere in the app
  const triggerDashboardRefresh = useCallback(() => {
    console.log('[Dashboard] Global triggerDashboardRefresh called');
    
    // Check if refresh is already in progress
    if (refreshInProgressRef.current) {
      console.log('[Dashboard] Refresh already in progress, skipping duplicate call');
      return;
    }
    
    // Set flag to prevent concurrent refreshes
    refreshInProgressRef.current = true;
    
    setShouldRefreshDashboard(true);
    // Directly invalidate caches and trigger refresh
    setDataCache({ lastFetch: 0, data: null });
    setModalDataCache({});
    setLastWorkoutCompletionTime(Date.now());
    
    // Trigger coordinated refresh after cache clear
    setTimeout(() => {
      fetchDashboardData().then(() => {
        console.log('[Dashboard] Dashboard refresh completed after trigger');
      }).catch((error) => {
        console.error('[Dashboard] Dashboard refresh failed:', error);
      }).finally(() => {
        // Release the mutex
        refreshInProgressRef.current = false;
        
        // Check if there's a pending refresh that was queued
        if (pendingRefreshRef.current) {
          console.log('[Dashboard] Processing queued refresh after current one completed');
          pendingRefreshRef.current = false;
          // Trigger another refresh
          setTimeout(() => triggerDashboardRefresh(), 50);
        }
      });
    }, 100);
  }, [setShouldRefreshDashboard, fetchDashboardData]);
  
  // Make the refresh function globally available
  (global as any).triggerDashboardRefresh = triggerDashboardRefresh;

  // Debug: Log when global trigger is called
  useEffect(() => {
    const originalTrigger = (global as any).triggerDashboardRefresh;
    (global as any).triggerDashboardRefresh = function() {
      console.log('[Dashboard] Global triggerDashboardRefresh INTERCEPTED at', new Date().toISOString());
      return originalTrigger.apply(this, arguments);
    };
    
    return () => {
      (global as any).triggerDashboardRefresh = originalTrigger;
    };
  }, []);

  // Enhanced function to handle workout completion and cache invalidation
  const handleWorkoutCompletionRefresh = useCallback(async () => {
    console.log('[Dashboard] Handling workout completion refresh');
    
    // Check if refresh is already in progress
    if (refreshInProgressRef.current) {
      console.log('[Dashboard] Refresh already in progress, queueing workout completion refresh');
      pendingRefreshRef.current = true;
      return;
    }
    
    // Set flag to prevent concurrent refreshes
    refreshInProgressRef.current = true;
    
    // Call the data context's invalidateAllCaches to properly invalidate caches
    // We don't pass a session object to avoid database constraint errors
    try {
      console.log('[Dashboard] Calling data context invalidateAllCaches for cache invalidation');
      // Use the data context's invalidateAllCaches function directly
      await handleWorkoutCompletion(undefined);
      console.log('[Dashboard] Data context cache invalidation completed');
      
      // Then trigger coordinated refresh
      await triggerCoordinatedRefresh();
    } catch (error) {
      console.error('[Dashboard] Error during workout completion refresh:', error);
    } finally {
      // Release the mutex
      refreshInProgressRef.current = false;
      
      // Check if there's a pending refresh that was queued
      if (pendingRefreshRef.current) {
        console.log('[Dashboard] Processing queued refresh after workout completion');
        pendingRefreshRef.current = false;
        // Trigger another refresh
        setTimeout(() => triggerDashboardRefresh(), 50);
      }
    }
  }, [handleWorkoutCompletion, triggerCoordinatedRefresh, triggerDashboardRefresh]);

  useEffect(() => {
    if (!authLoading && !session && !AUTO_LOGIN_FOR_DEVELOPMENT) {
      console.log('[Dashboard] No session, redirecting to login');
      router.replace('/login');
      return;
    }
  }, [session, authLoading, router]);

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
      if (needsOnboarding) {
        router.replace('/onboarding');
        return;
      }
      
      // Reset loading start time when profile is loaded
      if (loadingStartTimeRef.current > 0) {
        console.log('[Dashboard] Profile loaded, resetting loading timeout');
        loadingStartTimeRef.current = 0;
      }
    }
  }, [session, authLoading, userId, userProfile?.onboarding_completed, router]);

  // Enhanced focus effect to handle both regular refresh and workout completion refresh
  useFocusEffect(
    useCallback(() => {
      async function fetchOnFocus() {
        if (userProfile?.onboarding_completed && initialLoadComplete) {
          const now = Date.now();

          // Enhanced check for forced refresh - includes empty state detection
          const timeSinceLastDeletion = now - lastDeletionTimeRef.current;
          const shouldForceRefresh = shouldRefreshDashboard ||
                                   recentWorkouts.length === 0 || // Handle empty state after deletion
                                   (dataCache.data === null) || // Handle cache cleared state
                                   timeSinceLastDeletion < 10000; // Handle recent deletion (10 second window)

          // Check time since last workout completion (5 minutes window)
          const timeSinceLastCompletion = now - lastWorkoutCompletionTime;
          const recentWorkoutCompletion = timeSinceLastCompletion < 5 * 60 * 1000;
          
          // FIX: Fetch fresh recentWorkouts count from database to avoid stale state
          let freshRecentWorkoutsCount = recentWorkouts.length;
          if (recentWorkoutCompletion && recentWorkouts.length === 49 && userId) {
            // Likely stale state, fetch fresh count from database
            try {
              const freshSessions = await getWorkoutSessions(userId);
              freshRecentWorkoutsCount = freshSessions.length;
              console.log('[Dashboard] Fresh recentWorkouts count from DB:', freshRecentWorkoutsCount);
            } catch (error) {
              console.error('[Dashboard] Failed to fetch fresh workouts count:', error);
            }
          }

          console.log('[Dashboard] Focus effect refresh check:', {
            shouldForceRefresh,
            recentWorkoutCompletion,
            hasDataCache: !!dataCache.data,
            recentWorkoutsCount: freshRecentWorkoutsCount,
            isRefreshing,
            timeSinceLastDeletion: now - lastDeletionTimeRef.current,
            lastDeletionTime: lastDeletionTimeRef.current
          });

          // Prevent infinite loops by checking if we're already refreshing
          // Also check the mutex to prevent race conditions
          if ((shouldForceRefresh || recentWorkoutCompletion) && !isRefreshing && !refreshInProgressRef.current) {
            // Set a minimum time between refreshes to prevent rapid successive calls
            const timeSinceLastRefresh = now - lastRefreshRef.current;
            if (timeSinceLastRefresh > 2000) { // Minimum 2 seconds between refreshes
              console.log('[Dashboard] Focus effect triggering refresh due to:', {
                shouldForceRefresh,
                recentWorkoutCompletion,
                hasDataCache: !!dataCache.data,
                recentWorkoutsCount: freshRecentWorkoutsCount
              });
              
              // If this is a recent workout completion, use the enhanced refresh function
              if (recentWorkoutCompletion) {
                console.log('[Dashboard] Recent workout completion detected, using enhanced refresh');
                handleWorkoutCompletionRefresh().finally(() => {
                  lastRefreshRef.current = Date.now();
                  // Reset the flag only after refresh completes
                  setShouldRefreshDashboard(false);
                });
              } else {
                // Don't reset the flag immediately - wait until refresh completes
                setIsRefreshing(true);
                fetchDashboardData().finally(() => {
                  setIsRefreshing(false);
                  lastRefreshRef.current = Date.now();
                  // Reset the flag only after refresh completes
                  setShouldRefreshDashboard(false);
                });
              }
            }
          } else if (now - lastRefreshRef.current > 10000 && !isRefreshing && !refreshInProgressRef.current) {
            // Clear any existing timeout
            if (refreshTimeoutRef.current) {
              clearTimeout(refreshTimeoutRef.current);
            }

            // Debounce the refresh by 500ms to prevent rapid firing
            refreshTimeoutRef.current = setTimeout(() => {
              setIsRefreshing(true);
              fetchDashboardData().finally(() => {
                setIsRefreshing(false);
                lastRefreshRef.current = Date.now();
                refreshTimeoutRef.current = null;
              });
            }, 500);
          }
        }
      }
      
      // Call the async function and discard the returned Promise to avoid TypeScript errors
      fetchOnFocus().catch((error) => {
        console.error('[Dashboard] Error in fetchOnFocus:', error);
      });
    }, [userProfile?.onboarding_completed, initialLoadComplete, isRefreshing, fetchDashboardData, shouldRefreshDashboard, setShouldRefreshDashboard, lastWorkoutCompletionTime, dataCache.data, recentWorkouts.length, lastDeletionTimeRef.current, handleWorkoutCompletionRefresh, getWorkoutSessions, userId])
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

  // Optimized historical workout loading with caching
  const getHistoricalWorkout = useMemo(() => {
    const cache = new Map();
    const cacheTimeout = 5 * 60 * 1000; // 5 minutes

    return async (workoutName: string): Promise<any | null> => {
      if (!userId || !workoutName) return null;

      const cacheKey = `${userId}:${workoutName}`;
      const cached = cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < cacheTimeout)) {
        return cached.data;
      }

      try {
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
          return null;
        }

        if (!sessions) {
          return null;
        }
        
        // Additional validation
        if (!Array.isArray(sessions)) {
          console.error('[Dashboard] Invalid sessions data type:', typeof sessions);
          return null;
        }

        if (sessions && sessions.length > 1) {
          const previousSession = sessions[1]; // Skip current session
          const previousSets = previousSession.set_logs || [];
          
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
          
          // Cache the result
          cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          return result;
        }
      } catch (error) {
        console.error('[Dashboard] Error getting historical workout:', error);
      }
      
      return null;
    };
  }, [userId, supabase]);

  // Clear weekly volume cache - exposed for external use
  const clearWeeklyVolumeCache = useCallback(() => {
    // This will be set after getWeeklyVolumeData is defined
  }, []);

  // Helper function to get weekly volume data with caching
  const getWeeklyVolumeData = useMemo(() => {
    const cache = new Map();
    const cacheTimeout = 10 * 60 * 1000; // 10 minutes

    // Update the clear function reference
    (global as any).clearWeeklyVolumeCache = () => {
      console.log('[Dashboard] Clearing weekly volume cache');
      cache.clear();
    };

    const getStartOfWeek = () => {
        const now = new Date();
        const day = now.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when week starts on Monday
        const monday = new Date(new Date().setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    return async (): Promise<{ [key: string]: number }> => {
      if (!userId) return {};

      const cacheKey = `weekly_volume_total:${userId}`;
      const cached = cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < cacheTimeout)) {
        return cached.data;
      }

      try {
        if (!supabase) {
          console.error('[Dashboard] Supabase client not available');
          return {};
        }
        
        const { data: { session: authSession }, error: authError } = await supabase.auth.getSession();
        if (authError || !authSession) {
          console.error('[Dashboard] Not authenticated, cannot fetch weekly volume');
          return {};
        }

        const startOfWeek = getStartOfWeek();
        
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
          .gte('session_date', startOfWeek.toISOString());

        if (error) {
          console.error('[Dashboard] Error fetching weekly volume data:', error);
          return {};
        }

        if (!sessions) {
          return {};
        }

        // Get exercise definitions to map muscle groups
        const { data: exercises, error: exError } = await supabase
          .from('exercise_definitions')
          .select('id, main_muscle')
          .or(`user_id.eq.${userId},user_id.is.null`);

        if (exError) {
          console.error('[Dashboard] Error fetching exercise definitions:', exError);
          return {};
        }

        if (!exercises) {
          return {};
        }

        const exerciseLookup = new Map<string, string>();
        exercises?.forEach((ex: any) => {
          exerciseLookup.set(ex.id, ex.main_muscle || 'Other');
        });

        // Calculate total weekly volume by muscle group
        const weeklyVolume: { [muscle: string]: number } = {};

        sessions?.forEach((session: any) => {
          session.set_logs?.forEach((set: any) => {
            const muscleGroupsStr = exerciseLookup.get(set.exercise_id) || 'Other';
            const muscleGroups = muscleGroupsStr.split(',').map(m => m.trim());
            const volume = (parseFloat(set.weight_kg) || 0) * (parseInt(set.reps) || 0);
            
            muscleGroups.forEach(muscleGroup => {
              if (muscleGroup !== 'Other') {
                if (!weeklyVolume[muscleGroup]) {
                  weeklyVolume[muscleGroup] = 0;
                }
                weeklyVolume[muscleGroup] += volume / muscleGroups.length;
              }
            });
          });
        });
        
        // Cache the result
        cache.set(cacheKey, {
          data: weeklyVolume,
          timestamp: Date.now()
        });
        
        return weeklyVolume;
      } catch (error) {
        console.error('[Dashboard] Error getting weekly volume data:', error);
        return {};
      }
    };
  }, [userId, supabase]);

  // Helper function to get all available muscle groups from database (like exercise library)
  const getAvailableMuscleGroups = useMemo(() => {
    const cache = new Map();
    const cacheTimeout = 10 * 60 * 1000; // 10 minutes

    return async (): Promise<string[]> => {
      if (!userId) return ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

      const cacheKey = `muscle_groups:${userId}`;
      const cached = cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < cacheTimeout)) {
        return cached.data;
      }

      try {
        const { data: exercises, error } = await supabase
          .from('exercise_definitions')
          .select('main_muscle')
          .or(`user_id.eq.${userId},user_id.is.null`);

        if (error) throw error;

        // Get unique muscle groups (like exercise library does)
        const muscles = new Set<string>();
        exercises?.forEach((ex: any) => {
          if (ex.main_muscle) {
            ex.main_muscle.split(',').forEach((m: string) => {
              muscles.add(m.trim());
            });
          }
        });

        const result = Array.from(muscles).sort((a, b) => a.localeCompare(b));
        
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } catch (error) {
        console.error('[Dashboard] Error fetching muscle groups:', error);
        return ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
      }
    };
  }, [userId, supabase]);

  // Helper function to get next workout suggestion with caching
  const getNextWorkoutSuggestion = useMemo(() => {
    const cache = new Map();
    const cacheTimeout = 30 * 60 * 1000; // 30 minutes

    return async (currentWorkoutName: string): Promise<any | null> => {
      if (!userId || !activeTPath) return null;

      const cacheKey = `next_workout:${userId}:${currentWorkoutName}`;
      const cached = cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < cacheTimeout)) {
        console.log('[Dashboard] Using cached next workout suggestion');
        return cached.data;
      }

      try {
        // Get T-path child workouts
        const { data: childWorkouts, error } = await supabase
          .from('t_paths')
          .select('id, template_name')
          .eq('parent_t_path_id', activeTPath.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[Dashboard] Error fetching T-path workouts:', error);
          return null;
        }

        if (!childWorkouts) {
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
          
          // Cache the result
          cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          
          return result;
        }
      } catch (error) {
        console.error('[Dashboard] Error getting next workout suggestion:', error);
      }

      return null;
    };
  }, [userId, activeTPath, supabase]);

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
        return false;
      }

      return !!(profileData && profileData.active_t_path_id);
    } catch (error) {
      return false;
    }
  };

  const handleViewSummary = useCallback(async (sessionId: string) => {
    console.log('[Dashboard] handleViewSummary called with sessionId:', sessionId);
    
    // Prevent duplicate modal openings for the same session
    if (workoutSummaryModalVisible && selectedSessionData?.sessionId === sessionId) {
      console.log('[Dashboard] Modal already open for this session, ignoring duplicate call');
      return;
    }
    
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
            .select('id, name, main_muscle, category, icon_url')
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
              muscleGroup: exercise?.main_muscle || 'Unknown',
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

        // Check if we have cached modal data for this session
        const cachedModalData = modalDataCache[sessionId];
        let historicalWorkout: any = null, weeklyVolumeData: any = null, nextWorkoutSuggestion: any = null, isOnTPath: boolean = false, allAvailableMuscleGroups: string[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

        if (cachedModalData && (Date.now() - cachedModalData.timestamp < 5 * 60 * 1000)) {
          // Use cached data
          console.log('[Dashboard] Using cached modal data');
          historicalWorkout = cachedModalData.historicalWorkout;
          weeklyVolumeData = cachedModalData.weeklyVolumeData;
          nextWorkoutSuggestion = cachedModalData.nextWorkoutSuggestion;
          isOnTPath = cachedModalData.isOnTPath;
          allAvailableMuscleGroups = cachedModalData.allAvailableMuscleGroups || allAvailableMuscleGroups;
        } else {
          // Fetch data and cache it
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
          historicalWorkout = await getHistoricalWorkout(foundSession.template_name || 'Workout');
          console.log('[Dashboard] getHistoricalWorkout result:', !!historicalWorkout);
          
          console.log('[Dashboard] Calling getWeeklyVolumeData...');
          weeklyVolumeData = await getWeeklyVolumeData();
          console.log('[Dashboard] getWeeklyVolumeData result:', Object.keys(weeklyVolumeData || {}));
          
          console.log('[Dashboard] Calling getNextWorkoutSuggestion...');
          nextWorkoutSuggestion = await getNextWorkoutSuggestion(foundSession.template_name || 'Workout');
          console.log('[Dashboard] getNextWorkoutSuggestion result:', !!nextWorkoutSuggestion);
          
          console.log('[Dashboard] Calling checkIfOnTPath...');
          isOnTPath = await checkIfOnTPath();
          console.log('[Dashboard] checkIfOnTPath result:', isOnTPath);
          
          console.log('[Dashboard] Calling getAvailableMuscleGroups...');
          allAvailableMuscleGroups = await getAvailableMuscleGroups();
          console.log('[Dashboard] getAvailableMuscleGroups result:', allAvailableMuscleGroups);
          
          console.log('[Dashboard] Data fetch completed, results:', {
            historicalWorkout: !!historicalWorkout,
            weeklyVolumeData: Object.keys(weeklyVolumeData || {}),
            nextWorkoutSuggestion: !!nextWorkoutSuggestion,
            isOnTPath
          });

          // Cache the data
          setModalDataCache(prev => ({
            ...prev,
            [sessionId]: {
              historicalWorkout,
              weeklyVolumeData,
              nextWorkoutSuggestion,
              isOnTPath,
              allAvailableMuscleGroups,
              timestamp: Date.now()
            }
          }));
        }

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
          allAvailableMuscleGroups,
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
  }, [userId, workoutSummaryModalVisible, selectedSessionData?.sessionId, modalDataCache, getHistoricalWorkout, getWeeklyVolumeData, getNextWorkoutSuggestion, checkIfOnTPath, getAvailableMuscleGroups]);


  // Helper function to get workout date for volume data filtering
  const getWorkoutDate = useCallback((sessionId: string) => {
    const workout = recentWorkouts.find(w => w.id === sessionId);
    return workout?.session_date || new Date().toISOString();
  }, [recentWorkouts]);

  const handleDeleteWorkout = useCallback(
    async (sessionId: string, templateName: string) => {
      // Prevent concurrent deletions
      if (deletionInProgress) return;
      
      setDeletionInProgress(sessionId);
      
      try {
        console.log('[Dashboard] Starting atomic workout deletion:', sessionId);
        
        // Show confirmation dialog
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Delete Workout Session',
            `Are you sure you want to delete "${templateName}"? This action cannot be undone.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]
          );
        });
        
        if (!confirmed) {
          setDeletionInProgress(null);
          return;
        }
        
        // Step 1: Remove from local state immediately for instant UI feedback
        const deletedWorkoutDate = getWorkoutDate(sessionId);
        const deletedWorkout = recentWorkouts.find(w => w.id === sessionId);
        const wasCompleted = deletedWorkout?.completed_at !== null;
        
        console.log('[Dashboard] DEBUG: Deletion date comparison:', {
          sessionId,
          deletedWorkoutDate,
          deletedWorkoutDateType: typeof deletedWorkoutDate,
          volumeDataDates: volumeData.map(v => ({ date: v.date, volume: v.volume })),
          recentWorkoutDate: deletedWorkout?.session_date,
        });
        
        // Normalize dates to date string for comparison (remove time component)
        const normalizeDate = (dateStr: string) => {
          const date = new Date(dateStr);
          return date.toDateString();
        };
        const normalizedDeletedDate = normalizeDate(deletedWorkoutDate);
        
        console.log('[Dashboard] DEBUG: Normalized date comparison:', {
          originalDate: deletedWorkoutDate,
          normalizedDate: normalizedDeletedDate,
          volumeDataNormalized: volumeData.map(v => ({ date: normalizeDate(v.date), volume: v.volume })),
        });
        
        setRecentWorkouts(prev => prev.filter(workout => workout.id !== sessionId));

        // Clear volume data to force recalculation after deletion
        // This ensures correct volume totals if multiple workouts occurred on the same day
        setVolumeData([]);
        console.log('[Dashboard] Cleared volume data for recalculation after deletion:', {
          deletedWorkoutId: sessionId,
          deletedDate: normalizedDeletedDate
        });
        
        // CRITICAL FIX: Also update weeklySummary immediately to prevent stale widget data
        setWeeklySummary(prev => {
          const newCompletedWorkouts = prev.completed_workouts.filter(w => w.sessionId !== sessionId);
          const newTotalSessions = wasCompleted ? Math.max(0, prev.total_sessions - 1) : prev.total_sessions;
          console.log('[Dashboard] Immediate weeklySummary update:', {
            oldCount: prev.completed_workouts.length,
            newCount: newCompletedWorkouts.length,
            oldTotalSessions: prev.total_sessions,
            newTotalSessions,
            deletedSessionId: sessionId
          });
          return {
            ...prev,
            completed_workouts: newCompletedWorkouts,
            total_sessions: newTotalSessions
          };
        });
        
        // Update deletion timestamp for cache invalidation
        lastDeletionTimeRef.current = Date.now();
        
        // Step 2: Perform database deletion
        await deleteWorkoutSession(sessionId);
        console.log('[Dashboard] Workout session deleted from database');
        
        // Step 3: Wait for database operations to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 4: Enhanced cache invalidation for deletion scenarios
        console.log('[Dashboard] Starting enhanced cache invalidation for deletion');
        
        // Clear dashboard cache immediately to prevent stale data
        setDataCache({ lastFetch: 0, data: null });
        setShouldRefreshDashboard(true);
        
        // Clear modal data cache for this session
        setModalDataCache(prev => {
          const newCache = { ...prev };
          delete newCache[sessionId];
          return newCache;
        });
        
        // CRITICAL FIX: Clear weekly volume cache to ensure volume chart updates
        if ((global as any).clearWeeklyVolumeCache) {
          console.log('[Dashboard] Clearing weekly volume cache after deletion');
          (global as any).clearWeeklyVolumeCache();
        }
        
        // Update last workout completion time to trigger data context refresh
        if (typeof setLastWorkoutCompletionTime === 'function') {
          console.log('[Dashboard] Updating last workout completion time to trigger data context refresh');
          setLastWorkoutCompletionTime(Date.now());
        }
        
        // Call the data context's handleWorkoutCompletion for comprehensive cache invalidation
        try {
          console.log('[Dashboard] Calling data context handleWorkoutCompletion for comprehensive cache invalidation');
          await handleWorkoutCompletion(undefined);
          console.log('[Dashboard] Data context cache invalidation completed successfully');
        } catch (error) {
          console.error('[Dashboard] Error during data context cache invalidation:', error);
        }
        
        // Step 5: Trigger immediate dashboard refresh with forced cache bypass
        console.log('[Dashboard] Triggering immediate dashboard refresh after deletion');
        
        // Force refresh by bypassing cache check
        const currentTimestamp = Date.now();
        lastRefreshRef.current = 0; // Reset to allow immediate refresh
        
        // Clear any existing timeout
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        
        // Trigger immediate refresh with enhanced cache invalidation
        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            // Force clear dashboard cache to ensure fresh data
            setDataCache({ lastFetch: 0, data: null });
            setShouldRefreshDashboard(true);
            
            console.log('[Dashboard] Calling fetchDashboardData after deletion, current volumeData:', volumeData.length);
            await fetchDashboardData();
            console.log('[Dashboard] Dashboard refresh completed after deletion, new volumeData:', volumeData.length);
            
            // CRITICAL FIX: Force widget re-render by incrementing a key or triggering state sync
            // This ensures the WeeklyTargetWidget receives the updated weeklySummary immediately
            if (userId) {
              const updatedSessions = await getWorkoutSessions(userId);
              const newWeeklyCount = updatedSessions.filter(s => {
                const sessionDate = new Date(s.session_date);
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                return sessionDate >= startOfWeek;
              }).length;
              
              console.log('[Dashboard] Post-refresh session count verification:', {
                totalSessions: updatedSessions.length,
                weeklySessions: newWeeklyCount,
                expectedWidgetCount: newWeeklyCount
              });
            }
            
            // Show success feedback
            Alert.alert('Success', 'Workout deleted successfully');
          } catch (error) {
            console.error('[Dashboard] Dashboard refresh failed after deletion:', error);
            Alert.alert('Error', 'Workout deleted but dashboard refresh failed');
          }
        }, 100); // Short delay to ensure all caches are cleared
        
        console.log('[Dashboard] Workout deletion process initiated successfully');
        
      } catch (error) {
        console.error('[Dashboard] Failed to delete workout session:', error);
        Alert.alert('Error', 'Failed to delete workout session');
      } finally {
        setDeletionInProgress(null);
      }
    },
    [deletionInProgress, deleteWorkoutSession, getWorkoutDate, setDataCache, setShouldRefreshDashboard, setModalDataCache, fetchDashboardData]
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

  // Helper function to render dashboard with cached data when loading is stuck
  const renderDashboardWithData = useCallback((cachedData: any) => {
    console.log('[Dashboard] Rendering with cached data due to stuck loading');
    
    return (
      <>
        <View style={styles.container}>
          <BackgroundRoot />
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Use cached data for all widgets */}
            <View>
              <WelcomeHeader
                userName={userName}
                accountCreatedAt={accountCreatedAt}
              />
            </View>

            {/* Only show sync banner when there are sync issues or offline */}
            {(!isOnline || isSyncing || queueLength > 0) && (
              <View>
                <SyncStatusBanner
                  isOnline={isOnline}
                  isSyncing={isSyncing}
                  queueLength={queueLength}
                  onManualSync={() => {
                    // Trigger manual sync by refreshing data
                    onRefresh();
                  }}
                />
              </View>
            )}

            <View>
              <WeeklyTargetWidget
                completedWorkouts={cachedData.weeklySummary?.completed_workouts || []}
                goalTotal={cachedData.weeklySummary?.goal_total || 3}
                programmeType={cachedData.weeklySummary?.programme_type || 'ppl'}
                totalSessions={cachedData.weeklySummary?.total_sessions || 0}
                onViewCalendar={() => router.push('/workout-history')}
                onViewWorkoutSummary={handleViewSummary}
                activitiesCount={0}
                onViewActivities={() => {}}
                loading={false}
              />
            </View>

            <View>
              <ActionHubWidget
                onLogActivity={() => setActivityModalVisible(true)}
                onAICoach={() => {}}
                onWorkoutLog={() => setWorkoutPerformanceModalVisible(true)}
                onConsistencyCalendar={() => {}}
              />
            </View>

            {cachedData.gyms?.length > 1 && (
              <View>
                <GymToggle
                  gyms={cachedData.gyms || []}
                  activeGym={cachedData.activeGym}
                  onGymChange={async (gymId: string, newActiveGym: Gym | null) => {
                    if (userId) {
                      setActiveGymState(newActiveGym);
                      await setActiveGym(userId, gymId);
                      setTimeout(() => {
                        fetchDashboardData();
                      }, 100);
                    }
                  }}
                />
              </View>
            )}

            <View>
              <NextWorkoutCard
                workoutId={cachedData.nextWorkout?.id}
                workoutName={cachedData.nextWorkout?.template_name}
                estimatedDuration={
                  cachedData.profile?.preferred_session_length || '45 minutes'
                }
                loading={false}
                noActiveGym={!cachedData.activeGym}
                noActiveTPath={!cachedData.activeTPath}
                recommendationReason={(cachedData.nextWorkout as any)?.recommendationReason}
              />
            </View>

            <View>
              <AllWorkoutsQuickStart
                programName={cachedData.activeTPath?.template_name}
                workouts={cachedData.tPathWorkouts || []}
              />
            </View>

            <View>
              <SimpleVolumeChart data={cachedData.volumeHistory || []} />
            </View>

            <View>
              <PreviousWorkoutsWidget
                workouts={(cachedData.recentWorkouts || []).map((workout: any) => ({
                  id: workout.id,
                  sessionId: workout.id,
                  template_name: workout.template_name || 'Ad Hoc Workout',
                  completed_at: workout.completed_at || workout.session_date,
                  exercise_count: workout.exercise_count,
                  duration_string: workout.duration_string ?? undefined,
                }))}
                onViewSummary={handleViewSummary}
                onDelete={handleDeleteWorkout}
                loading={false}
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

        {/* Modals */}
        <WorkoutSummaryModal
          visible={workoutSummaryModalVisible}
          onClose={() => setWorkoutSummaryModalVisible(false)}
          exercises={selectedSessionData?.exercises || []}
          workoutName={selectedSessionData?.workoutName || ''}
          startTime={selectedSessionData?.startTime || new Date()}
          {...(selectedSessionData?.duration && { duration: selectedSessionData.duration })}
          {...(selectedSessionData?.historicalRating !== null && selectedSessionData?.historicalRating !== undefined && { historicalRating: selectedSessionData.historicalRating })}
          showActions={false}
          allAvailableMuscleGroups={selectedSessionData?.allAvailableMuscleGroups || []}
          weeklyVolumeData={selectedSessionData?.weeklyVolumeData || {}}
          onSaveWorkout={async () => {
            setWorkoutSummaryModalVisible(false);
          }}
          onRateWorkout={async (rating) => {
            if (!selectedSessionData || !selectedSessionData.sessionId) return;
            try {
              await handleSessionRatingUpdate(selectedSessionData.sessionId, rating);
            } catch (error) {
              Alert.alert('Error', 'Failed to save workout rating');
            }
          }}
        />

        <ActivityLoggingModal
          visible={activityModalVisible}
          onClose={() => setActivityModalVisible(false)}
          onLogActivity={async (activity: any) => {
            try {
              const activityData = {
                user_id: userId,
                type: activity.type,
                duration_minutes: activity.duration,
                notes: activity.notes,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              const { data, error } = await supabase
                .from('activity_logs')
                .insert([activityData])
                .select();

              if (error) {
                Alert.alert('Error', 'Failed to log activity. Please try again.');
                return;
              }

              setActivityModalVisible(false);
              await fetchDashboardData();
              Alert.alert('Success', 'Activity logged successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to log activity. Please try again.');
            }
          }}
        />

        <WorkoutPerformanceModal
          visible={workoutPerformanceModalVisible}
          onClose={() => setWorkoutPerformanceModalVisible(false)}
        />
      </>
    );
  }, [userName, accountCreatedAt, handleViewSummary, handleDeleteWorkout, userId, setActiveGym, fetchDashboardData, refreshing, onRefresh, workoutSummaryModalVisible, selectedSessionData, handleSessionRatingUpdate, activityModalVisible, setActivityModalVisible, workoutPerformanceModalVisible, setWorkoutPerformanceModalVisible]);

  // Show loading screen while checking onboarding status or data is being fetched
  // Modified condition: check if we actually need to load data, not just if local state is null
  const hasDataContextProfile = dataCache.data?.profile;
  const hasValidProfile = userProfile && userProfile.onboarding_completed !== undefined;
  const needsLoading = (!authLoading && session && userId && (!userProfile || loading) && !hasDataContextProfile && !hasValidProfile);
  
  if (needsLoading) {
    // Track loading start time to prevent infinite loading
    if (loading && loadingStartTimeRef.current === 0) {
      loadingStartTimeRef.current = Date.now();
      console.log('[Dashboard] Started tracking loading time:', loadingStartTimeRef.current);
    }
    
    const loadingDuration = loadingStartTimeRef.current > 0 ? Date.now() - loadingStartTimeRef.current : 0;
    const hasLoadingTimeout = loadingDuration > LOADING_TIMEOUT;
    
    console.log('[Dashboard] Profile loading or data fetching, showing loading screen...', {
      hasUserProfile: !!userProfile,
      hasDataContextProfile: !!hasDataContextProfile,
      isLoading: loading,
      authLoading,
      hasSession: !!session,
      hasUserId: !!userId,
      hasDataCache: !!dataCache.data,
      loadingDuration,
      hasLoadingTimeout,
      loadingStartTime: loadingStartTimeRef.current,
      needsLoading
    });
    
    // Force render with cached data if:
    // 1. We're still loading but have cached data, OR
    // 2. We've been loading for too long (timeout)
    if ((loading && dataCache.data) || hasLoadingTimeout) {
      console.log('[Dashboard] Forcing render with cached data:', {
        hasCachedData: !!dataCache.data,
        loadingTimeout: hasLoadingTimeout,
        loadingDuration
      });
      
      // Reset loading start time
      loadingStartTimeRef.current = 0;
      
      // If we have cached data, render with it; otherwise render with empty state
      if (dataCache.data) {
        return renderDashboardWithData(dataCache.data);
      } else {
        // Render minimal dashboard with empty states
        return renderDashboardWithData({
          profile: null,
          gyms: [],
          activeGym: null,
          weeklySummary: {
            completed_workouts: [],
            goal_total: 3,
            programme_type: 'ppl',
            total_sessions: 0,
          },
          volumeHistory: [],
          recentWorkouts: [],
          activeTPath: null,
          tPathWorkouts: [],
          nextWorkout: null,
        });
      }
    }
    
    return (
      <View style={styles.loadingContainer}>
        <BackgroundRoot />
        {/* Loading state while profile loads */}
      </View>
    );
  }
  
  // Reset loading start time when not loading
  if (!loading && loadingStartTimeRef.current > 0) {
    loadingStartTimeRef.current = 0;
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

          {/* Sync Status Banner - only show when there are sync issues */}
          {(!isOnline || isSyncing || queueLength > 0) && (
            <View>
              <SyncStatusBanner
                isOnline={isOnline}
                isSyncing={isSyncing}
                queueLength={queueLength}
                onManualSync={() => {
                  // Trigger manual sync by refreshing data
                  onRefresh();
                }}
              />
            </View>
          )}

          {/* 2. Weekly Target */}
          <View key={`weekly-target-${weeklySummary.total_sessions}-${weeklySummary.completed_workouts.length}-${Date.now()}`}>
            <WeeklyTargetWidget
              completedWorkouts={weeklySummary.completed_workouts}
              goalTotal={weeklySummary.goal_total}
              programmeType={weeklySummary.programme_type}
              totalSessions={weeklySummary.total_sessions}
              onViewCalendar={() => router.push('/workout-history')}
              onViewWorkoutSummary={handleViewSummary}
              activitiesCount={0}
              onViewActivities={() => {}}
              loading={loading}
            />
          </View>

          {/* 3. Action Hub */}
          <View>
            <ActionHubWidget
              onLogActivity={() => setActivityModalVisible(true)}
              onAICoach={() => {}}
              onWorkoutLog={() => setWorkoutPerformanceModalVisible(true)}
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
              recommendationReason={(nextWorkout as any)?.recommendationReason}
            />
          </View>

          {/* 6. All Workouts Quick Start */}
          <View>
            <AllWorkoutsQuickStart
              programName={activeTPath?.template_name}
              workouts={tpathWorkouts}
            />
          </View>

          {/* 7. Weekly Volume Chart */}
          <View key={`volume-chart-${volumeData.length}-${Date.now()}`}>
            <SimpleVolumeChart data={volumeData} />
          </View>

          {/* 8. Previous Workouts */}
          <View key={`previous-workouts-${recentWorkouts.length}-${Date.now()}`}>
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
              loading={loading || deletionInProgress !== null}
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
        allAvailableMuscleGroups={selectedSessionData?.allAvailableMuscleGroups || []}
        weeklyVolumeData={selectedSessionData?.weeklyVolumeData || {}}
        onSaveWorkout={async () => {
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

      {/* Activity Logging Modal */}
      <ActivityLoggingModal
        visible={activityModalVisible}
        onClose={() => setActivityModalVisible(false)}
        onLogActivity={async (activity) => {
          try {
            // Log the activity to the database
            console.log('[Dashboard] Logging activity:', activity);
            
            // Create activity log entry
            const activityData = {
              user_id: userId,
              type: activity.type,
              duration_minutes: activity.duration,
              notes: activity.notes,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            // Insert into Supabase
            const { data, error } = await supabase
              .from('activity_logs')
              .insert([activityData])
              .select();

            if (error) {
              console.error('[Dashboard] Failed to log activity:', error);
              Alert.alert('Error', 'Failed to log activity. Please try again.');
              return;
            }

            console.log('[Dashboard] Activity logged successfully:', data);
            setActivityModalVisible(false);
            
            // Refresh dashboard data to update activity count
            await fetchDashboardData();
            
            Alert.alert('Success', 'Activity logged successfully!');
          } catch (error) {
            console.error('[Dashboard] Error logging activity:', error);
            Alert.alert('Error', 'Failed to log activity. Please try again.');
          }
        }}
      />

      <WorkoutPerformanceModal
        visible={workoutPerformanceModalVisible}
        onClose={() => setWorkoutPerformanceModalVisible(false)}
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