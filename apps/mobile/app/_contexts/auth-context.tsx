import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { View } from 'react-native';
import { supabase } from '@data/supabase/client-mobile';
import { Skeleton } from '../_components/ui/Skeleton';
import { useData } from './data-context';
import { clearOnboardingData } from '../../lib/onboardingStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Additional AsyncStorage keys to clear on user change
const APP_STORAGE_KEYS = [
  'profile_active_tab', // Profile tab state
  'reality_check_accepted', // Physique analysis modal acceptance
  // Add other app-specific keys here as needed
];

/**
 * Clear all app-specific AsyncStorage keys
 */
const clearAllAppStorage = async (): Promise<void> => {
  try {
    // Clear onboarding data first
    await clearOnboardingData();
    
    // Clear other app-specific keys
    await AsyncStorage.multiRemove(APP_STORAGE_KEYS);
    console.log('[Auth] Cleared all app-specific AsyncStorage keys');
  } catch (error) {
    console.error('[Auth] Failed to clear AsyncStorage keys:', error);
  }
};

interface AuthContextType {
  session: Session | null;
  supabase: SupabaseClient;
  userId: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserId = useRef<string | null>(null);
  const { cleanupUserData } = useData();

  const userId = useMemo(() => session?.user?.id || null, [session?.user?.id]);

  useEffect(() => {
    // Force sign out to clear any cached sessions for testing
    supabase.auth.signOut().then(() => {
      console.log('[Auth] Forced sign out completed for testing');
      setSession(null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: string, newSession: Session | null) => {
        const newUserId = newSession?.user?.id || null;
        const oldUserId = previousUserId.current;
        
        console.log('[Auth] Auth state changed:', newSession ? `authenticated (user: ${newSession?.user?.email})` : 'not authenticated');
        console.log('[Auth] User transition:', { from: oldUserId, to: newUserId });
        
        // Check if user changed (different user or signed out)
        if (oldUserId && oldUserId !== newUserId) {
          console.log('[Auth] User change detected, cleaning up local data for previous user:', oldUserId);
          try {
            // Clear both SQLite database and AsyncStorage
            await Promise.all([
              cleanupUserData(oldUserId),
              clearAllAppStorage() // Clear all app-specific AsyncStorage keys
            ]);
            console.log('[Auth] Local data cleanup completed for previous user');
          } catch (error) {
            console.error('[Auth] Failed to cleanup local data for previous user:', error);
          }
        } else if (!oldUserId && newUserId) {
          // New user signed in - clear any existing onboarding data to ensure clean slate
          console.log('[Auth] New user detected, clearing onboarding data for fresh start');
          try {
            await clearAllAppStorage();
            console.log('[Auth] Onboarding data cleared for new user');
          } catch (error) {
            console.error('[Auth] Failed to clear onboarding data for new user:', error);
          }
        }
        
        // Update previous user ID
        previousUserId.current = newUserId;
        setSession(newSession);
      }
    );

    return () => subscription.unsubscribe();
  }, [/* cleanupUserData removed from deps to prevent re-subscription on every cleanupUserData change */]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Skeleton height={40} width={200} />
        <Skeleton height={20} width={150} style={{ marginTop: 10 }} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ session, supabase, userId, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
