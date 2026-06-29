# 0002 — Anonymous clientId for conversation ownership

## Status
Accepted

## Context
MVP keeps multi-session conversation history but excludes login. Conversations are
persisted server-side, so each one needs an owner key without authentication.

## Decision
Identify the owner with an **anonymous clientId cookie** issued on first visit.
Conversations belong to that clientId. A future login can link the clientId to an
account without data migration.

## Consequences
- No auth needed to ship history; lowest-friction path to multi-session.
- Clearing cookies orphans conversations — acceptable for MVP.
- Login can be layered on later by attaching the existing clientId to a user.
