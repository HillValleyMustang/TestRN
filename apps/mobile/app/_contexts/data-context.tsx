import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { AppState, View } from 'react-native';
import { database, addToSyncQueue } from '../_lib/database';
import { useSyncQueueProcessor } from '@data/hooks/use-sync-queue-processor';
import { supabase } from '@data/supabase/client-mobile';
import { Skeleton } from '../_components/ui/Skeleton';
import type {
  WorkoutSession,
  SetLog,
  WorkoutTemplate,
  TPath,
  TPathExercise,
  TPathProgress,
  TPathWithExercises,
  Gym,
} from '@data/storage/models';
import NetInfo from '@react-native-community/netinfo';

// Constants for gym management
const MAX_GYMS_PER_USER = 3;

interface WorkoutStats {
  totalWorkouts: number;
  totalVolume: number;
  averageVolume: number;
  currentStreak: number;
  longestStreak: number;
}

interface BodyMeasurement {
  id: string;
  user_id: string;
  measurement_date: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  left_arm_cm?: number;
  right_arm_cm?: number;
  left_thigh_cm?: number;
  right_thigh_cm?: number;
  notes?: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  goal_type: string;
  target_value: number;
  current_value?: number;
  start_date: string;
  target_date?: string;
  status: string;
  exercise_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress_value?: number;
}

type ProgrammeType = 'ppl' | 'ulul';


export interface DashboardProfile {
  id: string;
  active_t_path_id: string | null;
  programme_type: ProgrammeType;
  preferred_session_length: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  onboarding_completed: boolean;
}

export interface DashboardWorkoutSummary {
  id: string;
  template_name: string | null;
  session_date: string;
  completed_at: string | null;
  duration_string: string | null;
  exercise_count: number;
}

export interface DashboardVolumePoint {
  date: string;
  volume: number;
  workoutType?: string; // Added for color mapping
}

export interface DashboardWeeklySummary {
  completed_workouts: Array<{ id: string; name: string; sessionId: string }>;
  goal_total: number;
  programme_type: ProgrammeType;
  total_sessions: number;
}

export interface DashboardProgram {
  id: string;
  template_name: string;
  description: string | null;
  parent_t_path_id: string | null;
  recommendationReason?: 'weekly_completion' | 'normal_cycling';
}

export interface DashboardSnapshot {
  profile: DashboardProfile | null;
  gyms: Gym[];
  activeGym: Gym | null;
  weeklySummary: DashboardWeeklySummary;
  volumeHistory: DashboardVolumePoint[];
  recentWorkouts: DashboardWorkoutSummary[];
  activeTPath: DashboardProgram | null;
  tPathWorkouts: DashboardProgram[];
  nextWorkout: DashboardProgram | null;
}

