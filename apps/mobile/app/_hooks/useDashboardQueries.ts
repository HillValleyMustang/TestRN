import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { database } from '../_lib/database';
import { queryKeys } from '../_lib/react-query-client';
import { supabase } from '../_lib/supabase';
import { WeeklyWorkoutAnalyzer, type CompletedWorkout } from '@data/ai/weekly-workout-analyzer';
import type { DashboardProfile, DashboardWeeklySummary, DashboardVolumePoint, DashboardWorkoutSummary, DashboardProgram } from '../_contexts/data-context';
import type { Gym } from '@data/storage/models';

// Dashboard data aggregation query
export const useDashboardData = (userId: string) => {
  return useQuery({
    queryKey: ['dashboard', 'complete', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      console.log('[DashboardQuery] Fetching complete dashboard data for user:', userId);

      // Fetch all data in parallel
      const [
        profile,
        gyms,
        volumeHistory,
        recentWorkouts
      ] = await Promise.all([
        fetchProfile(userId),
        database.getGyms(userId),
        database.getVolumeHistory(userId, 7),
        database.getRecentWorkoutSummaries(userId, 50)
      ]);

      const activeGym = await getActiveGymOptimized(userId, gyms);
      const { weeklySummary, activeTPath, tPathWorkouts, nextWorkout } = await processWorkoutData(
        userId, 
        profile, 
        recentWorkouts
      );

      const processedVolumeHistory = await buildVolumePoints(volumeHistory, recentWorkouts, userId);

      const result = {
        profile,
        gyms,
        activeGym,
        weeklySummary,
        volumeHistory: processedVolumeHistory,
        recentWorkouts,
        activeTPath,
        tPathWorkouts,
        nextWorkout,
      };

      console.log('[DashboardQuery] Complete dashboard data fetched:', {
        profile: !!profile,
        gyms: gyms.length,
        activeGym: !!activeGym,
        completedWorkouts: weeklySummary.completed_workouts.length,
        totalSessions: weeklySummary.total_sessions,
        volumePoints: processedVolumeHistory.length,
        recentWorkouts: recentWorkouts.length,
        activeTPath: !!activeTPath,
        tPathWorkouts: tPathWorkouts.length,
        nextWorkout: !!nextWorkout
      });

      return result;
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute - simplified from complex timing logic
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Profile query with fallback to default
const fetchProfile = async (userId: string): Promise<DashboardProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, active_t_path_id, programme_type, preferred_session_length, full_name, first_name, last_name, onboarding_completed')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[DashboardQuery] Failed to load profile:', error);
      return getDefaultProfile(userId);
    }

    if (!data) {
      return getDefaultProfile(userId);
    }

    return {
      id: data.id,
      active_t_path_id: data.active_t_path_id,
      programme_type: data.programme_type === 'ulul' ? 'ulul' : 'ppl',
      preferred_session_length: data.preferred_session_length,
      full_name: data.full_name,
      first_name: data.first_name,
      last_name: data.last_name,
      onboarding_completed: Boolean(data.onboarding_completed),
    };
  } catch (error) {
    console.warn('[DashboardQuery] Profile fetch error:', error);
    return getDefaultProfile(userId);
  }
};

const getDefaultProfile = (userId: string): DashboardProfile => ({
  id: userId,
  active_t_path_id: null,
  programme_type: 'ppl',
  preferred_session_length: null,
  full_name: null,
  first_name: null,
  last_name: null,
  onboarding_completed: false,
});

// Optimized active gym getter with caching
const getActiveGymOptimized = async (userId: string, gyms: Gym[]): Promise<Gym | null> => {
  // First check if any gym is marked as active
  const activeGym = gyms.find(gym => gym.is_active);
  if (activeGym) {
    return activeGym;
  }

  // If no active gym but gyms exist, activate the first one
  if (gyms.length > 0) {
    try {
      await database.setActiveGym(userId, gyms[0].id);
      return { ...gyms[0], is_active: true };
    } catch (error) {
      console.warn('[DashboardQuery] Failed to set active gym:', error);
      return gyms[0]; // Return first gym even if activation failed
    }
  }

  return null;
};

