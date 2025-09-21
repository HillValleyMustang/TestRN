"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { db } from '@/lib/db'; // Import db

type Gym = Tables<'gyms'>;
type Profile = Tables<'profiles'>;

interface GymContextType {
  userGyms: Gym[];
  activeGym: Gym | null;
  switchActiveGym: (gymId: string) => Promise<void>;
  loadingGyms: boolean;
  refreshGyms: () => Promise<void>; // Added refresh function
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const GymContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useSession();
  const [userGyms, setUserGyms] = useState<Gym[]>([]);
  const [activeGym, setActiveGym] = useState<Gym | null>(null);
  const [loadingGyms, setLoadingGyms] = useState(true);

  const fetchGymData = useCallback(async () => {
    if (!session) {
      setLoadingGyms(false);
      return;
    }
    setLoadingGyms(true);
    try {
      // Fetch all user's gyms
      const { data: gymsData, error: gymsError } = await supabase
        .from('gyms')
        .select('*')
        .eq('user_id', session.user.id);
      if (gymsError) throw gymsError;
      setUserGyms(gymsData || []);

      // Fetch user's profile to find out which gym is active
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_gym_id')
        .eq('id', session.user.id)
        .single();
      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      const activeGymIdFromProfile = profileData?.active_gym_id;
      
      let newActiveGym: Gym | null = null;
      if (gymsData && gymsData.length > 0) {
        if (activeGymIdFromProfile) {
          newActiveGym = gymsData.find(g => g.id === activeGymIdFromProfile) || null;
        }
        // If no active gym in profile, or if it wasn't found, default to the first one
        if (!newActiveGym) {
          newActiveGym = gymsData[0];
        }
      }
      setActiveGym(newActiveGym);

    } catch (error: any) {
      toast.error("Failed to load gym data: " + error.message);
    } finally {
      setLoadingGyms(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    fetchGymData();
  }, [fetchGymData]);

  const switchActiveGym = async (gymId: string) => {
    if (!session) return;
    const newActiveGym = userGyms.find(g => g.id === gymId);
    if (!newActiveGym) return;

    const previousActiveGym = activeGym; // Store previous state for rollback
    setActiveGym(newActiveGym); // Optimistic update

    try {
      const response = await fetch('/api/switch-active-gym', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ gymId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch active gym.');
      }

      // On success, we need to refresh the profile data to get the new active_t_path_id
      // The useWorkoutDataFetcher hook will see the updated profile from Dexie and re-process everything.
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) throw profileError;

      if (updatedProfile) {
        await db.profiles_cache.put(updatedProfile);
      }
      
    } catch (error: any) {
      toast.error(error.message || "Failed to switch active gym.");
      setActiveGym(previousActiveGym); // Rollback optimistic update
    }
  };

  return (
    <GymContext.Provider value={{ userGyms, activeGym, switchActiveGym, loadingGyms, refreshGyms: fetchGymData }}>
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