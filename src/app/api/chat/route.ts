import { resolveClientId } from "../../../server/identity";
import { streamReply } from "../../../server/azureOpenAI";
import { db } from "../../../server/db";

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v;
  }
  return undefined;
}

export async function POST(req: Request) {
  const { conversationId, content } = (await req.json()) as {
    conversationId?: string;
    content: string;
  };
  const { clientId, isNew } = resolveClientId(
    readCookie(req.headers.get("cookie"), "clientId")
  );

  const conversation = conversationId
    ? await db.conversation.findUnique({ where: { id: conversationId } })
    : await db.conversation.create({
        data: { clientId, title: content.slice(0, 40) },
      });

  await db.message.create({
    data: { conversationId: conversation!.id, role: "user", content },
  });

  const history = await db.message.findMany({
    where: { conversationId: conversation!.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  const enc = new TextEncoder();
  let reply = "";
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const tok of streamReply(history)) {
          reply += tok;
          controller.enqueue(enc.encode(`data: ${tok}\n\n`));
        }
      } catch {
        controller.enqueue(enc.encode(`event: error\n\n`));
      } finally {
        await db.message.create({
          data: {
            conversationId: conversation!.id,
            role: "assistant",
            content: reply,
          },
        });
        controller.close();
      }
    },
  });

  const headers: Record<string, string> = {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
  };
  if (isNew) headers["set-cookie"] = `clientId=${clientId}; Path=/; HttpOnly`;
  return new Response(stream, { headers });
}
