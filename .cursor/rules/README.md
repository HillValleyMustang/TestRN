# Cursor Rules Documentation

This directory contains MCP (Model Context Protocol) rule files that guide AI-assisted development for this monorepo.

## Rule Files Overview

### Core Rules (Always Applied)
- **core-architecture.mdc** - Monorepo structure, code sharing, path aliases
- **critical-patterns.mdc** - Provider order, race conditions, circular dependencies (CRITICAL)
- **error-handling.mdc** - Error handling patterns, logging standards
- **state-management.mdc** - React hooks, cache invalidation, state strategy
- **typescript-patterns.mdc** - Type safety, imports, type definitions
- **supabase-integration.mdc** - Edge functions, database, authentication
- **common-pitfalls.mdc** - Common mistakes to avoid
- **file-organization.mdc** - Where code should live
- **forms-validation.mdc** - Form handling with react-hook-form and zod
- **verification.mdc** - Mandatory checks before committing code
- **clarification.mdc** - Handling ambiguity and edge cases

### Platform-Specific Rules (Applied by File Pattern)
- **mobile-patterns.mdc** - React Native/Expo patterns (apps/mobile/**)
- **web-patterns.mdc** - Next.js patterns (apps/web/**)
- **react-query-patterns.mdc** - React Query patterns (apps/web/**)
- **style.mdc** - Styling rules (web and mobile)
- **performance.mdc** - Optimization patterns (optional)

## Key Principles

1. **Provider Order**: DataProvider must wrap AuthProvider (not the other way around)
2. **Type Imports**: 
   - Mobile/Shared: Use `@data/storage/models`
   - Web: Use `apps/web/src/types/supabase-generated/`
3. **Logging**: 
   - Mobile: Use `createTaggedLogger`
   - Web: Use standard console methods
4. **State Management**:
   - Mobile: React Context + local SQLite
   - Web: React Context + React Query
5. **Offline-First**: Mobile writes go to local DB first, then sync queue

## Recent Updates

- Fixed logging patterns to distinguish mobile vs web
- Clarified type import sources for web vs mobile
- Added React Query patterns for web app
- Clarified provider order (DataProvider wraps AuthProvider)
- Updated verification checks to include both web and mobile schema locations
