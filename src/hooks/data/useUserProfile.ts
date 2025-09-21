"use client";

import { useCallback } from 'react';
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
  const { session, supabase } = useSession();

  const { 
    data: cachedProfile, 
    loading: isLoading, 
    error, 
    refresh 
  } = useCacheAndRevalidate<LocalProfile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client.from('profiles').select('*').eq('id', session.user.id);
      return { data: data || [], error };
    }, [session?.user.id]),
    queryKey: 'user_profile_data_hook',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const profile = cachedProfile?.[0] || null;

  return { profile, isLoading, error, refresh };
};