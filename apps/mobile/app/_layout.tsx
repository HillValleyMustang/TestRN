import { useCallback, useEffect, useRef, useState } from 'react';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';

import { SupabaseAuthProvider } from '@shared/features/auth';
import { supabase } from '@app/lib/supabase';
import { asyncStorageSessionStore } from '@app/lib/session-store';
import { SyncManagerInitializer } from '@app/components/SyncManagerInitializer';

export default function RootLayout() {
  const [initialSession, setInitialSession] = useState<Session | null | undefined>(undefined);
  const previousSessionRef = useRef<Session | null>(null);

  const handleSessionChange = useCallback(async (currentSession: Session | null) => {
    await asyncStorageSessionStore.saveSession(currentSession);
    const previousSession = previousSessionRef.current;
    previousSessionRef.current = currentSession;

    if (previousSession && !currentSession) {
      await asyncStorageSessionStore.reset();
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      await asyncStorageSessionStore.init();

      let sessionToUse: Session | null = null;

      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          sessionToUse = data.session;
          await asyncStorageSessionStore.saveSession(data.session);
        } else {
          sessionToUse = await asyncStorageSessionStore.getSession();
          if (sessionToUse) {
            await supabase.auth.setSession(sessionToUse);
          }
        }
      } catch (error) {
        console.error('[RootLayout] Failed to resolve session during init', error);
      }

      if (isMounted) {
        previousSessionRef.current = sessionToUse ?? null;
        setInitialSession(sessionToUse ?? null);
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      asyncStorageSessionStore.close().catch((error) => {
        console.error('[RootLayout] Error closing session store on unmount', error);
      });
    };
  }, []);

  if (typeof initialSession === 'undefined') {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SupabaseAuthProvider
      supabase={supabase}
      initialSession={initialSession}
      onSessionChange={handleSessionChange}
    >
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SyncManagerInitializer />
        <Slot />
      </SafeAreaProvider>
    </SupabaseAuthProvider>
  );
}
