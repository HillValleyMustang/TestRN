---
paths:
  - "**/*"
---
# Common Pitfalls to Avoid

1. **Multiple useEffect conflicts**: Don't have 5+ effects fetching the same data - consolidate them
2. **Premature redirects**: Always check data is loaded before redirecting - use explicit loading states
3. **Circular dependencies**: DataContext shouldn't import AuthContext - use Supabase client directly
4. **Raw error logging**: Don't log errors before custom handling - show user-friendly alerts first
5. **Missing loading states**: Always show loading during data fetches to prevent race conditions
6. **Cache not invalidated**: After mutations, invalidate relevant caches (both React Query and database-level)
7. **Provider order**: DataProvider must come before AuthProvider - this causes app crashes
8. **Type mismatches**: Use correct types from `@data/storage/models` (mobile/shared) or `apps/web/src/types/supabase-generated/` (web) - don't create duplicate types
9. **Hardcoded project IDs**: Consider environment variables for Supabase project ID
10. **Missing error boundaries**: Wrap error-prone components in ErrorBoundary
11. **Onboarding race conditions**: Check `userProfile !== null && userProfile !== undefined` before redirecting
12. **Dashboard refresh issues**: Use `useFocusEffect` to refresh when returning to dashboard after workout completion
