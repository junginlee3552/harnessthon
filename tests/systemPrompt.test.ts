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

it("prepends a system prompt to the model messages", async () => {
  const c = await db.conversation.create({ data: { clientId: "sys1", title: "t" } });
  const req = new Request("http://x/api/chat", {
    method: "POST",
    headers: { cookie: "clientId=sys1" },
    body: JSON.stringify({ conversationId: c.id, content: "hi" }),
  });
  await (await POST(req)).text();

  const last = captured[captured.length - 1];
  expect(last[0].role).toBe("system");
  expect(last[0].content.length).toBeGreaterThan(0);
});
