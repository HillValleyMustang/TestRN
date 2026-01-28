import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecentWorkouts } from '../useRecentWorkouts';

// Mock the database module
jest.mock('../../../app/_lib/database', () => ({
  database: {
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

describe('useRecentWorkouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when userId is null', async () => {
    const { result } = renderHook(() => useRecentWorkouts(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it('fetches recent workout summaries with default limit', async () => {
    const mockSummaries = [
      {
        session: {
          id: 'session-1',
          template_name: 'Push',
          session_date: '2025-01-25',
          completed_at: '2025-01-25T10:00:00Z',
          duration_string: '45 min',
        },
        exercise_count: 5,
        gym_name: 'Home Gym',
      },
    ];

    database.getRecentWorkoutSummaries.mockResolvedValueOnce(mockSummaries);

    const { result } = renderHook(() => useRecentWorkouts('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([
      {
        id: 'session-1',
        template_name: 'Push',
        session_date: '2025-01-25',
        completed_at: '2025-01-25T10:00:00Z',
        duration_string: '45 min',
        exercise_count: 5,
        gym_name: 'Home Gym',
      },
    ]);
    expect(database.getRecentWorkoutSummaries).toHaveBeenCalledWith('test-user', 3);
  });

  it('fetches with custom limit', async () => {
    database.getRecentWorkoutSummaries.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useRecentWorkouts('test-user', 10), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(database.getRecentWorkoutSummaries).toHaveBeenCalledWith('test-user', 10);
  });

  it('handles database errors gracefully', async () => {
    database.getRecentWorkoutSummaries.mockRejectedValueOnce(new Error('Database error'));

    const { result } = renderHook(() => useRecentWorkouts('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
