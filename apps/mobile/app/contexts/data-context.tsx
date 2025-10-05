import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { database, addToSyncQueue } from '../lib/database';
import { useSyncQueueProcessor } from '@data/hooks/use-sync-queue-processor';
import { useAuth } from './auth-context';
import type { WorkoutSession, SetLog, WorkoutTemplate } from '@data/storage/models';
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
