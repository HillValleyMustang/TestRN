import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGyms } from '../useGyms';

// Mock the database module
jest.mock('../../../app/_lib/database', () => ({
  database: {
    getGyms: jest.fn(),
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

describe('useGyms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when userId is null', async () => {
    const { result } = renderHook(() => useGyms(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.activeGym).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('fetches gyms successfully', async () => {
    const mockGyms = [
      {
        id: 'gym-1',
        user_id: 'test-user',
        name: 'Home Gym',
        is_active: false,
        created_at: '2025-01-01T00:00:00Z',
      },
      {
        id: 'gym-2',
        user_id: 'test-user',
        name: 'Commercial Gym',
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    database.getGyms.mockResolvedValueOnce(mockGyms);

    const { result } = renderHook(() => useGyms('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockGyms);
    expect(result.current.activeGym).toEqual(mockGyms[1]); // The active one
    expect(database.getGyms).toHaveBeenCalledWith('test-user');
  });

  it('returns first gym as active when none is marked active', async () => {
    const mockGyms = [
      {
        id: 'gym-1',
        user_id: 'test-user',
        name: 'Home Gym',
        is_active: false,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    database.getGyms.mockResolvedValueOnce(mockGyms);

    const { result } = renderHook(() => useGyms('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activeGym).toEqual(mockGyms[0]);
  });

  it('returns null for activeGym when no gyms exist', async () => {
    database.getGyms.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useGyms('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activeGym).toBeNull();
  });

  it('handles database errors gracefully', async () => {
    database.getGyms.mockRejectedValueOnce(new Error('Database error'));

    const { result } = renderHook(() => useGyms('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
