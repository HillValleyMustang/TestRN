/**
 * useTPathCompletionStats Hook
 * Reactive hook for fetching T-Path completion statistics from Supabase
 * Returns completion count and last completed date per T-Path workout
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '../../app/_lib/supabase';

interface TPathCompletionStat {
  tPathId: string;
  completionCount: number;
  lastCompletedAt: string | null;
}

interface UseTPathCompletionStatsOptions {
  enabled?: boolean;
}

interface UseTPathCompletionStatsReturn {
  stats: Map<string, TPathCompletionStat>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch completion statistics for T-Path workouts
 * Queries Supabase workout_sessions, matching by t_path_id and template_name fallback
 * @param userId - The user's ID
 * @param tPathIds - Array of T-Path IDs to fetch stats for
 * @param templateNames - Optional map of tPathId -> template_name for fallback matching
 * @param options - Optional configuration
 * @returns Completion stats mapped by T-Path ID
 */
export const useTPathCompletionStats = (
  userId: string | null,
  tPathIds: string[],
  options: UseTPathCompletionStatsOptions = {},
  templateNames?: Map<string, string>
): UseTPathCompletionStatsReturn => {
  const { enabled = true } = options;

  const statsQuery = useQuery({
    queryKey: ['t-path-completion-stats', userId, tPathIds.sort().join(',')],
    queryFn: async () => {
      if (!userId || tPathIds.length === 0) return [];

      // Query Supabase for all completed sessions for this user
      const { data: sessions, error } = await supabase
        .from('workout_sessions')
        .select('template_name, completed_at, t_path_id')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('[useTPathCompletionStats] Error fetching sessions:', error);
        throw error;
      }

      // Build stats per T-Path ID
      const statsMap = new Map<string, { count: number; lastCompleted: string | null }>();

      // Initialize all T-Path IDs with zero counts
      tPathIds.forEach(id => statsMap.set(id, { count: 0, lastCompleted: null }));

      if (sessions && sessions.length > 0) {
        // First pass: match by t_path_id (most accurate)
        sessions.forEach(session => {
          if (session.t_path_id && tPathIds.includes(session.t_path_id)) {
            const existing = statsMap.get(session.t_path_id)!;
            existing.count += 1;
            if (!existing.lastCompleted) {
              existing.lastCompleted = session.completed_at;
            }
          }
        });

        // Second pass: for any T-Paths with 0 matches, try template_name fallback
        if (templateNames) {
          tPathIds.forEach(tPathId => {
            const stats = statsMap.get(tPathId)!;
            if (stats.count === 0) {
              const templateName = templateNames.get(tPathId);
              if (templateName) {
                sessions.forEach(session => {
                  if (session.template_name === templateName) {
                    stats.count += 1;
                    if (!stats.lastCompleted) {
                      stats.lastCompleted = session.completed_at;
                    }
                  }
                });
              }
            }
          });
        }
      }

      return Array.from(statsMap.entries()).map(([tPathId, stats]) => ({
        tPathId,
        completionCount: stats.count,
        lastCompletedAt: stats.lastCompleted,
      }));
    },
    enabled: !!userId && tPathIds.length > 0 && enabled,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Convert to Map for easy lookup
  const statsMap = useMemo(() => {
    const map = new Map<string, TPathCompletionStat>();
    if (statsQuery.data) {
      statsQuery.data.forEach(stat => {
        map.set(stat.tPathId, stat);
      });
    }
    return map;
  }, [statsQuery.data]);

  return {
    stats: statsMap,
    loading: statsQuery.isLoading,
    error: statsQuery.error as Error | null,
    refetch: async () => {
      await statsQuery.refetch();
    },
  };
};

export default useTPathCompletionStats;
