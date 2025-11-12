import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './_contexts/auth-context';
import { useData } from './_contexts/data-context';
import { Colors } from '../constants/Theme';

export default function Index() {
  const { session, userId, loading: authLoading, supabase } = useAuth();
  const { forceRefreshProfile } = useData();
  const router = useRouter();

  // Feature flag for new onboarding flow
  const USE_NEW_ONBOARDING = false; // Set to true when ready to use new flow

  useEffect(() => {
    console.log('[Index] useEffect triggered - session:', !!session, 'userId:', userId, 'authLoading:', authLoading);
    const handleNavigation = async () => {
      if (!authLoading) {
        if (session === null) {
          console.log('[Index] No session, redirecting to login');
          router.replace('/login');
        } else if (userId) {
          console.log('[Index] User authenticated, forcing profile refresh and checking onboarding status...');

          // Force refresh the profile data to ensure we get the latest from database
          forceRefreshProfile();

          try {
            // Check if user has completed onboarding
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, onboarding_completed')
              .eq('id', userId)
              .single();

            console.log('[Index] Profile check result:', { profile: !!profile, onboarding_completed: profile?.onboarding_completed, profileError, timestamp: new Date().toISOString() });

            if (profile) {
              if (profile.onboarding_completed) {
                console.log('[Index] User has completed onboarding, redirecting to dashboard');
                router.replace('/(tabs)/dashboard');
              } else {
                console.log('[Index] User needs onboarding, redirecting to onboarding');
                if (USE_NEW_ONBOARDING) {
                  router.replace('/new-onboarding'); // Future new onboarding route
                } else {
                  router.replace('/onboarding'); // Current onboarding
                }
              }
            } else {
              console.log('[Index] No profile found, redirecting to onboarding');
              if (USE_NEW_ONBOARDING) {
                router.replace('/new-onboarding'); // Future new onboarding route
              } else {
                router.replace('/onboarding'); // Current onboarding
              }
            }
          } catch (error) {
            console.error('[Index] Error checking user profile:', error);
            // Default to onboarding on error
            router.replace('/onboarding');
          }
        }
      }
    };

    // Add a delay to ensure any pending database updates complete
    // This prevents race conditions with onboarding completion
    const timeoutId = setTimeout(handleNavigation, 1000);

    return () => clearTimeout(timeoutId);
  }, [session, userId, authLoading, router, supabase, forceRefreshProfile]);

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.background
    }}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ marginTop: 16, color: Colors.foreground }}>Loading...</Text>
    </View>
  );
}
