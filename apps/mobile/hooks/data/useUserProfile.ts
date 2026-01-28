/**
 * useUserProfile Hook
 * Reactive hook for fetching user profile data
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../app/_lib/react-query-client';
import { supabase } from '../../app/_lib/supabase';
import type { DashboardProfile } from '../../app/_contexts/data-context';

interface UseUserProfileOptions {
  enabled?: boolean;
}

interface UseUserProfileReturn {
  data: DashboardProfile | null | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch user profile data
 * @param userId - The user's ID
 * @param options - Optional configuration
 * @returns User profile with loading/error states
 */
export const useUserProfile = (
  userId: string | null,
  options: UseUserProfileOptions = {}
): UseUserProfileReturn => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: queryKeys.profile(userId!),
    queryFn: async (): Promise<DashboardProfile | null> => {
      if (!userId) throw new Error('User ID required');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, active_t_path_id, active_gym_id, programme_type, preferred_session_length, full_name, first_name, last_name, onboarding_completed, created_at')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.warn('[useUserProfile] Failed to fetch profile:', error);
        return getDefaultProfile(userId);
      }
      
      if (!data) {
        return getDefaultProfile(userId);
      }
      
      return {
        id: data.id,
        active_t_path_id: data.active_t_path_id,
        active_gym_id: data.active_gym_id,
        programme_type: data.programme_type === 'ulul' ? 'ulul' : 'ppl',
        preferred_session_length: data.preferred_session_length,
        full_name: data.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
        onboarding_completed: Boolean(data.onboarding_completed),
        created_at: data.created_at,
      };
    },
    enabled: !!userId && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
};

const getDefaultProfile = (userId: string): DashboardProfile => ({
  id: userId,
  active_t_path_id: null,
  active_gym_id: null,
  programme_type: 'ppl',
  preferred_session_length: null,
  full_name: null,
  first_name: null,
  last_name: null,
  onboarding_completed: false,
  created_at: new Date().toISOString(),
});

export default useUserProfile;
