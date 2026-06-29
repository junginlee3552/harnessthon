import { describe, it, expect } from "vitest";
import { GET } from "../src/app/api/conversations/[id]/route";
import { db } from "../src/server/db";

it("returns ordered messages for an owned conversation", async () => {
  const c = await db.conversation.create({
    data: {
      clientId: "owner2",
      title: "load me",
      messages: {
        create: [
          { role: "user", content: "q" },
          { role: "assistant", content: "a" },
        ],
      },
    },
  });
  const req = new Request(`http://x/api/conversations/${c.id}`, {
    headers: { cookie: "clientId=owner2" },
  });
  const res = await GET(req, { params: { id: c.id } });
  const msgs = (await res.json()) as { role: string; content: string }[];
  expect(msgs).toEqual([
    { role: "user", content: "q" },
    { role: "assistant", content: "a" },
  ]);
});

it("404s when the cookie does not own the conversation", async () => {
  const c = await db.conversation.create({ data: { clientId: "owner3", title: "x" } });
  const req = new Request(`http://x/api/conversations/${c.id}`, {
    headers: { cookie: "clientId=intruder" },
  });
  const res = await GET(req, { params: { id: c.id } });
  expect(res.status).toBe(404);
});
