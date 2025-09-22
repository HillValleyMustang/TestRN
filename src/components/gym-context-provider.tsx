"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/session-context-provider';
import { Tables, Profile } from '@/types/supabase';
import { toast } from 'sonner';
import { db, LocalGym } from '@/lib/db';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';

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
  const { session } = useSession();
  const [activeGym, setActiveGym] = useState<Gym | null>(null);

  const { data: cachedGyms, loading: loadingGyms, error: gymsError, refresh: refreshGyms } = useCacheAndRevalidate<LocalGym>({
    cacheTable: 'gyms_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      return client.from('gyms').select('*').eq('user_id', session.user.id);
    }, [session?.user.id]),
    queryKey: 'user_gyms',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const { data: cachedProfile, refresh: refreshProfile } = useCacheAndRevalidate<Profile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      return client.from('profiles').select('*').eq('id', session.user.id);
    }, [session?.user.id]),
    queryKey: 'user_profile_for_gym_context',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  useEffect(() => {
    if (gymsError) {
      toast.error("Failed to load gym data."); // Changed to toast.error
      console.error("GymContext Error:", gymsError);
    }
  }, [gymsError]);

  useEffect(() => {
    const profile = cachedProfile?.[0];
    const gyms = cachedGyms || [];
    if (profile && gyms.length > 0) {
      const activeGymId = profile.active_gym_id;
      let newActiveGym = activeGymId ? gyms.find(g => g.id === activeGymId) : null;
      if (!newActiveGym) {
        newActiveGym = gyms[0];
      }
      setActiveGym(newActiveGym || null);
    } else {
      setActiveGym(null);
    }
  }, [cachedGyms, cachedProfile]);

  const switchActiveGym = useCallback(async (gymId: string): Promise<boolean> => {
    if (!session) {
      console.error("Error: User not authenticated when trying to switch active gym.");
      toast.error("You must be logged in to switch active gym."); // Added toast.error
      return false;
    }
    const newActiveGym = (cachedGyms || []).find(g => g.id === gymId);
    if (!newActiveGym) {
      console.error("Error: New active gym not found in cached gyms.");
      toast.error("Selected gym not found."); // Added toast.error
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
      toast.error(error.message || "Failed to switch active gym."); // Changed to toast.error
      setActiveGym(previousActiveGym); // Rollback
      return false;
    }
  }, [session, cachedGyms, activeGym, refreshProfile]);

  const contextValue = useMemo(() => ({
    userGyms: cachedGyms || [],
    activeGym,
    switchActiveGym,
    loadingGyms,
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