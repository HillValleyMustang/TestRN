---
paths:
  - "apps/mobile/**/*"
---
# Reactive Hooks Architecture (React Query)

The mobile app uses a reactive data fetching architecture built on `@tanstack/react-query`. All new data fetching in the mobile app MUST use this pattern instead of imperative loading (e.g., `loadDashboardSnapshot`).

## When to Use Reactive Hooks

- **Any component that needs data from SQLite or Supabase** - use a reactive hook
- **Dashboard widgets** - each widget fetches its own data via hooks
- **Screens that display user data** - profile, workouts, gyms, training paths
- **Any new feature that displays dynamic data** - create a new hook in `apps/mobile/hooks/data/`

## Hook Location & Exports

All data hooks live in `apps/mobile/hooks/data/` and are exported from the barrel file `apps/mobile/hooks/data/index.ts`:

- `useWeeklySummary` - Weekly workout stats with memoized session grouping
- `useNextWorkout` - Next recommended workout with deduplication
- `useUserProfile` - Profile data with fallback defaults
- `useRecentWorkouts` - Recent workout summaries (configurable limit)
- `useVolumeHistory` - Volume tracking with workout type mapping (dual-query)
- `useGyms` - User's gym list
- `useTPaths` - Training paths with child workout deduplication (dual-query)
- `useWorkoutHistory` - Full workout history

## Creating a New Data Hook

Follow this template:

```typescript
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../../app/_lib/react-query-client';
import { database } from '../../app/_lib/database';

interface UseMyDataReturn {
  data: MyDataType | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useMyData(
  userId: string | null,
  options?: { enabled?: boolean }
): UseMyDataReturn {
  const query = useQuery({
    queryKey: queryKeys.myData(userId!),
    queryFn: () => database.getMyData(userId!),
    enabled: !!userId && (options?.enabled !== false),
    staleTime: 30 * 1000,       // 30 seconds
    gcTime: 5 * 60 * 1000,      // 5 minutes
  });

  const data = useMemo(() => {
    if (!query.data) return undefined;
    // Transform data here if needed
    return query.data;
  }, [query.data]);

  return {
    data,
    loading: query.isLoading,
    error: query.error,
    refetch: async () => { await query.refetch(); },
  };
}
```

**Rules for new hooks:**
1. Add a query key to `queryKeys` in `apps/mobile/app/_lib/react-query-client.ts`
2. Export from `apps/mobile/hooks/data/index.ts`
3. Return the standard interface: `{ data, loading, error, refetch }`
4. Guard with `enabled: !!userId` to prevent queries before auth is ready
5. Wrap any data transformation in `useMemo`

## Standard Return Interface

ALL data hooks MUST return this shape:

```typescript
{
  data: T | undefined;        // undefined while loading
  loading: boolean;           // true during initial fetch
  error: Error | null;        // query error
  refetch: () => Promise<void>; // manual refetch trigger
}
```

## Cache Timing Guidelines

Choose staleTime based on how frequently the data changes:

| Data Type | staleTime | gcTime | Example |
|-----------|-----------|--------|---------|
| Rarely changes | 2 min | 10 min | Volume history, workout history |
| Changes per session | 1 min | 5 min | User profile, gyms, training paths |
| Changes frequently | 30 sec | 5 min | Weekly summary, recent workouts, next workout |

Global defaults in `apps/mobile/app/_lib/react-query-client.ts`:
- `staleTime: 5 min`, `gcTime: 10 min`, `refetchOnWindowFocus: true`, `refetchOnReconnect: true`

## Query Key Factory

All query keys are centralized in `apps/mobile/app/_lib/react-query-client.ts` via the `queryKeys` object. Keys follow the pattern `['resource-name', userId, ...params]`:

```typescript
export const queryKeys = {
  recentWorkouts: (userId: string, limit?: number) =>
    ['recent-workouts', userId, limit] as const,
  volumeHistory: (userId: string, days?: number) =>
    ['volume-history', userId, days] as const,
  profile: (userId: string) =>
    ['profile', userId] as const,
  // ... etc
};
```

