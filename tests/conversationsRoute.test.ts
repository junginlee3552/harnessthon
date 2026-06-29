import { describe, it, expect } from "vitest";
import { GET } from "../src/app/api/conversations/route";
import { db } from "../src/server/db";

it("returns conversations for the cookie's clientId, newest first", async () => {
  await db.conversation.deleteMany({ where: { clientId: { in: ["owner1", "other"] } } });
  await db.conversation.create({ data: { clientId: "owner1", title: "first" } });
  await db.conversation.create({ data: { clientId: "owner1", title: "second" } });
  await db.conversation.create({ data: { clientId: "other", title: "nope" } });

  const req = new Request("http://x/api/conversations", {
    headers: { cookie: "clientId=owner1" },
  });
  const res = await GET(req);
  const list = (await res.json()) as { title: string }[];

  expect(list.map((c) => c.title)).toEqual(["second", "first"]);
});
