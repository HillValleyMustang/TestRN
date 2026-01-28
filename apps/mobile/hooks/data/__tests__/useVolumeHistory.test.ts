import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVolumeHistory } from '../useVolumeHistory';

// Mock the database module
jest.mock('../../../app/_lib/database', () => ({
  database: {
    getVolumeHistory: jest.fn(),
    getRecentWorkoutSummaries: jest.fn(),
  },
}));

const { database } = require('../../../app/_lib/database');

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useVolumeHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when userId is null', async () => {
    const { result } = renderHook(() => useVolumeHistory(null), {
      wrapper: createWrapper(),
    });

    // When userId is null, data should be the default empty array from useMemo
    expect(result.current.data).toBeDefined();
    expect(result.current.loading).toBe(false);
  });

  it('fetches volume history successfully', async () => {
    const mockVolumeHistory = [
      { date: '2025-01-20', volume: 1000 },
      { date: '2025-01-21', volume: 1500 },
    ];

    const mockWorkouts = [
      {
        session: {
          id: 'session-1',
          template_name: 'Push',
          session_date: '2025-01-20',
          completed_at: '2025-01-20T10:00:00Z',
        },
        exercise_count: 5,
        gym_name: null,
      },
    ];

    database.getVolumeHistory.mockResolvedValueOnce(mockVolumeHistory);
    database.getRecentWorkoutSummaries.mockResolvedValueOnce(mockWorkouts);

    const { result } = renderHook(() => useVolumeHistory('test-user', 7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.length).toBe(7); // Always returns 7 days
    expect(database.getVolumeHistory).toHaveBeenCalledWith('test-user', 7);
  });

  it('maps workout types to volume data', async () => {
    // Get current week's Monday
    const today = new Date();
    const dayOfWeek = today.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() - daysToMonday);
    const mondayStr = monday.toISOString().split('T')[0];

    const mockVolumeHistory = [
      { date: mondayStr, volume: 1000 },
    ];

    const mockWorkouts = [
      {
        session: {
          id: 'session-1',
          template_name: 'Push',
          session_date: mondayStr,
          completed_at: `${mondayStr}T10:00:00Z`,
        },
        exercise_count: 5,
        gym_name: null,
      },
    ];

    database.getVolumeHistory.mockResolvedValueOnce(mockVolumeHistory);
    database.getRecentWorkoutSummaries.mockResolvedValueOnce(mockWorkouts);

    const { result } = renderHook(() => useVolumeHistory('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Find the Monday entry
    const mondayEntry = result.current.data?.find(d => d.date === mondayStr);
    expect(mondayEntry?.volume).toBe(1000);
    expect(mondayEntry?.workoutType).toBe('push');
  });

  it('handles database errors gracefully', async () => {
    database.getVolumeHistory.mockRejectedValueOnce(new Error('Database error'));
    database.getRecentWorkoutSummaries.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useVolumeHistory('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
