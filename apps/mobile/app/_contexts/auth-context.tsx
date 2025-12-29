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

// DEVELOPMENT AUTO-LOGIN - Set to true to auto-login during development
const AUTO_LOGIN_FOR_DEVELOPMENT = true;
const DEV_EMAIL = 'craig.duffill@gmail.com';
const DEV_PASSWORD = 'lufclufc';

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
  const initialLoadRef = useRef(true);

  const userId = useMemo(() => session?.user?.id || null, [session?.user?.id]);

  useEffect(() => {
    // Always set up the auth state change listener first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: string, newSession: Session | null) => {
        const newUserId = newSession?.user?.id || null;
        const oldUserId = previousUserId.current;

        console.log('[Auth] Auth state changed:', newSession ? `authenticated (user: ${newSession?.user?.email})` : 'not authenticated');
        console.log('[Auth] User transition:', { from: oldUserId, to: newUserId });

        // Set loading to false on first auth state change
        if (initialLoadRef.current) {
          initialLoadRef.current = false;
          setLoading(false);
        }

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

    if (AUTO_LOGIN_FOR_DEVELOPMENT) {
      // DEVELOPMENT AUTO-LOGIN: Sign in with real credentials
      console.log('[Auth] 🔧 DEVELOPMENT MODE: Auto-logging in with dev credentials');
      supabase.auth.signInWithPassword({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      }).catch((error) => {
        console.error('[Auth] Auto-login failed:', error.message);
        console.log('[Auth] Falling back to normal auth flow');
        // Auth state change listener will handle setting session to null
      });
      return () => subscription.unsubscribe();
    }

    // Force sign out to clear any cached sessions for testing
    supabase.auth.signOut().catch((error) => {
      console.error('[Auth] Failed to sign out:', error);
      // Auth state change listener will handle the session state
    });

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
