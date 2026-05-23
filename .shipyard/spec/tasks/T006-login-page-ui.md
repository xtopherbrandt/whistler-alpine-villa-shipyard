---
id: T006
title: "Login Page UI"
feature: F001
kind: feature
sprint: sprint-001
effort: S
status: approved
dependencies: [T005]
verify_command: null
---

# Login Page UI

## What
`/login` page with email+password form, inline error display, and a "Forgot password?" link.

## Red Step
E2E: submitting valid credentials does not redirect to `/admin/users`.

## Steps
1. Create `app/(auth)/login/page.tsx` — Server Component with form
2. Form fields: email (type="email"), password (type="password")
3. Submit calls `loginAction` via form `action` binding
4. Display `ActionResult.error` inline below the form
5. Add "Forgot password?" link → `/forgot-password`
6. On success `loginAction` handles redirect internally (role-based)

## Acceptance Probe
`/login` renders. Valid credentials redirect Admin to `/admin/users`. Wrong credentials show "Invalid email or password." inline. Lockout shows lockout message inline.

## Technical Notes
Use Server Action form binding (`<form action={loginAction}>`). No `'use client'` needed — error display via URL search params or server-rendered state.

For error display without client state: use `useFormState` (React 19: `useActionState`) in a thin Client Component wrapper, or redirect back to `/login?error=...` and read the param in the Server Component.

Route group `(auth)` keeps login/forgot-password/reset pages out of the admin layout but does not affect URL structure.

This page must NOT require authentication (middleware in T009 must exclude `/(auth)/*`).
