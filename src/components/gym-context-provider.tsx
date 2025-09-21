"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
    supabaseQuery: useCallback(async (client) => {
      if (!session?.user.id) return { data: [], error: null };
      return client.from('profiles').select('*').eq('id', session.user.id);
    }, [session?.user.id]),
    queryKey: 'user_profile_for_gym_context',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  useEffect(() => {
    if (gymsError) {
      toast.error("Failed to load gym data.");
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

  const switchActiveGym = async (gymId: string): Promise<boolean> => {
    if (!session) return false;
    const newActiveGym = (cachedGyms || []).find(g => g.id === gymId);
    if (!newActiveGym) return false;

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
      
      // On success, trigger a refresh of the profile to get the new active_t_path_id
      refreshProfile();
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to switch active gym.");
      setActiveGym(previousActiveGym); // Rollback
      return false;
    }
  };

  return (
    <GymContext.Provider value={{ userGyms: cachedGyms || [], activeGym, switchActiveGym, loadingGyms, refreshGyms }}>
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