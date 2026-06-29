import { describe, it, expect, vi } from "vitest";

vi.mock("../src/server/azureOpenAI", () => ({
  streamReply: async function* () {
    yield "Hi";
    yield "!";
  },
}));

import { POST } from "../src/app/api/chat/route";
import { PrismaClient } from "@prisma/client";

it("creates conversation and persists both messages", async () => {
  const req = new Request("http://x/api/chat", {
    method: "POST",
    body: JSON.stringify({ content: "hello world" }),
  });
  const res = await POST(req);
  await res.text();
  const db = new PrismaClient();
  const c = await db.conversation.findFirst({
    orderBy: { createdAt: "desc" },
    include: { messages: true },
  });
  expect(c!.title).toBe("hello world");
  expect(c!.messages.map((m) => m.content)).toEqual(["hello world", "Hi!"]);
  await db.$disconnect();
});
