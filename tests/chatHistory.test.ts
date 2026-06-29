import { describe, it, expect, vi } from "vitest";

const captured: { role: string; content: string }[][] = [];
vi.mock("../src/server/azureOpenAI", () => ({
  streamReply: (msgs: { role: string; content: string }[]) => {
    captured.push(msgs);
    return (async function* () {
      yield "ok";
    })();
  },
}));

import { POST } from "../src/app/api/chat/route";
import { db } from "../src/server/db";

it("sends prior conversation history to the model", async () => {
  const c = await db.conversation.create({ data: { clientId: "hist1", title: "t" } });
  await db.message.create({ data: { conversationId: c.id, role: "user", content: "first" } });
  await db.message.create({ data: { conversationId: c.id, role: "assistant", content: "reply" } });

  const req = new Request("http://x/api/chat", {
    method: "POST",
    headers: { cookie: "clientId=hist1" },
    body: JSON.stringify({ conversationId: c.id, content: "second" }),
  });
  await (await POST(req)).text();

  const last = captured[captured.length - 1];
  expect(last.filter((m) => m.role !== "system").map((m) => m.content)).toEqual(["first", "reply", "second"]);
});
