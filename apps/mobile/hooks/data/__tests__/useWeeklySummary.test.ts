import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWeeklySummary } from '../useWeeklySummary';

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

describe('useWeeklySummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when userId is null', async () => {
    const { result } = renderHook(() => useWeeklySummary(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it('calculates weekly summary for PPL programme', async () => {
    // Mock current week workouts
    const now = new Date();
    const mockSummaries = [
      {
        session: {
          id: 'session-1',
          template_name: 'Push',
          session_date: now.toISOString(),
          completed_at: now.toISOString(),
        },
        exercise_count: 5,
        gym_name: 'Home Gym',
      },
    ];

    database.getRecentWorkoutSummaries.mockResolvedValueOnce(mockSummaries);

    const { result } = renderHook(() => useWeeklySummary('test-user', 'ppl'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.goal_total).toBe(3);
    expect(result.current.data?.programme_type).toBe('ppl');
  });

  it('calculates weekly summary for ULUL programme', async () => {
    database.getRecentWorkoutSummaries.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useWeeklySummary('test-user', 'ulul'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.goal_total).toBe(4);
    expect(result.current.data?.programme_type).toBe('ulul');
  });

  it('provides sessions grouped by workout type', async () => {
    const now = new Date();
    const mockSummaries = [
      {
        session: {
          id: 'session-1',
          template_name: 'Push',
          session_date: now.toISOString(),
          completed_at: now.toISOString(),
        },
        exercise_count: 5,
        gym_name: null,
      },
      {
        session: {
          id: 'session-2',
          template_name: 'Push',
          session_date: now.toISOString(),
          completed_at: now.toISOString(),
        },
        exercise_count: 6,
        gym_name: null,
      },
    ];

    database.getRecentWorkoutSummaries.mockResolvedValueOnce(mockSummaries);

    const { result } = renderHook(() => useWeeklySummary('test-user', 'ppl'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sessionsByWorkoutType).toBeDefined();
    expect(result.current.sessionsByWorkoutType['push']).toBeDefined();
    expect(result.current.sessionsByWorkoutType['push'].length).toBe(2);
  });

  it('handles database errors gracefully', async () => {
    database.getRecentWorkoutSummaries.mockRejectedValueOnce(new Error('Database error'));

    const { result } = renderHook(() => useWeeklySummary('test-user', 'ppl'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
