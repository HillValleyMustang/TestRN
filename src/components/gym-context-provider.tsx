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
      const { data: gymsData, error: gymsError } = await supabase
        .from('gyms')
        .select('*')
        .eq('user_id', session.user.id);
      if (gymsError) throw gymsError;
      setUserGyms(gymsData || []);

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
          // Try to find the gym specified in the profile
          newActiveGym = gymsData.find(g => g.id === activeGymIdFromProfile) || null;
        }
        // If no active_gym_id in profile, or if the gym wasn't found, default to the first gym
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

    setActiveGym(newActiveGym); // Optimistic update

    // Find the main T-Path for the new gym
    const { data: tPathForGym, error: tPathError } = await supabase
      .from('t_paths')
      .select('id')
      .eq('gym_id', gymId)
      .eq('user_id', session.user.id)
      .is('parent_t_path_id', null)
      .single();

    if (tPathError && tPathError.code !== 'PGRST116') {
      toast.error("Could not find workout plan for this gym.");
      fetchGymData(); // Revert optimistic UI change
      return;
    }

    const newActiveTPathId = tPathForGym ? tPathForGym.id : null;

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update({ active_gym_id: gymId, active_t_path_id: newActiveTPathId })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      toast.error("Failed to switch active gym.");
      // Revert optimistic update
      fetchGymData();
    } else {
      // On success, update the local Dexie cache to trigger reactivity elsewhere
      if (updatedProfile) {
        await db.profiles_cache.put(updatedProfile);
      }
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