// Process workout data for dashboard
const processWorkoutData = async (
  userId: string,
  profile: DashboardProfile | null,
  recentWorkouts: Array<{
    session: any;
    exercise_count: number;
    first_set_at: string | null;
    last_set_at: string | null;
  }>
) => {
  const programmeType = profile?.programme_type === 'ulul' ? 'ulul' : 'ppl';
  
  // Filter workouts to current week and deduplicate
  const { currentWeekWorkouts, uniqueWorkouts } = filterAndDeduplicateWorkouts(recentWorkouts);
  
  const weeklySummary: DashboardWeeklySummary = {
    completed_workouts: uniqueWorkouts.map(workout => ({
      id: workout.id,
      name: workout.template_name ?? 'Ad Hoc',
      sessionId: workout.id,
    })),
    goal_total: programmeType === 'ulul' ? 4 : 3,
    programme_type: programmeType,
    total_sessions: currentWeekWorkouts.length,
  };

  // Process T-Path data
  const { activeTPath, tPathWorkouts, nextWorkout } = await processTPathData(
    userId,
    profile,
    programmeType,
    recentWorkouts,
    weeklySummary.completed_workouts
  );

  return {
    weeklySummary,
    activeTPath,
    tPathWorkouts,
    nextWorkout,
  };
};

// Filter workouts to current week and remove duplicates
const filterAndDeduplicateWorkouts = (recentWorkouts: any[]) => {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const startOfWeek = new Date(now);
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setUTCDate(now.getUTCDate() - daysToSubtract);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);

  const currentWeekWorkouts = recentWorkouts.filter(({ session }) => {
    const workoutDate = new Date(session.completed_at || session.session_date);
    return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
  });

  // Group by workout type to avoid duplicates
  const workoutTypeMap = new Map<string, any>();
  currentWeekWorkouts.forEach(({ session }) => {
    const workoutType = session.template_name?.toLowerCase() || 'ad-hoc';
    if (!workoutTypeMap.has(workoutType)) {
      workoutTypeMap.set(workoutType, session);
    }
  });

  const uniqueWorkouts = Array.from(workoutTypeMap.values());
  
  return { currentWeekWorkouts, uniqueWorkouts };
};

// Process T-Path related data
const processTPathData = async (
  userId: string,
  profile: DashboardProfile | null,
  programmeType: 'ppl' | 'ulul',
  recentWorkouts: any[],
  completedWorkoutsThisWeek: CompletedWorkout[]
) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDashboardQueries.ts:224',message:'processTPathData called',data:{hasProfile:!!profile,activeTPathId:profile?.active_t_path_id,programmeType},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (!profile?.active_t_path_id) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDashboardQueries.ts:225',message:'No active_t_path_id in profile',data:{hasProfile:!!profile},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return {
      activeTPath: null,
      tPathWorkouts: [],
      nextWorkout: null,
    };
  }

  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDashboardQueries.ts:233',message:'Looking up t-path in local database',data:{activeTPathId:profile.active_t_path_id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const activeTPath = await database.getTPath(profile.active_t_path_id);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDashboardQueries.ts:234',message:'getTPath result',data:{activeTPathId:profile.active_t_path_id,found:!!activeTPath,tPathName:activeTPath?.template_name},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const tPathWorkouts = await database.getTPathsByParent(profile.active_t_path_id);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDashboardQueries.ts:235',message:'getTPathsByParent result',data:{activeTPathId:profile.active_t_path_id,workoutsCount:tPathWorkouts.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    const nextWorkout = WeeklyWorkoutAnalyzer.determineNextWorkoutWeeklyAware(
      programmeType,
      recentWorkouts,
      tPathWorkouts,
      completedWorkoutsThisWeek
    );

    return {
      activeTPath: activeTPath ? {
        id: activeTPath.id,
        template_name: activeTPath.template_name,
        description: activeTPath.description,
        parent_t_path_id: activeTPath.parent_t_path_id,
      } : null,
      tPathWorkouts: tPathWorkouts.map(tPath => ({
        id: tPath.id,
        template_name: tPath.template_name,
        description: tPath.description,
        parent_t_path_id: tPath.parent_t_path_id,
      })),
      nextWorkout,
    };
  } catch (error) {
    console.warn('[DashboardQuery] Failed to process T-Path data:', error);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useDashboardQueries.ts:259',message:'Error processing T-Path data',data:{activeTPathId:profile?.active_t_path_id,error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return {
      activeTPath: null,
      tPathWorkouts: [],
      nextWorkout: null,
    };
  }
};

