---
id: IDEA-001
title: "Initial Admin Bootstrap"
type: idea
status: proposed
source: "inline capture during /ship-discuss E005"
captured: 2026-05-21
---

# Initial Admin Bootstrap

## Idea

The first Admin account cannot be created via the invitation flow (no one to send the invite). A mechanism is needed to bootstrap the first Admin before anyone can log in: either a Prisma seed script that creates the account directly in the DB, or a one-time `/setup` page that is accessible only when zero users exist.

## Why It Might Matter

Without a bootstrap mechanism, the app is unusable from a blank database. This must be resolved before first deployment.

## Initial Thoughts

- Prisma seed script is simpler and doesn't require any UI. Run once on first deployment.
- The seed could create the Admin account with a temporary password, which the Admin then changes via the forgot-password flow.
- Alternatively, the seed generates an invite token and prints it to stdout for the Admin to use.
