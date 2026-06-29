# First Conversation Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one vertical slice — an anonymous client sends a message, an assistant reply streams back over SSE, and the full conversation (both messages) is persisted server-side.

**Architecture:** Next.js App Router hosts UI + server routes. A single chat page posts to a server route that resolves the anonymous clientId cookie, creates the Conversation on first message, calls Azure OpenAI behind a thin server boundary, streams tokens to the browser over SSE, then persists user + assistant messages via Prisma/SQLite.

**Tech Stack:** Next.js (App Router) + TypeScript, Prisma, SQLite, Vitest. Azure OpenAI is mocked in tests.

## Global Constraints

- Azure OpenAI API key stays server-side only; never sent to the client (ADR 0001).
- Model calls isolated behind one thin server module, not spread across routes (ADR 0001).
- SQLite single-file DB; Prisma ORM (ADR 0003).
- Conversation owner = anonymous clientId cookie, issued on first visit (ADR 0002).
- Glossary names used verbatim: Conversation, Message, Assistant reply, Stream, Anonymous client (CONTEXT.md).
- Conversation created only on first message send — no empty conversations.
- Conversation title = auto-truncate first user message to ~40 chars.
- Tests: Vitest, mock Azure OpenAI; no live network in tests.

---

### Task 1: Project scaffold + Prisma schema

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `prisma/schema.prisma`, `.env.example`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces: Prisma client with `Conversation` (id, clientId, title, createdAt) and `Message` (id, conversationId, role, content, createdAt) models; `role` is `"user" | "assistant"`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/schema.test.ts
import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";