**Always use `queryKeys.*` instead of raw strings** - this prevents key mismatches and enables type-safe invalidation.

## Dual-Query Pattern

When a hook needs data from two different sources to produce its result, use the dual-query pattern (see `useVolumeHistory`, `useTPaths`):

```typescript
export function useVolumeHistory(userId: string | null, days = 7) {
  // Query 1: Primary data
  const volumeQuery = useQuery({
    queryKey: queryKeys.volumeHistory(userId!, days),
    queryFn: () => database.getVolumeHistory(userId!, days),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query 2: Supplementary data for enrichment
  const workoutsQuery = useQuery({
    queryKey: ['volume-workouts', userId, days],
    queryFn: () => database.getRecentWorkoutSummaries(userId!, 50),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Memoized combination of both queries
  const volumeData = useMemo(() => {
    if (!volumeQuery.data) return undefined;
    // Combine volumeQuery.data with workoutsQuery.data
    return transformedResult;
  }, [volumeQuery.data, workoutsQuery.data]);

  return {
    data: volumeData,
    loading: volumeQuery.isLoading || workoutsQuery.isLoading,
    error: volumeQuery.error || workoutsQuery.error,
    refetch: async () => {
      await Promise.all([volumeQuery.refetch(), workoutsQuery.refetch()]);
    },
  };
}
```

**Key rules for dual-query:**
- Combine loading states with `||` (loading if either is loading)
- Combine errors with `||` (show first error)
- Batch refetch with `Promise.all`
- Memoize the combination with deps from both queries

## Dependent Queries

When one hook's result is needed to fetch another, use the `enabled` option:

```typescript
// Step 1: Fetch profile
const { data: profile, loading: profileLoading } = useUserProfile(userId);

// Step 2: Use profile data as dependency
const activeTPathId = profile?.active_t_path_id || null;
const { data: nextWorkout, loading: nextLoading } = useNextWorkout(
  userId,
  activeTPathId,
  profile?.programme_type || 'ppl',
  { enabled: !!activeTPathId }  // Only fetch when dependency is ready
);

// Combine loading states
const loading = profileLoading || nextLoading;
```

## Cache Invalidation

### After mutations (e.g., completing a workout):
```typescript
import { invalidateUserQueries } from '../app/_lib/react-query-client';

// Invalidate ALL queries for this user
invalidateUserQueries(userId);
```

### Selective invalidation:
```typescript
import { queryClient } from '../app/_lib/react-query-client';

queryClient.invalidateQueries({ queryKey: ['recent-workouts', userId] });
```

### On network reconnect (automatic):
React Query automatically refetches stale active queries when the device comes back online. This is configured via `NetInfo` in `QueryProvider.tsx`.

## Deduplication Pattern

When data may contain duplicates (e.g., T-Path child workouts), deduplicate using a `Map` keyed on normalized name:

```typescript
const uniqueItems = useMemo(() => {
  if (!data) return [];
  const seen = new Map<string, ItemType>();
  data.forEach(item => {
    const key = item.name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  });
  return Array.from(seen.values());
}, [data]);
```

## Feature Flag

The reactive hooks system is controlled by `USE_REACTIVE_HOOKS` in `apps/mobile/constants/feature-flags.ts`. When toggling between old and new patterns:

```typescript
const useReactiveHooks = useReactiveHooksEnabled();

const { data, loading } = useUserProfile(
  useReactiveHooks ? userId : null,
  { enabled: useReactiveHooks }
);
```

## Provider Setup

`QueryProvider` must wrap all components using reactive hooks. It is set up in `apps/mobile/app/_components/QueryProvider.tsx` and placed near the root of the app tree. It also configures network monitoring for automatic refetch on reconnect.

## Anti-Patterns

- **Do NOT** call `database.*` directly in components - always use a hook
- **Do NOT** use raw query key strings - use `queryKeys.*`
- **Do NOT** skip the `enabled` guard - always check `!!userId`
- **Do NOT** store query results in `useState` - let React Query manage the cache
- **Do NOT** forget `useMemo` when transforming query data
- **Do NOT** create hooks outside of `apps/mobile/hooks/data/` for data fetching
