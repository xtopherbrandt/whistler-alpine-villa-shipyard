---
paths: ["src/**/*"]
---
# Naming Conventions

## Files
- Components: `kebab-case.tsx` (e.g., `property-card.tsx`)
- Utilities: `kebab-case.ts` (e.g., `format-date.ts`)
- Hooks: `use-kebab-case.ts` (e.g., `use-booking-state.ts`)
- Types: `kebab-case.types.ts` or co-located in the file that owns them
- Server Actions: `kebab-case.actions.ts`

## Identifiers
- Components: `PascalCase` named exports — no default exports
- Hooks: `useCamelCase`
- Types and interfaces: `PascalCase`, no `I` prefix (not `IBooking`, use `Booking`)
- Constants: `SCREAMING_SNAKE_CASE`
- Booleans: `is`, `has`, `can`, or `should` prefix (e.g., `isAvailable`, `hasError`)
- Event handlers: `handle` prefix (e.g., `handleSubmit`, `handleDateChange`)
- Server Actions: `camelCase` verbs (e.g., `createBooking`, `updateAvailability`)
