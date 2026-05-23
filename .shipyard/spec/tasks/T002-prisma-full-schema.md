---
id: T002
title: "Prisma Full Schema + Initial Migration"
feature: F001
kind: feature
sprint: sprint-001
effort: M
status: approved
dependencies: [T001]
verify_command: null
---

# Prisma Full Schema + Initial Migration

## What
Define the complete Prisma schema for all sprint features in a single initial migration. Includes Auth.js adapter tables and all domain models.

## Red Step
`npx prisma migrate dev` fails — `schema.prisma` does not define required Auth.js adapter models.

## Steps
1. `npx prisma init` — creates `prisma/schema.prisma` and sets `DATABASE_URL` reference in `.env`
2. Write the full schema (all models below)
3. `npx prisma migrate dev --name init`
4. Verify TypeScript types generate without errors: `npx prisma generate`

## Schema (all models)
```prisma
// Auth.js adapter tables (exact field names required — do not modify)
model Account { ... }
model Session { ... }
model VerificationToken { ... }

// Domain models
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified DateTime?
  passwordHash  String?
  isAdmin       Boolean   @default(false)
  isDirector    Boolean   @default(false)
  isCaretaker   Boolean   @default(false)
  isActive      Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  units              UserUnit[]
  invitations        InvitationToken[]
  passwordResets     PasswordResetToken[]
  loginAttempts      LoginAttempt[]
  sessions           Session[]
  accounts           Account[]
}

model Unit {
  id            Int       @id
  description   String?
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

model InvitationToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id])
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id])
}

model LoginAttempt {
  id          String   @id @default(cuid())
  userId      String?
  email       String
  success     Boolean
  attemptedAt DateTime @default(now())
  user        User?    @relation(fields: [userId], references: [id])

  @@index([email, attemptedAt])
}
```

## Acceptance Probe
Migration applies cleanly. All tables exist. `npx prisma generate` produces TypeScript types with no errors.

## Technical Notes
Use the `@auth/prisma-adapter` published schema verbatim for `Account`, `Session`, `VerificationToken` — any field name deviation causes silent runtime failures. Copy from https://authjs.dev/getting-started/adapters/prisma.

`Unit.id` is the integer unit number (1–52), not a cuid. Admin-seeded, not user-created.

`LoginAttempt` indexes `[email, attemptedAt]` for the rate-limit window query (last 10 minutes by email).

`InvitationToken.token` stored as plaintext — short-lived single-use token, not a long-term secret. No bcrypt hash needed.

All three features (F001, F002, F003) share this schema. Defining in one migration avoids multiple alter-table sequences on a fresh database.
