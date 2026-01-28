import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkoutHistory } from '../useWorkoutHistory';

// Mock the database module
jest.mock('../../../app/_lib/database', () => ({
  database: {
    getWorkoutSessions: jest.fn(),
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

describe('useWorkoutHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when userId is null', async () => {
    const { result } = renderHook(() => useWorkoutHistory(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it('fetches workout sessions when userId is provided', async () => {
    const mockWorkouts = [
      {
        id: 'workout-1',
        user_id: 'test-user',
        template_name: 'Push',
        session_date: '2025-01-25',
        completed_at: '2025-01-25T10:00:00Z',
      },
      {
        id: 'workout-2',
        user_id: 'test-user',
        template_name: 'Pull',
        session_date: '2025-01-24',
        completed_at: '2025-01-24T10:00:00Z',
      },
    ];

    database.getWorkoutSessions.mockResolvedValueOnce(mockWorkouts);

    const { result } = renderHook(() => useWorkoutHistory('test-user'), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockWorkouts);
    expect(database.getWorkoutSessions).toHaveBeenCalledWith('test-user');
  });

  it('handles database errors gracefully', async () => {
    database.getWorkoutSessions.mockRejectedValueOnce(new Error('Database error'));

    const { result } = renderHook(() => useWorkoutHistory('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('Database error');
  });

  it('respects the enabled option', async () => {
    const { result } = renderHook(
      () => useWorkoutHistory('test-user', { enabled: false }),
      { wrapper: createWrapper() }
    );

    expect(result.current.loading).toBe(false);
    expect(database.getWorkoutSessions).not.toHaveBeenCalled();
  });

  it('provides a refetch function', async () => {
    const mockWorkouts = [{ id: 'workout-1', user_id: 'test-user' }];
    database.getWorkoutSessions.mockResolvedValue(mockWorkouts);

    const { result } = renderHook(() => useWorkoutHistory('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Call refetch
    await result.current.refetch();

    // Should have called getWorkoutSessions twice (initial + refetch)
    expect(database.getWorkoutSessions).toHaveBeenCalledTimes(2);
  });
});
