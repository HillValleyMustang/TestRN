/**
 * useAICoachUsage Hook
 * Fetches AI coach daily usage count from Supabase
 * Following mobile reactive hooks pattern (React Query)
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/_contexts/auth-context';

export function useAICoachUsage() {
  const { supabase, userId } = useAuth();

  return useQuery({
    queryKey: ['aiCoachUsage', userId],
    queryFn: async () => {
      if (!userId) {
        return 0;
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const { count, error } = await supabase
        .from('ai_coach_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('used_at', today.toISOString())
        .lt('used_at', tomorrow.toISOString());

      if (error) {
        console.error('[useAICoachUsage] Error fetching usage:', error);
        throw error;
      }

      return count || 0;
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}
