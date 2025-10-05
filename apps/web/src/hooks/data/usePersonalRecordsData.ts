"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { formatTime } from '@/lib/unit-conversions';

interface PersonalRecord {
  exerciseName: string;
  exerciseType: string;
  value: number;
  date: string;
  unit: string;
}

export const usePersonalRecordsData = () => {
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonalRecords = useCallback(async () => {
    if (!memoizedSessionUserId) { // Use memoized ID
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const { data: prs, error: rpcError } = await supabase.rpc('get_user_personal_records', {
        p_user_id: memoizedSessionUserId, // Use memoized ID
        p_limit: 5 // Fetch top 5 PRs
      });

      if (rpcError) throw rpcError;

      const formattedRecords: PersonalRecord[] = (prs || []).map((pr: any) => ({
        exerciseName: pr.exercise_name,
        exerciseType: pr.exercise_type,
        value: pr.best_value || 0,
        date: new Date(pr.last_achieved_date).toLocaleDateString(),
        unit: pr.unit || '',
      }));
      
      setPersonalRecords(formattedRecords);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load personal bests.";
      console.error("Failed to load personal bests:", err);
      setError(errorMessage);
      toast.error(errorMessage); // Changed to toast.error
    } finally {
      setIsLoading(false);
    }
  }, [memoizedSessionUserId, supabase]); // Depend on memoized ID

  useEffect(() => {
    fetchPersonalRecords();
  }, [fetchPersonalRecords]);

  return {
    personalRecords,
    isLoading,
    error,
    refresh: fetchPersonalRecords,
  };
};