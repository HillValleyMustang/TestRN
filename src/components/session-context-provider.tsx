"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { SyncManagerInitializer } from './sync-manager-initializer';
import { db, LocalSupabaseSession } from '@/lib/db'; // Import db and LocalSupabaseSession

interface SessionContextType {
  session: Session | null;
  supabase: SupabaseClient;
  memoizedSessionUserId: string | null; // ADDED: Memoized user ID
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Memoize sessionUserId to ensure stable reference for dependencies
  const memoizedSessionUserId = useMemo(() => session?.user.id || null, [session?.user.id]);

  // Function to save session to IndexedDB
  const saveSessionToIndexedDB = useCallback(async (currentSession: Session | null) => {
    try {
      if (currentSession) {
        await db.supabase_session.put({
          id: 'current_session', // Fixed ID for the single session object
          session: currentSession,
          last_updated: Date.now(),
        });
      } else {
        // If session is null, remove it from IndexedDB
        await db.supabase_session.delete('current_session');
      }
    } catch (error) {
      console.error("Error saving session to IndexedDB:", error);
    }
  }, []);

  // Function to load session from IndexedDB
  const loadSessionFromIndexedDB = useCallback(async (): Promise<Session | null> => {
    try {
      const localSession = await db.supabase_session.get('current_session');
      if (localSession && localSession.session) {
        // Check if the session is still valid (e.g., not expired)
        const currentTime = Date.now() / 1000; // in seconds
        if (localSession.session.expires_at && localSession.session.expires_at > currentTime) {
          return localSession.session;
        } else {
          // Session expired, remove it
          await db.supabase_session.delete('current_session');
        }
      }
    } catch (error) {
      console.error("Error loading session from IndexedDB:", error);
    }
    return null;
  }, []);

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const initializeDbAndSession = async () => {
      setLoading(true);
      try {
        await db.open(); // Ensure DB is open when provider mounts
        console.log("[SessionContextProvider] IndexedDB opened.");
      } catch (error) {
        console.error("[SessionContextProvider] Failed to open IndexedDB:", error);
        // If DB fails to open, we might not be able to load/save sessions locally.
        // Proceed without local session, relying only on Supabase.
      }

      // 1. Try to get session from Supabase (server-side or fresh client-side)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();

      if (isMounted) {
        if (supabaseSession) {
          setSession(supabaseSession);
          await saveSessionToIndexedDB(supabaseSession);
        } else {
          // 2. If no session from Supabase, try to load from IndexedDB
          const localSession = await loadSessionFromIndexedDB();
          if (localSession) {
            setSession(localSession);
            // Attempt to refresh the session in the background if it's from IndexedDB
            supabase.auth.setSession(localSession).then(() => {
              supabase.auth.refreshSession().then(({ data, error }) => {
                if (isMounted) {
                  if (data?.session) {
                    setSession(data.session);
                    saveSessionToIndexedDB(data.session);
                  } else if (error) {
                    console.error("Error refreshing session from IndexedDB:", error);
                    // If refresh fails, consider the local session invalid
                    setSession(null);
                    saveSessionToIndexedDB(null);
                  }
                }
              });
            });
          }
        }
        setLoading(false);
      }
    };

    initializeDbAndSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
        await saveSessionToIndexedDB(newSession); // Always save the latest session state
        setLoading(false); // Ensure loading is false after any auth state change

        if (_event === 'SIGNED_OUT') {
          router.push('/login');
          // Clear all IndexedDB data on sign out
          try {
            await db.delete(); // Delete all data
            await db.open(); // Re-open the database after deletion
            console.log("[SessionContextProvider] IndexedDB cleared and re-opened on sign out.");
          } catch (err) {
            console.error("[SessionContextProvider] Error clearing/re-opening IndexedDB on sign out:", err);
          }
        }
      }
    });

    return () => {
      isMounted = false; // Cleanup flag
      subscription.unsubscribe();
      try {
        db.close(); // Close DB when provider unmounts
        console.log("[SessionContextProvider] IndexedDB closed on unmount.");
      } catch (error) {
        console.error("[SessionContextProvider] Error closing IndexedDB on unmount:", error);
      }
    };
  }, [router, saveSessionToIndexedDB, loadSessionFromIndexedDB]);

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <SessionContext.Provider value={{ session, supabase, memoizedSessionUserId }}>
      <SyncManagerInitializer />
      {children}
      <Toaster />
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};