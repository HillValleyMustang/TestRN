---
paths:
  - "apps/mobile/**/*"
---
# React Native Best Practices Checklist

## Component Design
- [ ] Components are focused and single-purpose (extract complex logic to hooks/utilities)
- [ ] No inline functions in render (use `useCallback` for event handlers)
- [ ] No inline objects/arrays in render (extract to constants or useMemo)
- [ ] Proper key props for lists (use stable IDs, not array indices)
- [ ] Components are properly typed with TypeScript interfaces

## Performance Optimization
- [ ] Expensive computations are memoized with `useMemo`
- [ ] Functions passed to children are wrapped in `useCallback`
- [ ] Long lists use `FlatList` with proper `keyExtractor` and `getItemLayout` when possible
- [ ] Images are optimized (use `expo-image` for better performance than `Image`)
- [ ] Avoid unnecessary re-renders (use `React.memo` for expensive components)
- [ ] State updates are batched when possible

## Hooks Usage
- [ ] `useEffect` has proper dependencies array (include ALL used values)
- [ ] `useEffect` has cleanup functions for subscriptions/timers/listeners
- [ ] No missing dependencies in dependency arrays (use ESLint exhaustive-deps rule)
- [ ] Custom hooks follow naming convention (`use` prefix)
- [ ] Hooks are extracted when logic is reusable

## State Management
- [ ] State is stored at the appropriate level (local vs context vs global)
- [ ] Derived state is computed, not stored (use `useMemo` for calculations)
- [ ] Complex state uses `useReducer` instead of multiple `useState` calls
- [ ] Context providers are not overused (only for truly global state)

## Data Fetching & Caching
- [ ] Data fetching uses proper loading and error states
- [ ] Offline-first: Writes go to local DB first, then sync queue
- [ ] Cache invalidation happens after mutations
- [ ] No duplicate data fetching (consolidate multiple effects)
- [ ] Network requests are properly cancelled on unmount

## Navigation & Screen Lifecycle
- [ ] `useFocusEffect` is used for screen-level data refreshes
- [ ] Navigation params are properly typed
- [ ] Deep links are handled correctly
- [ ] Back button behavior is considered

## Styling
- [ ] Styles use `StyleSheet.create()` (not inline styles)
- [ ] Styles are defined outside render (not recreated on each render)
- [ ] Theme constants are used (Colors, Spacing, BorderRadius from `constants/Theme.ts`)
- [ ] Typography uses TextStyles from `constants/Typography.ts`
- [ ] Responsive design is considered (use Dimensions API when needed)

## Error Handling
- [ ] All async operations have try/catch blocks
- [ ] User-friendly error messages are shown (not raw errors)
- [ ] Errors are logged appropriately (use `createTaggedLogger`)
- [ ] Loading states are shown during async operations
- [ ] Network errors are handled gracefully

## TypeScript
- [ ] No `any` types (use `unknown` with type guards if needed)
- [ ] All function parameters and return types are typed
- [ ] Types are imported from correct sources (`@data/storage/models` or `@data/types/exercise.ts`)
- [ ] Type assertions are minimal and well-justified
- [ ] Optional chaining is used appropriately
