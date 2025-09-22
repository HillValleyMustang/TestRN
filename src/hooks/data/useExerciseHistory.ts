"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { useUserProfile } from './useUserProfile';

type SetLog = Tables<'set_logs'>;
type Profile = Tables<'profiles'>;

export type SetLogWithSession = Pick<SetLog, 'id' | 'weight_kg' | 'reps' | 'reps_l' | 'reps_r' | 'time_seconds' | 'created_at' | 'exercise_id' | 'is_pb' | 'session_id'> & {
  workout_sessions: Pick<Tables<'workout_sessions'>, 'session_date'> | null;
};

interface UseExerciseHistoryProps {
  exerciseId: string;
}

export const useExerciseHistory = ({ exerciseId }: UseExerciseHistoryProps) => {
  const { session, supabase } = useSession();
  const { profile, isLoading: loadingProfile } = useUserProfile();
  const [historyLogs, setHistoryLogs] = useState<SetLogWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const preferredWeightUnit = profile?.preferred_weight_unit || 'kg';

  const fetchHistory = useCallback(async () => {
    if (!session || !exerciseId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('set_logs')
        .select(`
          id, weight_kg, reps, reps_l, reps_r, time_seconds, created_at, exercise_id, is_pb, session_id,
          workout_sessions (
            session_date
          )
        `)
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const mappedData: SetLogWithSession[] = (data as any[]).map(log => ({
        ...log,
        workout_sessions: (log.workout_sessions && Array.isArray(log.workout_sessions) && log.workout_sessions.length > 0) 
          ? log.workout_sessions[0] 
          : log.workout_sessions,
      }));

      setHistoryLogs(mappedData || []);
    } catch (err: any) {
      console.error("Failed to fetch exercise history:", err);
      setError("Failed to load exercise history.");
      toast.error("Failed to load exercise history."); // Changed to toast.error
    } finally {
      setLoading(false);
    }
  }, [session, exerciseId, supabase]);

  useEffect(() => {
    if (exerciseId) {
        fetchHistory();
    }
  }, [exerciseId, fetchHistory]);

  return {
    historyLogs,
    loading: loading || loadingProfile,
    error,
    preferredWeightUnit,
    refresh: fetchHistory,
  };
};