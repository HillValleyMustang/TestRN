import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNextWorkout } from '../useNextWorkout';

// Mock the database module
jest.mock('../../../app/_lib/database', () => ({
  database: {
    getRecentWorkoutSummaries: jest.fn(),
    getTPathsByParent: jest.fn(),
  },
}));

// Mock the WeeklyWorkoutAnalyzer
jest.mock('@data/ai/weekly-workout-analyzer', () => ({
  WeeklyWorkoutAnalyzer: {
    determineNextWorkoutWeeklyAware: jest.fn(),
  },
}));

const { database } = require('../../../app/_lib/database');
const { WeeklyWorkoutAnalyzer } = require('@data/ai/weekly-workout-analyzer');

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

describe('useNextWorkout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when userId is null', async () => {
    const { result } = renderHook(() => useNextWorkout(null, null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it('returns null when activeTPathId is null', async () => {
    const { result } = renderHook(() => useNextWorkout('test-user', null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it('determines next workout successfully', async () => {
    const mockRecentWorkouts = [
      {
        session: {
          id: 'session-1',
          template_name: 'Push',
          session_date: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
        exercise_count: 5,
        gym_name: null,
      },
    ];

    const mockTPathWorkouts = [
      {
        id: 'child-1',
        template_name: 'Push',
        description: 'Push workout',
        parent_t_path_id: 't-path-1',
      },
      {
        id: 'child-2',
        template_name: 'Pull',
        description: 'Pull workout',
        parent_t_path_id: 't-path-1',
      },
    ];

    const mockNextWorkout = {
      id: 'child-2',
      template_name: 'Pull',
      description: 'Pull workout',
      parent_t_path_id: 't-path-1',
      recommendationReason: 'normal_cycling',
    };

    database.getRecentWorkoutSummaries.mockResolvedValueOnce(mockRecentWorkouts);
    database.getTPathsByParent.mockResolvedValueOnce(mockTPathWorkouts);
    WeeklyWorkoutAnalyzer.determineNextWorkoutWeeklyAware.mockReturnValueOnce(mockNextWorkout);

    const { result } = renderHook(
      () => useNextWorkout('test-user', 't-path-1', 'ppl'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      id: 'child-2',
      template_name: 'Pull',
      description: 'Pull workout',
      parent_t_path_id: 't-path-1',
      recommendationReason: 'normal_cycling',
    });
  });

  it('handles database errors gracefully', async () => {
    database.getRecentWorkoutSummaries.mockRejectedValueOnce(new Error('Database error'));
    database.getTPathsByParent.mockResolvedValueOnce([]);

    const { result } = renderHook(
      () => useNextWorkout('test-user', 't-path-1', 'ppl'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('respects the enabled option', async () => {
    const { result } = renderHook(
      () => useNextWorkout('test-user', 't-path-1', 'ppl', { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.loading).toBe(false);
    expect(database.getRecentWorkoutSummaries).not.toHaveBeenCalled();
  });
});
