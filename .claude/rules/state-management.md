---
paths:
  - "**/*.tsx"
  - "**/*.ts"
---
# State Management Patterns

## React Hooks
- Custom hooks go in `apps/mobile/hooks/` or `apps/web/src/hooks/`
- Shared hooks go in `packages/features/`
- Use `useEffect` cleanup functions for subscriptions, timers, listeners
- Dependencies: Include ALL values from component scope used in effect
- Use `useMemo` for expensive computations (workout stats, filtered lists)
- Use `useCallback` for functions passed to child components
- Avoid storing derived state - compute it in render or useMemo
- For complex state, prefer `useReducer` over multiple `useState` calls

## Cache Invalidation
- When deleting workouts/sessions, call `invalidateAllCaches()` AND `handleWorkoutCompletion()` from DataContext
- Dashboard refresh after workout completion: Use `useFocusEffect` to refresh when returning to dashboard
- Weekly target updates: Use proper state comparison (not just JSON.stringify) and debug logging
- Clear both React Query cache AND database-level caches when needed
- After mutations, always invalidate relevant caches

## State Management Strategy
- React Context API for global state (DataContext, AuthContext, PreferencesContext)
- React Query (`@tanstack/react-query`) for server state (web app only)
- Local state with hooks for component-level state
- Offline-first: All writes go to local DB first, then sync queue (mobile)
- Web: Direct Supabase queries with React Query caching
