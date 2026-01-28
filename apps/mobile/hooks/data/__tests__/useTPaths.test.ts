import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTPaths } from '../useTPaths';

// Mock the database module
jest.mock('../../../app/_lib/database', () => ({
  database: {
    getTPaths: jest.fn(),
    getTPath: jest.fn(),
    getTPathsByParent: jest.fn(),
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

describe('useTPaths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when userId is null', async () => {
    const { result } = renderHook(() => useTPaths(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.activeTPath).toBeNull();
    expect(result.current.tPathWorkouts).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetches T-Paths successfully', async () => {
    const mockTPaths = [
      {
        id: 't-path-1',
        user_id: 'test-user',
        template_name: 'PPL Program',
        description: 'Push Pull Legs',
        parent_t_path_id: null,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    database.getTPaths.mockResolvedValueOnce(mockTPaths);

    const { result } = renderHook(() => useTPaths('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockTPaths);
    expect(database.getTPaths).toHaveBeenCalledWith('test-user');
  });

  it('fetches active T-Path and child workouts when activeTPathId is provided', async () => {
    const mockTPaths = [
      {
        id: 't-path-1',
        user_id: 'test-user',
        template_name: 'PPL Program',
        description: 'Push Pull Legs',
        parent_t_path_id: null,
      },
    ];

    const mockActiveTPath = {
      id: 't-path-1',
      template_name: 'PPL Program',
      description: 'Push Pull Legs',
      parent_t_path_id: null,
    };

    const mockChildWorkouts = [
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

    database.getTPaths.mockResolvedValueOnce(mockTPaths);
    database.getTPath.mockResolvedValueOnce(mockActiveTPath);
    database.getTPathsByParent.mockResolvedValueOnce(mockChildWorkouts);

    const { result } = renderHook(() => useTPaths('test-user', 't-path-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activeTPath).toEqual({
      id: 't-path-1',
      template_name: 'PPL Program',
      description: 'Push Pull Legs',
      parent_t_path_id: null,
    });

    expect(result.current.tPathWorkouts).toEqual([
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
    ]);
  });

  it('handles database errors gracefully', async () => {
    database.getTPaths.mockRejectedValueOnce(new Error('Database error'));

    const { result } = renderHook(() => useTPaths('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
