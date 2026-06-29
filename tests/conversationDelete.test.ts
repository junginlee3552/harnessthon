import { describe, it, expect } from "vitest";
import { DELETE } from "../src/app/api/conversations/[id]/route";
import { db } from "../src/server/db";

it("deletes an owned conversation and its messages", async () => {
  const c = await db.conversation.create({
    data: {
      clientId: "del1",
      title: "bye",
      messages: { create: [{ role: "user", content: "q" }] },
    },
  });
  const req = new Request(`http://x/api/conversations/${c.id}`, {
    method: "DELETE",
    headers: { cookie: "clientId=del1" },
  });
  const res = await DELETE(req, { params: { id: c.id } });
  expect(res.status).toBe(200);
  expect(await db.conversation.findUnique({ where: { id: c.id } })).toBeNull();
});

it("404s when deleting a conversation you do not own", async () => {
  const c = await db.conversation.create({ data: { clientId: "del2", title: "x" } });
  const req = new Request(`http://x/api/conversations/${c.id}`, {
    method: "DELETE",
    headers: { cookie: "clientId=other" },
  });
  const res = await DELETE(req, { params: { id: c.id } });
  expect(res.status).toBe(404);
  expect(await db.conversation.findUnique({ where: { id: c.id } })).not.toBeNull();
});
