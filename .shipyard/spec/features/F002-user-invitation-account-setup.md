---
id: F002
title: "User Invitation & Account Setup"
type: feature
epic: E005
status: in_progress
story_points: 5
complexity: medium
token_estimate: 8000
rice_reach: 60
rice_impact: 8
rice_confidence: 0.9
rice_effort: 1.5
rice_score: 288
feasibility: 8
dependencies: [F001]
references: []
children: []
tasks: [T010, T011, T012, T013, T021]
created: 2026-05-21
updated: 2026-05-21
demo_probe: |
  node -e "
    const res = await fetch('http://localhost:3000/api/test/invite', {method:'POST'});
    const {token} = await res.json();
    const res2 = await fetch('http://localhost:3000/invite/'+token);
    process.exit(res2.ok ? 0 : 1);
  "
---

# User Invitation & Account Setup

## User Story

As an Admin, I want to create user accounts and send invitation emails so that new shareholders, the caretaker, and directors can set up their own credentials and access the system.

## Why This Matters

The system is invitation-only. Without an invitation flow, the Admin has no way to onboard users. This is the first step in the lifecycle of every account.

## Acceptance Criteria

```gherkin
Feature: User Invitation & Account Setup

  Scenario: Admin creates a shareholder account and sends invite
    Given the Admin is on the "New User" form
    When they submit a valid name, email address, select the Shareholder role, and assign one or more unit numbers
    Then a new inactive account is created
    And an invitation email is sent to that address within 60 seconds
    And the user list shows the new account with status "Invited"

  Scenario: Admin assigns multiple roles to a new account
    Given the Admin is creating a new account
    When they enable any combination of role flags (Admin, Shareholder, Caretaker, Director) and assign the relevant unit(s)
    Then the account is created with all selected roles active simultaneously
    And the invitation email is sent
    And the activated user has access to all features of every assigned role

  Scenario: Invite email contains a valid activation link
    Given an invitation email has been sent
    When the recipient opens the email
    Then they see a link to set their password
    And the link is valid for 72 hours from the time of invitation

  Scenario: New user activates account via invite link
    Given a user clicks a valid invite link in their email
    When they enter and confirm a password meeting policy (8–72 chars)
    Then their password is set and the account is marked active
    And the invite token is invalidated
    And they are redirected to the login page with message "Account activated. Please log in."

  Scenario: User clicks an expired invite link
    Given a user clicks an invite link more than 72 hours old
    When they land on the activation page
    Then they see "This invitation has expired. Please ask your administrator to resend the invite."

  Scenario: Admin sends invite to a duplicate email
    Given an account already exists with a given email address
    When the Admin attempts to create a new account with that same email
    Then an error is shown: "An account with this email already exists."
    And no invite is sent

  Scenario: Admin creates a Caretaker account
    Given the Admin is on the "New User" form
    When they select the Caretaker role (without assigning a unit number)
    Then the account is created with the Caretaker role
    And an invitation email is sent
```

## Data Model

```
InvitationToken {
  id          String    @id @default(cuid())
  userId      String
  token       String    @unique   // crypto.randomBytes(32).toString('hex')
  expiresAt   DateTime            // now + 72 hours
  usedAt      DateTime?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id])
}

// User is extended in F003 data model
// Unit and UserUnit (join table) defined in F003
```

## Flows

```
Admin fills form (name, email, roles, units)
  → Server Action: createUser()
      → validate email uniqueness
      → create User record (passwordHash: null, isActive: false)
      → create UserUnit records for each assigned unit
      → generate InvitationToken (72h expiry)
      → send invite email via Resend
      → return { data: user, error: null }
  → UI shows user list with "Invited" status

New user clicks invite link (/invite/[token])
  → Server: validate token (exists, not expired, not used)
      → if invalid: show expiry error page
      → if valid: render password-set form
  → User submits password
      → Server Action: activateAccount()
          → validate password length (8–72)
          → hash with bcryptjs
          → update User (passwordHash, isActive: true)
          → mark token usedAt: now()
          → redirect to /login with success message
```

## Error Handling

- Duplicate email: return `ActionResult` error — "An account with this email already exists."
- Expired token: show static error page with re-request instruction
- Used token: same error as expired (indistinguishable to user — prevents token probing)
- Email send failure: log the error server-side; return `ActionResult` error to Admin — "Account created but invite email failed to send. Use resend invite from the user list."

## Technical Notes

**Invite token (HIGH confidence):** `crypto.randomBytes(32).toString('hex')` — 256-bit random, stored plaintext, expires 72h from creation, single-use.

**Email (HIGH confidence):** Resend with a React Email template.
- `npm install resend react-email`
- Template: simple transactional email with activation link and 72h expiry notice

**Caretaker unit:** The Caretaker role does not require a unit assignment. The caretaker's company-held unit is a data concern handled separately in F003 (admin can assign it later if needed).

**Password validation:** Same policy as F001 — 8–72 chars, length only. Validated in `activateAccount()` Server Action before hashing.

## Decision Log

| Date | Decision | Options | Chosen | Reasoning |
|------|----------|---------|--------|-----------|
| 2026-05-21 | Invite expiry | 24h, 72h, 7 days | 72 hours | Balances usability and security |
| 2026-05-21 | Caretaker unit assignment | Required at invite / optional | Optional at invite | Caretaker role doesn't require a personal unit |
| 2026-05-21 | Share transfer | Reassign unit vs deactivate+recreate | Deactivate old + create new | Clean ownership history |
| 2026-05-21 | Email failure handling | Block account creation vs create + warn | Create + warn | Account still exists; admin can resend |
