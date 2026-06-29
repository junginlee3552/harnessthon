import { describe, it, expect } from "vitest";
import { PATCH } from "../src/app/api/conversations/[id]/route";
import { db } from "../src/server/db";

it("renames an owned conversation", async () => {
  const c = await db.conversation.create({ data: { clientId: "ren1", title: "old" } });
  const req = new Request(`http://x/api/conversations/${c.id}`, {
    method: "PATCH",
    headers: { cookie: "clientId=ren1" },
    body: JSON.stringify({ title: "new name" }),
  });
  const res = await PATCH(req, { params: { id: c.id } });
  expect(res.status).toBe(200);
  const updated = await db.conversation.findUnique({ where: { id: c.id } });
  expect(updated!.title).toBe("new name");
});

it("404s when renaming a conversation you do not own", async () => {
  const c = await db.conversation.create({ data: { clientId: "ren2", title: "old" } });
  const req = new Request(`http://x/api/conversations/${c.id}`, {
    method: "PATCH",
    headers: { cookie: "clientId=other" },
    body: JSON.stringify({ title: "hack" }),
  });
  const res = await PATCH(req, { params: { id: c.id } });
  expect(res.status).toBe(404);
  const same = await db.conversation.findUnique({ where: { id: c.id } });
  expect(same!.title).toBe("old");
});
