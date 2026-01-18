import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@data/supabase/client-mobile';
import { useAuth } from './auth-context';
import { Gym, DashboardProfile } from './data-context'; // Using Gym and DashboardProfile from data-context
import Toast from 'react-native-toast-message';

interface GymContextType {
  userGyms: Gym[];
  activeGym: Gym | null;
  switchActiveGym: (gymId: string) => Promise<boolean>;
  loadingGyms: boolean;
  refreshGyms: () => void;
  profile: DashboardProfile | null; // Added profile to context
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const GymProvider = ({ children }: { children: React.ReactNode }) => {
  const { session, userId } = useAuth();
  const [userGyms, setUserGyms] = useState<Gym[]>([]);
  const [activeGym, setActiveGym] = useState<Gym | null>(null);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshGyms = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const fetchGymData = useCallback(async () => {
    if (!userId) {
      setUserGyms([]);
      setActiveGym(null);
      setProfile(null);
      setLoadingGyms(false);
      return;
    }

    setLoadingGyms(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, active_gym_id, active_t_path_id, programme_type, preferred_session_length, full_name, first_name, last_name, onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        Toast.show({
          type: 'error',
          text1: 'Error loading user profile.',
        });
        setProfile(null);
      } else if (profileData) {
        setProfile({
          id: profileData.id,
          active_t_path_id: profileData.active_t_path_id,
          programme_type: profileData.programme_type || 'ppl', // Default or map if necessary
          preferred_session_length: profileData.preferred_session_length,
          full_name: profileData.full_name,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          onboarding_completed: Boolean(profileData.onboarding_completed),
        });
      }

      const { data: gymsData, error: gymsError } = await supabase
        .from('gyms')
        .select('*')
        .eq('user_id', userId);

      if (gymsError) {
        console.error('Error fetching gyms:', gymsError);
        Toast.show({
          type: 'error',
          text1: 'Error loading gyms.',
        });
        setUserGyms([]);
        setActiveGym(null);
      } else {
        const sortedGyms = gymsData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setUserGyms(sortedGyms);

        const activeGymId = profileData?.active_gym_id;
        let currentActiveGym = activeGymId ? sortedGyms.find(g => g.id === activeGymId) : null;

        // If no active gym is set in profile, or the set one doesn't exist, default to the first gym
        if (!currentActiveGym && sortedGyms.length > 0) {
          currentActiveGym = sortedGyms[0];
          // Also update the profile to set this gym as active
          await supabase.from('profiles').update({ active_gym_id: currentActiveGym.id }).eq('id', userId);
        }
        setActiveGym(currentActiveGym || null);
      }
    } catch (error) {
      console.error('Unexpected error in fetchGymData:', error);
      Toast.show({
        type: 'error',
        text1: 'An unexpected error occurred while loading gym data.',
      });
    } finally {
      setLoadingGyms(false);
    }
  }, [userId, refreshTrigger]);

  useEffect(() => {
    fetchGymData();
  }, [userId, fetchGymData]);

  const switchActiveGym = useCallback(async (gymId: string): Promise<boolean> => {
    if (!userId || !session) {
      Toast.show({
        type: 'error',
        text1: 'You must be logged in to switch active gym.',
      });
      return false;
    }

    const newActiveGym = userGyms.find(g => g.id === gymId);
    if (!newActiveGym) {
      Toast.show({
        type: 'error',
        text1: 'Selected gym not found.',
      });
      return false;
    }

    const previousActiveGym = activeGym;
    setActiveGym(newActiveGym); // Optimistic update

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gym-context.tsx:132',message:'Switching active gym',data:{gymId,previousGymId:activeGym?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Call the edge function to switch active gym, which also updates active_t_path_id
      const { data, error } = await supabase.functions.invoke('switch-active-gym', {
        body: { gymId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to switch active gym');
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gym-context.tsx:145',message:'Edge function call successful',data:{gymId,result:data},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Refresh gyms and profile to get updated active_t_path_id
      refreshGyms();
      
      // Also manually refresh profile to ensure active_t_path_id is updated
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('active_t_path_id, active_gym_id')
        .eq('id', userId)
        .maybeSingle();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gym-context.tsx:155',message:'Profile after switch',data:{activeGymId:updatedProfile?.active_gym_id,activeTPathId:updatedProfile?.active_t_path_id},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      if (updatedProfile) {
        setProfile(prev => prev ? { ...prev, active_t_path_id: updatedProfile.active_t_path_id } : null);
      }
      
      Toast.show({
        type: 'success',
        text1: 'Active gym switched successfully!',
      });
      return true;
    } catch (error: any) {
      console.error('Error switching active gym:', error.message);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cf89fb70-89f1-4c6a-b7b8-8d2defa2257c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gym-context.tsx:168',message:'Error switching gym',data:{error:error.message,gymId},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      Toast.show({
        type: 'error',
        text1: error.message || 'Failed to switch active gym.',
      });
      setActiveGym(previousActiveGym); // Rollback
      return false;
    }
  }, [userId, session, userGyms, activeGym, refreshGyms]);

  const contextValue = useMemo(() => ({
    userGyms,
    activeGym,
    switchActiveGym,
    loadingGyms,
    refreshGyms,
    profile, // Include profile in context value
  }), [userGyms, activeGym, switchActiveGym, loadingGyms, refreshGyms, profile]);

  return (
    <GymContext.Provider value={contextValue}>
      {children}
    </GymContext.Provider>
  );
};

export const useGym = () => {
  const context = useContext(GymContext);
  if (context === undefined) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
};
