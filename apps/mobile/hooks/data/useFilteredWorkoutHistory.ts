import { useMemo } from 'react';
import useWorkoutHistory from '../../app/_hooks/useWorkoutHistory';

export interface WorkoutHistoryFilters {
  workoutTypes: string[];
  dateFrom: Date | null;
  dateTo: Date | null;
  sortBy: 'date-desc' | 'date-asc' | 'volume-desc' | 'duration-desc';
}

/**
 * Normalizes workout template names to standard categories
 * Examples:
 * - "Push Day" -> "Push"
 * - "Upper Body A" -> "Upper A"
 * - null -> "Ad Hoc"
 */
function normalizeWorkoutType(templateName: string | null): string {
  if (!templateName) return 'Ad Hoc';

  const name = templateName.toLowerCase().trim();

  // PPL matching
  if (name.includes('push')) return 'Push';
  if (name.includes('pull')) return 'Pull';
  if (name.includes('leg')) return 'Legs';

  // ULUL matching
  if (name.includes('upper') && name.includes('a')) return 'Upper A';
  if (name.includes('upper') && name.includes('b')) return 'Upper B';
  if (name.includes('lower') && name.includes('a')) return 'Lower A';
  if (name.includes('lower') && name.includes('b')) return 'Lower B';

  return 'Ad Hoc';
}

/**
 * Parses duration string (e.g., "45m 30s") to total seconds
 * Supports formats: "1h 30m 45s", "45m 30s", "30s", "1h"
 */
function parseDurationToSeconds(durationString: string | null | undefined): number {
  if (!durationString) return 0;

  let totalSeconds = 0;
  const hoursMatch = durationString.match(/(\d+)h/);
  const minutesMatch = durationString.match(/(\d+)m/);
  const secondsMatch = durationString.match(/(\d+)s/);

  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
  if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);

  return totalSeconds;
}

/**
 * Hook that wraps useWorkoutHistory with client-side filtering and sorting
 *
 * @param userId - User ID to fetch workouts for
 * @param filters - Filter criteria and sort options
 * @returns Filtered and sorted workout sessions plus available workout types
 */
export function useFilteredWorkoutHistory(
  userId: string | null,
  filters: WorkoutHistoryFilters
) {
  const { sessions: allSessions, isLoading: loading, error, refresh: refetch } = useWorkoutHistory();

  // Filter and sort sessions based on current filter state
  const filteredSessions = useMemo(() => {
    if (!allSessions) return [];

    let filtered = allSessions;

    // Filter by workout types (OR logic - show sessions matching ANY selected type)
    if (filters.workoutTypes.length > 0) {
      filtered = filtered.filter(session =>
        filters.workoutTypes.includes(normalizeWorkoutType(session.template_name))
      );
    }

    // Filter by date range - from date
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0); // Start of day
      filtered = filtered.filter(session =>
        new Date(session.session_date) >= fromDate
      );
    }

    // Filter by date range - to date
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(session =>
        new Date(session.session_date) <= toDate
      );
    }

    // Sort sessions based on selected sort option
    const sorted = [...filtered];
    switch (filters.sortBy) {
      case 'date-desc':
        sorted.sort((a, b) =>
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        );
        break;
      case 'date-asc':
        sorted.sort((a, b) =>
          new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
        );
        break;
      case 'volume-desc':
        sorted.sort((a, b) => b.total_volume_kg - a.total_volume_kg);
        break;
      case 'duration-desc':
        sorted.sort((a, b) => {
          const aDuration = parseDurationToSeconds(a.duration_string);
          const bDuration = parseDurationToSeconds(b.duration_string);
          return bDuration - aDuration;
        });
        break;
    }

    return sorted;
  }, [allSessions, filters]);

  // Extract unique workout types from all sessions for filter chips
  const availableWorkoutTypes = useMemo(() => {
    if (!allSessions) return [];
    const types = new Set(
      allSessions.map(s => normalizeWorkoutType(s.template_name))
    );
    return Array.from(types).sort();
  }, [allSessions]);

  return {
    data: filteredSessions,
    loading,
    error: error ? new Error(error) : null,
    refetch,
    availableWorkoutTypes,
  };
}
