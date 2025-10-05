import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { database, addToSyncQueue } from '../lib/database';
import { useSyncQueueProcessor } from '@data/hooks/use-sync-queue-processor';
import { useAuth } from './auth-context';
import type { WorkoutSession, SetLog, WorkoutTemplate, TPath, TPathExercise, TPathProgress, TPathWithExercises } from '@data/storage/models';
import NetInfo from '@react-native-community/netinfo';

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

interface DataContextType {
  addWorkoutSession: (session: WorkoutSession) => Promise<void>;
  addSetLog: (setLog: SetLog) => Promise<void>;
  getWorkoutSessions: (userId: string) => Promise<WorkoutSession[]>;
  getSetLogs: (sessionId: string) => Promise<SetLog[]>;
  getPersonalRecord: (userId: string, exerciseId: string) => Promise<number>;
  saveTemplate: (template: WorkoutTemplate) => Promise<void>;
  getTemplates: (userId: string) => Promise<WorkoutTemplate[]>;
  getTemplate: (templateId: string) => Promise<WorkoutTemplate | null>;
  deleteTemplate: (templateId: string) => Promise<void>;
  getWorkoutStats: (userId: string, days?: number) => Promise<WorkoutStats>;
  getWorkoutFrequency: (userId: string, days?: number) => Promise<Array<{ date: string; count: number }>>;
  getVolumeHistory: (userId: string, days?: number) => Promise<Array<{ date: string; volume: number }>>;
  getPRHistory: (userId: string, exerciseId: string) => Promise<Array<{ date: string; weight: number }>>;
  saveBodyMeasurement: (measurement: BodyMeasurement) => Promise<void>;
  getBodyMeasurements: (userId: string) => Promise<BodyMeasurement[]>;
  getWeightHistory: (userId: string, days?: number) => Promise<Array<{ date: string; weight: number }>>;
  deleteBodyMeasurement: (measurementId: string) => Promise<void>;
  saveGoal: (goal: Goal) => Promise<void>;
  getGoals: (userId: string, status?: string) => Promise<Goal[]>;
  getGoal: (goalId: string) => Promise<Goal | null>;
  updateGoalProgress: (goalId: string, currentValue: number, status?: string) => Promise<void>;
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
  getTPathProgress: (userId: string, tPathId: string) => Promise<TPathProgress | null>;
  getAllTPathProgress: (userId: string) => Promise<TPathProgress[]>;
  isSyncing: boolean;
  queueLength: number;
  isOnline: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const { supabase, userId } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    database.init().then(() => setIsInitialized(true));
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  const { isSyncing, queueLength } = useSyncQueueProcessor({
    supabase,
    store: database.syncQueue,
    isOnline,
    enabled: isInitialized && !!userId,
  });

  const addWorkoutSession = async (session: WorkoutSession): Promise<void> => {
    await database.addWorkoutSession(session);
    await addToSyncQueue('create', 'workout_sessions', session);
  };

  const addSetLog = async (setLog: SetLog): Promise<void> => {
    await database.addSetLog(setLog);
    await addToSyncQueue('create', 'set_logs', setLog);
  };

  const getWorkoutSessions = async (userId: string): Promise<WorkoutSession[]> => {
    return await database.getWorkoutSessions(userId);
  };

  const getSetLogs = async (sessionId: string): Promise<SetLog[]> => {
    return await database.getSetLogs(sessionId);
  };

  const getPersonalRecord = async (userId: string, exerciseId: string): Promise<number> => {
    return await database.getPersonalRecord(userId, exerciseId);
  };

  const saveTemplate = async (template: WorkoutTemplate): Promise<void> => {
    await database.saveTemplate(template);
  };

  const getTemplates = async (userId: string): Promise<WorkoutTemplate[]> => {
    return await database.getTemplates(userId);
  };

  const getTemplate = async (templateId: string): Promise<WorkoutTemplate | null> => {
    return await database.getTemplate(templateId);
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    await database.deleteTemplate(templateId);
  };

