import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
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
import type { TempStatusMessage } from '../../hooks/useRollingStatus';
import { createTaggedLogger } from '../../lib/logger';
import { queryClient, queryKeys } from '../_lib/react-query-client';

const log = createTaggedLogger('DataContext');

type ProgrammeType = 'ppl' | 'ulul';

export interface DashboardProfile {
  id: string;
  active_t_path_id: string | null;
  active_gym_id: string | null;
  programme_type: ProgrammeType;
  preferred_session_length: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

export interface DashboardWorkoutSummary {
  id: string;
  template_name: string | null;
  session_date: string;
  completed_at: string | null;
  duration_string: string | null;
  exercise_count: number;
  gym_name?: string | null;
}

export interface DashboardVolumePoint {
  date: string;
  volume: number;
  workoutType?: string;
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
  getWorkoutStats: (userId: string, days?: number) => Promise<any>;
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
  saveBodyMeasurement: (measurement: any) => Promise<void>;
  getBodyMeasurements: (userId: string) => Promise<any[]>;
  getWeightHistory: (
    userId: string,
    days?: number
  ) => Promise<Array<{ date: string; weight: number }>>;
  deleteBodyMeasurement: (measurementId: string) => Promise<void>;
  saveGoal: (goal: any) => Promise<void>;
  getGoals: (userId: string, status?: string) => Promise<any[]>;
  getGoal: (goalId: string) => Promise<any | null>;
  updateGoalProgress: (
    goalId: string,
    currentValue: number,
    status?: string
  ) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  unlockAchievement: (achievement: any) => Promise<void>;
  getUserAchievements: (userId: string) => Promise<any[]>;
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
  forceRefreshProfile: () => void;
  forceRefresh: number;
  forceSyncPendingItems: () => Promise<void>;
  cleanupUserData: (userId: string) => Promise<{ success: boolean; cleanedTables: string[]; errors: string[] }>;
  emergencyReset: () => Promise<{ success: boolean; error?: string }>;
  invalidateAllCaches: () => void;
  handleWorkoutCompletion: (session?: WorkoutSession | undefined) => Promise<void>;
  shouldRefreshDashboard: boolean;
  setShouldRefreshDashboard: (value: boolean) => void;
  lastWorkoutCompletionTime: number;
  setLastWorkoutCompletionTime: (value: number) => void;
  tempStatusMessage: TempStatusMessage | null;
  setTempStatusMessage: (message: TempStatusMessage | null) => void;
  isGeneratingPlan: boolean;
  setIsGeneratingPlan: (value: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [appMounted, setAppMounted] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [shouldRefreshDashboard, setShouldRefreshDashboard] = useState(false);
  const [lastWorkoutCompletionTime, setLastWorkoutCompletionTime] = useState<number>(0);
  const [tempStatusMessage, setTempStatusMessageState] = useState<TempStatusMessage | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const tempStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

    if (AppState.currentState === 'active') {
      setRuntimeReady(true);
    }

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const newUserId = session?.user?.id || null;
    setUserId(newUserId);
  }, [session]);

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

  const invalidateAllCaches = useCallback(() => {
    log.info('[DataContext] Starting atomic cache invalidation');
    
    if (database.clearSessionCache) {
      database.clearSessionCache(userId || '');
    }
    if (database.clearWeeklyVolumeCache) {
      database.clearWeeklyVolumeCache(userId || '');
    }
    if (database.clearExerciseDefinitionsCache) {
      database.clearExerciseDefinitionsCache();
    }
    
    setGymActivationCache({});
    
    if (userId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.workoutSessions(userId) });
      queryClient.invalidateQueries({ queryKey: ['recent-workouts', userId] });
      queryClient.invalidateQueries({ queryKey: ['weekly-summary', userId] });
      queryClient.invalidateQueries({ queryKey: ['volume-history', userId] });
      queryClient.invalidateQueries({ queryKey: ['next-workout', userId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gyms(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tPaths(userId) });
      log.debug('[DataContext] Invalidated React Query caches');
    }
    
    log.debug('[DataContext] Cache invalidation completed');
  }, [userId]);

  const addWorkoutSession = async (session: WorkoutSession): Promise<void> => {
    await database.addWorkoutSession(session);
    await addToSyncQueue('create', 'workout_sessions', session);
    invalidateAllCaches();
  };

  const addSetLog = async (setLog: SetLog): Promise<void> => {
    await database.addSetLog(setLog);
    await addToSyncQueue('create', 'set_logs', setLog);
  };

