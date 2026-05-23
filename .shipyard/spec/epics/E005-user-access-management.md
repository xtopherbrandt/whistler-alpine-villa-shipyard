---
id: E005
title: "User & Access Management"
type: epic
status: proposed
created: 2026-05-21
updated: 2026-05-21
---
<!-- Epic membership is derived from feature files (epic: field). Do NOT add a features: array here. -->

# User & Access Management

## Description

Invitation-only account system with four roles (additive — a user can hold multiple):

- **Admin** — system administrator. Creates and manages all accounts, assigns roles and units. Not required to be a shareholder or director. Initially the developer; can be delegated later.
- **Shareholder** — linked to one or more unit numbers. Can check in/out, register guest stays, view their own stats and the complex occupancy overview. Multiple shares = multiple units.
- **Caretaker** — linked to a company-held unit. Full occupancy visibility, parking lot management.
- **Director** — oversight role. Receives notifications for guest-use registrations, accesses complex-wide reporting. Assignable to any account by Admin.

Admin creates accounts by providing name, email, and unit assignment. System sends invite email with a time-limited password-set link. Units are identified by number (e.g. Unit 23) — no building-level grouping. Sessions persist 30 days. Share transfers handled by deactivating old account + creating new one.

## Business Value

Foundation for the entire system — every other epic depends on authenticated users with the right permissions. Invitation-only model keeps access controlled and accurate to current ownership.

## Dependencies

None — this is the foundational epic.
