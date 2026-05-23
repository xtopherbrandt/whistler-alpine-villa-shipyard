---
id: T011
title: "Invite Email Template"
feature: F002
kind: feature
sprint: sprint-001
effort: S
status: approved
dependencies: [T007]
verify_command: null
---

# Invite Email Template

## What
React Email component for invitation emails with the activation link and 72h expiry notice.

## Red Step
`<InviteEmail>` component throws or renders an empty string.

## Steps
1. Create `src/lib/email/InviteEmail.tsx`:
   ```tsx
   import { Html, Body, Heading, Text, Button, Section } from '@react-email/components'
   interface InviteEmailProps { recipientName: string; activationUrl: string }
   export function InviteEmail({ recipientName, activationUrl }: InviteEmailProps) { ... }
   ```
2. Content: greeting, brief explanation ("You've been invited to Whistler Alpine Villa"), activation button, 72h expiry note, plain-text fallback link
3. Wire into `createUser()` (T010): `sendEmail({ to: user.email, subject: 'Your invitation to Whistler Alpine Villa', react: <InviteEmail ... /> })`

## Acceptance Probe
`InviteEmail` renders to valid HTML without errors. Activation link format: `${NEXT_PUBLIC_APP_URL}/invite/${token}`.

## Technical Notes
Keep the template minimal — no images, no heavy styling. React Email components (`Html`, `Body`, `Text`, `Button`) handle email-client compatibility.

Test the template with `npx react-email dev` locally to preview rendering.

This component is also referenced by T017 (resend invite) which reuses the same template with a new token URL.
