import { resolveClientId } from "../../../server/identity";
import { streamReply } from "../../../server/azureOpenAI";
import { searchWeb, groundingPrompt } from "../../../server/webSearch";
import { db } from "../../../server/db";

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v;
  }
  return undefined;
}

// Trivial follow-ups (e.g. "응", "그래", "ok") carry no search-worthy
// keywords; searching them only injects junk grounding, so skip the web hit.
function isTrivialFollowUp(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length <= 6) return true;
  return /^(응|네|예|어|그래|좋아|ok|okay|yes|yep|sure|그렇게 해줘|그래 해줘|응 그렇게 해줘)[.!~\s]*$/.test(t);
}

export async function POST(req: Request) {
  const { conversationId, content, model, search } = (await req.json()) as {
    conversationId?: string;
    content: string;
    model?: string;
    search?: boolean;
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

  let systemContent = "You are a helpful assistant.";
  if (search && !isTrivialFollowUp(content)) {
    try {
      const results = await searchWeb(content, fetch);
      const grounding = groundingPrompt(content, results);
      systemContent = grounding
        ? `${systemContent}\n\n${grounding}`
        : `${systemContent}\n\nA live web search for "${content}" returned no results. Do the best you can with what you know and tell the user the search came up empty; do not claim you cannot access the internet.`;
    } catch {
      systemContent = `${systemContent}\n\nA live web search was attempted but failed. Answer as best you can and note the search was unavailable; do not claim you fundamentally cannot access the internet.`;
    }
  }

  const messages = [
    { role: "system", content: systemContent },
    ...history,
  ];

  const enc = new TextEncoder();
  let reply = "";
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const tok of streamReply(messages, fetch, model)) {
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
    "x-conversation-id": conversation!.id,
  };
  if (isNew) headers["set-cookie"] = `clientId=${clientId}; Path=/; HttpOnly`;
  return new Response(stream, { headers });
}