  const deleteWorkoutSession = async (sessionId: string): Promise<void> => {
    try {
      await database.deleteWorkoutSession(sessionId);
      await addToSyncQueue('delete', 'workout_sessions', { id: sessionId });
      invalidateAllCaches();
      setShouldRefreshDashboard(true);
    } catch (error) {
      log.error('[DataContext] Failed to delete workout session:', error);
      throw error;
    }
  };

  const getWorkoutSessions = async (targetUserId: string): Promise<WorkoutSession[]> => {
    return await database.getWorkoutSessions(targetUserId);
  };

  const getSetLogs = async (sessionId: string): Promise<SetLog[]> => {
    return await database.getSetLogs(sessionId);
  };

  const getPersonalRecord = async (targetUserId: string, exerciseId: string): Promise<number> => {
    return await database.getPersonalRecord(targetUserId, exerciseId);
  };

  const saveTemplate = async (template: WorkoutTemplate): Promise<void> => {
    await database.saveTemplate(template);
  };

  const getTemplates = async (targetUserId: string): Promise<WorkoutTemplate[]> => {
    return await database.getTemplates(targetUserId);
  };

  const getTemplate = async (templateId: string): Promise<WorkoutTemplate | null> => {
    return await database.getTemplate(templateId);
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    await database.deleteTemplate(templateId);
  };

  const getWorkoutStats = async (targetUserId: string, days: number = 30): Promise<any> => {
    return await database.getWorkoutStats(targetUserId, days);
  };

  const getWorkoutFrequency = async (targetUserId: string, days: number = 30): Promise<any[]> => {
    return await database.getWorkoutFrequency(targetUserId, days);
  };

  const getVolumeHistory = async (targetUserId: string, days: number = 30): Promise<any[]> => {
    return await database.getVolumeHistory(targetUserId, days);
  };

  const getPRHistory = async (targetUserId: string, exerciseId: string): Promise<any[]> => {
    return await database.getPRHistory(targetUserId, exerciseId);
  };

  const saveBodyMeasurement = async (measurement: any): Promise<void> => {
    await database.saveBodyMeasurement(measurement);
  };

  const getBodyMeasurements = async (targetUserId: string): Promise<any[]> => {
    return await database.getBodyMeasurements(targetUserId);
  };

  const getWeightHistory = async (targetUserId: string, days?: number): Promise<any[]> => {
    return await database.getWeightHistory(targetUserId, days);
  };

  const deleteBodyMeasurement = async (measurementId: string): Promise<void> => {
    await database.deleteBodyMeasurement(measurementId);
  };

  const saveGoal = async (goal: any): Promise<void> => {
    await database.saveGoal(goal);
  };

  const getGoals = async (targetUserId: string, status?: string): Promise<any[]> => {
    return await database.getGoals(targetUserId, status);
  };

  const getGoal = async (goalId: string): Promise<any | null> => {
    return await database.getGoal(goalId);
  };

  const updateGoalProgress = async (goalId: string, currentValue: number, status?: string): Promise<void> => {
    await database.updateGoalProgress(goalId, currentValue, status);
  };

  const deleteGoal = async (goalId: string): Promise<void> => {
    await database.deleteGoal(goalId);
  };

  const unlockAchievement = async (achievement: any): Promise<void> => {
    await database.unlockAchievement(achievement);
  };

  const getUserAchievements = async (targetUserId: string): Promise<any[]> => {
    return await database.getUserAchievements(targetUserId);
  };

  const hasAchievement = async (targetUserId: string, achievementId: string): Promise<boolean> => {
    return await database.hasAchievement(targetUserId, achievementId);
  };

  const checkAndUnlockAchievements = async (targetUserId: string): Promise<void> => {
    // Legacy implementation kept for now
  };

  const addTPath = async (tPath: TPath): Promise<void> => {
    await database.addTPath(tPath);
  };

  const getTPath = async (tPathId: string): Promise<TPathWithExercises | null> => {
    return await database.getTPath(tPathId);
  };

  const getTPaths = async (targetUserId: string, mainProgramsOnly?: boolean): Promise<TPath[]> => {
    return await database.getTPaths(targetUserId, mainProgramsOnly);
  };

  const getTPathsByParent = async (parentId: string): Promise<TPath[]> => {
    return await database.getTPathsByParent(parentId);
  };

  const updateTPath = async (tPathId: string, updates: Partial<TPath>): Promise<void> => {
    await database.updateTPath(tPathId, updates);
  };

