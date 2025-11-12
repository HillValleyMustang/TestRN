/**
 * useWorkoutHistory Hook
 * Fetches and manages workout history data for the mobile app
 * Matches web version functionality with proper data aggregation
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../_contexts/auth-context';
import { useData } from '../_contexts/data-context';
import type { WorkoutSession } from '@data/storage/models';

interface WorkoutHistorySession {
  id: string;
  template_name: string | null;
  session_date: string;
  duration_string?: string | null;
  exercise_count: number;
  total_volume_kg: number;
  has_prs?: boolean;
}

interface UseWorkoutHistoryReturn {
  sessions: WorkoutHistorySession[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeSession: (sessionId: string) => void;
}

export default function useWorkoutHistory(): UseWorkoutHistoryReturn {
  const { userId } = useAuth();
  const { getWorkoutSessions, getSetLogs } = useData();
  const [sessions, setSessions] = useState<WorkoutHistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkoutHistory = useCallback(async () => {
    if (!userId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get all workout sessions
      const workoutSessions = await getWorkoutSessions(userId);

      // Sort by session date descending (most recent first)
      const sortedSessions = workoutSessions.sort(
        (a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
      );

      // Process each session to get aggregated data
      const processedSessionsTemp: (WorkoutHistorySession | null)[] = [];

      for (const session of sortedSessions) {
        try {
          // Get set logs for this session
          const setLogs = await getSetLogs(session.id);

          // Calculate exercise count (unique exercises)
          const uniqueExercises = new Set(setLogs.map(log => log.exercise_id));
          const exerciseCount = uniqueExercises.size;

          // Calculate total volume
          const totalVolume = setLogs.reduce((sum, log) => {
            const weight = log.weight_kg || 0;
            const reps = log.reps || 0;
            return sum + (weight * reps);
          }, 0);

          // Check for PRs
          const hasPrs = setLogs.some(log => log.is_pb);

          // Only include sessions that have actual data (completed workouts)
          // Exclude sessions with 0 exercises or 0 volume (incomplete/abandoned workouts)
          if (exerciseCount === 0 || totalVolume === 0) {
            processedSessionsTemp.push(null);
            continue;
          }

          processedSessionsTemp.push({
            id: session.id,
            template_name: session.template_name,
            session_date: session.session_date,
            duration_string: session.duration_string,
            exercise_count: exerciseCount,
            total_volume_kg: Math.round(totalVolume),
            has_prs: hasPrs,
          });
        } catch (err) {
          console.error(`Failed to process session ${session.id}:`, err);
          // Return null for failed sessions (don't include incomplete data)
          processedSessionsTemp.push(null);
        }
      }

      // Filter out null sessions (incomplete workouts)
      const validSessions = processedSessionsTemp.filter(session => session !== null) as WorkoutHistorySession[];

      setSessions(validSessions);
    } catch (err) {
      console.error('Failed to fetch workout history:', err);
      setError('Failed to load workout history');
    } finally {
      setIsLoading(false);
    }
  }, [userId, getWorkoutSessions, getSetLogs]);

  useEffect(() => {
    fetchWorkoutHistory();
  }, [fetchWorkoutHistory]);

  const removeSession = (sessionId: string) => {
    setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
  };

  return {
    sessions,
    isLoading,
    error,
    refresh: fetchWorkoutHistory,
    removeSession,
  };
}