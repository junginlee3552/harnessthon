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
    await db.$disconnect();
  });
});
