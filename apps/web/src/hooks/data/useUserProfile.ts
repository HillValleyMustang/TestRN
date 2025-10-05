"use client";

import { useCallback, useMemo } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Profile } from '@/types/supabase';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';
import { LocalProfile } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * A centralized hook to fetch and manage the current user's profile data.
 * It uses the caching layer to provide instant loads and offline support.
 */
export const useUserProfile = () => {
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId

  const { 
    data: cachedProfileArray, // Renamed to emphasize it's an array
    loading: isLoading, 
    error, 
    refresh 
  } = useCacheAndRevalidate<LocalProfile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      const { data, error } = await client.from('profiles').select('*').eq('id', memoizedSessionUserId); // Use memoized ID
      return { data: data || [], error };
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'user_profile_data_hook',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  // Use useMemo to ensure the 'profile' object itself is referentially stable
  const profile = useMemo(() => cachedProfileArray?.[0] || null, [cachedProfileArray]);

  return { profile, isLoading, error, refresh };
};