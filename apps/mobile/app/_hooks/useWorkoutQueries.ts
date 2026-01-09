import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { database } from '../_lib/database';
import { queryKeys, invalidateUserQueries } from '../_lib/react-query-client';
import { useUIStore } from '../_lib/ui-store';
import type { WorkoutSession, SetLog } from '@data/storage';

// Query hooks for workout sessions
export const useWorkoutSessions = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.workoutSessions(userId),
    queryFn: () => database.getWorkoutSessions(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRecentWorkouts = (userId: string, limit: number = 3) => {
  return useQuery({
    queryKey: queryKeys.recentWorkouts(userId, limit),
    queryFn: () => database.getRecentWorkoutSummaries(userId, limit),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useWorkoutSessionById = (sessionId: string) => {
  return useQuery({
    queryKey: ['workout-session', sessionId] as const,
    queryFn: () => database.getWorkoutSessionById(sessionId),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSetLogs = (sessionId: string) => {
  return useQuery({
    queryKey: ['set-logs', sessionId] as const,
    queryFn: () => database.getSetLogs(sessionId),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Workout stats queries
export const useWorkoutStats = (userId: string, days: number = 30) => {
  return useQuery({
    queryKey: queryKeys.workoutStats(userId, days),
    queryFn: () => database.getWorkoutStats(userId, days),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useWorkoutFrequency = (userId: string, days: number = 30) => {
  return useQuery({
    queryKey: queryKeys.workoutFrequency(userId, days),
    queryFn: () => database.getWorkoutFrequency(userId, days),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};

export const useVolumeHistory = (userId: string, days: number = 30) => {
  return useQuery({
    queryKey: queryKeys.volumeHistory(userId, days),
    queryFn: () => database.getVolumeHistory(userId, days),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};

export const useWeeklyVolume = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.weeklyVolume(userId),
    queryFn: () => database.getWeeklyVolumeData(userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Personal record queries
export const usePersonalRecord = (userId: string, exerciseId: string) => {
  return useQuery({
    queryKey: queryKeys.exercisePR(userId, exerciseId),
    queryFn: () => database.getPersonalRecord(userId, exerciseId),
    enabled: !!userId && !!exerciseId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Mutation hooks for workout operations
export const useAddWorkoutSession = () => {
  const queryClient = useQueryClient();
  const { setSavingWorkout } = useUIStore();

  return useMutation({
    mutationFn: async (session: WorkoutSession) => {
      setSavingWorkout(true);
      await database.addWorkoutSession(session);
      return session;
    },
    onSuccess: (session) => {
      // Invalidate relevant queries
      invalidateUserQueries(session.user_id);
      
      // Update specific queries optimistically
      queryClient.invalidateQueries({
        queryKey: queryKeys.workoutSessions(session.user_id),
      });
      
      queryClient.invalidateQueries({
        queryKey: queryKeys.recentWorkouts(session.user_id),
      });
      
      queryClient.invalidateQueries({
        queryKey: queryKeys.workoutStats(session.user_id),
      });
      
      queryClient.invalidateQueries({
        queryKey: queryKeys.weeklyVolume(session.user_id),
      });
      
      // Force immediate refetch for critical dashboard components
      queryClient.refetchQueries({
        queryKey: queryKeys.workoutSessions(session.user_id),
      });
      
      queryClient.refetchQueries({
        queryKey: queryKeys.weeklyVolume(session.user_id),
      });
    },
    onError: (error) => {
      console.error('Failed to add workout session:', error);
    },
    onSettled: () => {
      setSavingWorkout(false);
    },
  });
};

export const useUpdateWorkoutSession = () => {
  const queryClient = useQueryClient();
  const { setSavingWorkout } = useUIStore();

  return useMutation({
    mutationFn: async ({ sessionId, updates }: { sessionId: string; updates: Partial<WorkoutSession> }) => {
      setSavingWorkout(true);
      await database.updateWorkoutSession(sessionId, updates);
      return { sessionId, updates };
    },
    onSuccess: ({ sessionId, updates }) => {
      // Get the userId from the session (we'll need to fetch it first)
      queryClient.invalidateQueries({
        queryKey: ['workout-session', sessionId],
      });
      
      // Invalidate all user queries - we'll get the userId from the updated session
      // This is a bit tricky since we don't have the userId directly here
      // For now, invalidate all workout queries
      queryClient.invalidateQueries({
        queryKey: ['workout-sessions'],
      });
      
      queryClient.invalidateQueries({
        queryKey: ['recent-workouts'],
      });
      
      queryClient.invalidateQueries({
        queryKey: ['workout-stats'],
      });
    },
    onError: (error) => {
      console.error('Failed to update workout session:', error);
    },
    onSettled: () => {
      setSavingWorkout(false);
    },
  });
};

export const useDeleteWorkoutSession = () => {
  const queryClient = useQueryClient();
  const { setDeletingWorkout } = useUIStore();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      setDeletingWorkout(true);
      
      // First get the session to know the user_id
      const session = await database.getWorkoutSessionById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Clear database caches FIRST before deletion
      console.log('[DeleteWorkout] Clearing database caches before deletion');
      database.clearAllCachesForUser(session.user_id);
      
      // Delete from database
      await database.deleteWorkoutSession(sessionId);
      
      console.log('[DeleteWorkout] Database deletion completed for session:', sessionId);
      return session;
    },
    onSuccess: (session) => {
      console.log('[DeleteWorkout] Starting aggressive cache invalidation for user:', session.user_id);
      
      // Clear React Query cache more aggressively
      queryClient.removeQueries({
        predicate: (query) => {
          // Remove queries that contain the user ID
          return query.queryKey.some(key => 
            typeof key === 'string' && key.includes(session.user_id)
          );
        }
      });
      
      // Invalidate all user-related queries
      invalidateUserQueries(session.user_id);
      
      // Remove the specific session from cache
      queryClient.removeQueries({
        queryKey: ['workout-session', session.id],
      });
      
      queryClient.removeQueries({
        queryKey: ['set-logs', session.id],
      });
      
      // Force immediate refetch for critical dashboard components
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: queryKeys.workoutSessions(session.user_id),
        });
        
        queryClient.refetchQueries({
          queryKey: queryKeys.weeklyVolume(session.user_id),
        });
        
        queryClient.refetchQueries({
          queryKey: queryKeys.recentWorkouts(session.user_id),
        });
        
        queryClient.refetchQueries({
          queryKey: queryKeys.workoutStats(session.user_id),
        });
      }, 100); // Small delay to ensure database operations complete first
      
      console.log('[DeleteWorkout] Cache invalidation completed');
    },
    onError: (error) => {
      console.error('Failed to delete workout session:', error);
    },
    onSettled: () => {
      setDeletingWorkout(false);
    },
  });
};

export const useAddSetLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (setLog: SetLog) => {
      await database.addSetLog(setLog);
      return setLog;
    },
    onSuccess: (setLog) => {
      // Get session info to invalidate user queries
      queryClient.invalidateQueries({
        queryKey: ['set-logs', setLog.session_id],
      });
      
      // Invalidate weekly volume since set logs affect volume calculations
      queryClient.invalidateQueries({
        queryKey: ['weekly-volume'],
      });
      
      // Force immediate refetch for weekly volume after set log addition
      queryClient.refetchQueries({
        queryKey: ['weekly-volume'],
      });
    },
    onError: (error) => {
      console.error('Failed to add set log:', error);
    },
  });
};

export const useReplaceSetLogsForSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, logs }: { sessionId: string; logs: SetLog[] }) => {
      await database.replaceSetLogsForSession(sessionId, logs);
      return { sessionId, logs };
    },
    onSuccess: ({ sessionId }) => {
      // Invalidate set logs for this session
      queryClient.invalidateQueries({
        queryKey: ['set-logs', sessionId],
      });
      
      // Invalidate weekly volume
      queryClient.invalidateQueries({
        queryKey: ['weekly-volume'],
      });
      
      // Force immediate refetch for weekly volume after set logs change
      queryClient.refetchQueries({
        queryKey: ['weekly-volume'],
      });
    },
    onError: (error) => {
      console.error('Failed to replace set logs:', error);
    },
  });
};

// Utility hooks for dashboard
export const useDashboardData = (userId: string) => {
  const sessionsQuery = useWorkoutSessions(userId);
  const recentWorkoutsQuery = useRecentWorkouts(userId);
  const workoutStatsQuery = useWorkoutStats(userId);
  const weeklyVolumeQuery = useWeeklyVolume(userId);
  const workoutFrequencyQuery = useWorkoutFrequency(userId);

  const isLoading = sessionsQuery.isLoading || recentWorkoutsQuery.isLoading || 
                   workoutStatsQuery.isLoading || weeklyVolumeQuery.isLoading || 
                   workoutFrequencyQuery.isLoading;

  const hasError = sessionsQuery.error || recentWorkoutsQuery.error || 
                  workoutStatsQuery.error || weeklyVolumeQuery.error || 
                  workoutFrequencyQuery.error;

  return {
    sessions: sessionsQuery.data || [],
    recentWorkouts: recentWorkoutsQuery.data || [],
    workoutStats: workoutStatsQuery.data,
    weeklyVolume: weeklyVolumeQuery.data,
    workoutFrequency: workoutFrequencyQuery.data,
    isLoading,
    hasError,
    refetch: () => {
      sessionsQuery.refetch();
      recentWorkoutsQuery.refetch();
      workoutStatsQuery.refetch();
      weeklyVolumeQuery.refetch();
      workoutFrequencyQuery.refetch();
    },
  };
};

// Hook for automatic refresh when workouts are completed or deleted
export const useRefreshWorkoutData = (userId: string) => {
  const queryClient = useQueryClient();

  const refreshWorkoutData = () => {
    if (!userId) return;
    
    // Invalidate all workout-related queries
    invalidateUserQueries(userId);
  };

  const refreshAfterWorkoutCompletion = () => {
    if (!userId) return;
    
    // More aggressive refresh after workout completion
    queryClient.invalidateQueries({
      queryKey: queryKeys.workoutSessions(userId),
    });
    
    queryClient.invalidateQueries({
      queryKey: queryKeys.recentWorkouts(userId),
    });
    
    queryClient.invalidateQueries({
      queryKey: queryKeys.workoutStats(userId),
    });
    
    queryClient.invalidateQueries({
      queryKey: queryKeys.weeklyVolume(userId),
    });
    
    queryClient.invalidateQueries({
      queryKey: queryKeys.workoutFrequency(userId),
    });
  };

  return {
    refreshWorkoutData,
    refreshAfterWorkoutCompletion,
  };
};

export default {
  useWorkoutSessions,
  useRecentWorkouts,
  useWorkoutSessionById,
  useSetLogs,
  useWorkoutStats,
  useWorkoutFrequency,
  useVolumeHistory,
  useWeeklyVolume,
  usePersonalRecord,
  useAddWorkoutSession,
  useUpdateWorkoutSession,
  useDeleteWorkoutSession,
  useAddSetLog,
  useReplaceSetLogsForSession,
  useDashboardData,
  useRefreshWorkoutData,
};