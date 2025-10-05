import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { database, addToSyncQueue } from "../_lib/database";
import { useSyncQueueProcessor } from "@data/hooks/use-sync-queue-processor";
import { useAuth } from "./auth-context";
import type {
  WorkoutSession,
  SetLog,
  WorkoutTemplate,
  TPath,
  TPathExercise,
  TPathProgress,
  TPathWithExercises,
  Gym,
} from "@data/storage/models";
import NetInfo from "@react-native-community/netinfo";

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
  getWorkoutFrequency: (
    userId: string,
    days?: number,
  ) => Promise<Array<{ date: string; count: number }>>;
  getVolumeHistory: (
    userId: string,
    days?: number,
  ) => Promise<Array<{ date: string; volume: number }>>;
  getPRHistory: (
    userId: string,
    exerciseId: string,
  ) => Promise<Array<{ date: string; weight: number }>>;
  saveBodyMeasurement: (measurement: BodyMeasurement) => Promise<void>;
  getBodyMeasurements: (userId: string) => Promise<BodyMeasurement[]>;
  getWeightHistory: (
    userId: string,
    days?: number,
  ) => Promise<Array<{ date: string; weight: number }>>;
  deleteBodyMeasurement: (measurementId: string) => Promise<void>;
  saveGoal: (goal: Goal) => Promise<void>;
  getGoals: (userId: string, status?: string) => Promise<Goal[]>;
  getGoal: (goalId: string) => Promise<Goal | null>;
  updateGoalProgress: (
    goalId: string,
    currentValue: number,
    status?: string,
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
    tPathId: string,
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
    const unsubscribe = NetInfo.addEventListener((state) => {
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
    await addToSyncQueue("create", "workout_sessions", session);
  };

  const addSetLog = async (setLog: SetLog): Promise<void> => {
    await database.addSetLog(setLog);
    await addToSyncQueue("create", "set_logs", setLog);
  };

  const getWorkoutSessions = async (
    targetUserId: string,
  ): Promise<WorkoutSession[]> => {
    return await database.getWorkoutSessions(targetUserId);
  };

  const getSetLogs = async (sessionId: string): Promise<SetLog[]> => {
    return await database.getSetLogs(sessionId);
  };

  const getPersonalRecord = async (
    targetUserId: string,
    exerciseId: string,
  ): Promise<number> => {
    return await database.getPersonalRecord(targetUserId, exerciseId);
  };

  const saveTemplate = async (template: WorkoutTemplate): Promise<void> => {
    await database.saveTemplate(template);
  };

  const getTemplates = async (
    targetUserId: string,
  ): Promise<WorkoutTemplate[]> => {
    return await database.getTemplates(targetUserId);
  };

  const getTemplate = async (
    templateId: string,
  ): Promise<WorkoutTemplate | null> => {
    return await database.getTemplate(templateId);
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    await database.deleteTemplate(templateId);
  };

  const getWorkoutStats = async (
    targetUserId: string,
    days: number = 30,
  ): Promise<WorkoutStats> => {
    return await database.getWorkoutStats(targetUserId, days);
  };

  const getWorkoutFrequency = async (
    targetUserId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; count: number }>> => {
    return await database.getWorkoutFrequency(targetUserId, days);
  };

  const getVolumeHistory = async (
    targetUserId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; volume: number }>> => {
    return await database.getVolumeHistory(targetUserId, days);
  };

  const getPRHistory = async (
    targetUserId: string,
    exerciseId: string,
  ): Promise<Array<{ date: string; weight: number }>> => {
    return await database.getPRHistory(targetUserId, exerciseId);
  };

  const saveBodyMeasurement = async (
    measurement: BodyMeasurement,
  ): Promise<void> => {
    await database.saveBodyMeasurement(measurement);
  };

  const getBodyMeasurements = async (
    targetUserId: string,
  ): Promise<BodyMeasurement[]> => {
    return await database.getBodyMeasurements(targetUserId);
  };

  const getWeightHistory = async (
    targetUserId: string,
    days?: number,
  ): Promise<Array<{ date: string; weight: number }>> => {
    return await database.getWeightHistory(targetUserId, days);
  };

  const deleteBodyMeasurement = async (
    measurementId: string,
  ): Promise<void> => {
    await database.deleteBodyMeasurement(measurementId);
  };

  const saveGoal = async (goal: Goal): Promise<void> => {
    await database.saveGoal(goal);
  };

  const getGoals = async (
    targetUserId: string,
    status?: string,
  ): Promise<Goal[]> => {
    return await database.getGoals(targetUserId, status);
  };

  const getGoal = async (goalId: string): Promise<Goal | null> => {
    return await database.getGoal(goalId);
  };

  const updateGoalProgress = async (
    goalId: string,
    currentValue: number,
    status?: string,
  ): Promise<void> => {
    await database.updateGoalProgress(goalId, currentValue, status);
  };

  const deleteGoal = async (goalId: string): Promise<void> => {
    await database.deleteGoal(goalId);
  };

  const unlockAchievement = async (
    achievement: UserAchievement,
  ): Promise<void> => {
    await database.unlockAchievement(achievement);
  };

  const getUserAchievements = async (
    targetUserId: string,
  ): Promise<UserAchievement[]> => {
    return await database.getUserAchievements(targetUserId);
  };

  const hasAchievement = async (
    targetUserId: string,
    achievementId: string,
  ): Promise<boolean> => {
    return await database.hasAchievement(targetUserId, achievementId);
  };

  const checkAndUnlockAchievements = async (
    targetUserId: string,
  ): Promise<void> => {
    const { ACHIEVEMENTS } = await import("@data/achievements");
    const stats = await database.getWorkoutStats(targetUserId);
    const unlockedAchievements = await database.getUserAchievements(
      targetUserId,
    );
    const unlockedIds = new Set(
      unlockedAchievements.map((a) => a.achievement_id),
    );

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.id)) {
        continue;
      }

      let shouldUnlock = false;
      let progressValue = 0;

      switch (achievement.requirement.type) {
        case "workout_count":
          progressValue = stats.totalWorkouts;
          shouldUnlock = progressValue >= achievement.requirement.value;
          break;
        case "streak_days":
          progressValue = stats.currentStreak;
          shouldUnlock = progressValue >= achievement.requirement.value;
          break;
        case "total_volume":
          progressValue = stats.totalVolume;
          shouldUnlock = progressValue >= achievement.requirement.value;
          break;
        case "max_weight":
          if (achievement.requirement.exercise_id) {
            progressValue = await database.getPersonalRecord(targetUserId, achievement.requirement.exercise_id);
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
    tPathId: string,
  ): Promise<TPathWithExercises | null> => {
    return await database.getTPath(tPathId);
  };

  const getTPaths = async (
    userId: string,
    mainProgramsOnly?: boolean,
  ): Promise<TPath[]> => {
    return await database.getTPaths(userId, mainProgramsOnly);
  };

  const getTPathsByParent = async (parentId: string): Promise<TPath[]> => {
    return await database.getTPathsByParent(parentId);
  };

  const updateTPath = async (
    tPathId: string,
    updates: Partial<TPath>,
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
    tPathId: string,
  ): Promise<TPathExercise[]> => {
    return await database.getTPathExercises(tPathId);
  };

  const deleteTPathExercise = async (exerciseId: string): Promise<void> => {
    await database.deleteTPathExercise(exerciseId);
  };

  const updateTPathProgress = async (
    progress: TPathProgress,
  ): Promise<void> => {
    await database.updateTPathProgress(progress);
  };

  const getTPathProgress = async (
    userId: string,
    tPathId: string,
  ): Promise<TPathProgress | null> => {
    return await database.getTPathProgress(userId, tPathId);
  };

  const getAllTPathProgress = async (
    userId: string,
  ): Promise<TPathProgress[]> => {
    return await database.getAllTPathProgress(userId);
  };

  const addGym = async (gym: Gym): Promise<void> => {
    await database.addGym(gym);
  };

  const getGym = async (gymId: string): Promise<Gym | null> => {
    return await database.getGym(gymId);
  };

  const getGyms = async (userId: string): Promise<Gym[]> => {
    return await database.getGyms(userId);
  };

  const getActiveGym = async (userId: string): Promise<Gym | null> => {
    return await database.getActiveGym(userId);
  };

  const updateGym = async (
    gymId: string,
    updates: Partial<Gym>,
  ): Promise<void> => {
    await database.updateGym(gymId, updates);
  };

  const setActiveGym = async (userId: string, gymId: string): Promise<void> => {
    await database.setActiveGym(userId, gymId);
  };

  const deleteGym = async (gymId: string): Promise<void> => {
    await database.deleteGym(gymId);
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
    }),
    [isSyncing, queueLength, isOnline],
  );

  if (!isInitialized) {
    return null;
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
