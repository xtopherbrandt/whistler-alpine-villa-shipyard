---
id: T016
title: "Unit Assignment Server Actions"
feature: F003
kind: feature
sprint: sprint-001
effort: S
status: approved
dependencies: [T014]
verify_command: null
---

# Unit Assignment Server Actions

## What
`assignUnit()` and `removeUnit()` Server Actions for managing the UserUnit join table.

## Red Step
Unit test: `assignUnit` called twice with the same userId+unitId creates a duplicate row.

## Steps
1. Create `src/lib/actions/units.ts`:
   ```typescript
   async function assignUnit(userId: string, unitId: number): Promise<ActionResult<void>>
   async function removeUnit(userId: string, unitId: number): Promise<ActionResult<{ hasActiveOccupancy: boolean }>>
   ```
2. `assignUnit`: upsert-style — create UserUnit if not exists, silently succeed if already assigned
3. `removeUnit`:
   - Check for active occupancy (stub: `hasActiveOccupancy = false` — E001 will wire the real check)
   - Delete the `UserUnit` row
   - Return `{ data: { hasActiveOccupancy }, error: null }`

## Acceptance Probe
`assignUnit` twice: only one UserUnit row exists. `removeUnit` deletes the row and returns `{ hasActiveOccupancy: false }`. Admin UI (T019) uses `hasActiveOccupancy` to show warning before confirming removal.

## Technical Notes
`hasActiveOccupancy` stub: always returns `false` for this sprint. When E001 is built, it will replace this with a real query against the occupancy records table. The return shape is already correct so E001 only needs to wire the query.

`assignUnit` uses `prisma.userUnit.upsert` with `create` and `update: {}` (no-op update) — idempotent.

No validation that the unit number exists in the `Unit` table needed at the server action level — the UI loads units from the seeded list, so invalid unit IDs are a UI bug, not a user input path.
