import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

// Custom query cache that works with SQLite database
class SQLiteQueryCache {
  private cache = new Map<string, { data: any; timestamp: number; userId: string }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(queryKey: string[], data: any, userId: string, options?: { ttl?: number }) {
    const ttl = options?.ttl || this.DEFAULT_TTL;
    const key = JSON.stringify(queryKey);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      userId
    });

    // Auto-expire after TTL
    setTimeout(() => {
      const entry = this.cache.get(key);
      if (entry && Date.now() - entry.timestamp >= ttl) {
        this.cache.delete(key);
      }
    }, ttl);
  }

  get(queryKey: string[], userId: string) {
    const key = JSON.stringify(queryKey);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if cache is for current user
    if (entry.userId !== userId) {
      this.cache.delete(key);
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp >= this.DEFAULT_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(userId?: string) {
    if (userId) {
      // Invalidate only user-specific cache
      for (const [key, entry] of this.cache.entries()) {
        if (entry.userId === userId) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  clear() {
    this.cache.clear();
  }
}

// Create query client with custom configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount: number, error: unknown) => {
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('Database not initialized')) {
            return false;
          }
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Custom query cache instance
export const sqliteQueryCache = new SQLiteQueryCache();

// Network status helper
export const getNetworkStatus = async () => {
  const state = await NetInfo.fetch();
  return {
    isOnline: state.isConnected ?? false,
    isConnected: state.isConnected ?? false,
    type: state.type,
  };
};

// Invalidate queries when user data changes
export const invalidateUserQueries = (userId: string) => {
  queryClient.invalidateQueries({
    predicate: (query: any) => {
      // Check if query is user-specific and matches current user
      const queryKey = query.queryKey;
      if (Array.isArray(queryKey) && queryKey.length > 0) {
        const userIdFromKey = queryKey[0];
        return userIdFromKey === userId;
      }
      return false;
    },
  });
  
  // Also clear SQLite cache for the user
  sqliteQueryCache.invalidate(userId);
};

// Helper function to get cached data for a specific query
export const getCachedQueryData = (queryKey: string[], userId: string) => {
  return sqliteQueryCache.get(queryKey, userId);
};

// Setup query client with network status monitoring
export const setupQueryClient = () => {
  // Monitor network status
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected ?? false;
    
    if (isOnline) {
      // When coming back online, refetch all queries
      queryClient.resumePausedMutations();
      queryClient.refetchQueries({
        type: 'active',
        stale: true,
      });
    }
  });

  return unsubscribe;
};

// Query key factory for consistent query keys
export const queryKeys = {
  // User queries
  user: (userId: string) => ['user', userId] as const,
  
  // Workout queries
  workouts: (userId: string) => ['workouts', userId] as const,
  workoutSessions: (userId: string) => ['workout-sessions', userId] as const,
  recentWorkouts: (userId: string, limit?: number) => ['recent-workouts', userId, limit] as const,
  workoutStats: (userId: string, days?: number) => ['workout-stats', userId, days] as const,
  
  // Exercise queries
  exerciseDefinitions: () => ['exercise-definitions'] as const,
  exercisePR: (userId: string, exerciseId: string) => ['exercise-pr', userId, exerciseId] as const,
  exerciseProgression: (userId: string, exerciseId: string, limit: number) => ['exercise-progression', userId, exerciseId, limit] as const,

  // Workout comparison queries
  workoutComparison: (userId: string, currentSessionId: string, previousSessionId: string) => ['workout-comparison', userId, currentSessionId, previousSessionId] as const,

  // Analytics queries
  workoutFrequency: (userId: string, days?: number) => ['workout-frequency', userId, days] as const,
  volumeHistory: (userId: string, days?: number) => ['volume-history', userId, days] as const,
  weeklyVolume: (userId: string) => ['weekly-volume', userId] as const,
  
  // Profile and preferences
  profile: (userId: string) => ['profile', userId] as const,
  preferences: (userId: string) => ['preferences', userId] as const,
  achievements: (userId: string) => ['achievements', userId] as const,
  
  // Goals and measurements
  goals: (userId: string) => ['goals', userId] as const,
  bodyMeasurements: (userId: string) => ['body-measurements', userId] as const,
  weightHistory: (userId: string, days?: number) => ['weight-history', userId, days] as const,
  
  // Templates and paths
  templates: (userId: string) => ['templates', userId] as const,
  tPaths: (userId: string) => ['t-paths', userId] as const,
  tPathProgress: (userId: string) => ['t-path-progress', userId] as const,
  
  // Gyms
  gyms: (userId: string) => ['gyms', userId] as const,
  activeGym: (userId: string) => ['active-gym', userId] as const,
} as const;

export default queryClient;