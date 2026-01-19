import React, { useCallback, useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
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
import { DeleteWorkoutDialog } from '../../components/ui/DeleteWorkoutDialog';
import { SuccessDialog } from '../../components/ui/SuccessDialog';
import { createTaggedLogger } from '../../lib/logger';

const log = createTaggedLogger('Dashboard');

export default function DashboardScreen() {
  const { session, userId, loading: authLoading } = useAuth();
  const { loadDashboardSnapshot, deleteWorkoutSession, setActiveGym, isSyncing, queueLength, isOnline, forceRefreshProfile, getWorkoutSessions, getSetLogs, shouldRefreshDashboard, setShouldRefreshDashboard, lastWorkoutCompletionTime, setLastWorkoutCompletionTime, handleWorkoutCompletion, setTempStatusMessage, invalidateAllCaches } = useData();
  
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
  // Track when we're waiting for fresh t-path data after a gym switch
  const [isWaitingForTPathData, setIsWaitingForTPathData] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [deletionInProgress, setDeletionInProgress] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<{ sessionId: string; templateName: string } | null>(null);
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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
  
  // Track sync box visibility - show for max 2 seconds from when first shown
  const syncBoxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncBoxShownAtRef = useRef<number | null>(null);
  const syncBoxHiddenRef = useRef<boolean>(false); // Track if sync box was already hidden
  const tempMessageClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tempMessageClearedRef = useRef<boolean>(false);
  const tempMessageMinDurationElapsedRef = useRef<boolean>(false);
  const syncCompletedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showSyncBox, setShowSyncBox] = useState(false);
  
  // Stable sync state that doesn't flicker - only becomes false after consistent inactivity
  const stableIsSyncingRef = useRef<boolean>(false);
  const stableSyncInactiveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [stableIsSyncing, setStableIsSyncing] = useState(false);
  
  // ScrollView refs for scrolling to top
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollViewRefSecondary = useRef<ScrollView | null>(null);
  
  // Track if we've already scrolled to top for this focus session
  // This prevents scrolling when data loads after initial focus
  const hasScrolledToTopThisFocus = useRef<boolean>(false);
  
  // Track current scroll position to detect unexpected resets
  const currentScrollY = useRef<number>(0);
  // Track previous content height to detect size changes
  const previousContentHeight = useRef<number>(0);
  
  // Track last known T-path to detect changes even if flag is reset
  const lastKnownTPathIdRef = useRef<string | null>(null);
  const lastKnownProgrammeTypeRef = useRef<string | null>(null);

  // Enhanced cache invalidation function - now calls data context's handleWorkoutCompletion
  const dashboardInvalidateAllCaches = useCallback(async () => {
    log.info('[Dashboard] Starting atomic cache invalidation');
    
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
      log.debug('[Dashboard] Calling data context invalidateAllCaches');
      // Use the data context's invalidateAllCaches function
      await handleWorkoutCompletionRefresh();
      log.debug('[Dashboard] Data context cache invalidation completed successfully');
    } catch (error) {
      log.error('[Dashboard] Error during data context cache invalidation:', error);
    }
  }, [userId, setShouldRefreshDashboard, handleWorkoutCompletion, setLastWorkoutCompletionTime]);

  // Enhanced coordinated refresh function
  const triggerCoordinatedRefresh = useCallback(async () => {
        if (__DEV__) {
      log.debug('[Dashboard] Starting coordinated refresh');
    }
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // CRITICAL FIX: Clear cache immediately before refresh
    setDataCache({ lastFetch: 0, data: null });
    setShouldRefreshDashboard(true);
    
    // Use debounced refresh to prevent multiple rapid calls
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
                await fetchDashboardData();
                if (__DEV__) {
          log.debug('[Dashboard] Coordinated refresh completed');
        }
      } catch (error) {
        log.error('[Dashboard] Coordinated refresh failed:', error);
      }
    }, 100); // Small delay to ensure all caches are cleared
  }, [fetchDashboardData, setShouldRefreshDashboard]);

  const fetchDashboardData = useCallback(async () => {
        
    if (!userId || isRefreshing) {
            return;
    }
    
    // Additional safeguard: prevent rapid successive calls
    // CRITICAL FIX: Allow immediate refresh if shouldRefreshDashboard is true
    const currentTimestamp = Date.now();
    const timeSinceLastRefresh = currentTimestamp - lastRefreshRef.current;
    if (timeSinceLastRefresh < 1000 && !shouldRefreshDashboard) { // Minimum 1 second between refreshes, unless forced
            return;
    }

    const now = Date.now();
    const cacheDuration = 60000; // 60 seconds (increased from 30)

    // CRITICAL: Check for T-path changes from fresh Supabase data BEFORE checking cache
    // This prevents showing stale cached data when T-path has changed
    let freshTPathId: string | null = null;
    let freshProgrammeType: string | null = null;
    if (userId && supabase) {
      try {
        const { data: freshProfile } = await supabase
          .from('profiles')
          .select('active_t_path_id, programme_type')
          .eq('id', userId)
          .maybeSingle();
        
        if (freshProfile) {
          freshTPathId = freshProfile.active_t_path_id || null;
          freshProgrammeType = freshProfile.programme_type || null;
        }
      } catch (error) {
        log.error('[Dashboard] Error fetching fresh profile in fetchDashboardData:', error);
      }
    }
    
    // Check if T-path changed by comparing fresh data with last known values
    const tPathChanged = freshTPathId !== null && freshTPathId !== lastKnownTPathIdRef.current;
    const programmeTypeChanged = freshProgrammeType !== null && freshProgrammeType !== lastKnownProgrammeTypeRef.current;
    const tPathOrTypeChanged = tPathChanged || programmeTypeChanged;
    
    // If T-path changed, immediately clear state and cache to prevent showing old data
    if (tPathOrTypeChanged) {
      if (__DEV__) {
        log.debug('[Dashboard] T-path change detected in fetchDashboardData - immediately clearing state:', {
          oldTPathId: lastKnownTPathIdRef.current,
          newTPathId: freshTPathId,
          oldProgrammeType: lastKnownProgrammeTypeRef.current,
          newProgrammeType: freshProgrammeType
        });
      }
      lastKnownTPathIdRef.current = freshTPathId;
      lastKnownProgrammeTypeRef.current = freshProgrammeType;
      // Clear state immediately to prevent UI from showing old T-path data
      // CRITICAL: Also clear userProfile if it has the old t-path ID to prevent stale lookups
      if (userProfile?.active_t_path_id && userProfile.active_t_path_id !== freshTPathId) {
        log.debug('[Dashboard] Clearing stale userProfile with old t-path ID:', userProfile.active_t_path_id);
                setUserProfile(null); // Clear to force fresh fetch
      }
      setActiveTPath(null);
      setTpathWorkouts([]);
      setNextWorkout(null); // Also clear nextWorkout to prevent stale display
      setDataCache({ lastFetch: 0, data: null });
      setModalDataCache({});
      // Only set waiting flag if we actually cleared the t-path (not just detected a change)
      // This prevents the flag from being set unnecessarily
      if (!freshTPathId || !activeTPath) {
        setIsWaitingForTPathData(true); // Mark that we're waiting for fresh t-path data
      }
      // Force refresh by bypassing cache
    }
    
    // Check cache first, but bypass if force refresh is needed
    // CRITICAL FIX: Always bypass cache if shouldRefreshDashboard is true (workout just completed)
    const hasValidCache = dataCache.data && 
                          (currentTimestamp - dataCache.lastFetch < cacheDuration) && 
                          !tPathOrTypeChanged &&
                          !shouldRefreshDashboard; // CRITICAL: Force refresh if flag is set
    
    if (hasValidCache && !shouldRefreshDashboard) {
      // Enhanced force refresh conditions - include empty state and deletion scenarios
      const timeSinceLastCompletion = currentTimestamp - lastWorkoutCompletionTime;
      const timeSinceLastDeletion = currentTimestamp - lastDeletionTimeRef.current;
      
      // Check if T-path changed by comparing with last known values (backup check using state)
      const currentTPathId = userProfile?.active_t_path_id || null;
      const currentProgrammeType = userProfile?.programme_type || null;
      const tPathChangedFromState = currentTPathId !== lastKnownTPathIdRef.current;
      const programmeTypeChangedFromState = currentProgrammeType !== lastKnownProgrammeTypeRef.current;
      const tPathOrTypeChangedFromState = tPathChangedFromState || programmeTypeChangedFromState;
      
      const shouldForceRefresh = shouldRefreshDashboard ||
                               tPathOrTypeChangedFromState || // CRITICAL: Detect T-path changes directly from state
                               timeSinceLastCompletion < 5 * 60 * 1000 ||
                               timeSinceLastDeletion < 10000 || // Force refresh for 10 seconds after deletion
                               recentWorkouts.length === 0 || // Empty state after deletion
                               (dataCache.data && recentWorkouts.length === 0) || // Cache shows data but UI is empty
                               dataCache.lastFetch === 0 || // Cache was explicitly cleared
                               !dataCache.data; // Cache is null/undefined
      
      if (__DEV__) {
        log.debug('[Dashboard] Cache check:', {
          hasCache: !!dataCache.data,
          cacheAge: currentTimestamp - dataCache.lastFetch,
          cacheLastFetch: dataCache.lastFetch,
          hasValidCache,
          shouldForceRefresh,
          shouldRefreshDashboard,
          tPathChanged,
          programmeTypeChanged,
          currentTPathId,
          lastKnownTPathId: lastKnownTPathIdRef.current,
          currentProgrammeType,
          lastKnownProgrammeType: lastKnownProgrammeTypeRef.current,
          timeSinceLastCompletion,
          timeSinceLastDeletion,
          recentWorkoutsCount: recentWorkouts.length,
          deletionDetected: dataCache.lastFetch === 0,
          lastDeletionTime: lastDeletionTimeRef.current
        });
      }
      
      // Update refs if T-path changed (will trigger refresh below)
      if (tPathOrTypeChangedFromState) {
        if (__DEV__) {
          log.debug('[Dashboard] T-path or programme type changed detected from state:', {
            oldTPathId: lastKnownTPathIdRef.current,
            newTPathId: currentTPathId,
            oldProgrammeType: lastKnownProgrammeTypeRef.current,
            newProgrammeType: currentProgrammeType
          });
        }
        lastKnownTPathIdRef.current = currentTPathId;
        lastKnownProgrammeTypeRef.current = currentProgrammeType;
      }
      
      if (shouldForceRefresh) {
        if (tPathOrTypeChangedFromState) {
          if (__DEV__) {
            log.debug('[Dashboard] T-path change detected from state - immediately clearing cache and state to prevent showing old data');
          }
          // Clear cache immediately for T-path changes
          setDataCache({ lastFetch: 0, data: null });
          setModalDataCache({});
          // CRITICAL: Clear state immediately to prevent UI from showing old T-path data
          // This ensures the UI doesn't render stale data while fetching new snapshot
          setActiveTPath(null);
          setTpathWorkouts([]);
          // Keep weeklySummary and nextWorkout as null temporarily to show loading state
          // They will be updated from the fresh snapshot
        }
        if (__DEV__) {
          log.debug('[Dashboard] Bypassing cache due to force refresh conditions');
        }
        // Bypass cache due to recent workout completion, refresh flag, T-path change, or empty state
      } else if (!shouldRefreshDashboard) {
        // Update state directly - React optimizes re-renders automatically
        // Removed expensive JSON.stringify comparisons that were causing jagginess
        setUserProfile(dataCache.data.profile);
        
        // Deduplicate gyms by name - keep only one gym per unique name
        const uniqueGymsMap = new Map<string, Gym>();
        (dataCache.data.gyms || []).forEach((gym: Gym) => {
          const existing = uniqueGymsMap.get(gym.name);
          if (!existing) {
            uniqueGymsMap.set(gym.name, gym);
          } else if (gym.is_active && !existing.is_active) {
            uniqueGymsMap.set(gym.name, gym);
          }
        });
        setGyms(Array.from(uniqueGymsMap.values()));
        
        if (__DEV__) {
          log.debug('[Dashboard] Weekly summary updated from cache:', {
            completedWorkoutsCount: dataCache.data.weeklySummary.completed_workouts.length,
            totalSessions: dataCache.data.weeklySummary.total_sessions
          });
        }
        setWeeklySummary(dataCache.data.weeklySummary);
        setActiveGymState(dataCache.data.activeGym);
        setActiveTPath(dataCache.data.activeTPath);
        setIsWaitingForTPathData(false); // Clear waiting flag when using cached data
        setTpathWorkouts(dataCache.data.tPathWorkouts);
        
        if (__DEV__) {
          log.debug('[Dashboard] Volume data updated from cache:', {
            dataPoints: dataCache.data.volumeHistory.length
          });
        }
        setVolumeData(dataCache.data.volumeHistory);
        setRecentWorkouts(dataCache.data.recentWorkouts);
        setNextWorkout(dataCache.data.nextWorkout);
        return;
      }
    } else {
      if (__DEV__) {
        log.debug('[Dashboard] No valid cache data available, proceeding with fetch');
      }
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
      }

      const snapshot = await loadDashboardSnapshot();

      // CRITICAL: Check for T-path changes from the fresh snapshot BEFORE updating state
      // This ensures we detect changes even if userProfile state hasn't updated yet
      const snapshotTPathId = snapshot.profile?.active_t_path_id || null;
      const snapshotProgrammeType = snapshot.profile?.programme_type || null;
      const tPathChangedFromSnapshot = snapshotTPathId !== null && snapshotTPathId !== lastKnownTPathIdRef.current;
      const programmeTypeChangedFromSnapshot = snapshotProgrammeType !== null && snapshotProgrammeType !== lastKnownProgrammeTypeRef.current;
      
      if (tPathChangedFromSnapshot || programmeTypeChangedFromSnapshot) {
        if (__DEV__) {
          log.debug('[Dashboard] T-path change detected from fresh snapshot - immediately updating state:', {
            oldTPathId: lastKnownTPathIdRef.current,
            newTPathId: snapshotTPathId,
            oldProgrammeType: lastKnownProgrammeTypeRef.current,
            newProgrammeType: snapshotProgrammeType
          });
        }
        // Update refs immediately
        lastKnownTPathIdRef.current = snapshotTPathId;
        lastKnownProgrammeTypeRef.current = snapshotProgrammeType;
        
        // IMMEDIATELY update all state from snapshot to show new T-path right away
        // Don't wait for the normal state update flow
        if (snapshot.profile) {
                    setUserProfile(snapshot.profile);
        }
        if (snapshot.activeTPath) {
          setActiveTPath(snapshot.activeTPath);
          setIsWaitingForTPathData(false); // We have fresh t-path data now
        } else {
          // If snapshot doesn't have activeTPath, we've confirmed there's no t-path
          // Clear the waiting flag so error can be shown if needed
          setIsWaitingForTPathData(false);
        }
        if (snapshot.tPathWorkouts) {
          setTpathWorkouts(snapshot.tPathWorkouts);
        }
        if (snapshot.weeklySummary) {
          setWeeklySummary(snapshot.weeklySummary);
        }
        if (snapshot.nextWorkout) {
          setNextWorkout(snapshot.nextWorkout);
        }
      }

      // Update state directly - React optimizes re-renders automatically
      // Removed expensive JSON.stringify comparisons that were causing jagginess
      setUserProfile(snapshot.profile);
      
      // Update T-path tracking refs when profile changes
      const newTPathId = snapshot.profile?.active_t_path_id || null;
      const newProgrammeType = snapshot.profile?.programme_type || null;
      if (newTPathId !== lastKnownTPathIdRef.current || newProgrammeType !== lastKnownProgrammeTypeRef.current) {
        if (__DEV__) {
          log.debug('[Dashboard] Profile updated - T-path tracking:', {
            oldTPathId: lastKnownTPathIdRef.current,
            newTPathId,
            oldProgrammeType: lastKnownProgrammeTypeRef.current,
            newProgrammeType
          });
        }
        lastKnownTPathIdRef.current = newTPathId;
        lastKnownProgrammeTypeRef.current = newProgrammeType;
      }
      
      // Deduplicate gyms by name - keep only one gym per unique name
      const uniqueGymsMap = new Map<string, Gym>();
      (snapshot.gyms || []).forEach((gym: Gym) => {
        const existing = uniqueGymsMap.get(gym.name);
        if (!existing) {
          uniqueGymsMap.set(gym.name, gym);
        } else if (gym.is_active && !existing.is_active) {
          uniqueGymsMap.set(gym.name, gym);
        }
      });
      setGyms(Array.from(uniqueGymsMap.values()));
      
      if (__DEV__) {
        log.debug('[Dashboard] Weekly summary updated from snapshot:', {
          completedWorkoutsCount: snapshot.weeklySummary.completed_workouts.length,
          totalSessions: snapshot.weeklySummary.total_sessions
        });
      }
      setWeeklySummary(snapshot.weeklySummary);
      setActiveGymState(snapshot.activeGym);
      
      if (__DEV__) {
        log.debug('[Dashboard] Active T-path updated from snapshot:', {
          id: snapshot.activeTPath?.id,
          name: snapshot.activeTPath?.template_name
        });
      }
      setActiveTPath(snapshot.activeTPath);
      setIsWaitingForTPathData(false); // Clear waiting flag when t-path is updated
      setTpathWorkouts(snapshot.tPathWorkouts);
      
      if (__DEV__) {
        log.debug('[Dashboard] Volume data updated from snapshot:', {
          dataPoints: snapshot.volumeHistory.length
        });
      }
      setVolumeData(snapshot.volumeHistory);
      setRecentWorkouts(snapshot.recentWorkouts);
      setNextWorkout(snapshot.nextWorkout);
      
      // Cache the data
      setDataCache({
        lastFetch: currentTimestamp,
        data: snapshot
      });
      
      // Sync local state with cached data from data context
      if (snapshot.profile && !userProfile) {
        if (__DEV__) {
          log.debug('[Dashboard] Syncing userProfile from cached data');
        }
        setUserProfile(snapshot.profile);
        
        // Initialize T-path tracking refs on first load
        if (lastKnownTPathIdRef.current === null) {
          lastKnownTPathIdRef.current = snapshot.profile?.active_t_path_id || null;
          lastKnownProgrammeTypeRef.current = snapshot.profile?.programme_type || null;
          if (__DEV__) {
            log.debug('[Dashboard] Initialized T-path tracking:', {
              tPathId: lastKnownTPathIdRef.current,
              programmeType: lastKnownProgrammeTypeRef.current
            });
          }
        }
      }

      // Update rolling workout status periodically when dashboard data is refreshed
      if (userId) {
        try {
          if (__DEV__) {
            log.debug('[Dashboard] Updating rolling workout status on dashboard refresh');
          }
          supabase?.functions.invoke('calculate-rolling-status', {
            body: { user_id: userId }
          }).then(({ data, error }) => {
            if (error) {
              log.error('[Dashboard] Error updating rolling workout status:', error);
            } else {
              if (__DEV__) {
                log.debug('[Dashboard] Rolling workout status updated successfully:', data);
              }
            }
          }).catch((error) => {
            log.error('[Dashboard] Failed to update rolling workout status:', error);
          });
        } catch (error) {
          log.error('[Dashboard] Failed to trigger rolling workout status update:', error);
        }
      }
    } catch (error) {
      log.error('[Dashboard] Failed to load data', error);
      setIsWaitingForTPathData(false); // Clear waiting flag on error
    } finally {
      setIsWaitingForTPathData(false); // Always clear waiting flag when fetch completes
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
        setInitialLoadComplete(true);
      }
    }
  }, [userId, isRefreshing, dataCache, isInitialLoad, shouldRefreshDashboard, lastWorkoutCompletionTime, userProfile, gyms, weeklySummary, activeGym, activeTPath, tpathWorkouts, volumeData, recentWorkouts, nextWorkout, getWorkoutSessions]);

  // Global refresh function that can be called from anywhere in the app
  const triggerDashboardRefresh = useCallback(() => {
    if (__DEV__) {
      log.debug('[Dashboard] Global triggerDashboardRefresh called');
    }
    
    // Check if refresh is already in progress
    if (refreshInProgressRef.current) {
      log.debug('[Dashboard] Refresh already in progress, skipping duplicate call');
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
        log.debug('[Dashboard] Dashboard refresh completed after trigger');
      }).catch((error) => {
        log.error('[Dashboard] Dashboard refresh failed:', error);
      }).finally(() => {
        // Release the mutex
        refreshInProgressRef.current = false;
        
        // Check if there's a pending refresh that was queued
        if (pendingRefreshRef.current) {
          log.debug('[Dashboard] Processing queued refresh after current one completed');
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
      if (__DEV__) {
        log.debug('[Dashboard] Global triggerDashboardRefresh INTERCEPTED at', new Date().toISOString());
      }
      return originalTrigger.apply(this, arguments);
    };
    
    return () => {
      (global as any).triggerDashboardRefresh = originalTrigger;
    };
  }, []);

  // Enhanced function to handle workout completion and cache invalidation
  const handleWorkoutCompletionRefresh = useCallback(async () => {
        log.debug('[Dashboard] Handling workout completion refresh');
    
    // Check if refresh is already in progress
    if (refreshInProgressRef.current) {
      log.debug('[Dashboard] Refresh already in progress, queueing workout completion refresh');
      pendingRefreshRef.current = true;
      return;
    }
    
    // Set flag to prevent concurrent refreshes
    refreshInProgressRef.current = true;
    
    // CRITICAL FIX: Clear temp message immediately when refresh starts
    // This prevents "Workout Complete!" from showing during refresh
    setTempStatusMessage(null);
    
    // CRITICAL FIX: Clear cache immediately to force fresh fetch
    setDataCache({ lastFetch: 0, data: null });
    setModalDataCache({});
    
    // CRITICAL FIX: Only invalidate caches, don't call handleWorkoutCompletion which sets status messages
    // handleWorkoutCompletion should only be called when a workout is actually completed, not on navigation refresh
    try {
      log.debug('[Dashboard] Calling invalidateAllCaches for cache invalidation (no status message)');
      // Use the data context's invalidateAllCaches function directly - this only clears caches
      invalidateAllCaches();
      log.debug('[Dashboard] Cache invalidation completed');
      
      // CRITICAL FIX: Call fetchDashboardData directly instead of via triggerCoordinatedRefresh
      // This ensures immediate refresh without delays
      setIsRefreshing(true);
            await fetchDashboardData();
            log.debug('[Dashboard] Workout completion refresh completed');
      setIsRefreshing(false);
      lastRefreshRef.current = Date.now();
      // CRITICAL FIX: Reset refresh flag AFTER data has been fetched and state updated
      setShouldRefreshDashboard(false);
    } catch (error) {
      log.error('[Dashboard] Error during workout completion refresh:', error);
      setIsRefreshing(false);
    } finally {
      // Release the mutex
      refreshInProgressRef.current = false;
      
      // Check if there's a pending refresh that was queued
      if (pendingRefreshRef.current) {
        log.debug('[Dashboard] Processing queued refresh after workout completion');
        pendingRefreshRef.current = false;
        // Trigger another refresh
        setTimeout(() => triggerDashboardRefresh(), 50);
      }
    }
  }, [invalidateAllCaches, fetchDashboardData, setTempStatusMessage, triggerDashboardRefresh]);

  useEffect(() => {
    if (!authLoading && !session && !AUTO_LOGIN_FOR_DEVELOPMENT) {
      log.debug('[Dashboard] No session, redirecting to login');
      router.replace('/login');
      return;
    }
  }, [session, authLoading, router]);

  // Initialize T-path tracking refs when profile is first loaded
  useEffect(() => {
    if (userProfile && lastKnownTPathIdRef.current === null) {
      lastKnownTPathIdRef.current = userProfile.active_t_path_id || null;
      lastKnownProgrammeTypeRef.current = userProfile.programme_type || null;
      log.debug('[Dashboard] Initialized T-path tracking from userProfile:', {
        tPathId: lastKnownTPathIdRef.current,
        programmeType: lastKnownProgrammeTypeRef.current
      });
    }
  }, [userProfile?.active_t_path_id, userProfile?.programme_type]);

  // Initial data load effect - only run once
  useEffect(() => {
    if (!authLoading && session && userId && !hasFetchedDataRef.current) {
      hasFetchedDataRef.current = true;
      fetchDashboardData();
    }
  }, [session, userId, authLoading, fetchDashboardData]);

  // Track loading state changes to detect when widgets finish loading
  // Preserve scroll position when loading finishes to prevent jarring scroll-to-top
  const prevLoadingState = useRef({ loading, isRefreshing, isWaitingForTPathData });
  const scrollPositionToRestore = useRef<number | null>(null);
  
  useEffect(() => {
    const wasLoading = prevLoadingState.current.loading || prevLoadingState.current.isRefreshing || prevLoadingState.current.isWaitingForTPathData;
    const isLoading = loading || isRefreshing || isWaitingForTPathData;
    
    // CRITICAL FIX: Save scroll position WHILE loading (before it finishes)
    // This prevents scroll reset when content size changes during loading transitions
    if (isLoading && currentScrollY.current > 50) {
      // Save scroll position proactively while loading is happening
      scrollPositionToRestore.current = currentScrollY.current;
    } else if (wasLoading && !isLoading) {
      // Loading just finished - ensure we have a saved position to restore
      // If we don't have one yet, use the current position (though it might already be reset)
      if (scrollPositionToRestore.current === null && currentScrollY.current > 50) {
        scrollPositionToRestore.current = currentScrollY.current;
      }
    }
    
    prevLoadingState.current = { loading, isRefreshing, isWaitingForTPathData };
  }, [loading, isRefreshing, isWaitingForTPathData]);
  
  // Use useLayoutEffect to restore scroll position immediately after render
  // This runs synchronously before paint, preventing visible scroll jump
  useLayoutEffect(() => {
    if (scrollPositionToRestore.current !== null && scrollPositionToRestore.current > 0) {
      // Restore immediately - useLayoutEffect runs before paint
      requestAnimationFrame(() => {
        if (scrollViewRef.current && scrollPositionToRestore.current !== null) {
          scrollViewRef.current.scrollTo({ y: scrollPositionToRestore.current, animated: false });
        }
        if (scrollViewRefSecondary.current && scrollPositionToRestore.current !== null) {
          scrollViewRefSecondary.current.scrollTo({ y: scrollPositionToRestore.current, animated: false });
        }
        // Clear the restore flag after restoring
        scrollPositionToRestore.current = null;
      });
    }
  });

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
        log.debug('[Dashboard] Profile loaded, resetting loading timeout');
        loadingStartTimeRef.current = 0;
      }
    }
  }, [session, authLoading, userId, userProfile?.onboarding_completed, router]);

  // Show sync box for exactly 2 seconds from when workout completes or sync starts
  // This ensures the box shows even if sync hasn't started yet
  useEffect(() => {
    const hasSyncActivity = isSyncing || queueLength > 0;
    const timeSinceCompletion = lastWorkoutCompletionTime > 0 ? Date.now() - lastWorkoutCompletionTime : Infinity;
    const recentWorkoutCompletion = timeSinceCompletion < 5000; // Within 5 seconds of completion (extended window)
    const timeSinceShow = syncBoxShownAtRef.current ? Date.now() - syncBoxShownAtRef.current : null;
    const isWithinTwoSecondWindow = timeSinceShow !== null && timeSinceShow < 2000;
        
    // Show sync box ONLY if workout just completed (not for other sync operations like deletions)
    // This ensures background syncs (like workout deletion) happen silently without showing the banner
    const shouldShowSyncBox = recentWorkoutCompletion && 
                               syncBoxShownAtRef.current === null && 
                               !syncBoxHiddenRef.current; // Don't re-show if already hidden
    
    if (shouldShowSyncBox) {
      // First time - show box and set timer (only once)
      const now = Date.now();
      syncBoxShownAtRef.current = now;
      tempMessageClearedRef.current = false;
      setShowSyncBox(true);
      
      // Mark that 2 seconds minimum duration has elapsed after this timeout
      // We'll clear temp message when sync is active (to prevent flickering)
      // The data-context has a 5-second auto-clear as a fallback if sync never starts
      tempMessageMinDurationElapsedRef.current = false;
      if (tempMessageClearTimeoutRef.current) {
        clearTimeout(tempMessageClearTimeoutRef.current);
      }
      tempMessageClearTimeoutRef.current = setTimeout(() => {
        tempMessageMinDurationElapsedRef.current = true;
        // Don't clear temp message here - let the effect below clear it when sync is active
        // This ensures smooth transition: "Workout Complete!" → "Syncing" (no flicker to normal status first)
        tempMessageClearTimeoutRef.current = null;
      }, 2000);
      
      // Hide sync box after exactly 2 seconds from first show
      if (syncBoxTimeoutRef.current) {
        clearTimeout(syncBoxTimeoutRef.current);
      }
      syncBoxTimeoutRef.current = setTimeout(() => {
        // Force hide the sync box after 2 seconds regardless of sync state
        setShowSyncBox(false);
        syncBoxHiddenRef.current = true; // Mark that we've hidden the sync box
        syncBoxTimeoutRef.current = null;
        log.debug('[Dashboard] Sync box hidden after 2 seconds', {
          isSyncing,
          queueLength,
          showSyncBox: 'will be false'
        });
      }, 2000);
    }
    
    // ENFORCEMENT: Always hide sync box after 2 seconds maximum, no exceptions
    if (showSyncBox && syncBoxShownAtRef.current !== null) {
      const timeSinceShow = Date.now() - syncBoxShownAtRef.current;
      if (timeSinceShow >= 2000) {
        // Force hide immediately if 2 seconds have passed
        log.debug('[Dashboard] ENFORCEMENT: Force hiding sync box after 2 seconds');
        setShowSyncBox(false);
        syncBoxHiddenRef.current = true;
        if (syncBoxTimeoutRef.current) {
          clearTimeout(syncBoxTimeoutRef.current);
          syncBoxTimeoutRef.current = null;
        }
        syncBoxShownAtRef.current = null; // Reset to allow future shows
      }
    }

    // Detect when sync completes (only reset if we're past the 2-second window)
    // Don't interfere with the 2-second hide timeout - let it run independently
    if (!hasSyncActivity && syncBoxShownAtRef.current !== null && !isWithinTwoSecondWindow && !syncCompletedTimeoutRef.current) {
      // Wait a bit to ensure sync has truly completed (debounce check)
      syncCompletedTimeoutRef.current = setTimeout(() => {
        // Re-check if sync is still inactive
        // Note: We can't access current isSyncing/queueLength here, but if hasSyncActivity was false,
        // and we're past the 2-second window, sync has likely completed
        // Reset everything except showSyncBox (which is controlled by its own timeout)
          // Sync truly completed - ensure temp message is cleared (should already be cleared after 2s)
          // But in case sync completed before 2s, make sure temp message is cleared
          if (!tempMessageClearedRef.current) {
            setTempStatusMessage(null);
            tempMessageClearedRef.current = true;
          }
          
          // Don't clear syncBoxTimeoutRef - let it finish its job
          if (tempMessageClearTimeoutRef.current) {
            clearTimeout(tempMessageClearTimeoutRef.current);
            tempMessageClearTimeoutRef.current = null;
          }
          syncBoxShownAtRef.current = null;
          syncBoxHiddenRef.current = false; // Reset for next workout
          tempMessageMinDurationElapsedRef.current = false; // Reset for next workout
          tempMessageClearedRef.current = false;
          syncCompletedTimeoutRef.current = null;
          // Don't set showSyncBox to false here - let the 2-second timeout handle it
          log.debug('[Dashboard] Sync completed - state reset (sync box will hide via its own timeout)');
      }, 500); // Wait 500ms to ensure sync is truly done
    } else if (hasSyncActivity && syncCompletedTimeoutRef.current) {
      // Sync restarted - cancel the completion check
      clearTimeout(syncCompletedTimeoutRef.current);
      syncCompletedTimeoutRef.current = null;
    }
    
    // Manage stable sync state and clear temp message when sync is active (after 2s minimum)
    // This ensures smooth transition: "Workout Complete!" (2s) → "Syncing" → normal status
    if (hasSyncActivity) {
      // Sync is active - set stable state immediately
      if (!stableIsSyncingRef.current) {
        stableIsSyncingRef.current = true;
        setStableIsSyncing(true);
        log.debug('[Dashboard] Sync activity detected - setting stable sync state');
      }
      // If 2 seconds have elapsed and temp message is still showing, clear it so "Syncing" can show
      // This prevents flickering by ensuring we transition directly from "Workout Complete!" to "Syncing"
      if (tempMessageMinDurationElapsedRef.current && !tempMessageClearedRef.current) {
                setTempStatusMessage(null);
        tempMessageClearedRef.current = true;
        if (__DEV__) {
          log.debug('[Dashboard] Clearing temp message after 2s minimum - showing "Syncing"');
        }
      }
      // Clear any inactive timeout
      if (stableSyncInactiveTimeoutRef.current) {
        clearTimeout(stableSyncInactiveTimeoutRef.current);
        stableSyncInactiveTimeoutRef.current = null;
      }
    } else if (stableIsSyncingRef.current && !stableSyncInactiveTimeoutRef.current) {
      // Sync became inactive - wait before clearing stable state to prevent flickering
      stableSyncInactiveTimeoutRef.current = setTimeout(() => {
        // Re-check if sync is still inactive
        const stillInactive = !isSyncing && queueLength === 0;
        if (stillInactive) {
                    stableIsSyncingRef.current = false;
          setStableIsSyncing(false);
        }
        stableSyncInactiveTimeoutRef.current = null;
      }, 2000); // CRITICAL FIX: Increased from 1s to 2s to prevent flickering
    }
    
    // Cleanup on unmount
    return () => {
      if (syncBoxTimeoutRef.current) {
        clearTimeout(syncBoxTimeoutRef.current);
        syncBoxTimeoutRef.current = null;
      }
      if (tempMessageClearTimeoutRef.current) {
        clearTimeout(tempMessageClearTimeoutRef.current);
        tempMessageClearTimeoutRef.current = null;
      }
      if (syncCompletedTimeoutRef.current) {
        clearTimeout(syncCompletedTimeoutRef.current);
        syncCompletedTimeoutRef.current = null;
      }
      if (stableSyncInactiveTimeoutRef.current) {
        clearTimeout(stableSyncInactiveTimeoutRef.current);
        stableSyncInactiveTimeoutRef.current = null;
      }
    };
  }, [isSyncing, queueLength, lastWorkoutCompletionTime, setTempStatusMessage]); // Removed showSyncBox from deps to prevent re-runs

  // Enhanced focus effect to handle both regular refresh and workout completion refresh
  useFocusEffect(
    useCallback(() => {
            // Reset scroll position to top only on initial focus (not when data loads)
      // This prevents jarring scroll when cards finish loading
            if (!hasScrolledToTopThisFocus.current) {
                if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
        if (scrollViewRefSecondary.current) {
          scrollViewRefSecondary.current.scrollTo({ y: 0, animated: false });
        }
        hasScrolledToTopThisFocus.current = true;
      } else {
              }
      
      // Check if we're returning from workout completion and trigger sync box if needed
      // But don't re-show if we've already hidden it - the main effect handles this now
      // This check is only needed if the main effect hasn't already shown the sync box
      
      async function fetchOnFocus() {
        if (userProfile?.onboarding_completed && initialLoadComplete) {
          const now = Date.now();

          // Enhanced check for forced refresh - includes empty state detection
          const timeSinceLastDeletion = now - lastDeletionTimeRef.current;
          
          // CRITICAL: Fetch fresh profile data to check for T-path changes
          // Don't rely on userProfile state which might be stale
          let freshTPathId: string | null = null;
          let freshProgrammeType: string | null = null;
          if (userId && supabase) {
            try {
              const { data: freshProfile } = await supabase
                .from('profiles')
                .select('active_t_path_id, programme_type')
                .eq('id', userId)
                .maybeSingle();
              
              if (freshProfile) {
                freshTPathId = freshProfile.active_t_path_id || null;
                freshProgrammeType = freshProfile.programme_type || null;
              }
            } catch (error) {
              log.error('[Dashboard] Error fetching fresh profile for T-path check:', error);
            }
          }
          
          // Check if T-path changed by comparing fresh data with last known values
          const tPathChanged = freshTPathId !== null && freshTPathId !== lastKnownTPathIdRef.current;
          const programmeTypeChanged = freshProgrammeType !== null && freshProgrammeType !== lastKnownProgrammeTypeRef.current;
          const tPathOrTypeChanged = tPathChanged || programmeTypeChanged;
          
          const shouldForceRefresh = shouldRefreshDashboard ||
                                   tPathOrTypeChanged || // CRITICAL: Detect T-path changes directly from fresh data
                                   recentWorkouts.length === 0 || // Handle empty state after deletion
                                   (dataCache.data === null) || // Handle cache cleared state
                                   timeSinceLastDeletion < 10000; // Handle recent deletion (10 second window)

          // Check time since last workout completion (5 minutes window)
          const timeSinceLastCompletion = lastWorkoutCompletionTime > 0 ? now - lastWorkoutCompletionTime : Infinity;
          const recentWorkoutCompletion = timeSinceLastCompletion < 10 * 60 * 1000; // CRITICAL FIX: Extended to 10 minutes to catch delayed navigation
          
          // Update refs if T-path changed
          if (tPathOrTypeChanged && freshTPathId) {
            if (__DEV__) {
              log.debug('[Dashboard] Focus effect - T-path change detected from fresh profile, immediately clearing state:', {
                oldTPathId: lastKnownTPathIdRef.current,
                newTPathId: freshTPathId,
                oldProgrammeType: lastKnownProgrammeTypeRef.current,
                newProgrammeType: freshProgrammeType
              });
            }
            lastKnownTPathIdRef.current = freshTPathId;
            lastKnownProgrammeTypeRef.current = freshProgrammeType;
            // CRITICAL: Clear state immediately to prevent showing old T-path data
            // This ensures UI doesn't render stale data while fetching new snapshot
            setActiveTPath(null);
            setTpathWorkouts([]);
            setDataCache({ lastFetch: 0, data: null });
            setModalDataCache({});
          }
          
          // CRITICAL FIX: Always fetch fresh count if recent workout completion detected
          let freshRecentWorkoutsCount = recentWorkouts.length;
          if (recentWorkoutCompletion && userId) {
            try {
              const freshSessions = await getWorkoutSessions(userId);
              freshRecentWorkoutsCount = freshSessions.length;
              // Calculate timeSinceCompletion for logging
              const timeSinceCompletion = lastWorkoutCompletionTime > 0 ? now - lastWorkoutCompletionTime : Infinity;
                            log.debug('[Dashboard] Fresh recentWorkouts count from DB:', freshRecentWorkoutsCount, 'old count:', recentWorkouts.length);
            } catch (error) {
              log.error('[Dashboard] Failed to fetch fresh workouts count:', error);
            }
          }

          if (__DEV__) {
            log.debug('[Dashboard] Focus effect refresh check:', {
              shouldForceRefresh,
              recentWorkoutCompletion,
              tPathOrTypeChanged,
              tPathChanged,
              programmeTypeChanged,
              freshTPathId,
              lastKnownTPathId: lastKnownTPathIdRef.current,
              freshProgrammeType,
              lastKnownProgrammeType: lastKnownProgrammeTypeRef.current,
              hasDataCache: !!dataCache.data,
              recentWorkoutsCount: freshRecentWorkoutsCount,
              isRefreshing,
              timeSinceLastDeletion: now - lastDeletionTimeRef.current,
              lastDeletionTime: lastDeletionTimeRef.current
            });
          }

          // Prevent infinite loops by checking if we're already refreshing
          // Also check the mutex to prevent race conditions
          if ((shouldForceRefresh || recentWorkoutCompletion) && !isRefreshing && !refreshInProgressRef.current) {
            // For T-path changes (shouldRefreshDashboard or tPathOrTypeChanged), bypass the 2-second minimum to refresh immediately
            const timeSinceLastRefresh = now - lastRefreshRef.current;
            const isTPathChange = (shouldRefreshDashboard || tPathOrTypeChanged) && !recentWorkoutCompletion;
            const canRefresh = isTPathChange || timeSinceLastRefresh > 2000; // Immediate for T-path changes, 2s for others
            
            if (canRefresh) {
              if (__DEV__) {
                log.debug('[Dashboard] Focus effect triggering refresh due to:', {
                  shouldForceRefresh,
                  recentWorkoutCompletion,
                  isTPathChange,
                  tPathOrTypeChanged,
                  hasDataCache: !!dataCache.data,
                  recentWorkoutsCount: freshRecentWorkoutsCount
                });
              }
              
              // If this is a T-path change, immediately clear cache and force refresh
              if (isTPathChange || tPathOrTypeChanged) {
                if (__DEV__) {
                  log.debug('[Dashboard] T-path change detected, immediately clearing cache and refreshing');
                }
                setDataCache({ lastFetch: 0, data: null });
                setModalDataCache({});
              }
              
              // If this is a recent workout completion, use the enhanced refresh function
              if (recentWorkoutCompletion) {
                                log.debug('[Dashboard] Recent workout completion detected, using enhanced refresh');
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
        log.error('[Dashboard] Error in fetchOnFocus:', error);
      });
      
      // Cleanup: Reset scroll flag when screen loses focus
      // This ensures we scroll to top again when user returns to the tab
      return () => {
                hasScrolledToTopThisFocus.current = false;
      };
    }, [userProfile?.onboarding_completed, initialLoadComplete, isRefreshing, fetchDashboardData, shouldRefreshDashboard, setShouldRefreshDashboard, lastWorkoutCompletionTime, dataCache.data, recentWorkouts.length, lastDeletionTimeRef.current, handleWorkoutCompletionRefresh, getWorkoutSessions, userId])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Force clear any cached data and refresh using the data context
      log.debug('[Dashboard] Manual refresh triggered - forcing data context refresh');
      forceRefreshProfile();
       
      // Small delay to let the cache clear, then fetch fresh data
      setTimeout(() => {
        fetchDashboardData();
        log.debug('[Dashboard] Refresh completed');
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
          log.error('[Dashboard] Supabase client not available');
          return null;
        }
        
        // Check if user is authenticated
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError) {
          log.error('[Dashboard] Auth error:', authError);
          return null;
        }
        if (!session) {
          log.error('[Dashboard] No active session found');
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
          log.error('[Dashboard] Error fetching historical workouts:', error);
          return null;
        }

        if (!sessions) {
          return null;
        }
        
        // Additional validation
        if (!Array.isArray(sessions)) {
          log.error('[Dashboard] Invalid sessions data type:', typeof sessions);
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
        log.error('[Dashboard] Error getting historical workout:', error);
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
      log.debug('[Dashboard] Clearing weekly volume cache');
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
          log.error('[Dashboard] Supabase client not available');
          return {};
        }
        
        const { data: { session: authSession }, error: authError } = await supabase.auth.getSession();
        if (authError || !authSession) {
          log.error('[Dashboard] Not authenticated, cannot fetch weekly volume');
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
          log.error('[Dashboard] Error fetching weekly volume data:', error);
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
          log.error('[Dashboard] Error fetching exercise definitions:', exError);
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
        log.error('[Dashboard] Error getting weekly volume data:', error);
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
        log.error('[Dashboard] Error fetching muscle groups:', error);
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
        log.debug('[Dashboard] Using cached next workout suggestion');
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
          log.error('[Dashboard] Error fetching T-path workouts:', error);
          return null;
        }

        if (!childWorkouts) {
          return null;
        }
        
        // Additional validation
        if (!Array.isArray(childWorkouts)) {
          log.error('[Dashboard] Invalid childWorkouts data type:', typeof childWorkouts);
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
        log.error('[Dashboard] Error getting next workout suggestion:', error);
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
        log.debug('[Dashboard] handleViewSummary called with sessionId:', sessionId);
    
    // CRITICAL: Prevent modal from opening if we just completed a workout (within last 2 seconds)
    // This prevents the modal from reappearing after user closes it
    const timeSinceCompletion = lastWorkoutCompletionTime > 0 ? Date.now() - lastWorkoutCompletionTime : Infinity;
    const justCompletedWorkout = timeSinceCompletion < 2000; // 2 second window
    
    if (justCompletedWorkout && sessionId && userId) {
      // Check if this is the most recent workout session
      try {
        const sessions = await getWorkoutSessions(userId);
        const mostRecentSession = sessions
          .filter(s => s.completed_at)
          .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];
        
        if (mostRecentSession && mostRecentSession.id === sessionId) {
          log.debug('[Dashboard] Blocking modal open - just completed this workout, preventing auto-open');
                    return;
        }
      } catch (error) {
        log.error('[Dashboard] Error checking recent session:', error);
        // Continue with normal flow if check fails
      }
    }
    
    // Prevent duplicate modal openings for the same session
    if (workoutSummaryModalVisible && selectedSessionData?.sessionId === sessionId) {
      log.debug('[Dashboard] Modal already open for this session, ignoring duplicate call');
      return;
    }
    
    if (!userId) {
      log.debug('[Dashboard] No userId, returning');
      return;
    }

    try {
      log.debug('[Dashboard] Loading session data for sessionId:', sessionId);
      
      // Use direct database lookup to ensure we get the session data regardless of cache state
      const foundSession = await database.getWorkoutSessionById(sessionId);
      log.debug('[Dashboard] Found session via direct lookup:', !!foundSession);
      
      if (!foundSession) {
        log.debug('[Dashboard] Session not found via direct lookup, showing error');
        Alert.alert('Error', 'Workout session not found. Please try again.');
        return;
      }

      if (foundSession) {
        // Debug: Log the found session data including rating
        log.debug('[Dashboard] Found session data:', {
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
            log.error('[Dashboard] Failed to load exercise definitions from Supabase:', error);
          } else {
            exerciseDefinitions = data || [];
            log.debug('[Dashboard] Loaded exercise definitions from Supabase:', exerciseDefinitions.length);
          }
        } catch (error) {
          log.error('[Dashboard] Failed to load exercise definitions:', error);
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
          log.debug('[Dashboard] Using cached modal data');
          historicalWorkout = cachedModalData.historicalWorkout;
          weeklyVolumeData = cachedModalData.weeklyVolumeData;
          nextWorkoutSuggestion = cachedModalData.nextWorkoutSuggestion;
          isOnTPath = cachedModalData.isOnTPath;
          allAvailableMuscleGroups = cachedModalData.allAvailableMuscleGroups || allAvailableMuscleGroups;
        } else {
          // Fetch data and cache it
          log.debug('[Dashboard] Fetching advanced modal data...');
          
          // First, verify Supabase is working
          try {
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            log.debug('[Dashboard] Supabase auth check:', { hasSession: !!session, authError });
            
            if (authError) {
              log.error('[Dashboard] Auth error:', authError);
              return;
            }
            if (!session) {
              log.error('[Dashboard] No active session found');
              return;
            }
          } catch (authCheckError) {
            log.error('[Dashboard] Auth check failed:', authCheckError);
            return;
          }
          
          log.debug('[Dashboard] Starting data fetch calls...');
          
          // Call each function individually to see which one fails
          log.debug('[Dashboard] Calling getHistoricalWorkout...');
          historicalWorkout = await getHistoricalWorkout(foundSession.template_name || 'Workout');
          log.debug('[Dashboard] getHistoricalWorkout result:', !!historicalWorkout);
          
          log.debug('[Dashboard] Calling getWeeklyVolumeData...');
          weeklyVolumeData = await getWeeklyVolumeData();
          log.debug('[Dashboard] getWeeklyVolumeData result:', Object.keys(weeklyVolumeData || {}));
          
          log.debug('[Dashboard] Calling getNextWorkoutSuggestion...');
          nextWorkoutSuggestion = await getNextWorkoutSuggestion(foundSession.template_name || 'Workout');
          log.debug('[Dashboard] getNextWorkoutSuggestion result:', !!nextWorkoutSuggestion);
          
          log.debug('[Dashboard] Calling checkIfOnTPath...');
          isOnTPath = await checkIfOnTPath();
          log.debug('[Dashboard] checkIfOnTPath result:', isOnTPath);
          
          log.debug('[Dashboard] Calling getAvailableMuscleGroups...');
          allAvailableMuscleGroups = await getAvailableMuscleGroups();
          log.debug('[Dashboard] getAvailableMuscleGroups result:', allAvailableMuscleGroups);
          
          log.debug('[Dashboard] Data fetch completed, results:', {
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
        log.debug('[Dashboard] Setting modal data with:', {
          exercisesCount: exercises.length,
          workoutName: foundSession.template_name || 'Workout',
          historicalWorkout: !!historicalWorkout,
          weeklyVolumeData: Object.keys(weeklyVolumeData || {}),
          nextWorkoutSuggestion: !!nextWorkoutSuggestion,
          isOnTPath,
        });

        // Debug: Log what we're about to set
        log.debug('[Dashboard] About to set session data:', {
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

        log.debug('[Dashboard] Session data set successfully');

        // CRITICAL FIX: Prevent auto-opening modal if we just completed a workout
        // Check if this session was just completed (within last 3 seconds)
        const timeSinceCompletion = lastWorkoutCompletionTime > 0 ? Date.now() - lastWorkoutCompletionTime : Infinity;
        const justCompletedWorkout = timeSinceCompletion < 3000; // 3 second window
        
        if (justCompletedWorkout && foundSession.id === sessionId) {
          // Check if this is the most recent workout
          try {
            const sessions = await getWorkoutSessions(userId);
            const mostRecentSession = sessions
              .filter(s => s.completed_at)
              .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];
            
            if (mostRecentSession && mostRecentSession.id === sessionId) {
              log.debug('[Dashboard] Blocking auto-open of modal - user just closed summary modal for this workout');
                            return; // Don't open the modal
            }
          } catch (error) {
            log.error('[Dashboard] Error checking recent session:', error);
            // Continue with normal flow if check fails
          }
        }
        
        // CRITICAL FIX: Only set modal data if we have exercises to prevent empty modal
        if (!exercises || exercises.length === 0) {
          log.debug('[Dashboard] No exercises found, not opening modal');
          return;
        }
        
        log.debug('[Dashboard] Setting modal visible to true');
        setWorkoutSummaryModalVisible(true);
      } else {
        log.debug('[Dashboard] No session found, not opening modal');
      }
    } catch (error) {
      log.error('Failed to load workout summary:', error);
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
      
      // Show confirmation dialog
      setWorkoutToDelete({ sessionId, templateName });
      setDeleteDialogVisible(true);
    },
    [deletionInProgress]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!workoutToDelete || deletionInProgress) return;
    
    const { sessionId, templateName } = workoutToDelete;
    setDeleteDialogVisible(false);
    setDeletionInProgress(sessionId);
    
    try {
      log.debug('[Dashboard] Starting atomic workout deletion:', sessionId);
        
      // Step 1: Remove from local state immediately for instant UI feedback
      const deletedWorkoutDate = getWorkoutDate(sessionId);
      const deletedWorkout = recentWorkouts.find(w => w.id === sessionId);
      const wasCompleted = deletedWorkout?.completed_at !== null;
      
      log.debug('[Dashboard] DEBUG: Deletion date comparison:', {
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
      
      log.debug('[Dashboard] DEBUG: Normalized date comparison:', {
        originalDate: deletedWorkoutDate,
        normalizedDate: normalizedDeletedDate,
        volumeDataNormalized: volumeData.map(v => ({ date: normalizeDate(v.date), volume: v.volume })),
      });
      
      setRecentWorkouts(prev => prev.filter(workout => workout.id !== sessionId));

      // Clear volume data to force recalculation after deletion
      // This ensures correct volume totals if multiple workouts occurred on the same day
      setVolumeData([]);
      log.debug('[Dashboard] Cleared volume data for recalculation after deletion:', {
        deletedWorkoutId: sessionId,
        deletedDate: normalizedDeletedDate
      });
      
      // CRITICAL FIX: Also update weeklySummary immediately to prevent stale widget data
      setWeeklySummary(prev => {
        const newCompletedWorkouts = prev.completed_workouts.filter(w => w.sessionId !== sessionId);
        const newTotalSessions = wasCompleted ? Math.max(0, prev.total_sessions - 1) : prev.total_sessions;
        log.debug('[Dashboard] Immediate weeklySummary update:', {
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
      log.debug('[Dashboard] Workout session deleted from database');
      
      // Step 3: Wait for database operations to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 4: Enhanced cache invalidation for deletion scenarios
      log.debug('[Dashboard] Starting enhanced cache invalidation for deletion');
      
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
        log.debug('[Dashboard] Clearing weekly volume cache after deletion');
        (global as any).clearWeeklyVolumeCache();
      }
      
      // NOTE: Do NOT call setLastWorkoutCompletionTime or handleWorkoutCompletion here
      // Those are only for workout completions and will trigger the sync banner to show
      // Deletions should sync silently in the background
      
      // Step 5: Trigger immediate dashboard refresh with forced cache bypass
      log.debug('[Dashboard] Triggering immediate dashboard refresh after deletion');
      
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
          
          log.debug('[Dashboard] Calling fetchDashboardData after deletion, current volumeData:', volumeData.length);
          await fetchDashboardData();
          log.debug('[Dashboard] Dashboard refresh completed after deletion, new volumeData:', volumeData.length);
          
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
            
            log.debug('[Dashboard] Post-refresh session count verification:', {
              totalSessions: updatedSessions.length,
              weeklySessions: newWeeklyCount,
              expectedWidgetCount: newWeeklyCount
            });
          }
          
          // Show success feedback
          setSuccessMessage('Workout deleted successfully');
          setSuccessDialogVisible(true);
        } catch (error) {
          log.error('[Dashboard] Dashboard refresh failed after deletion:', error);
          Alert.alert('Error', 'Workout deleted but dashboard refresh failed');
        }
      }, 100); // Short delay to ensure all caches are cleared
      
      log.debug('[Dashboard] Workout deletion process initiated successfully');
      
    } catch (error) {
      log.error('[Dashboard] Failed to delete workout session:', error);
      Alert.alert('Error', 'Failed to delete workout session');
    } finally {
      setDeletionInProgress(null);
      setWorkoutToDelete(null);
    }
  },
  [workoutToDelete, deletionInProgress, deleteWorkoutSession, getWorkoutDate, recentWorkouts, volumeData, setDataCache, setShouldRefreshDashboard, setModalDataCache, fetchDashboardData, userId, getWorkoutSessions]
  );

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogVisible(false);
    setWorkoutToDelete(null);
  }, []);

  // Handle session rating updates and refresh dashboard
  const handleSessionRatingUpdate = useCallback(async (sessionId: string, rating: number) => {
    try {
      log.debug('[Dashboard] Updating session rating:', sessionId, rating);
      
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
        log.error('[Dashboard] Failed to check session existence in Supabase:', checkError);
        // Don't show error to user since local update succeeded, but log it for debugging
      } else if (sessionData) {
        // Session exists in Supabase, update the rating
        const { data, error: supabaseError } = await supabase
          .from('workout_sessions')
          .update({ rating: rating })
          .eq('id', sessionId)
          .select();
        
        if (supabaseError) {
          log.error('[Dashboard] Failed to update rating in Supabase:', supabaseError);
        } else {
          log.debug('[Dashboard] Successfully updated rating in Supabase:', data);
        }
      } else {
        log.debug('[Dashboard] Session not yet synced to Supabase, rating will be synced later');
      }
      
      // Force refresh the dashboard data to update the cache
      await fetchDashboardData();
      
      log.debug('[Dashboard] Session rating updated and dashboard refreshed');
    } catch (error) {
      log.error('[Dashboard] Failed to update session rating:', error);
      Alert.alert('Error', 'Failed to update workout rating');
    }
  }, [fetchDashboardData]);

  // Helper function to render dashboard with cached data when loading is stuck
  const renderDashboardWithData = useCallback((cachedData: any) => {
    log.debug('[Dashboard] Rendering with cached data due to stuck loading');
    
    return (
      <>
        <View style={styles.container}>
          <BackgroundRoot />
          <ScrollView
            key="dashboard-scrollview-primary"
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onScroll={(event) => {
              const scrollY = event.nativeEvent.contentOffset.y;
              // Always update current scroll position (no threshold check)
              currentScrollY.current = scrollY;
              
              // CRITICAL FIX: Only clear restore flag if we're not loading
              // During loading, we want to preserve the scroll position for restoration
              const isLoading = loading || isRefreshing || isWaitingForTPathData;
              if (!isLoading && scrollPositionToRestore.current !== null) {
                // Only clear if user manually scrolls after loading is complete
                scrollPositionToRestore.current = null;
              }
              
              // Save scroll position while loading to restore later
              if (isLoading && scrollY > 50) {
                scrollPositionToRestore.current = scrollY;
              }
            }}
            onContentSizeChange={(contentWidth, contentHeight) => {
              // CRITICAL FIX: Save current scroll position BEFORE content size changes
              // This prevents scroll-to-top when NextWorkoutCard finishes loading while user is scrolling
              const currentScrollYValue = currentScrollY.current;
              const isLoading = loading || isRefreshing || isWaitingForTPathData;
              
              // If user has scrolled and we don't have a saved position, save the current one now
              // This handles the case where NextWorkoutCard finishes loading while user is scrolling
              if (currentScrollYValue > 50 && scrollPositionToRestore.current === null) {
                scrollPositionToRestore.current = currentScrollYValue;
              }
              
              // Restore scroll position whenever content size changes if we have a saved position
              if (scrollPositionToRestore.current !== null && scrollPositionToRestore.current > 0) {
                // Restore scroll position immediately when content size changes
                // This prevents jarring scroll-to-top when loading spinners finish
                requestAnimationFrame(() => {
                  if (scrollViewRef.current && scrollPositionToRestore.current !== null) {
                    scrollViewRef.current.scrollTo({ 
                      y: scrollPositionToRestore.current, 
                      animated: false 
                    });
                  }
                });
              }
              previousContentHeight.current = contentHeight;
            }}
            scrollEventThrottle={16}
          >
            {/* Use cached data for all widgets */}
            <View>
              <WelcomeHeader
                userName={userName}
                accountCreatedAt={accountCreatedAt}
              />
            </View>

            {/* Only show sync banner when offline or during 2-second sync box display */}
            {/* ENFORCEMENT: Only show sync box if explicitly set to true AND not hidden by ref */}
            {(!isOnline || (showSyncBox && !syncBoxHiddenRef.current)) && (
              <View>
                <SyncStatusBanner
                  isOnline={isOnline}
                  isSyncing={isSyncing || (showSyncBox && !syncBoxHiddenRef.current)}
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

            {/* Gym Toggle - COMMENTED OUT: Keeping logic for potential future dashboard filtering by gym
                Currently gym switching is available on the workout page where it's contextually relevant.
                Uncomment when implementing dashboard data filtering by active gym.
            {cachedData.gyms?.length > 1 && (
              <View>
                <GymToggle
                  gyms={cachedData.gyms || []}
                  activeGym={cachedData.activeGym}
                  onGymChange={async (gymId: string, newActiveGym: Gym | null) => {
                    log.debug('[Dashboard] onGymChange called with:', gymId, newActiveGym?.name);
                    if (userId) {
                      log.debug('[Dashboard] Updating active gym state...');
                      setActiveGymState(newActiveGym);
                      
                      // Update gyms array to reflect the new active gym
                      setGyms(prev => prev.map(g => ({
                        ...g,
                        is_active: g.id === gymId
                      })));
                      
                    log.debug('[Dashboard] Setting active gym in database...');
                    await setActiveGym(userId, gymId);
                    log.debug('[Dashboard] Active gym set in database');
                    
                    // Update cached data AFTER database update to ensure consistency
                    setDataCache(prev => {
                      if (prev.data) {
                        return {
                          ...prev,
                          data: {
                            ...prev.data,
                            activeGym: newActiveGym,
                            gyms: (prev.data.gyms || []).map((g: Gym) => ({
                              ...g,
                              is_active: g.id === gymId
                            }))
                          }
                        };
                      }
                      return prev;
                    });
                    
                    // Don't trigger immediate refresh - let the natural sync happen
                    // The state is already updated above, so UI will reflect the change immediately
                    // The next natural refresh will sync with Supabase
                    }
                  }}
                />
              </View>
            )}
            */}

            <View>
              <NextWorkoutCard
                workoutId={cachedData.nextWorkout?.id}
                workoutName={cachedData.nextWorkout?.template_name}
                estimatedDuration={
                  cachedData.profile?.preferred_session_length || '45 minutes'
                }
                loading={isRefreshing || isWaitingForTPathData}
                noActiveGym={!cachedData.activeGym}
                noActiveTPath={!cachedData.activeTPath && !isWaitingForTPathData}
                recommendationReason={(cachedData.nextWorkout as any)?.recommendationReason}
              />
            </View>

            <View>
              <AllWorkoutsQuickStart
                programName={cachedData.activeTPath?.template_name}
                workouts={cachedData.tPathWorkouts || []}
                loading={loading || isRefreshing}
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
                  gym_name: workout.gym_name ?? undefined,
                }))}
                onViewSummary={handleViewSummary}
                onDelete={handleDeleteWorkout}
                loading={false}
              />
            </View>

          </ScrollView>
        </View>

        {/* Modals */}
        <WorkoutSummaryModal
          visible={workoutSummaryModalVisible && selectedSessionData && selectedSessionData.exercises && selectedSessionData.exercises.length > 0}
          onClose={() => {
            setWorkoutSummaryModalVisible(false);
            // CRITICAL FIX: Clear selected session data to prevent modal from reappearing
            setSelectedSessionData(null);
          }}
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
            // CRITICAL FIX: Clear selected session data
            setSelectedSessionData(null);
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
      // Loading time tracking removed - too verbose
    }
    
    const loadingDuration = loadingStartTimeRef.current > 0 ? Date.now() - loadingStartTimeRef.current : 0;
    const hasLoadingTimeout = loadingDuration > LOADING_TIMEOUT;
    
    // Loading state logging removed - too verbose
    
    // Force render with cached data if:
    // 1. We're still loading but have cached data, OR
    // 2. We've been loading for too long (timeout)
    if ((loading && dataCache.data) || hasLoadingTimeout) {
      if (__DEV__) {
        log.debug('[Dashboard] Forcing render with cached data:', {
          hasCachedData: !!dataCache.data,
          loadingTimeout: hasLoadingTimeout,
          loadingDuration
        });
      }
      
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
    if (__DEV__) {
      log.debug('[Dashboard] User needs onboarding, redirecting...');
    }
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
          key="dashboard-scrollview-secondary"
          ref={scrollViewRefSecondary}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScroll={(event) => {
            const scrollY = event.nativeEvent.contentOffset.y;
            // Always update current scroll position (no threshold check)
            currentScrollY.current = scrollY;
            
            // CRITICAL FIX: Only clear restore flag if we're not loading
            // During loading, we want to preserve the scroll position for restoration
            const isLoading = loading || isRefreshing || isWaitingForTPathData;
            if (!isLoading && scrollPositionToRestore.current !== null) {
              // Only clear if user manually scrolls after loading is complete
              scrollPositionToRestore.current = null;
            }
            
            // Save scroll position while loading to restore later
            if (isLoading && scrollY > 50) {
              scrollPositionToRestore.current = scrollY;
            }
          }}
          onContentSizeChange={(contentWidth, contentHeight) => {
            // CRITICAL FIX: Save current scroll position BEFORE content size changes
            // This prevents scroll-to-top when NextWorkoutCard finishes loading while user is scrolling
            const currentScrollYValue = currentScrollY.current;
            const isLoading = loading || isRefreshing || isWaitingForTPathData;
            
            // If user has scrolled and we don't have a saved position, save the current one now
            // This handles the case where NextWorkoutCard finishes loading while user is scrolling
            if (currentScrollYValue > 50 && scrollPositionToRestore.current === null) {
              scrollPositionToRestore.current = currentScrollYValue;
            }
            
            // Restore scroll position whenever content size changes if we have a saved position
            if (scrollPositionToRestore.current !== null && scrollPositionToRestore.current > 0) {
              // Restore scroll position immediately when content size changes
              // This prevents jarring scroll-to-top when loading spinners finish
              requestAnimationFrame(() => {
                if (scrollViewRefSecondary.current && scrollPositionToRestore.current !== null) {
                  scrollViewRefSecondary.current.scrollTo({ 
                    y: scrollPositionToRestore.current, 
                    animated: false 
                  });
                }
              });
            }
            previousContentHeight.current = contentHeight;
          }}
          scrollEventThrottle={16}
        >

          {/* 1. Welcome Header */}
          <View>
            <WelcomeHeader
              userName={userName}
              accountCreatedAt={accountCreatedAt}
            />
          </View>

          {/* Sync Status Banner - only show when offline or during 2-second sync box display */}
          {/* ENFORCEMENT: Only show sync box if explicitly set to true AND not hidden by ref */}
          {(!isOnline || (showSyncBox && !syncBoxHiddenRef.current)) && (
            <View>
              <SyncStatusBanner
                isOnline={isOnline}
                isSyncing={isSyncing || (showSyncBox && !syncBoxHiddenRef.current)}
                queueLength={queueLength}
                onManualSync={() => {
                  // Trigger manual sync by refreshing data
                  onRefresh();
                }}
              />
            </View>
          )}

          {/* 2. Weekly Target */}
          {/* CRITICAL FIX: Use stable key based on actual data, not timestamp */}
          <View key={`weekly-target-${weeklySummary.completed_workouts.map(w => w.id).join('-')}-${weeklySummary.total_sessions}`}>
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

          {/* 4. Gym Toggle (only show if 2+ gyms) - COMMENTED OUT: Keeping logic for potential future dashboard filtering by gym
              Currently gym switching is available on the workout page where it's contextually relevant.
              Uncomment when implementing dashboard data filtering by active gym.
          {(() => {
                        return null;
          })()}
          {gyms.length > 1 && (
            <View>
              <GymToggle
                gyms={gyms}
                activeGym={activeGym}
                onGymChange={async (gymId: string, newActiveGym: Gym | null) => {
                  log.debug('[Dashboard] onGymChange called with:', gymId, newActiveGym?.name);
                  if (userId) {
                    log.debug('[Dashboard] Updating active gym state...');
                    // Update dashboard state immediately for UI consistency
                    setActiveGymState(newActiveGym);
                    
                    // Update gyms array to reflect the new active gym
                    setGyms(prev => prev.map(g => ({
                      ...g,
                      is_active: g.id === gymId
                    })));

                    // Update the database
                    log.debug('[Dashboard] Setting active gym in database...');
                    await setActiveGym(userId, gymId);
                    log.debug('[Dashboard] Active gym set in database');
                    
                    // Don't trigger immediate refresh - state is already updated above
                    // The next natural refresh will sync with Supabase
                  }
                }}
              />
            </View>
          )}
          */}

          {/* 5. Next Workout Card */}
          <View>
            <NextWorkoutCard
              workoutId={nextWorkout?.id}
              workoutName={nextWorkout?.template_name}
              estimatedDuration={
                userProfile?.preferred_session_length || '45 minutes'
              }
              loading={loading || isRefreshing || isWaitingForTPathData}
              noActiveGym={!activeGym}
              noActiveTPath={!activeTPath && !isWaitingForTPathData}
              recommendationReason={(nextWorkout as any)?.recommendationReason}
            />
          </View>

          {/* 6. All Workouts Quick Start */}
          <View>
            <AllWorkoutsQuickStart
              programName={activeTPath?.template_name}
              workouts={tpathWorkouts}
              loading={loading || isRefreshing}
            />
          </View>

          {/* 7. Weekly Volume Chart */}
          {/* CRITICAL FIX: Use stable key based on actual data, not timestamp */}
          <View key={`volume-chart-${volumeData.map(v => `${v.date}-${v.volume}`).join('-')}`}>
            <SimpleVolumeChart data={volumeData} />
          </View>

          {/* 8. Previous Workouts */}
          {/* CRITICAL FIX: Use stable key based on actual data, not timestamp */}
          <View key={`previous-workouts-${recentWorkouts.map(w => w.id).join('-')}`}>
            <PreviousWorkoutsWidget
              workouts={recentWorkouts.map(workout => ({
                id: workout.id,
                sessionId: workout.id,
                template_name: workout.template_name || 'Ad Hoc Workout',
                completed_at: workout.completed_at || workout.session_date,
                exercise_count: workout.exercise_count,
                duration_string: workout.duration_string ?? undefined,
                gym_name: workout.gym_name ?? undefined,
              }))}
              onViewSummary={handleViewSummary}
              onDelete={handleDeleteWorkout}
              loading={loading || deletionInProgress !== null}
            />
          </View>

        </ScrollView>
      </View>

      {/* Workout Summary Modal */}
      <WorkoutSummaryModal
        visible={workoutSummaryModalVisible && selectedSessionData && selectedSessionData.exercises && selectedSessionData.exercises.length > 0}
        onClose={() => {
                    setWorkoutSummaryModalVisible(false);
          // CRITICAL FIX: Clear selected session data to prevent modal from reappearing
          setSelectedSessionData(null);
        }}
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
            log.debug('[Dashboard] Saving workout rating:', rating);
            
            // Use the new refresh function
            await handleSessionRatingUpdate(selectedSessionData.sessionId, rating);
            
            log.debug('[Dashboard] Workout rating saved successfully');
          } catch (error) {
            log.error('[Dashboard] Failed to save workout rating:', error);
            Alert.alert('Error', 'Failed to save workout rating');
          }
        }}
      />

      {/* Activity Logging Modal */}
      <ActivityLoggingModal
        visible={activityModalVisible}
        onClose={() => setActivityModalVisible(false)}
        setTempStatusMessage={setTempStatusMessage}
        onLogActivity={async () => {
          // ActivityLoggingModal handles the database insertion internally
          // Just refresh dashboard data after successful logging
          await fetchDashboardData();
        }}
      />

      <WorkoutPerformanceModal
        visible={workoutPerformanceModalVisible}
        onClose={() => setWorkoutPerformanceModalVisible(false)}
      />

      {/* Delete Workout Confirmation Dialog */}
      <DeleteWorkoutDialog
        visible={deleteDialogVisible}
        workoutName={workoutToDelete?.templateName || 'Ad Hoc Workout'}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Success Dialog */}
      <SuccessDialog
        visible={successDialogVisible}
        title="Success"
        message={successMessage}
        onClose={() => setSuccessDialogVisible(false)}
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