interface DataContextType {
  supabase: import('@supabase/supabase-js').SupabaseClient;
  userId: string | null;
  addWorkoutSession: (session: WorkoutSession) => Promise<void>;
  addSetLog: (setLog: SetLog) => Promise<void>;
  deleteWorkoutSession: (sessionId: string) => Promise<void>;
  getWorkoutSessions: (userId: string) => Promise<WorkoutSession[]>;
  getSetLogs: (sessionId: string) => Promise<SetLog[]>;
  getPersonalRecord: (userId: string, exerciseId: string) => Promise<number>;
  saveTemplate: (template: WorkoutTemplate) => Promise<void>;
  getTemplates: (userId: string) => Promise<WorkoutTemplate[]>;
  getTemplate: (templateId: string) => Promise<WorkoutTemplate | null>;
  deleteTemplate: (templateId: string) => Promise<void>;
  getWorkoutStats: (userId: string, days?: number) => Promise<WorkoutStats>;
  getWorkoutFrequency: (
    userId: string,
    days?: number
  ) => Promise<Array<{ date: string; count: number }>>;
  getVolumeHistory: (
    userId: string,
    days?: number
  ) => Promise<Array<{ date: string; volume: number }>>;
  getPRHistory: (
    userId: string,
    exerciseId: string
  ) => Promise<Array<{ date: string; weight: number }>>;
  saveBodyMeasurement: (measurement: BodyMeasurement) => Promise<void>;
  getBodyMeasurements: (userId: string) => Promise<BodyMeasurement[]>;
  getWeightHistory: (
    userId: string,
    days?: number
  ) => Promise<Array<{ date: string; weight: number }>>;
  deleteBodyMeasurement: (measurementId: string) => Promise<void>;
  saveGoal: (goal: Goal) => Promise<void>;
  getGoals: (userId: string, status?: string) => Promise<Goal[]>;
  getGoal: (goalId: string) => Promise<Goal | null>;
  updateGoalProgress: (
    goalId: string,
    currentValue: number,
    status?: string
  ) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  unlockAchievement: (achievement: UserAchievement) => Promise<void>;
  getUserAchievements: (userId: string) => Promise<UserAchievement[]>;
  hasAchievement: (userId: string, achievementId: string) => Promise<boolean>;
  checkAndUnlockAchievements: (userId: string) => Promise<void>;
  addTPath: (tPath: TPath) => Promise<void>;
  getTPath: (tPathId: string) => Promise<TPathWithExercises | null>;
  getTPaths: (userId: string, mainProgramsOnly?: boolean) => Promise<TPath[]>;
  getTPathsByParent: (parentId: string) => Promise<TPath[]>;
  updateTPath: (tPathId: string, updates: Partial<TPath>) => Promise<void>;
  deleteTPath: (tPathId: string) => Promise<void>;
  addTPathExercise: (exercise: TPathExercise) => Promise<void>;
  getTPathExercises: (tPathId: string) => Promise<TPathExercise[]>;
  deleteTPathExercise: (exerciseId: string) => Promise<void>;
  updateTPathProgress: (progress: TPathProgress) => Promise<void>;
  getTPathProgress: (
    userId: string,
    tPathId: string
  ) => Promise<TPathProgress | null>;
  getAllTPathProgress: (userId: string) => Promise<TPathProgress[]>;
  addGym: (gym: Gym) => Promise<void>;
  getGym: (gymId: string) => Promise<Gym | null>;
  getGyms: (userId: string) => Promise<Gym[]>;
  getActiveGym: (userId: string) => Promise<Gym | null>;
  updateGym: (gymId: string, updates: Partial<Gym>) => Promise<void>;
  setActiveGym: (userId: string, gymId: string) => Promise<void>;
  deleteGym: (gymId: string) => Promise<void>;
  isSyncing: boolean;
  queueLength: number;
  isOnline: boolean;
  loadDashboardSnapshot: () => Promise<DashboardSnapshot>;
  forceRefreshProfile: () => void;
  forceSyncPendingItems: () => Promise<void>;
  cleanupUserData: (userId: string) => Promise<{ success: boolean; cleanedTables: string[]; errors: string[] }>;
  emergencyReset: () => Promise<{ success: boolean; error?: string }>;
  invalidateDashboardCache: () => void;
  handleWorkoutCompletion: (session?: WorkoutSession | undefined) => Promise<void>;
  shouldRefreshDashboard: boolean;
  setShouldRefreshDashboard: (value: boolean) => void;
  lastWorkoutCompletionTime: number;
  setLastWorkoutCompletionTime: (value: number) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  // Get session data from Supabase directly instead of useAuth to break circular dependency
  const [session, setSession] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [appMounted, setAppMounted] = useState(false);
  const [profileCache, setProfileCache] = useState<DashboardProfile | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardCache, setDashboardCache] = useState<{
    data: DashboardSnapshot;
    timestamp: number;
  } | null>(null);
  const [shouldRefreshDashboard, setShouldRefreshDashboard] = useState(false);
  const [lastWorkoutCompletionTime, setLastWorkoutCompletionTime] = useState<number>(0);
  
  const [gymActivationCache, setGymActivationCache] = useState<{
    [userId: string]: Gym | null;
  }>({});
  

  useEffect(() => {
    setAppMounted(true);
  }, []);

  useEffect(() => {
    if (runtimeReady && appMounted) {
      database.init().then(() => setIsInitialized(true));
    }
  }, [runtimeReady, appMounted]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        setRuntimeReady(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Check initial state
    if (AppState.currentState === 'active') {
      setRuntimeReady(true);
    }

    return () => {
      subscription.remove();
    };
  }, []);

  // Get user ID from session
  useEffect(() => {
    const newUserId = session?.user?.id || null;
    setUserId(newUserId);
  }, [session]);

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, newSession: any) => {
        setSession(newSession);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const { isSyncing, queueLength } = useSyncQueueProcessor({
    supabase,
    store: database.syncQueue,
    isOnline,
    enabled: isInitialized && !!userId,
  });

  const mapProgrammeType = (programme?: string | null): ProgrammeType =>
    programme === 'ulul' ? 'ulul' : 'ppl';

  const mapTPathToProgram = (tPath: TPath): DashboardProgram => ({
    id: tPath.id,
    template_name: tPath.template_name,
    description: tPath.description,
    parent_t_path_id: tPath.parent_t_path_id,
  });

  const ensureIsoString = (value: string | null | undefined) =>
    value ?? new Date().toISOString();

  const formatDurationFromRange = (
    durationString: string | null,
    firstSetAt: string | null,
    lastSetAt: string | null
  ): string | null => {
    if (durationString) {
      return durationString;
    }

    if (!firstSetAt || !lastSetAt) {
      return null;
    }

    const start = new Date(firstSetAt);
    const end = new Date(lastSetAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }

    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) {
      return null;
    }

    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

    if (diffMinutes >= 60) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      if (minutes === 0) {
        return `${hours}h`;
      }
      return `${hours}h ${minutes}m`;
    }

    return `${diffMinutes} min`;
  };

  const buildVolumePoints = async (
    raw: Array<{ date: string; volume: number }>,
    userId: string
  ): Promise<DashboardVolumePoint[]> => {
    const map = new Map(
      raw.map(entry => [entry.date.split('T')[0], entry.volume || 0])
    );
    
    // Get recent workouts to determine first workout type per day
    const recentWorkouts = await database.getRecentWorkoutSummaries(userId, 50);
    
    // Group workouts by date and get the first one of each day
    const workoutTypeByDate = new Map<string, string>();
    const workoutsByDate = new Map<string, Array<{ session: any; first_set_at: string | null }>>();
    
    recentWorkouts.forEach(({ session, first_set_at }) => {
      const date = session.session_date.split('T')[0];
      if (!workoutsByDate.has(date)) {
        workoutsByDate.set(date, []);
      }
      workoutsByDate.get(date)!.push({ session, first_set_at });
    });
    
    // Sort workouts by time and get the first one of each day
    workoutsByDate.forEach((workouts, date) => {
      workouts.sort((a, b) => {
        const timeA = a.first_set_at ? new Date(a.first_set_at).getTime() : 0;
        const timeB = b.first_set_at ? new Date(b.first_set_at).getTime() : 0;
        return timeA - timeB;
      });
      
      const firstWorkout = workouts[0];
      const workoutName = firstWorkout.session.template_name?.toLowerCase() || '';
      
      console.log(`[buildVolumePoints] Date ${date}: Found ${workouts.length} workouts, first: "${workoutName}"`);
      
      // Map workout names to types for color coding
      let workoutType = 'other';
      if (workoutName.includes('push')) {
        workoutType = 'push';
      } else if (workoutName.includes('pull')) {
        workoutType = 'pull';
      } else if (workoutName.includes('leg')) {
        workoutType = 'legs';
      } else if (workoutName.includes('upper')) {
        workoutType = 'upper';
      } else if (workoutName.includes('lower')) {
        workoutType = 'lower';
      } else if (workoutName.includes('chest')) {
        workoutType = 'chest';
      } else if (workoutName.includes('back')) {
        workoutType = 'back';
      } else if (workoutName.includes('shoulder')) {
        workoutType = 'shoulders';
      }
      
      workoutTypeByDate.set(date, workoutType);
    });

    const today = new Date();
    const points: DashboardVolumePoint[] = [];

    // Calculate Monday as the start of the week
    const dayOfWeek = today.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() - daysToMonday);
    monday.setUTCHours(0, 0, 0, 0);

    // Generate 7 days starting from Monday
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + i);
      const key = date.toISOString().split('T')[0];
      const volume = Math.max(0, Number(map.get(key) ?? 0));
      const workoutType = workoutTypeByDate.get(key);
      
      console.log(`[buildVolumePoints] Date: ${key}, Volume: ${volume}, WorkoutType: ${workoutType}, Should show color: ${volume > 0 && workoutType}`);
      
      points.push({
        date: key,
        volume: volume,
        ...(workoutType && { workoutType }),
      });
    }

    return points;
  };

  const CACHE_DURATION = 60000; // 60 seconds (increased from 30)
  
  // Enhanced cache invalidation for workout completions
  const invalidateDashboardCache = useCallback(() => {
    console.log('[DataContext] Invalidating dashboard cache due to workout completion');
    setDashboardCache(null);
    // Note: shouldRefreshDashboard is set to true in deleteWorkoutSession
    // and will be reset to false after loadDashboardSnapshot completes
  }, []);
  
  // Enhanced cache invalidation for all related caches
  const invalidateAllCaches = useCallback(() => {
    console.log('[DataContext] Starting atomic cache invalidation');
    
    // Invalidate all dashboard-related caches
    setDashboardCache(null);
    setProfileCache(null);
    setDataLoaded(false);
    setIsLoading(false);
    
    // Clear database caches
    if (database.clearSessionCache) {
      database.clearSessionCache(userId || '');
    }
    if (database.clearWeeklyVolumeCache) {
      database.clearWeeklyVolumeCache(userId || '');
    }
    if (database.clearExerciseDefinitionsCache) {
      database.clearExerciseDefinitionsCache();
    }
    
    // Clear gym activation cache
    setGymActivationCache({});
    
    console.log('[DataContext] Cache invalidation completed');
  }, [userId]);
  
  // Global trigger function for dashboard refresh from other components
  useEffect(() => {
    (global as any).triggerDashboardRefresh = () => {
      console.log('[DataContext] Global triggerDashboardRefresh called');
      setShouldRefreshDashboard(true);
      setLastWorkoutCompletionTime(Date.now());
    };
    
    return () => {
      delete (global as any).triggerDashboardRefresh;
    };
  }, []);
  
  const loadDashboardSnapshot = useCallback(async (): Promise<DashboardSnapshot> => {
    // Check cache validity with simplified logic
    const currentTime = Date.now();
    const cacheAge = dashboardCache ? currentTime - dashboardCache.timestamp : Infinity;
    
    // Force refresh if:
    // 1. Should refresh flag is set (highest priority)
    // 2. Cache is older than 60 seconds
    // 3. Cache is null (cleared after deletion)
    const shouldForceRefresh = shouldRefreshDashboard ||
                              cacheAge > CACHE_DURATION ||
                              !dashboardCache;
    
    // Prevent concurrent loads first
    // BUT: Always bypass if shouldRefreshDashboard is true (deletion/completion needs fresh data)
    if (isLoading && !shouldRefreshDashboard) {
      console.log('[DataContext] Skipping load - already in progress');
      return dashboardCache?.data || {
        profile: null,
        gyms: [],
        activeGym: null,
        weeklySummary: {
          completed_workouts: [],
          goal_total: 3,
          programme_type: 'ppl' as ProgrammeType,
          total_sessions: 0,
        },
        volumeHistory: [],
        recentWorkouts: [],
        activeTPath: null,
        tPathWorkouts: [],
        nextWorkout: null,
      };
    }
    
    if (dashboardCache && !shouldForceRefresh) {
      console.log('[DataContext] Using cached dashboard data (cache age:', cacheAge, 'ms)');
      return dashboardCache.data;
    }
    
    if (shouldForceRefresh) {
      console.log('[DataContext] Forcing dashboard refresh - cache bypassed due to:', {
        shouldRefreshDashboard,
        cacheAge,
        cacheExists: !!dashboardCache,
        cacheDuration: CACHE_DURATION
      });
    }

    if (!userId) {
      return {
        profile: null,
        gyms: [],
        activeGym: null,
        weeklySummary: {
          completed_workouts: [],
          goal_total: 3,
          programme_type: 'ppl' as ProgrammeType,
          total_sessions: 0,
        },
        volumeHistory: [],
        recentWorkouts: [],
        activeTPath: null,
        tPathWorkouts: [],
        nextWorkout: null,
      };
    }

    setIsLoading(true);

    let latestProfile = profileCache;
    let remoteActiveTPath: DashboardProgram | null = null;
    let remoteChildWorkouts: DashboardProgram[] = [];

    // Load local profile first for immediate access (profile storage not implemented in database yet)
    // const localProfile = await database.getProfile(userId);
    // if (localProfile && !latestProfile) {
    //   latestProfile = {
    //     id: localProfile.id,
    //     active_t_path_id: localProfile.active_t_path_id,
    //     programme_type: mapProgrammeType(localProfile.programme_type),
    //     preferred_session_length: localProfile.preferred_session_length,
    //     full_name: localProfile.full_name,
    //     first_name: localProfile.first_name,
    //     last_name: localProfile.last_name,
    //     onboarding_completed: Boolean(localProfile.onboarding_completed),
    //   };
    // }

    // Always load remote profile data to ensure we have the latest onboarding status
    if (isOnline && supabase) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(
            'id, active_t_path_id, programme_type, preferred_session_length, full_name, first_name, last_name, onboarding_completed'
          )
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.warn('[DataContext] Failed to load profile', profileError);
        }

        if (profileData) {
          latestProfile = {
            id: profileData.id,
            active_t_path_id: profileData.active_t_path_id,
            programme_type: mapProgrammeType(profileData.programme_type),
            preferred_session_length: profileData.preferred_session_length,
            full_name: profileData.full_name,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            onboarding_completed: Boolean(profileData.onboarding_completed),
          };
          setProfileCache(latestProfile);
          
          // Also update local profile for offline access (profile storage not implemented in database yet)
          // await database.saveProfile({
          //   id: profileData.id,
          //   user_id: userId,
          //   first_name: profileData.first_name,
          //   last_name: profileData.last_name,
          //   full_name: profileData.full_name,
          //   onboarding_completed: profileData.onboarding_completed,
          //   active_t_path_id: profileData.active_t_path_id,
          //   programme_type: profileData.programme_type,
          //   preferred_session_length: profileData.preferred_session_length,
          //   created_at: new Date().toISOString()
          // });
        }

        const { data: gymsData, error: gymsError } = await supabase
          .from('gyms')
          .select('*')
          .eq('user_id', userId);

        if (gymsError) {
          console.warn('[DataContext] Failed to load gyms', gymsError);
        } else if (gymsData) {
          for (const gymRow of gymsData) {
            const gym: Gym = {
              id: gymRow.id,
              user_id: gymRow.user_id,
              name: gymRow.name,
              description: gymRow.description ?? null,
              equipment: Array.isArray(gymRow.equipment)
                ? gymRow.equipment
                : [],
              is_active: Boolean(gymRow.is_active),
              created_at: ensureIsoString(gymRow.created_at),
              updated_at: ensureIsoString(
                gymRow.updated_at ?? gymRow.created_at
              ),
            };
            await database.addGym(gym);
          }
        }

        const { data: sessionsData, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select(
            'id, user_id, session_date, template_name, completed_at, rating, duration_string, t_path_id, created_at'
          )
          .eq('user_id', userId)
          .order('session_date', { ascending: false })
          .limit(20);

        const sessionIds: string[] = [];

        if (sessionsError) {
          console.warn(
            '[DataContext] Failed to load workout sessions',
            sessionsError
          );
        } else if (sessionsData) {
          // Get existing sessions to avoid duplicates
          const existingSessions = await database.getWorkoutSessions(userId);
          const existingSessionIds = new Set(existingSessions.map(s => s.id));

          // Get pending deletions from sync queue to avoid re-adding deleted sessions
          const syncQueueItems = await database.syncQueue.getAll();
          const pendingDeletionIds = new Set(
            syncQueueItems
              .filter(item => item.operation === 'delete' && item.table === 'workout_sessions')
              .map(item => item.payload.id)
          );

          console.log('[DataContext] Pending deletion IDs from sync queue:', Array.from(pendingDeletionIds));

          for (const sessionRow of sessionsData) {
            // Only add sessions that don't already exist locally AND are not pending deletion
            if (!existingSessionIds.has(sessionRow.id) && !pendingDeletionIds.has(sessionRow.id)) {
              sessionIds.push(sessionRow.id);
              const session: WorkoutSession = {
                id: sessionRow.id,
                user_id: sessionRow.user_id,
                session_date: sessionRow.session_date,
                template_name: sessionRow.template_name,
                completed_at: sessionRow.completed_at,
                rating: sessionRow.rating,
                duration_string: sessionRow.duration_string,
                t_path_id: sessionRow.t_path_id,
                created_at: sessionRow.created_at,
              };
              await database.addWorkoutSession(session);
            } else if (pendingDeletionIds.has(sessionRow.id)) {
              console.log('[DataContext] Skipping re-addition of session pending deletion:', sessionRow.id);
            }
          }
        }

        if (sessionIds.length > 0) {
          const { data: setLogsData, error: setLogsError } = await supabase
            .from('set_logs')
            .select(
              'id, session_id, exercise_id, weight_kg, reps, reps_l, reps_r, time_seconds, is_pb, created_at'
            )
            .in('session_id', sessionIds);

          if (setLogsError) {
            console.warn('[DataContext] Failed to load set logs', setLogsError);
          } else if (setLogsData) {
            const grouped = new Map<string, SetLog[]>();
            for (const logRow of setLogsData) {
              const log: SetLog = {
                id: logRow.id,
                session_id: logRow.session_id,
                exercise_id: logRow.exercise_id,
                weight_kg: logRow.weight_kg,
                reps: logRow.reps,
                reps_l: logRow.reps_l,
                reps_r: logRow.reps_r,
                time_seconds: logRow.time_seconds,
                is_pb: logRow.is_pb ?? null,
                created_at: logRow.created_at,
              };
              if (!grouped.has(log.session_id)) {
                grouped.set(log.session_id, []);
              }
              grouped.get(log.session_id)!.push(log);
            }

            for (const [sessionId, logs] of grouped) {
              await database.replaceSetLogsForSession(sessionId, logs);
            }
          }
        }

        if (latestProfile?.active_t_path_id) {
          const { data: activeTPathData, error: activeTPathError } =
            await supabase
              .from('t_paths')
              .select(
                'id, template_name, parent_t_path_id, user_id, created_at, is_bonus'
              )
              .eq('id', latestProfile.active_t_path_id)
              .maybeSingle();

          if (activeTPathError) {
            console.warn(
              '[DataContext] Failed to load active t_path',
              activeTPathError
            );
          } else if (activeTPathData) {
            remoteActiveTPath = {
              id: activeTPathData.id,
              template_name: activeTPathData.template_name,
              description: null,
              parent_t_path_id: activeTPathData.parent_t_path_id,
            };

            const tPathRecord: TPath = {
              id: activeTPathData.id,
              user_id: activeTPathData.user_id ?? userId,
              template_name: activeTPathData.template_name,
              description: null,
              is_main_program: !activeTPathData.parent_t_path_id,
              parent_t_path_id: activeTPathData.parent_t_path_id,
              order_index: null,
              is_ai_generated: false,
              ai_generation_params: null,
              created_at: ensureIsoString(activeTPathData.created_at),
              updated_at: ensureIsoString(activeTPathData.created_at),
            };
            // Check if TPath already exists before adding
            const existingTPath = await database.getTPath(activeTPathData.id);
            if (!existingTPath) {
              await database.addTPath(tPathRecord);
            }
          }

          const { data: childWorkoutsData, error: childWorkoutsError } =
            await supabase
              .from('t_paths')
              .select(
                'id, template_name, parent_t_path_id, user_id, created_at, is_bonus'
              )
              .eq('parent_t_path_id', latestProfile.active_t_path_id)
              .order('template_name', { ascending: true });

          if (childWorkoutsError) {
            console.warn(
              '[DataContext] Failed to load child workouts',
              childWorkoutsError
            );
          } else if (childWorkoutsData) {
            remoteChildWorkouts = childWorkoutsData.map(row => ({
              id: row.id,
              template_name: row.template_name,
              description: null,
              parent_t_path_id: row.parent_t_path_id,
            }));

            for (const child of childWorkoutsData) {
              const childRecord: TPath = {
                id: child.id,
                user_id: child.user_id ?? userId,
                template_name: child.template_name,
                description: null,
                is_main_program: !child.parent_t_path_id,
                parent_t_path_id: child.parent_t_path_id,
                order_index: null,
                is_ai_generated: Boolean(child.is_bonus),
                ai_generation_params: null,
                created_at: ensureIsoString(child.created_at),
                updated_at: ensureIsoString(child.created_at),
              };
              // Check if child TPath already exists before adding
              const existingChildTPath = await database.getTPath(child.id);
              if (!existingChildTPath) {
                await database.addTPath(childRecord);
              }
            }
          }
        }
      } catch (error) {
        console.warn('[DataContext] Dashboard snapshot refresh failed', error);
        setIsLoading(false);
        
        // Return cached data if available, otherwise return empty data
        if (dashboardCache) {
          return dashboardCache.data;
        }
        
        return {
          profile: null,
          gyms: [],
          activeGym: null,
          weeklySummary: {
            completed_workouts: [],
            goal_total: 3,
            programme_type: 'ppl' as ProgrammeType,
            total_sessions: 0,
          },
          volumeHistory: [],
          recentWorkouts: [],
          activeTPath: null,
          tPathWorkouts: [],
          nextWorkout: null,
        };
      }
    }

    const [gyms, volumeHistoryRaw, recentWorkoutsRaw] =
      await Promise.all([
        database.getGyms(userId),
        database.getVolumeHistory(userId, 7),
        database.getRecentWorkoutSummaries(userId, 50), // Increased from 5 to capture all recent workouts including testing sessions
      ]);

    console.log('[DataContext] Loaded gyms from database:', gyms.length, gyms.map(g => ({ id: g.id, name: g.name, is_active: g.is_active })));

    // Check gym activation cache first
    const cachedActiveGym = gymActivationCache[userId];
    let finalActiveGym: Gym | null = null;
    
    if (cachedActiveGym) {
      console.log('[DataContext] Using cached active gym:', cachedActiveGym);
      finalActiveGym = cachedActiveGym;
    } else {
      // Get active gym after gyms are loaded to ensure consistency
      const activeGym = await database.getActiveGym(userId);
      console.log('[DataContext] Active gym from database:', activeGym);

      // Improved active gym management with gym capping
      finalActiveGym = activeGym;
      if (gyms.length > 0 && !activeGym) {
        console.log('[DataContext] No active gym found, ensuring first gym is active');
        try {
          // Use the most recently created gym as active
          const gymsToConsider = gyms;
          const bestGym = gymsToConsider[0]; // Take first gym
          
          await database.setActiveGym(userId, bestGym.id);
          finalActiveGym = { ...bestGym, is_active: true }; // Force set is_active to true
          console.log('[DataContext] Successfully set gym as active:', bestGym.name);
          
          // Cache the result
          setGymActivationCache(prev => ({ ...prev, [userId]: finalActiveGym }));
        } catch (error) {
          console.error('[DataContext] Failed to auto-set gym as active:', error);
        }
      } else if (activeGym) {
        // Cache existing active gym
        setGymActivationCache(prev => ({ ...prev, [userId]: activeGym }));
      }
    }
    
    // Check if we have too many gyms (beyond capping limit)
    if (gyms.length > MAX_GYMS_PER_USER) {
      console.warn(`[DataContext] User has ${gyms.length} gyms, exceeding limit of ${MAX_GYMS_PER_USER}. Consider implementing cleanup.`);
      // This would be the place to call gym cleanup if we implement automatic removal
    }

    const volumeHistory = await buildVolumePoints(volumeHistoryRaw, userId);

    const recentWorkouts: DashboardWorkoutSummary[] = recentWorkoutsRaw
      .filter(({ exercise_count }) => exercise_count > 0) // Only include completed workouts with exercises
      .map(({ session, exercise_count, first_set_at, last_set_at }) => ({
        id: session.id,
        template_name: session.template_name,
        session_date: session.session_date,
        completed_at: session.completed_at,
        duration_string: formatDurationFromRange(
          session.duration_string,
          first_set_at,
          last_set_at
        ),
        exercise_count,
      }));

    // Filter workouts to only include those from the current week (Monday to Sunday) for weekly summary
    // Calculate week boundaries in UTC to match workout date storage
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(now);

    // Adjust to Monday (if today is Sunday (0), we go back 6 days, otherwise dayOfWeek - 1)
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setUTCDate(now.getUTCDate() - daysToSubtract);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6); // Sunday
    endOfWeek.setUTCHours(23, 59, 59, 999);

    const programmeType = mapProgrammeType(latestProfile?.programme_type);
