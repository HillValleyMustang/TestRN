import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { database, addToSyncQueue } from '../lib/database';
import { useSyncQueueProcessor } from '@data/hooks/use-sync-queue-processor';
import { useAuth } from './auth-context';
import type { WorkoutSession, SetLog, WorkoutTemplate } from '@data/storage/models';
import NetInfo from '@react-native-community/netinfo';

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
