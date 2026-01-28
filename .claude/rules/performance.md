---
paths:
  - "**/*.tsx"
  - "**/*.ts"
---
# Performance Optimization

## React Optimization
- Use `React.memo` for expensive components that receive stable props
- Lazy load heavy components with `React.lazy()` and `Suspense`
- Debounce search/filter inputs to avoid excessive re-renders
- Virtualize long lists (FlatList with proper keyExtractor on mobile)
- Memoize expensive calculations with `useMemo`

## Database Queries
- Index frequently queried fields in Supabase
- Use pagination for large datasets
- Batch related queries when possible
- Cache query results appropriately
- Avoid N+1 query problems

## State Optimization
- Use `useMemo` for expensive computations (workout stats, filtered lists) - see `state-management.md` for details
- Use `useCallback` for functions passed to child components - see `state-management.md` for details
- Avoid storing derived state - compute it in render or useMemo
- For complex state, prefer `useReducer` over multiple `useState` calls
- **Note**: See `state-management.md` for comprehensive hook patterns and best practices