  const getWorkoutStats = async (userId: string, days: number = 30): Promise<WorkoutStats> => {
    return await database.getWorkoutStats(userId, days);
  };

  const getWorkoutFrequency = async (userId: string, days: number = 30): Promise<Array<{ date: string; count: number }>> => {
    return await database.getWorkoutFrequency(userId, days);
  };

  const getVolumeHistory = async (userId: string, days: number = 30): Promise<Array<{ date: string; volume: number }>> => {
    return await database.getVolumeHistory(userId, days);
  };

  const getPRHistory = async (userId: string, exerciseId: string): Promise<Array<{ date: string; weight: number }>> => {
    return await database.getPRHistory(userId, exerciseId);
  };

  const saveBodyMeasurement = async (measurement: BodyMeasurement): Promise<void> => {
    await database.saveBodyMeasurement(measurement);
  };

  const getBodyMeasurements = async (userId: string): Promise<BodyMeasurement[]> => {
    return await database.getBodyMeasurements(userId);
  };

  const getWeightHistory = async (userId: string, days?: number): Promise<Array<{ date: string; weight: number }>> => {
    return await database.getWeightHistory(userId, days);
  };

  const deleteBodyMeasurement = async (measurementId: string): Promise<void> => {
    await database.deleteBodyMeasurement(measurementId);
  };

  const saveGoal = async (goal: Goal): Promise<void> => {
    await database.saveGoal(goal);
  };

  const getGoals = async (userId: string, status?: string): Promise<Goal[]> => {
    return await database.getGoals(userId, status);
  };

  const getGoal = async (goalId: string): Promise<Goal | null> => {
    return await database.getGoal(goalId);
  };

  const updateGoalProgress = async (goalId: string, currentValue: number, status?: string): Promise<void> => {
    await database.updateGoalProgress(goalId, currentValue, status);
  };

  const deleteGoal = async (goalId: string): Promise<void> => {
    await database.deleteGoal(goalId);
  };

  const unlockAchievement = async (achievement: UserAchievement): Promise<void> => {
    await database.unlockAchievement(achievement);
  };

  const getUserAchievements = async (userId: string): Promise<UserAchievement[]> => {
    return await database.getUserAchievements(userId);
  };

  const hasAchievement = async (userId: string, achievementId: string): Promise<boolean> => {
    return await database.hasAchievement(userId, achievementId);
  };

  const checkAndUnlockAchievements = async (userId: string): Promise<void> => {
    const { ACHIEVEMENTS } = await import('@data/achievements');
    const stats = await database.getWorkoutStats(userId);
    const unlockedAchievements = await database.getUserAchievements(userId);
    const unlockedIds = new Set(unlockedAchievements.map(a => a.achievement_id));

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.id)) continue;

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
            progressValue = await database.getPersonalRecord(userId, achievement.requirement.exercise_id);
            shouldUnlock = progressValue >= achievement.requirement.value;
          }
          break;
      }

      if (shouldUnlock) {
        await database.unlockAchievement({
          id: `${userId}_${achievement.id}_${Date.now()}`,
          user_id: userId,
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

  const getTPath = async (tPathId: string): Promise<TPathWithExercises | null> => {
    return await database.getTPath(tPathId);
  };

  const getTPaths = async (userId: string, mainProgramsOnly?: boolean): Promise<TPath[]> => {
    return await database.getTPaths(userId, mainProgramsOnly);
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

  const getTPathProgress = async (userId: string, tPathId: string): Promise<TPathProgress | null> => {
    return await database.getTPathProgress(userId, tPathId);
  };

  const getAllTPathProgress = async (userId: string): Promise<TPathProgress[]> => {
    return await database.getAllTPathProgress(userId);
  };

  const value = useMemo(
    () => ({
      addWorkoutSession,
      addSetLog,
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
      isSyncing,
      queueLength,
      isOnline,
    }),
    [isSyncing, queueLength, isOnline]
  );

  if (!isInitialized) {
    return null;
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