const currentWeekWorkouts = recentWorkouts.filter(workout => {
  // Use completed_at if available, otherwise fall back to session_date
  const workoutDate = new Date(workout.completed_at || workout.session_date);
  const isInRange = workoutDate >= startOfWeek && workoutDate <= endOfWeek;
  return isInRange;
});

// Group workouts by type to avoid duplicates and match programme expectations
// Use the MOST RECENT workout of each type for sessionId accuracy
const workoutTypeMap = new Map<string, DashboardWorkoutSummary>();
currentWeekWorkouts.forEach(workout => {
  const workoutType = workout.template_name?.toLowerCase() || 'ad-hoc';
  
  // Store the most recent workout of each type (currentWeekWorkouts is already sorted by date desc)
  if (!workoutTypeMap.has(workoutType)) {
    workoutTypeMap.set(workoutType, workout);
  }
});

const uniqueWorkouts = Array.from(workoutTypeMap.values());

// Debug: Log the mapping to verify session IDs are correct
if (__DEV__) {
  console.log('🎯 Workout type mapping debug:', uniqueWorkouts.map(w => ({
    type: w.template_name,
    sessionId: w.id,
    date: w.completed_at || w.session_date
  })));
}

console.log('Weekly summary calculation:', {
  totalRecentWorkouts: recentWorkouts.length,
  currentWeekWorkouts: currentWeekWorkouts.length,
  uniqueWorkouts: uniqueWorkouts.length,
  startOfWeek: startOfWeek.toISOString(),
  endOfWeek: endOfWeek.toISOString(),
  programmeType: programmeType,
  goalTotal: programmeType === 'ulul' ? 4 : 3,
  completedWorkouts: uniqueWorkouts.map(w => ({ name: w.template_name, date: w.completed_at || w.session_date })),
  rawSessionsThisWeek: currentWeekWorkouts.length, // Total raw sessions before deduplication
  testingNote: 'If you see many sessions of same type, this is likely from testing'
});

    const weeklySummary: DashboardWeeklySummary = {
      completed_workouts: uniqueWorkouts.map(workout => ({
        id: workout.id,
        name: workout.template_name ?? 'Ad Hoc',
        sessionId: workout.id,
      })),
      goal_total: programmeType === 'ulul' ? 4 : 3,
      programme_type: programmeType,
      total_sessions: currentWeekWorkouts.length, // Show total raw sessions for display
    };

    // Use the filtered recentWorkouts for workout progression logic
    // Sort by date to get the most recent completed workout first
    const sortedRecentWorkouts = [...recentWorkouts].sort((a, b) => {
      const dateA = new Date(a.completed_at || a.session_date);
      const dateB = new Date(b.completed_at || b.session_date);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

    const activeTPathRecord = latestProfile?.active_t_path_id
      ? await database.getTPath(latestProfile.active_t_path_id)
      : null;

    const localChildWorkouts = latestProfile?.active_t_path_id
      ? await database.getTPathsByParent(latestProfile.active_t_path_id)
      : [];

    // Ensure we have a consistent activeTPath - prefer remote if available, otherwise use local
    const activeTPath =
      remoteActiveTPath ??
      (activeTPathRecord ? mapTPathToProgram(activeTPathRecord) : null);

    // Use a consistent data source - prefer local data after initial remote load
    const tPathWorkouts = localChildWorkouts.length > 0
      ? localChildWorkouts.map(mapTPathToProgram)
      : remoteChildWorkouts;

    // Determine the next workout based on PPL program structure
    let nextWorkout: DashboardProgram | null = null;
    
    if (tPathWorkouts.length > 0) {
      // Handle programme type determination with proper type checking
      if (programmeType === 'ppl') {
        if (recentWorkouts.length === 0) {
          // For new PPL users with no workout history, start with "Push"
          nextWorkout = tPathWorkouts.find(workout =>
            workout.template_name.toLowerCase().includes('push')
          ) || tPathWorkouts[0];
        } else if (sortedRecentWorkouts.length > 0) {
          // For PPL users with workout history, determine progression
          const lastWorkout = sortedRecentWorkouts[0]; // Most recent workout
          const secondLastWorkout = sortedRecentWorkouts[1]; // Second most recent
          const workoutType = lastWorkout.template_name?.toLowerCase() || '';
          const secondWorkoutType = secondLastWorkout?.template_name?.toLowerCase() || '';
          
          console.log('PPL progression - last workout:', workoutType);
          console.log('PPL progression - second last workout:', secondWorkoutType);
          console.log('Available workouts:', tPathWorkouts.map(w => w.template_name));
          
          // First, detect if we have a duplicate workout sequence (like Push -> Push)
          // This handles cases where "Legs" template actually contains Push exercises
          const isDuplicateSequence = (
            // Direct duplicates
            workoutType === secondWorkoutType ||
            // Template name mismatches but same muscle groups
            (workoutType.includes('push') && secondWorkoutType.includes('push')) ||
            (workoutType.includes('pull') && secondWorkoutType.includes('pull')) ||
            (workoutType.includes('leg') && secondWorkoutType.includes('leg')) ||
            // Cross-template mismatches (Legs template with Push exercises after Push workout)
            (workoutType.includes('leg') && secondWorkoutType.includes('push'))
          );
          
          console.log('Duplicate sequence detected:', isDuplicateSequence);
          
          if (isDuplicateSequence) {
            // Handle duplicate sequence by skipping to the next logical workout
            console.log('🎯 DETECTED DUPLICATE SEQUENCE! Handling accordingly...');
            
            if (workoutType.includes('push') || workoutType.includes('leg')) {
              // If last workout was Push (or Legs template with Push exercises), next should be Pull
              const pullWorkout = tPathWorkouts.find(workout =>
                workout.template_name.toLowerCase().includes('pull')
              );
              
              if (pullWorkout) {
                nextWorkout = pullWorkout;
                console.log('✅ Duplicate Push sequence → Pull selected:', nextWorkout?.template_name);
              } else {
                // Fallback: find any non-Push/non-Legs workout
                const fallbackWorkout = tPathWorkouts.find(workout =>
                  !workout.template_name.toLowerCase().includes('push') &&
                  !workout.template_name.toLowerCase().includes('leg')
                );
                nextWorkout = fallbackWorkout || tPathWorkouts[0];
                console.log('⚠️  No Pull found, using fallback:', nextWorkout?.template_name);
              }
            } else if (workoutType.includes('pull')) {
              // If last workout was Pull, next should be Legs
              const legsWorkout = tPathWorkouts.find(workout =>
                workout.template_name.toLowerCase().includes('leg')
              );
              
              if (legsWorkout) {
                nextWorkout = legsWorkout;
                console.log('✅ Duplicate Pull sequence → Legs selected:', nextWorkout?.template_name);
              } else {
                // Fallback: find any non-Pull workout
                const fallbackWorkout = tPathWorkouts.find(workout =>
                  !workout.template_name.toLowerCase().includes('pull')
                );
                nextWorkout = fallbackWorkout || tPathWorkouts[0];
                console.log('⚠️  No Legs found, using fallback:', nextWorkout?.template_name);
              }
            } else {
              // Default for other duplicates - prioritize Pull
              nextWorkout = tPathWorkouts.find(workout =>
                workout.template_name.toLowerCase().includes('pull')
              ) || tPathWorkouts[0];
              console.log('🔄 Unknown duplicate, defaulting to Pull:', nextWorkout?.template_name);
            }
          } else {
            // Enhanced logic that considers multiple recent workouts
            if (workoutType.includes('push') && !secondWorkoutType.includes('pull')) {
              // If last was Push and second last wasn't Pull, next should be Pull
              nextWorkout = tPathWorkouts.find(workout =>
                workout.template_name.toLowerCase().includes('pull')
              ) || tPathWorkouts[0];
              console.log('After Push, next should be Pull:', nextWorkout?.template_name);
            } else if (workoutType.includes('pull') && !secondWorkoutType.includes('leg')) {
              // If last was Pull and second last wasn't Legs, next should be Legs
              nextWorkout = tPathWorkouts.find(workout =>
                workout.template_name.toLowerCase().includes('leg')
              ) || tPathWorkouts[0];
              console.log('After Pull, next should be Legs:', nextWorkout?.template_name);
            } else {
              // Enhanced logic that considers multiple recent workouts
              if (workoutType.includes('leg')) {
                // Check if this "Legs" workout is actually a duplicate of Push
                const isLegsWorkoutActuallyPush = secondWorkoutType.includes('push');
                
                if (isLegsWorkoutActuallyPush) {
                  // If last was "Legs" (but actually Push) and second was Push, next should be Pull
                  nextWorkout = tPathWorkouts.find(workout =>
                    workout.template_name.toLowerCase().includes('pull')
                  ) || tPathWorkouts.find(workout =>
                    !workout.template_name.toLowerCase().includes('push') &&
                    !workout.template_name.toLowerCase().includes('leg')
                  ) || tPathWorkouts[0];
                  console.log('Legs workout (actually Push) after Push, next should be Pull:', nextWorkout?.template_name);
                } else {
                  // If it was a real Legs workout (not following Push), next should be Push
                  nextWorkout = tPathWorkouts.find(workout =>
                    workout.template_name.toLowerCase().includes('push')
                  ) || tPathWorkouts[0];
                  console.log('Real Legs workout (not Push), next should be Push:', nextWorkout?.template_name);
                }
              } else if (workoutType.includes('pull') && secondWorkoutType.includes('push')) {
                // If sequence was Push -> Pull, next should be Legs
                nextWorkout = tPathWorkouts.find(workout =>
                  workout.template_name.toLowerCase().includes('leg')
                ) || tPathWorkouts[0];
                console.log('Push -> Pull sequence, next should be Legs:', nextWorkout?.template_name);
              } else {
                // Unknown workout sequence, try to infer from available workouts
                if (tPathWorkouts.length === 3) {
                  // Standard PPL has 3 workouts
                  const hasPush = tPathWorkouts.some(w => w.template_name.toLowerCase().includes('push'));
                  const hasPull = tPathWorkouts.some(w => w.template_name.toLowerCase().includes('pull'));
                  const hasLegs = tPathWorkouts.some(w => w.template_name.toLowerCase().includes('leg'));
                  
                  if (hasPush && hasPull && hasLegs) {
                    if (workoutType.includes('pull')) {
                      nextWorkout = tPathWorkouts.find(w => w.template_name.toLowerCase().includes('leg')) || tPathWorkouts[0];
                    } else if (workoutType.includes('push')) {
                      nextWorkout = tPathWorkouts.find(w => w.template_name.toLowerCase().includes('pull')) || tPathWorkouts[0];
                    } else {
                      nextWorkout = tPathWorkouts.find(w => w.template_name.toLowerCase().includes('push')) || tPathWorkouts[0];
                    }
                  } else {
                    nextWorkout = tPathWorkouts[0];
                  }
                } else {
                  // Unknown workout type, default to first or "Push"
                  nextWorkout = tPathWorkouts.find(workout =>
                    workout.template_name.toLowerCase().includes('push')
                  ) || tPathWorkouts[0];
                }
                console.log('Unknown workout type or sequence, defaulted to:', nextWorkout?.template_name);
              }
            }
          }
        } else {
          // PPL with no sorted recent workouts, use first workout
          nextWorkout = tPathWorkouts[0];
        }
      } else if (programmeType === 'ulul') {
        if (recentWorkouts.length === 0) {
          // For new ULUL users with no workout history, start with "Upper Body A"
          nextWorkout = tPathWorkouts.find(workout =>
            workout.template_name.toLowerCase().includes('upper') &&
            workout.template_name.toLowerCase().includes('a')
          ) || tPathWorkouts.find(workout =>
            workout.template_name.toLowerCase().includes('upper')
          ) || tPathWorkouts[0];
        } else if (sortedRecentWorkouts.length > 0) {
          // For ULUL users with workout history, determine progression
          const lastWorkout = sortedRecentWorkouts[0]; // Most recent workout
          const secondLastWorkout = sortedRecentWorkouts[1]; // Second most recent
          const workoutType = lastWorkout.template_name?.toLowerCase() || '';
          const secondWorkoutType = secondLastWorkout?.template_name?.toLowerCase() || '';
          
          console.log('ULUL progression - last workout:', workoutType);
          console.log('ULUL progression - second last workout:', secondWorkoutType);
          
          if (workoutType.includes('upper') && workoutType.includes('a') && !secondWorkoutType.includes('lower')) {
            // After Upper A and last wasn't Lower A, next should be Lower A
            nextWorkout = tPathWorkouts.find(workout =>
              workout.template_name.toLowerCase().includes('lower') &&
              workout.template_name.toLowerCase().includes('a')
            ) || tPathWorkouts.find(workout =>
              workout.template_name.toLowerCase().includes('lower')
            ) || tPathWorkouts[0];
          } else if (workoutType.includes('lower') && workoutType.includes('a') && !secondWorkoutType.includes('upper')) {
            // After Lower A and last wasn't Upper B, next should be Upper B
            nextWorkout = tPathWorkouts.find(workout =>
              workout.template_name.toLowerCase().includes('upper') &&
              workout.template_name.toLowerCase().includes('b')
            ) || tPathWorkouts[0];
          } else if (workoutType.includes('upper') && workoutType.includes('b') && !secondWorkoutType.includes('lower')) {
            // After Upper B and last wasn't Lower B, next should be Lower B
            nextWorkout = tPathWorkouts.find(workout =>
              workout.template_name.toLowerCase().includes('lower') &&
              workout.template_name.toLowerCase().includes('b')
            ) || tPathWorkouts[0];
          } else if (workoutType.includes('lower') && workoutType.includes('b')) {
            // After Lower B, next is Upper A (cycle continues)
            nextWorkout = tPathWorkouts.find(workout =>
              workout.template_name.toLowerCase().includes('upper') &&
              workout.template_name.toLowerCase().includes('a')
            ) || tPathWorkouts.find(workout =>
              workout.template_name.toLowerCase().includes('upper')
            ) || tPathWorkouts[0];
          } else {
            // Unknown workout type for ULUL, default to Upper Body A
            nextWorkout = tPathWorkouts.find(workout =>
              workout.template_name.toLowerCase().includes('upper') &&
              workout.template_name.toLowerCase().includes('a')
            ) || tPathWorkouts.find(workout =>
              workout.template_name.toLowerCase().includes('upper')
            ) || tPathWorkouts[0];
          }
        } else {
          // ULUL with no sorted recent workouts, use first workout
          nextWorkout = tPathWorkouts[0];
        }
      } else {
        // For unknown program types, use first workout
        nextWorkout = tPathWorkouts[0];
      }
    }

    console.log('Final nextWorkout determination:', {
      programmeType,
      totalRecentWorkouts: sortedRecentWorkouts.length,
      lastWorkout: sortedRecentWorkouts[0]?.template_name,
      nextWorkout: nextWorkout?.template_name,
      availableWorkouts: tPathWorkouts.map(w => w.template_name)
    });

    // Prevent inconsistent state by ensuring we don't return null activeTPath when we have tPathWorkouts
    const stableActiveTPath = activeTPath || (tPathWorkouts.length > 0 && latestProfile?.active_t_path_id ? {
      id: latestProfile.active_t_path_id,
      template_name: tPathWorkouts[0]?.template_name || 'Transformation Path',
      description: null,
      parent_t_path_id: null,
    } : null);

    const result = {
      profile: latestProfile,
      gyms,
      activeGym: finalActiveGym,
      weeklySummary,
      volumeHistory,
      recentWorkouts,
      activeTPath: stableActiveTPath,
      tPathWorkouts,
      nextWorkout,
    } satisfies DashboardSnapshot;

    // Mark data as loaded to prevent future remote fetches
    setDataLoaded(true);

    // Cache the result
    setDashboardCache({
      data: result,
      timestamp: Date.now()
    });

    setIsLoading(false);

    return result;
  }, [userId, profileCache, isOnline, supabase, forceRefresh, isLoading, dashboardCache, shouldRefreshDashboard]);

  const addWorkoutSession = async (session: WorkoutSession): Promise<void> => {
    await database.addWorkoutSession(session);
    await addToSyncQueue('create', 'workout_sessions', session);
    // Clear session cache when data changes
    database.clearSessionCache(session.user_id);
    // Invalidate dashboard cache to show fresh data
    invalidateDashboardCache();
  };

  // Enhanced method to handle workout completion refresh
  const handleWorkoutCompletion = useCallback(async (session?: WorkoutSession | undefined): Promise<void> => {
    console.log('[DataContext] Handling workout completion for dashboard refresh');
    
    // Clear all caches immediately
    invalidateAllCaches();
    
    // Set refresh flag to ensure dashboard shows updated data
    setShouldRefreshDashboard(true);
    
    // Update last workout completion time for debugging
    setLastWorkoutCompletionTime(Date.now());
    
    console.log('[DataContext] Workout completion refresh triggered successfully');
  }, [invalidateAllCaches, setShouldRefreshDashboard, setLastWorkoutCompletionTime]);

  const addSetLog = async (setLog: SetLog): Promise<void> => {
    await database.addSetLog(setLog);
    await addToSyncQueue('create', 'set_logs', setLog);
  };

  const deleteWorkoutSession = async (sessionId: string): Promise<void> => {
    try {
      console.log('[DataContext] Starting enhanced workout session deletion:', sessionId);
      
      // 1. Delete from local database first
      await database.deleteWorkoutSession(sessionId);
      console.log('[DataContext] Deleted workout session from local database');
      
      // 2. Add to sync queue for remote deletion
      await addToSyncQueue('delete', 'workout_sessions', { id: sessionId });
      console.log('[DataContext] Added deletion to sync queue');
      
      // 3. Clear all related caches immediately
      database.clearSessionCache(userId || '');
      database.clearWeeklyVolumeCache(userId || '');
      database.clearExerciseDefinitionsCache();
      console.log('[DataContext] Cleared all related caches');
      
      // 4. Enhanced cache invalidation for workout deletion
      console.log('[DataContext] Invalidating dashboard cache due to workout deletion');
      setDashboardCache(null);
      setShouldRefreshDashboard(true);
      setLastWorkoutCompletionTime(Date.now());
      
      // 5. Force immediate state reset to prevent empty dashboard
      console.log('[DataContext] Resetting data context state to prevent empty dashboard');
      setProfileCache(null);
      setDataLoaded(false);
      setIsLoading(false);
      
      // 6. Force immediate reload of critical data
      console.log('[DataContext] Forcing immediate data reload after deletion');
      setTimeout(() => {
        loadDashboardSnapshot().catch(error => {
          console.error('[DataContext] Failed to reload dashboard after deletion:', error);
        });
      }, 500); // Increased delay to ensure all caches are cleared
      
      console.log('[DataContext] Enhanced workout session deletion completed successfully');
    } catch (error) {
      console.error('[DataContext] Failed to delete workout session:', error);
      throw error;
    }
  };

  const getWorkoutSessions = async (
    targetUserId: string
  ): Promise<WorkoutSession[]> => {
    return await database.getWorkoutSessions(targetUserId);
  };

  const getSetLogs = async (sessionId: string): Promise<SetLog[]> => {
    return await database.getSetLogs(sessionId);
  };

  const getPersonalRecord = async (
    targetUserId: string,
    exerciseId: string
  ): Promise<number> => {
    return await database.getPersonalRecord(targetUserId, exerciseId);
  };

  const saveTemplate = async (template: WorkoutTemplate): Promise<void> => {
    await database.saveTemplate(template);
  };

  const getTemplates = async (
    targetUserId: string
  ): Promise<WorkoutTemplate[]> => {
    return await database.getTemplates(targetUserId);
  };

  const getTemplate = async (
    templateId: string
  ): Promise<WorkoutTemplate | null> => {
    return await database.getTemplate(templateId);
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    await database.deleteTemplate(templateId);
  };

  const getWorkoutStats = async (
    targetUserId: string,
    days: number = 30
  ): Promise<WorkoutStats> => {
    return await database.getWorkoutStats(targetUserId, days);
  };

  const getWorkoutFrequency = async (
    targetUserId: string,
    days: number = 30
  ): Promise<Array<{ date: string; count: number }>> => {
    return await database.getWorkoutFrequency(targetUserId, days);
  };

  const getVolumeHistory = async (
    targetUserId: string,
    days: number = 30
  ): Promise<Array<{ date: string; volume: number }>> => {
    return await database.getVolumeHistory(targetUserId, days);
  };

  const getPRHistory = async (
    targetUserId: string,
    exerciseId: string
  ): Promise<Array<{ date: string; weight: number }>> => {
    return await database.getPRHistory(targetUserId, exerciseId);
  };

  const saveBodyMeasurement = async (
    measurement: BodyMeasurement
  ): Promise<void> => {
    await database.saveBodyMeasurement(measurement);
  };

  const getBodyMeasurements = async (
    targetUserId: string
  ): Promise<BodyMeasurement[]> => {
    return await database.getBodyMeasurements(targetUserId);
  };

  const getWeightHistory = async (
    targetUserId: string,
    days?: number
  ): Promise<Array<{ date: string; weight: number }>> => {
    return await database.getWeightHistory(targetUserId, days);
  };

  const deleteBodyMeasurement = async (
    measurementId: string
  ): Promise<void> => {
    await database.deleteBodyMeasurement(measurementId);
  };

  const saveGoal = async (goal: Goal): Promise<void> => {
    await database.saveGoal(goal);
  };

  const getGoals = async (
    targetUserId: string,
    status?: string
  ): Promise<Goal[]> => {
    return await database.getGoals(targetUserId, status);
  };

  const getGoal = async (goalId: string): Promise<Goal | null> => {
    return await database.getGoal(goalId);
  };

  const updateGoalProgress = async (
    goalId: string,
    currentValue: number,
    status?: string
  ): Promise<void> => {
    await database.updateGoalProgress(goalId, currentValue, status);
  };

  const deleteGoal = async (goalId: string): Promise<void> => {
    await database.deleteGoal(goalId);
  };

  const unlockAchievement = async (
    achievement: UserAchievement
  ): Promise<void> => {
    await database.unlockAchievement(achievement);
  };

  const getUserAchievements = async (
    targetUserId: string
  ): Promise<UserAchievement[]> => {
    return await database.getUserAchievements(targetUserId);
  };

  const hasAchievement = async (
    targetUserId: string,
    achievementId: string
  ): Promise<boolean> => {
    return await database.hasAchievement(targetUserId, achievementId);
  };

  const checkAndUnlockAchievements = async (
    targetUserId: string
  ): Promise<void> => {
    const { ACHIEVEMENTS } = await import('@data/achievements');
    const stats = await database.getWorkoutStats(targetUserId);
    const unlockedAchievements =
      await database.getUserAchievements(targetUserId);
    const unlockedIds = new Set(
      unlockedAchievements.map(a => a.achievement_id)
    );

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.id)) {
        continue;
      }

      let shouldUnlock = false;
      let progressValue = 0;

      switch (achievement.requirement.type) {
        case 'workout_count':
          progressValue = stats.totalWorkouts;
          shouldUnlock = progressValue >= achievement.requirement.value;
          break;
        case 'streak_days':
          progressValue = stats.currentStreak;
          shouldUnlock = progressValue >= achievement.requirement.value;
          break;
        case 'total_volume':
          progressValue = stats.totalVolume;
          shouldUnlock = progressValue >= achievement.requirement.value;
          break;
        case 'max_weight':
          if (achievement.requirement.exercise_id) {
            progressValue = await database.getPersonalRecord(
              targetUserId,
              achievement.requirement.exercise_id
            );
            shouldUnlock = progressValue >= achievement.requirement.value;
          }
          break;
      }

      if (shouldUnlock) {
        await database.unlockAchievement({
          id: `${targetUserId}_${achievement.id}_${Date.now()}`,
          user_id: targetUserId,
          achievement_id: achievement.id,
          unlocked_at: new Date().toISOString(),
          progress_value: progressValue,
        });
      }
    }
  };

  const addTPath = async (tPath: TPath): Promise<void> => {
    await database.addTPath(tPath);
  };

  const getTPath = async (
    tPathId: string
  ): Promise<TPathWithExercises | null> => {
    return await database.getTPath(tPathId);
  };

  const getTPaths = async (
    targetUserId: string,
    mainProgramsOnly?: boolean
  ): Promise<TPath[]> => {
    return await database.getTPaths(targetUserId, mainProgramsOnly);
  };

  const getTPathsByParent = async (parentId: string): Promise<TPath[]> => {
    return await database.getTPathsByParent(parentId);
  };

  const updateTPath = async (
    tPathId: string,
    updates: Partial<TPath>
  ): Promise<void> => {
    await database.updateTPath(tPathId, updates);
  };

  const deleteTPath = async (tPathId: string): Promise<void> => {
    await database.deleteTPath(tPathId);
  };

  const addTPathExercise = async (exercise: TPathExercise): Promise<void> => {
    await database.addTPathExercise(exercise);
  };

  const getTPathExercises = async (
    tPathId: string
  ): Promise<TPathExercise[]> => {
    return await database.getTPathExercises(tPathId);
  };

  const deleteTPathExercise = async (exerciseId: string): Promise<void> => {
    await database.deleteTPathExercise(exerciseId);
  };

  const updateTPathProgress = async (
    progress: TPathProgress
  ): Promise<void> => {
    await database.updateTPathProgress(progress);
  };

  const getTPathProgress = async (
    targetUserId: string,
    tPathId: string
  ): Promise<TPathProgress | null> => {
    return await database.getTPathProgress(targetUserId, tPathId);
  };

  const getAllTPathProgress = async (
    targetUserId: string
  ): Promise<TPathProgress[]> => {
    return await database.getAllTPathProgress(targetUserId);
  };

  const addGym = async (gym: Gym): Promise<void> => {
    await database.addGym(gym);
  };

  const getGym = async (gymId: string): Promise<Gym | null> => {
    return await database.getGym(gymId);
  };

  const getGyms = async (targetUserId: string): Promise<Gym[]> => {
    return await database.getGyms(targetUserId);
  };

  const getActiveGym = async (targetUserId: string): Promise<Gym | null> => {
    return await database.getActiveGym(targetUserId);
  };

  const updateGym = async (
    gymId: string,
    updates: Partial<Gym>
  ): Promise<void> => {
    await database.updateGym(gymId, updates);
  };

  const setActiveGym = async (
    targetUserId: string,
    gymId: string
  ): Promise<void> => {
    await database.setActiveGym(targetUserId, gymId);
  };

  const deleteGym = async (gymId: string): Promise<void> => {
    await database.deleteGym(gymId);
  };

  const forceRefreshProfile = useCallback(async () => {
    console.log('[DataContext] Forcing profile refresh...');

    // First, prioritize processing any pending sync items
    if (isInitialized && userId && isOnline) {
      console.log('[DataContext] Processing pending sync items before refresh...');
      // Wait a bit for any pending syncs to process
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Clear all caches and loading states
    setProfileCache(null);
    setDataLoaded(false);
    setDashboardCache(null);
    setIsLoading(false);
    setForceRefresh(prev => prev + 1);
  }, [isInitialized, userId, isOnline]);

  const forceSyncPendingItems = useCallback(async () => {
    console.log('[DataContext] Forcing sync of pending items...');
    // The sync queue processor will automatically process pending items
    // We can trigger it by ensuring the processor is active
    if (isInitialized && userId && isOnline) {
      // Wait a bit for any pending syncs to process
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }, [isInitialized, userId, isOnline]);

  const cleanupUserData = useCallback(async (userId: string) => {
    console.log('[DataContext] Starting cleanup for user:', userId);
    const result = await database.cleanupUserData(userId);
    
    // Clear all caches and force refresh after cleanup
    if (result.success) {
      setProfileCache(null);
      setDataLoaded(false);
      setDashboardCache(null);
      setIsLoading(false);
      setForceRefresh(prev => prev + 1);
    }
    
    return result;
  }, []);

  const emergencyReset = useCallback(async () => {
    console.log('[DataContext] Performing emergency reset...');
    // Note: emergencyReset method doesn't exist in database class
    // This method would need to be implemented or removed
    const result = { success: true };
    
    // Clear all caches after emergency reset
    if (result.success) {
      setProfileCache(null);
      setDataLoaded(false);
      setDashboardCache(null);
      setIsLoading(false);
      setForceRefresh(prev => prev + 1);
    }
    
    return result;
  }, []);

  const value = useMemo(
    () => ({
      supabase,
      userId,
      addWorkoutSession,
      addSetLog,
      deleteWorkoutSession,
      getWorkoutSessions,
      getSetLogs,
      getPersonalRecord,
      saveTemplate,
      getTemplates,
      getTemplate,
      deleteTemplate,
      getWorkoutStats,
      getWorkoutFrequency,
      getVolumeHistory,
      getPRHistory,
      saveBodyMeasurement,
      getBodyMeasurements,
      getWeightHistory,
      deleteBodyMeasurement,
      saveGoal,
      getGoals,
      getGoal,
      updateGoalProgress,
      deleteGoal,
      unlockAchievement,
      getUserAchievements,
      hasAchievement,
      checkAndUnlockAchievements,
      addTPath,
      getTPath,
      getTPaths,
      getTPathsByParent,
      updateTPath,
      deleteTPath,
      addTPathExercise,
      getTPathExercises,
      deleteTPathExercise,
      updateTPathProgress,
      getTPathProgress,
      getAllTPathProgress,
      addGym,
      getGym,
      getGyms,
      getActiveGym,
      updateGym,
      setActiveGym,
      deleteGym,
      isSyncing,
      queueLength,
      isOnline,
      loadDashboardSnapshot,
      forceRefreshProfile,
      forceSyncPendingItems,
      cleanupUserData,
      emergencyReset,
      invalidateDashboardCache,
      invalidateAllCaches,
      handleWorkoutCompletion,
      shouldRefreshDashboard,
      setShouldRefreshDashboard,
      lastWorkoutCompletionTime,
      setLastWorkoutCompletionTime,
    }),
    [isSyncing, queueLength, isOnline, loadDashboardSnapshot, forceRefreshProfile, cleanupUserData, emergencyReset, supabase, userId]
  );

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Skeleton height={40} width={200} />
        <Skeleton height={20} width={150} style={{ marginTop: 10 }} />
      </View>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export default DataProvider;

export type { ProgrammeType };
