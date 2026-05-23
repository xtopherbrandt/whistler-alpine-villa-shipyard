---
id: F003
title: "User & Unit Administration"
type: feature
epic: E005
status: in_progress
story_points: 5
complexity: medium
token_estimate: 8000
rice_reach: 60
rice_impact: 7
rice_confidence: 0.9
rice_effort: 1.5
rice_score: 252
feasibility: 9
dependencies: [F001, F002]
references: []
children: []
tasks: [T014, T015, T016, T017, T018, T019, T022]
created: 2026-05-21
updated: 2026-05-21
demo_probe: |
  curl -fsS -b 'session=ADMIN_SESSION' http://localhost:3000/admin/users \
    | grep -q 'Unit 1'
---

# User & Unit Administration

## User Story

As an Admin, I want to manage user accounts and their unit assignments so that the user roster stays accurate as shareholders join, leave, or change their holdings.

## Why This Matters

Ownership changes (share sales, transfers, role changes) happen over time. The Admin needs to keep accounts accurate without recreating the system from scratch. Outdated accounts create security risk and inaccurate occupancy data.

## Acceptance Criteria

```gherkin
Feature: User & Unit Administration

  Scenario: Admin views the user list
    Given the Admin is on the Users page
    When the page loads
    Then all user accounts are listed with name, email, roles, unit assignments, and status (Active / Invited / Deactivated)

  Scenario: Admin edits a user's name or email
    Given the Admin opens a user's edit form
    When they change the name or email and save
    Then the user record is updated immediately
    And the user can log in with their new email on next login attempt

  Scenario: Admin adds a unit to a shareholder
    Given a shareholder account exists
    When the Admin assigns an additional unit number to them
    Then the shareholder is linked to that unit
    And the occupancy system (E001) recognises them as authorised for that unit

  Scenario: Admin removes a unit from a shareholder
    Given a shareholder is assigned to a unit
    When the Admin removes that unit assignment
    Then the shareholder loses authorisation for that unit
    And any future check-in attempts for that unit by that shareholder are blocked

  Scenario: Admin grants Director role to an existing user
    Given a user without the Director role
    When the Admin enables the Director flag on their account
    Then the user gains Director-level access on their next page load (no re-login required)

  Scenario: Admin deactivates a user account
    Given an active user account
    When the Admin deactivates it
    Then the user's active sessions are invalidated immediately
    And they cannot log in until reactivated
    And their account remains in the list with status "Deactivated"

  Scenario: Admin reactivates a user account
    Given a deactivated account
    When the Admin reactivates it
    Then the account returns to "Active" status
    And the user can log in again with their existing password

  Scenario: Admin resends an invite to a pending user
    Given a user with status "Invited" who has not yet activated their account
    When the Admin clicks "Resend invite"
    Then the old invite token is invalidated
    And a new token (72-hour expiry) is created
    And a new invite email is sent

  Scenario: Admin cannot deactivate their own account
    Given the Admin is viewing their own account
    When they attempt to deactivate it
    Then an error is shown: "You cannot deactivate your own account."
    And the account remains active
```

## Data Model

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String?   // null until invite accepted
  isAdmin       Boolean   @default(false)
  isDirector    Boolean   @default(false)
  isCaretaker   Boolean   @default(false)
  isActive      Boolean   @default(false)  // false until invite accepted
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  units              UserUnit[]
  invitations        InvitationToken[]
  passwordResets     PasswordResetToken[]
  loginAttempts      LoginAttempt[]
  // Auth.js managed:
  sessions           Session[]
  accounts           Account[]
}

model Unit {
  id            Int       @id    // unit number (e.g. 23)
  description   String?          // optional label
  isCompanyHeld Boolean   @default(false)

  assignments   UserUnit[]
}

model UserUnit {
  userId  String
  unitId  Int
  user    User   @relation(fields: [userId], references: [id])
  unit    Unit   @relation(fields: [unitId], references: [id])

  @@id([userId, unitId])
}
```

## Configuration

No additional environment variables beyond F001/F002.

## Error Handling

- Editing email to a duplicate: Server Action returns error — "That email address is already in use."
- Removing a unit that has an active check-in: surface a warning — "Unit N has an active occupancy record. Remove assignment anyway? The occupancy record will not be affected."
- Self-deactivation attempt: blocked server-side, error returned via `ActionResult`
- All mutations use `ActionResult<T>` pattern — never throw

## Technical Notes

**Session invalidation on deactivate (HIGH confidence):** When an account is deactivated, delete all `Session` rows for that user from the database. Auth.js session validation will reject the missing session on the user's next request.

**Role changes take effect on next page load (MEDIUM confidence):** Auth.js session encodes roles at login time. Role changes between sessions require the user to refresh (or re-login) to see the new permission set. This is acceptable for an admin-managed system where role changes are rare.

**Unit numbers are admin-seeded:** The 52 unit numbers (1–52) are seeded into the `Unit` table at deployment time via a Prisma seed script. Admin UI allows assigning existing units to users — it does not create new unit records.

## Decision Log

| Date | Decision | Options | Chosen | Reasoning |
|------|----------|---------|--------|-----------|
| 2026-05-21 | Unit identifier | Building+unit vs unit number only | Unit number only | User preference — simpler for this complex |
| 2026-05-21 | Role change activation | Immediate vs on re-login | On next page load (session refresh) | Auth.js session-based; acceptable for rare role changes |
| 2026-05-21 | Unit removal with active check-in | Block / warn / silent | Warn and allow | Data integrity: occupancy records are independent |
| 2026-05-21 | Session invalidation on deactivate | Immediate DB delete vs flag | Immediate DB delete | Security — deactivated user must lose access instantly |