// Determine next workout based on programme type and recent history

// Build volume points with workout type mapping
const buildVolumePoints = async (
  rawVolumeHistory: Array<{ date: string; volume: number }>,
  recentWorkouts: any[],
  userId: string
): Promise<DashboardVolumePoint[]> => {
  const volumeMap = new Map(
    rawVolumeHistory.map(entry => [entry.date.split('T')[0], entry.volume || 0])
  );

  // Get workout types for color coding
  const workoutTypeByDate = new Map<string, string>();
  
  recentWorkouts.forEach(({ session, first_set_at }) => {
    const date = session.session_date.split('T')[0];
    if (!workoutTypeByDate.has(date)) {
      const workoutName = session.template_name?.toLowerCase() || '';
      let workoutType = 'other';
      
      if (workoutName.includes('push')) workoutType = 'push';
      else if (workoutName.includes('pull')) workoutType = 'pull';
      else if (workoutName.includes('leg')) workoutType = 'legs';
      else if (workoutName.includes('upper')) workoutType = 'upper';
      else if (workoutName.includes('lower')) workoutType = 'lower';
      
      workoutTypeByDate.set(date, workoutType);
    }
  });

  // Generate 7 days starting from Monday
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - daysToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const points: DashboardVolumePoint[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + i);
    const key = date.toISOString().split('T')[0];
    const volume = Math.max(0, Number(volumeMap.get(key) ?? 0));
    const workoutType = workoutTypeByDate.get(key);
    
    points.push({
      date: key,
      volume,
      ...(workoutType && { workoutType }),
    });
  }

  return points;
};

// Optimistic workout completion mutation
export const useCompleteWorkout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ session, userId }: { session: any; userId: string }) => {
      // Add to database
      await database.addWorkoutSession(session);
      
      // Add to sync queue
      const { addToSyncQueue } = await import('../_lib/database');
      await addToSyncQueue('create', 'workout_sessions', session);
      
      return { session, userId };
    },
    onMutate: async ({ session, userId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['dashboard', 'complete', userId] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['dashboard', 'complete', userId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['dashboard', 'complete', userId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          recentWorkouts: [
            {
              session,
              exercise_count: 0, // Will be updated on refetch
              first_set_at: null,
              last_set_at: null,
            },
            ...old.recentWorkouts
          ],
          weeklySummary: {
            ...old.weeklySummary,
            total_sessions: old.weeklySummary.total_sessions + 1,
            // Don't add to completed_workouts yet - wait for actual completion
          }
        };
      });

      return { previousData };
    },
    onError: (err, { userId }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(['dashboard', 'complete', userId], context.previousData);
      }
    },
    onSettled: ({ userId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'complete', userId] });
    },
  });
};

// Workout deletion mutation with optimistic updates
export const useDeleteWorkout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      await database.deleteWorkoutSession(sessionId);
      
      // Add to sync queue for deletion
      const { addToSyncQueue } = await import('../_lib/database');
      await addToSyncQueue('delete', 'workout_sessions', { id: sessionId });
      
      return { sessionId, userId };
    },
    onMutate: async ({ sessionId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard', 'complete', userId] });

      const previousData = queryClient.getQueryData(['dashboard', 'complete', userId]);

      queryClient.setQueryData(['dashboard', 'complete', userId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          recentWorkouts: old.recentWorkouts.filter((workout: any) => workout.session.id !== sessionId),
          weeklySummary: {
            ...old.weeklySummary,
            total_sessions: Math.max(0, old.weeklySummary.total_sessions - 1),
            completed_workouts: old.weeklySummary.completed_workouts.filter(
              (workout: any) => workout.sessionId !== sessionId
            ),
          }
        };
      });

      return { previousData };
    },
    onError: (err, { userId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['dashboard', 'complete', userId], context.previousData);
      }
    },
    onSettled: ({ userId }) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'complete', userId] });
    },
  });
};

export default {
  useDashboardData,
  useCompleteWorkout,
  useDeleteWorkout,
};