  const deleteTPath = async (tPathId: string): Promise<void> => {
    await database.deleteTPath(tPathId);
  };

  const addTPathExercise = async (exercise: TPathExercise): Promise<void> => {
    await database.addTPathExercise(exercise);
  };

  const getTPathExercises = async (tPathId: string): Promise<TPathExercise[]> => {
    return await database.getTPathExercises(tPathId);
  };

  const deleteTPathExercise = async (exerciseId: string): Promise<void> => {
    await database.deleteTPathExercise(exerciseId);
  };

  const updateTPathProgress = async (progress: TPathProgress): Promise<void> => {
    await database.updateTPathProgress(progress);
  };

  const getTPathProgress = async (targetUserId: string, tPathId: string): Promise<TPathProgress | null> => {
    return await database.getTPathProgress(targetUserId, tPathId);
  };

  const getAllTPathProgress = async (targetUserId: string): Promise<TPathProgress[]> => {
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

  const updateGym = async (gymId: string, updates: Partial<Gym>): Promise<void> => {
    await database.updateGym(gymId, updates);
  };

  const setActiveGym = async (targetUserId: string, gymId: string): Promise<void> => {
    await database.setActiveGym(targetUserId, gymId);
    if (targetUserId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.gyms(targetUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeGym(targetUserId) });
    }
  };

  const deleteGym = async (gymId: string): Promise<void> => {
    await database.deleteGym(gymId);
  };

  const forceRefreshProfile = useCallback(async () => {
    if (isInitialized && userId && isOnline) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    invalidateAllCaches();
    setForceRefresh(prev => prev + 1);
  }, [isInitialized, userId, isOnline, invalidateAllCaches]);

  const forceSyncPendingItems = useCallback(async () => {
    if (isInitialized && userId && isOnline) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }, [isInitialized, userId, isOnline]);

  const cleanupUserData = useCallback(async (userId: string) => {
    const result = await database.cleanupUserData(userId);
    if (result.success) {
      invalidateAllCaches();
      setForceRefresh(prev => prev + 1);
    }
    return result;
  }, [invalidateAllCaches]);

  const emergencyReset = useCallback(async () => {
    const result = { success: true };
    if (result.success) {
      invalidateAllCaches();
      setForceRefresh(prev => prev + 1);
    }
    return result;
  }, [invalidateAllCaches]);

  const handleWorkoutCompletion = useCallback(async (session?: WorkoutSession | undefined): Promise<void> => {
    invalidateAllCaches();
    setShouldRefreshDashboard(true);
    setLastWorkoutCompletionTime(Date.now());
    setTempStatusMessageState({ message: 'Workout Complete!', type: 'success' });
    
    if (userId && supabase) {
      try {
        await supabase.functions.invoke('calculate-rolling-status', { body: { user_id: userId } });
        await supabase.functions.invoke('process-achievements', { body: { user_id: userId, session_id: session?.id } });
      } catch (error) {
        log.error('[DataContext] Error in background tasks:', error);
      }
    }
    await forceRefreshProfile();
  }, [invalidateAllCaches, forceRefreshProfile, userId, supabase]);

  const setTempStatusMessage = useCallback((message: TempStatusMessage | null) => {
    if (tempStatusTimeoutRef.current) {
      clearTimeout(tempStatusTimeoutRef.current);
      tempStatusTimeoutRef.current = null;
    }
    setTempStatusMessageState(message);
    if (message) {
      tempStatusTimeoutRef.current = setTimeout(() => {
        setTempStatusMessageState(null);
        tempStatusTimeoutRef.current = null;
      }, 5000);
    }
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
      forceRefreshProfile,
      forceSyncPendingItems,
      cleanupUserData,
      emergencyReset,
      invalidateAllCaches,
      handleWorkoutCompletion,
      shouldRefreshDashboard,
      setShouldRefreshDashboard,
      lastWorkoutCompletionTime,
      setLastWorkoutCompletionTime,
      tempStatusMessage,
      setTempStatusMessage,
      isGeneratingPlan,
      setIsGeneratingPlan,
      forceRefresh,
    }),
    [isSyncing, queueLength, isOnline, forceRefreshProfile, cleanupUserData, emergencyReset, supabase, userId, tempStatusMessage, isGeneratingPlan, setTempStatusMessage, forceRefresh, invalidateAllCaches, handleWorkoutCompletion, shouldRefreshDashboard, lastWorkoutCompletionTime]
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
