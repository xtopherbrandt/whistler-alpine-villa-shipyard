---
paths: ["src/**/*.test.*", "e2e/**/*", "tests/**/*"]
---
# Testing Patterns

## Naming
- Unit tests: `it('should [behavior] when [condition]')`
- E2E tests: `test('[user action] [expected outcome]')`
- Test files: co-located alongside source files as `*.test.ts` / `*.test.tsx`
- E2E files: under `e2e/` directory, named by user journey

## Strategy
- Mock only external boundaries: network calls, filesystem, database, clock
- Never mock internal project modules — test real implementations
- Assert on behavior and output, not on implementation details or mock call counts
- Server Actions: test with real inputs and assert the returned shape, not internals
- Components: render and assert on visible output (text, aria attributes), not internal state

## Coverage Expectations
- Business logic in `src/lib/`: high coverage (aim for 85%+)
- UI components: test interaction and state transitions, not rendering details
- E2E: cover critical user journeys (booking flow, auth, checkout) end-to-end
