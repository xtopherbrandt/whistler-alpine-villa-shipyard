---
id: F001
title: "Login & Authentication"
type: feature
epic: E005
status: in_progress
story_points: 8
complexity: medium
token_estimate: 15000
rice_reach: 60
rice_impact: 10
rice_confidence: 0.9
rice_effort: 2
rice_score: 270
feasibility: 8
dependencies: []
references: []
children: []
tasks: [T001, T002, T003, T004, T005, T006, T007, T008, T009, T020]
created: 2026-05-21
updated: 2026-05-21
demo_probe: |
  curl -fsS -X POST localhost:3000/api/auth/callback/credentials \
    -d 'email=test@example.com&password=testpass123&csrfToken=TOKEN' \
    | grep -q 'session'
---

# Login & Authentication

## User Story

As any user (Admin, Shareholder, Caretaker, or Director), I want to log in with my email and password so that I can securely access the features available to my role.

## Why This Matters

The entire application is access-controlled. Without authentication, no other feature can function. This is the front door to every other epic.

## Acceptance Criteria

```gherkin
Feature: Login & Authentication

  Scenario: Successful login
    Given a user with a valid account and password
    When they submit their email and password on the login page
    Then they are redirected to the dashboard
    And a 30-day session cookie is set

  Scenario: Invalid credentials
    Given a user submits an incorrect email or password
    When the login form is submitted
    Then an error message "Invalid email or password" is shown
    And no information is revealed about whether the email exists

  Scenario: Rate limiting triggers after 5 failed attempts
    Given a user has submitted 5 incorrect passwords for the same email in 10 minutes
    When they attempt to log in again within that window
    Then login is blocked with message "Too many attempts. Try again in 15 minutes."
    And the lockout persists for 15 minutes from the last failed attempt

  Scenario: Forgot password — valid email
    Given a user enters their email address on the forgot-password page
    When they submit the form
    Then a password-reset email is sent to that address within 60 seconds
    And the email contains a link valid for 1 hour
    And the page shows "If that email is registered, you'll receive a reset link"

  Scenario: Forgot password — email not registered
    Given a user enters an email address that has no account
    When they submit the forgot-password form
    Then the page shows the same message: "If that email is registered, you'll receive a reset link"
    And no email is sent
    And no information is revealed about whether the email exists

  Scenario: Password reset — valid token
    Given a user clicks a valid (unexpired, unused) reset link
    When they enter and confirm a new password meeting the policy (8–72 chars)
    Then their password is updated
    And the reset token is invalidated
    And they are redirected to the login page with message "Password updated. Please log in."

  Scenario: Password reset — expired or used token
    Given a user clicks a reset link that is expired or already used
    When they land on the reset page
    Then an error is shown: "This link has expired or already been used."
    And a link to request a new reset email is shown

  Scenario: Logout
    Given a logged-in user clicks "Sign out"
    When the logout action is triggered
    Then their session is invalidated server-side
    And they are redirected to the login page
```

## Data Model

```
PasswordResetToken {
  id          String    @id @default(cuid())
  userId      String
  token       String    @unique   // crypto.randomBytes(32).toString('hex')
  expiresAt   DateTime            // now + 1 hour
  usedAt      DateTime?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id])
}

LoginAttempt {
  id          String    @id @default(cuid())
  email       String
  attemptedAt DateTime  @default(now())
  success     Boolean
  @@index([email, attemptedAt])
}
```

Auth.js v5 manages the Session and Account tables automatically via Prisma adapter.

## Configuration

```
AUTH_SECRET=<random 32-byte string>          # Next.js/Auth.js session signing key
RESEND_API_KEY=<from resend.com>             # For password reset emails
NEXT_PUBLIC_APP_URL=https://...              # For constructing reset link URLs
```

## Error Handling

- Login errors always return "Invalid email or password" — never "email not found" or "wrong password" (prevents email enumeration)
- Forgot-password form always returns the same message regardless of whether the email exists
- Reset link errors surface clearly: "This link has expired or already been used" + re-request link
- Rate-limit lockout is communicated clearly with time remaining
- All auth Server Actions return `ActionResult<T>` — never throw

## Technical Notes

**Auth library (HIGH confidence):** Auth.js v5 (NextAuth) with credentials provider.
- Install: `npm install next-auth@beta`
- Prisma adapter: `npm install @auth/prisma-adapter`
- `auth()` works in server components, middleware, and server actions
- Session stored in DB via Prisma adapter; cookie is a reference token

**Password hashing (HIGH confidence):** `bcryptjs` (pure JS, edge-compatible)
- `npm install bcryptjs` + `npm install -D @types/bcryptjs`
- Min 8 chars, max 72 chars (bcrypt input limit)
- Enforce max length before hashing to prevent silent truncation

**Rate limiting implementation:** Track `LoginAttempt` rows by email. In the login Server Action: count failed attempts in the last 10 minutes. If ≥ 5, return lockout error without attempting password check.

**Password reset tokens:** `crypto.randomBytes(32).toString('hex')` — stored as plaintext (short-lived, low risk). Expires 1 hour after creation. Marked `usedAt` on first use.

**Email (HIGH confidence):** Resend API for password reset emails.

## Decision Log

| Date | Decision | Options | Chosen | Reasoning |
|------|----------|---------|--------|-----------|
| 2026-05-21 | Auth library | Auth.js v5, custom JWT, Lucia | Auth.js v5 | App Router native, session management built-in |
| 2026-05-21 | Password policy | Length only vs complexity rules | Min 8, max 72 chars | NIST SP 800-63B — length is most effective |
| 2026-05-21 | Rate limiting | Per-email DB counter | 5 attempts/10 min → 15 min lockout | Prevents brute force on small user set |
| 2026-05-21 | Error messages | Specific vs generic | Generic always | Prevents email enumeration |
