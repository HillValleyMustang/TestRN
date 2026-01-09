import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../_lib/ui-store';
import { invalidateUserQueries } from '../_lib/react-query-client';
import { useAddWorkoutSession, useDeleteWorkoutSession } from './useWorkoutQueries';
import type { WorkoutSession } from '@data/storage';
import { database } from '../_lib/database';

/**
 * Hook for managing workout lifecycle events and automatic dashboard refresh
 * This hook provides functions that should be called when workouts are completed or deleted
 */
export const useWorkoutLifecycle = (userId: string) => {
  const queryClient = useQueryClient();
  const { setErrorMessage } = useUIStore();
  
  // Get the mutation hooks
  const addWorkoutSessionMutation = useAddWorkoutSession();
  const deleteWorkoutSessionMutation = useDeleteWorkoutSession();

  /**
   * Handle workout completion - should be called when a workout is finished
   * This automatically refreshes the dashboard and all related data
   */
  const handleWorkoutCompleted = useCallback(async (workoutSession: WorkoutSession) => {
    try {
      console.log('[WorkoutLifecycle] Handling workout completion:', workoutSession.id);
      
      // Add the workout session
      await addWorkoutSessionMutation.mutateAsync(workoutSession);
      
      // Close any workout summary modal
      useUIStore.getState().closeWorkoutSummaryModal();
      
      // Force a comprehensive refresh of all workout-related data
      await refreshAllWorkoutData(userId);
      
      console.log('[WorkoutLifecycle] Workout completion handled successfully');
      
    } catch (error) {
      console.error('[WorkoutLifecycle] Failed to handle workout completion:', error);
      setErrorMessage('Failed to save workout. Please try again.');
    }
  }, [userId, addWorkoutSessionMutation, setErrorMessage]);

  /**
   * Handle workout deletion - should be called when a workout is deleted
   * This automatically refreshes the dashboard and removes the workout from cache
   */
  const handleWorkoutDeleted = useCallback(async (sessionId: string) => {
    try {
      console.log('[WorkoutLifecycle] Handling workout deletion:', sessionId);
      
      // Delete the workout session (this now handles all cache clearing)
      await deleteWorkoutSessionMutation.mutateAsync(sessionId);
      
      // Close any delete confirmation modal
      useUIStore.getState().closeDeleteConfirmationModal();
      
      // Note: refreshAllWorkoutData is called within the mutation success handler
      // Additional clearing here would be redundant and could cause race conditions
      
      console.log('[WorkoutLifecycle] Workout deletion handled successfully');
      
    } catch (error) {
      console.error('[WorkoutLifecycle] Failed to handle workout deletion:', error);
      setErrorMessage('Failed to delete workout. Please try again.');
    }
  }, [userId, deleteWorkoutSessionMutation, setErrorMessage]);

  /**
   * Handle workout update - should be called when a workout is modified
   * This automatically refreshes the dashboard and updates the specific workout
   */
  const handleWorkoutUpdated = useCallback(async (sessionId: string, updates: Partial<WorkoutSession>) => {
    try {
      console.log('[WorkoutLifecycle] Handling workout update:', sessionId);
      
      // Update the workout session
      await queryClient.invalidateQueries({
        queryKey: ['workout-session', sessionId],
      });
      
      // Refresh all user data since stats might have changed
      await refreshAllWorkoutData(userId);
      
      console.log('[WorkoutLifecycle] Workout update handled successfully');
      
    } catch (error) {
      console.error('[WorkoutLifecycle] Failed to handle workout update:', error);
      setErrorMessage('Failed to update workout. Please try again.');
    }
  }, [userId, queryClient, setErrorMessage]);

  /**
   * Refresh all workout-related data for the user
   * This is the core function that ensures the dashboard stays up-to-date
   */
  const refreshAllWorkoutData = useCallback(async (userId: string) => {
    if (!userId) {
      console.warn('[WorkoutLifecycle] Cannot refresh data: no userId provided');
      return;
    }

    console.log('[WorkoutLifecycle] Refreshing all workout data for user:', userId);

    try {
      // Invalidate all user-specific queries
      invalidateUserQueries(userId);
      
      // Additional specific invalidation for critical dashboard components
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workouts', userId] }),
        queryClient.invalidateQueries({ queryKey: ['workout-sessions', userId] }),
        queryClient.invalidateQueries({ queryKey: ['recent-workouts', userId] }),
        queryClient.invalidateQueries({ queryKey: ['workout-stats', userId] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-volume', userId] }),
        queryClient.invalidateQueries({ queryKey: ['workout-frequency', userId] }),
        queryClient.invalidateQueries({ queryKey: ['volume-history', userId] }),
        queryClient.invalidateQueries({ queryKey: ['achievements', userId] }),
        queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
      ]);
      
      // Force immediate refetch for dashboard components
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['workout-sessions', userId] }),
        queryClient.refetchQueries({ queryKey: ['weekly-volume', userId] }),
      ]);

      console.log('[WorkoutLifecycle] All workout data refreshed successfully');
      
    } catch (error) {
      console.error('[WorkoutLifecycle] Failed to refresh workout data:', error);
    }
  }, [queryClient]);

  /**
   * Optimistic update for immediate UI feedback
   * Use this when you want the UI to update immediately before the server confirms
   */
  const optimisticWorkoutUpdate = useCallback((workoutData: Partial<WorkoutSession>) => {
    if (!userId) return;

    console.log('[WorkoutLifecycle] Performing optimistic update');

    // Update queries optimistically
    queryClient.setQueryData(['workout-sessions', userId], (oldData: WorkoutSession[] | undefined) => {
      if (!oldData) return oldData;
      return oldData.map(session => 
        session.id === workoutData.id ? { ...session, ...workoutData } : session
      );
    });
  }, [userId, queryClient]);

  /**
   * Reset UI state after workout operations
   * Call this to clear loading states and close modals
   */
  const resetWorkoutUIState = useCallback(() => {
    useUIStore.getState().updateMultipleStates({
      isSavingWorkout: false,
      isDeletingWorkout: false,
      isRefreshingData: false,
    });
  }, []);

  /**
   * Check if any workout operations are currently in progress
   */
  const isWorkoutOperationInProgress = useCallback(() => {
    const { isSavingWorkout, isDeletingWorkout, isRefreshingData } = useUIStore.getState();
    return isSavingWorkout || isDeletingWorkout || isRefreshingData;
  }, []);

  return {
    // Core lifecycle handlers
    handleWorkoutCompleted,
    handleWorkoutDeleted,
    handleWorkoutUpdated,
    
    // Utility functions
    refreshAllWorkoutData,
    optimisticWorkoutUpdate,
    resetWorkoutUIState,
    isWorkoutOperationInProgress,
    
    // Loading states
    isCompletingWorkout: addWorkoutSessionMutation.isPending,
    isDeletingWorkout: deleteWorkoutSessionMutation.isPending,
    
    // Error states
    completionError: addWorkoutSessionMutation.error,
    deletionError: deleteWorkoutSessionMutation.error,
  };
};

