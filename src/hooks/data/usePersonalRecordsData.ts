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
  const { session, supabase } = useSession();
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonalRecords = useCallback(async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const { data: prs, error: rpcError } = await supabase.rpc('get_user_personal_records', {
        p_user_id: session.user.id,
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
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [session, supabase]);

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