import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserProfile } from '../useUserProfile';

// Mock the supabase module
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: jest.fn(),
      })),
    })),
  })),
};

jest.mock('../../../app/_lib/supabase', () => ({
  supabase: mockSupabase,
}));

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

describe('useUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when userId is null', async () => {
    const { result } = renderHook(() => useUserProfile(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it('fetches user profile successfully', async () => {
    const mockProfile = {
      id: 'test-user',
      active_t_path_id: 't-path-1',
      active_gym_id: 'gym-1',
      programme_type: 'ppl',
      preferred_session_length: '45-60',
      full_name: 'Test User',
      first_name: 'Test',
      last_name: 'User',
      onboarding_completed: true,
    };

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useUserProfile('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      id: 'test-user',
      active_t_path_id: 't-path-1',
      active_gym_id: 'gym-1',
      programme_type: 'ppl',
      preferred_session_length: '45-60',
      full_name: 'Test User',
      first_name: 'Test',
      last_name: 'User',
      onboarding_completed: true,
    });
  });

  it('returns default profile when no data found', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          maybeSingle: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useUserProfile('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      id: 'test-user',
      active_t_path_id: null,
      active_gym_id: null,
      programme_type: 'ppl',
      preferred_session_length: null,
      full_name: null,
      first_name: null,
      last_name: null,
      onboarding_completed: false,
    });
  });

  it('handles ULUL programme type correctly', async () => {
    const mockProfile = {
      id: 'test-user',
      programme_type: 'ulul',
      onboarding_completed: true,
    };

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          maybeSingle: jest.fn().mockResolvedValueOnce({ data: mockProfile, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useUserProfile('test-user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.programme_type).toBe('ulul');
  });
});
