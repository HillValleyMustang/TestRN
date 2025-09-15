"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';

type Gym = Tables<'gyms'>;
type Profile = Tables<'profiles'>;

interface GymContextType {
  userGyms: Gym[];
  activeGym: Gym | null;
  switchActiveGym: (gymId: string) => Promise<void>;
  loadingGyms: boolean;
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

      const activeGymId = profileData?.active_gym_id;
      if (activeGymId && gymsData) {
        setActiveGym(gymsData.find(g => g.id === activeGymId) || gymsData[0] || null);
      } else if (gymsData && gymsData.length > 0) {
        setActiveGym(gymsData[0]);
      } else {
        setActiveGym(null);
      }
    } catch (error: any) {
      toast.error("Failed to load gym data: " + error.message);
    } finally {
      setLoadingGyms(false);
    }
  }, [session]);

  useEffect(() => {
    fetchGymData();
  }, [fetchGymData]);

  const switchActiveGym = async (gymId: string) => {
    if (!session) return;
    const newActiveGym = userGyms.find(g => g.id === gymId);
    if (!newActiveGym) return;

    setActiveGym(newActiveGym); // Optimistic update

    const { error } = await supabase
      .from('profiles')
      .update({ active_gym_id: gymId })
      .eq('id', session.user.id);

    if (error) {
      toast.error("Failed to switch active gym.");
      // Revert optimistic update
      fetchGymData();
    }
  };

  return (
    <GymContext.Provider value={{ userGyms, activeGym, switchActiveGym, loadingGyms }}>
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