"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/session-context-provider';
import { Tables, Profile } from '@/types/supabase';
import { toast } from 'sonner';
import { db, LocalGym } from '@/lib/db';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';
import { deepEqual } from '@/lib/utils'; // Import deepEqual

type Gym = Tables<'gyms'>;

interface GymContextType {
  userGyms: Gym[];
  activeGym: Gym | null;
  switchActiveGym: (gymId: string) => Promise<boolean>; // Returns success status
  loadingGyms: boolean;
  refreshGyms: () => void;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const GymContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [activeGym, setActiveGym] = useState<Gym | null>(null);

  const { data: cachedGyms, loading: loadingGymsFromCache, error: gymsError, refresh: refreshGyms } = useCacheAndRevalidate<LocalGym>({
    cacheTable: 'gyms_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      return client.from('gyms').select('*').eq('user_id', memoizedSessionUserId); // Use memoized ID
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'user_gyms',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  const { data: cachedProfile, loading: loadingProfileFromCache, error: profileError, refresh: refreshProfile } = useCacheAndRevalidate<Profile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      return client.from('profiles').select('*').eq('id', memoizedSessionUserId); // Use memoized ID
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'user_profile_for_gym_context',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  // Combine loading states to prevent flicker
  const loadingGyms = loadingGymsFromCache || loadingProfileFromCache;

  useEffect(() => {
    const combinedError = gymsError || profileError;
    if (combinedError) {
      toast.error("Failed to load gym or profile data.");
      console.error("GymContext Error:", combinedError);
    }
  }, [gymsError, profileError]);

  useEffect(() => {
    // Only process if not loading and all data is available
    if (loadingGyms || !cachedProfile || !cachedGyms) {
      return;
    }

    const profile = cachedProfile?.[0];
    const gyms = cachedGyms || [];
    if (profile && gyms.length > 0) {
      const activeGymId = profile.active_gym_id;
      let newActiveGym = activeGymId ? gyms.find(g => g.id === activeGymId) : null;
      // If no active gym is set in profile, or the set one doesn't exist, default to the first gym
      if (!newActiveGym) {
        newActiveGym = gyms[0];
      }
      // CRITICAL: Only update if the ID is different
      if (newActiveGym?.id !== activeGym?.id) {
        setActiveGym(newActiveGym || null);
      }
    } else if (activeGym !== null) { // If no profile/gyms, and activeGym is currently set, clear it
      setActiveGym(null);
    }
  }, [cachedGyms, cachedProfile, loadingGyms, activeGym]); // Added activeGym to dependencies

  const switchActiveGym = useCallback(async (gymId: string): Promise<boolean> => {
    if (!session) {
      console.error("Error: User not authenticated when trying to switch active gym.");
      toast.error("You must be logged in to switch active gym.");
      return false;
    }
    const newActiveGym = (cachedGyms || []).find(g => g.id === gymId);
    if (!newActiveGym) {
      console.error("Error: New active gym not found in cached gyms.");
      toast.error("Selected gym not found.");
      return false;
    }

    const previousActiveGym = activeGym;
    setActiveGym(newActiveGym); // Optimistic update

    try {
      const response = await fetch('/api/switch-active-gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ gymId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to switch active gym.');
      
      // Refreshing the profile is enough to trigger downstream updates
      await refreshProfile();

      return true;
    } catch (error: any) {
      console.error("Error switching active gym:", error.message);
      toast.error(error.message || "Failed to switch active gym.");
      setActiveGym(previousActiveGym); // Rollback
      return false;
    }
  }, [session, cachedGyms, activeGym, refreshProfile]);

  const contextValue = useMemo(() => ({
    userGyms: cachedGyms || [],
    activeGym,
    switchActiveGym,
    loadingGyms, // This is now the combined loading state
    refreshGyms,
  }), [cachedGyms, activeGym, switchActiveGym, loadingGyms, refreshGyms]);

  return (
    <GymContext.Provider value={contextValue}>
      {children}
    </GymContext.Provider>
  );
};

export const useGym = () => {
  const context = useContext(GymContext);
  if (context === undefined) {
    throw new Error('useGym must be used within a GymContextProvider');
  }
  return context;
};