/**
 * Hook specifically for the WorkoutSummaryModal
 * Provides modal-specific lifecycle management
 */
export const useWorkoutSummaryModalLifecycle = (userId: string) => {
  const lifecycle = useWorkoutLifecycle(userId);
  const { isWorkoutSummaryModalOpen, closeWorkoutSummaryModal } = useUIStore();

  /**
   * Handle modal close after successful workout completion
   */
  const handleModalCloseAfterCompletion = useCallback(async (workoutSession: WorkoutSession) => {
    await lifecycle.handleWorkoutCompleted(workoutSession);
    closeWorkoutSummaryModal();
  }, [lifecycle, closeWorkoutSummaryModal]);

  /**
   * Handle modal close after workout deletion
   */
  const handleModalCloseAfterDeletion = useCallback(async (sessionId: string) => {
    await lifecycle.handleWorkoutDeleted(sessionId);
    closeWorkoutSummaryModal();
  }, [lifecycle, closeWorkoutSummaryModal]);

  return {
    ...lifecycle,
    isWorkoutSummaryModalOpen,
    closeWorkoutSummaryModal,
    handleModalCloseAfterCompletion,
    handleModalCloseAfterDeletion,
  };
};

/**
 * Hook for dashboard refresh management
 * Use this in dashboard components to ensure data stays fresh
 */
export const useDashboardRefresh = (userId: string) => {
  const queryClient = useQueryClient();
  const { setRefreshingData } = useUIStore();

  /**
   * Force refresh all dashboard data
   */
  const refreshDashboard = useCallback(async () => {
    if (!userId) return;

    setRefreshingData(true);
    
    try {
      await queryClient.invalidateQueries();
      console.log('[DashboardRefresh] Dashboard data refreshed');
    } catch (error) {
      console.error('[DashboardRefresh] Failed to refresh dashboard:', error);
    } finally {
      setRefreshingData(false);
    }
  }, [userId, queryClient, setRefreshingData]);

  /**
   * Refresh specific dashboard components
   */
  const refreshDashboardComponent = useCallback((componentType: 'workouts' | 'stats' | 'volume' | 'frequency') => {
    if (!userId) return;

    const componentQueries = {
      workouts: ['workout-sessions', userId],
      stats: ['workout-stats', userId],
      volume: ['weekly-volume', userId],
      frequency: ['workout-frequency', userId],
    };

    const queryKey = componentQueries[componentType];
    if (queryKey) {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [userId, queryClient]);

  return {
    refreshDashboard,
    refreshDashboardComponent,
    isRefreshing: useUIStore(state => state.isRefreshingData),
  };
};

export default useWorkoutLifecycle;