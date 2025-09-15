"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { SyncManagerInitializer } from './sync-manager-initializer';
import { db, LocalSupabaseSession } from '@/lib/db'; // Import db and LocalSupabaseSession

interface SessionContextType {
  session: Session | null;
  supabase: SupabaseClient;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to save session to IndexedDB
  const saveSessionToIndexedDB = useCallback(async (currentSession: Session | null) => {
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
  }, []);

  // Function to load session from IndexedDB
  const loadSessionFromIndexedDB = useCallback(async (): Promise<Session | null> => {
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
    return null;
  }, []);

  useEffect(() => {
    const initializeSession = async () => {
      setLoading(true);
      // 1. Try to get session from Supabase (server-side or fresh client-side)
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();

      if (supabaseSession) {
        setSession(supabaseSession);
        await saveSessionToIndexedDB(supabaseSession);
        console.log("[SessionContextProvider] Initial session set:", supabaseSession.user.id);
      } else {
        // 2. If no session from Supabase, try to load from IndexedDB
        const localSession = await loadSessionFromIndexedDB();
        if (localSession) {
          setSession(localSession);
          console.log("[SessionContextProvider] Session loaded from IndexedDB:", localSession.user.id);
          // Attempt to refresh the session in the background if it's from IndexedDB
          // This helps ensure we have the latest token when online
          supabase.auth.setSession(localSession).then(() => {
            supabase.auth.refreshSession().then(({ data, error }) => {
              if (data?.session) {
                setSession(data.session);
                saveSessionToIndexedDB(data.session);
                console.log("[SessionContextProvider] Session refreshed from IndexedDB:", data.session.user.id);
              } else if (error) {
                console.error("Error refreshing session from IndexedDB:", error);
                // If refresh fails, consider the local session invalid
                setSession(null);
                saveSessionToIndexedDB(null);
                console.log("[SessionContextProvider] Session refresh failed, cleared.");
              }
            });
          });
        } else {
          console.log("[SessionContextProvider] No session found, local or remote.");
        }
      }
      setLoading(false);
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await saveSessionToIndexedDB(newSession); // Always save the latest session state
      setLoading(false); // Ensure loading is false after any auth state change
      console.log(`[SessionContextProvider] Auth state changed: ${_event}. New session ID: ${newSession?.user.id || 'none'}`);

      if (_event === 'SIGNED_OUT') {
        router.push('/login');
        // Clear all IndexedDB data on sign out
        db.delete().then(() => {
          console.log("IndexedDB cleared on sign out.");
        }).catch(err => {
          console.error("Error clearing IndexedDB on sign out:", err);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [router, saveSessionToIndexedDB, loadSessionFromIndexedDB]);

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <SessionContext.Provider value={{ session, supabase }}>
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