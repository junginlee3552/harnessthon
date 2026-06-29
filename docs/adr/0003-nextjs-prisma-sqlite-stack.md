# 0003 — Next.js + Prisma + SQLite stack

## Status
Accepted

## Context
We need frontend, a server boundary to proxy Azure OpenAI, and persistence for
conversations, kept simple enough for vertical-slice TDD.

## Decision
Use **Next.js (App Router) + TypeScript** for UI and server routes, **Prisma** as
the ORM, and **SQLite** as the initial database.

## Consequences
- One project hosts UI, proxy, and storage — fits vertical-slice TDD.
- SQLite is a single file: fast tests, zero infra. Prisma keeps a Postgres swap cheap.
- Migrating to Postgres later is a connection/provider change, not a rewrite.