describe("schema", () => {
  it("persists a conversation with messages", async () => {
    const db = new PrismaClient();
    const c = await db.conversation.create({
      data: {
        clientId: "abc",
        title: "Hello",
        messages: { create: [{ role: "user", content: "hi" }] },
      },
      include: { messages: true },
    });
    expect(c.messages[0].role).toBe("user");
    await db.conversation.delete({ where: { id: c.id } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/schema.test.ts`
Expected: FAIL (no @prisma/client / no DB).

- [ ] **Step 3: Add scaffold + schema**

`prisma/schema.prisma`:
```prisma
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }
generator client { provider = "prisma-client-js" }

model Conversation {
  id        String    @id @default(cuid())
  clientId  String
  title     String
  createdAt DateTime  @default(now())
  messages  Message[]
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           String
  content        String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}
```
`.env.example`: `DATABASE_URL="file:./dev.db"` and `AZURE_OPENAI_API_KEY=`, `AZURE_OPENAI_ENDPOINT=`, `AZURE_OPENAI_DEPLOYMENT=`.
Install: `npm i next react react-dom @prisma/client`; `npm i -D typescript vitest prisma @types/node`. Run `npx prisma migrate dev --name init`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: scaffold next+prisma+sqlite with conversation/message schema"
```

---

### Task 2: Anonymous clientId helper

**Files:**
- Create: `src/server/identity.ts`
- Test: `tests/identity.test.ts`

**Interfaces:**
- Produces: `resolveClientId(cookieValue: string | undefined): { clientId: string; isNew: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/identity.test.ts
import { describe, it, expect } from "vitest";
import { resolveClientId } from "../src/server/identity";

it("keeps existing clientId", () => {
  expect(resolveClientId("xyz")).toEqual({ clientId: "xyz", isNew: false });
});
it("mints new clientId when absent", () => {
  const r = resolveClientId(undefined);
  expect(r.isNew).toBe(true);
  expect(r.clientId.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify fail** — Run: `npm test -- tests/identity.test.ts` → FAIL (no module).

- [ ] **Step 3: Implement**

```ts
// src/server/identity.ts
import { randomUUID } from "crypto";
export function resolveClientId(cookieValue: string | undefined) {
  return cookieValue
    ? { clientId: cookieValue, isNew: false }
    : { clientId: randomUUID(), isNew: true };
}
```

- [ ] **Step 4: Run to verify pass** — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: anonymous clientId resolver"`

---

### Task 3: Azure OpenAI streaming boundary (mockable)

**Files:**
- Create: `src/server/azureOpenAI.ts`
- Test: `tests/azureOpenAI.test.ts`

**Interfaces:**
- Produces: `streamReply(messages: {role:string;content:string}[]): AsyncIterable<string>` yielding token chunks; reads key/endpoint from env; injectable fetch for tests.

- [ ] **Step 1: Write the failing test**

```ts
// tests/azureOpenAI.test.ts
import { describe, it, expect } from "vitest";
import { streamReply } from "../src/server/azureOpenAI";

it("yields token chunks from a mocked fetch", async () => {
  const fakeFetch = async () => ({
    ok: true,
    body: { getReader: () => mockReader(["He", "llo"]) },
  });
  const out: string[] = [];
  for await (const t of streamReply([{ role: "user", content: "hi" }], fakeFetch as any)) out.push(t);
  expect(out.join("")).toBe("Hello");
});
function mockReader(parts: string[]) {
  const enc = new TextEncoder();
  const chunks = parts.map(p => enc.encode(`data: {"choices":[{"delta":{"content":"${p}"}}]}\n\n`));
  let i = 0;
  return { read: async () => i < chunks.length ? { value: chunks[i++], done: false } : { value: undefined, done: true } };
}
```

- [ ] **Step 2: Run to verify fail** → FAIL (no module).

- [ ] **Step 3: Implement**

```ts
// src/server/azureOpenAI.ts
export async function* streamReply(messages: {role:string;content:string}[], fetchImpl = fetch) {
  const url = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-02-01`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "api-key": process.env.AZURE_OPENAI_API_KEY ?? "", "content-type": "application/json" },
    body: JSON.stringify({ messages, stream: true }),
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split("\n\n")) {
      const m = line.replace(/^data: /, "").trim();
      if (!m || m === "[DONE]") continue;
      const tok = JSON.parse(m).choices?.[0]?.delta?.content;
      if (tok) yield tok;
    }
  }
}
```

- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: azure openai streaming boundary"`

---

### Task 4: Send route — create conversation, stream, persist

**Files:**
- Create: `src/app/api/chat/route.ts`, `src/server/db.ts`
- Test: `tests/chatRoute.test.ts`

**Interfaces:**
- Consumes: `resolveClientId`, `streamReply`, Prisma client.
- Produces: POST `/api/chat` body `{ conversationId?: string, content: string }` → SSE stream of tokens; sets clientId cookie if new; on stream end persists user + assistant Messages, creating Conversation (title = first content sliced 40) when no conversationId.

- [ ] **Step 1: Write the failing test**

```ts
// tests/chatRoute.test.ts
import { describe, it, expect, vi } from "vitest";
vi.mock("../src/server/azureOpenAI", () => ({ streamReply: async function*(){ yield "Hi"; yield "!"; } }));
import { POST } from "../src/app/api/chat/route";
import { PrismaClient } from "@prisma/client";

it("creates conversation and persists both messages", async () => {
  const req = new Request("http://x/api/chat", { method: "POST", body: JSON.stringify({ content: "hello world" }) });
  const res = await POST(req);
  await res.text();
  const db = new PrismaClient();
  const c = await db.conversation.findFirst({ orderBy: { createdAt: "desc" }, include: { messages: true } });
  expect(c!.title).toBe("hello world");
  expect(c!.messages.map(m => m.content)).toEqual(["hello world", "Hi!"]);
});
```

- [ ] **Step 2: Run to verify fail** → FAIL (no route).

- [ ] **Step 3: Implement** route reading cookie, mint clientId, create conversation if absent, stream tokens via SSE, accumulate, persist user+assistant on close. `src/server/db.ts` exports shared `PrismaClient`. Title = `content.slice(0,40)`.

- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: chat send route with sse + persistence"`

---

### Task 5: Minimal chat page

**Files:**
- Create: `src/app/page.tsx`
- Test: `tests/page.test.tsx`

**Interfaces:**
- Consumes: POST `/api/chat`.
- Produces: centered input + one-line hint on empty state; sends, renders streaming assistant reply.

- [ ] **Step 1: Write failing render test** asserting empty-state hint text and input present.
- [ ] **Step 2: Run to verify fail** → FAIL.
- [ ] **Step 3: Implement** client component: input, hint, fetch SSE, append tokens.
- [ ] **Step 4: Run to verify pass** → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: minimal chat page first slice"`
