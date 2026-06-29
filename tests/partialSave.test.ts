import { describe, it, expect, vi } from "vitest";

vi.mock("../src/server/azureOpenAI", () => ({
  streamReply: async function* () {
    yield "Par";
    yield "tial";
    throw new Error("stream blew up");
  },
}));

import { POST } from "../src/app/api/chat/route";
import { PrismaClient } from "@prisma/client";

it("persists the partial assistant reply when the stream fails", async () => {
  const req = new Request("http://x/api/chat", {
    method: "POST",
    body: JSON.stringify({ content: "partial test" }),
  });
  const res = await POST(req);
  await res.text();
  const db = new PrismaClient();
  const c = await db.conversation.findFirst({
    where: { title: "partial test" },
    orderBy: { createdAt: "desc" },
    include: { messages: true },
  });
  expect(c!.messages.map((m) => m.content)).toEqual(["partial test", "Partial"]);
  await db.$disconnect();
});
