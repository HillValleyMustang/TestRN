---
paths:
  - "**/*"
---
# Prompt Enhancement Protocol

## When User Provides a Vague Request

**Before starting work, expand the user's prompt with:**

1. **Technical Context**: Identify the specific files/components affected
2. **Related Rules**: Reference relevant rule files that apply
3. **Codebase Patterns**: Note existing patterns/utilities to use
4. **Expected Outcome**: Clarify what "done" looks like
5. **Complexity Assessment**: Determine if this needs a detailed plan (see `task-planning.md`)

## Prompt Expansion Process

### Step 1: Analyze the Request
- What files/components are likely affected?
- What type of change is this? (bug fix, feature, optimization, refactor)
- What's the scope? (single file, multiple files, cross-platform)

### Step 2: Add Technical Context
- Identify specific file paths
- Note related components/hooks/utilities
- Reference existing patterns in codebase
- Identify dependencies

### Step 3: Reference Relevant Rules
Automatically include relevant rules:
- **Performance issues** -> `performance.md`, `react-native-checklist.md`
- **Loading/state issues** -> `critical-patterns.md`, `state-management.md`
- **Styling/UI** -> `style.md`, `mobile-patterns.md` or `web-patterns.md`
- **Database/data** -> `supabase-integration.md`, `typescript-patterns.md`
- **Complex features** -> `task-planning.md`, `clarification.md`

### Step 4: Add Codebase-Specific Context
- Note existing utilities/functions to use
- Reference similar implementations
- Identify anti-patterns to avoid
- Note platform-specific considerations (mobile vs web)

### Step 5: Clarify Expected Outcome
- What does "fixed" or "done" look like?
- Are there specific edge cases to handle?
- What's the user experience goal?

## Guidelines

- **Be specific**: Don't just repeat the user's words - add actionable context
- **Reference rules**: Always note which rules apply to this request
- **Note patterns**: Identify existing codebase patterns to follow
- **Clarify scope**: Make it clear what files/components are involved
- **Set expectations**: Define what "done" looks like

## Integration with Other Rules

- **Before** `task-planning.md`: Use this to understand scope before creating plan
- **Before** `clarification.md`: Use this to identify what questions to ask
- **Before** `pre-implementation-review.md`: Use this to challenge the approach with full context
- **During** implementation: Reference this expanded context throughout
