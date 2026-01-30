/**
 * useMediaPosts Hook
 * Reactive hook for fetching media posts from Supabase
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/_contexts/auth-context';
import type { MediaPost } from '@data/storage/models';

interface UseMediaPostsOptions {
  enabled?: boolean;
}

interface UseMediaPostsReturn {
  data: MediaPost[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch all media posts
 * @param options - Optional configuration
 * @returns Media posts data with loading/error states
 */
export const useMediaPosts = (
  options: UseMediaPostsOptions = {}
): UseMediaPostsReturn => {
  const { enabled = true } = options;
  const { supabase } = useAuth();

  const query = useQuery({
    queryKey: ['media-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MediaPost[];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes (content doesn't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
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

export default useMediaPosts;
