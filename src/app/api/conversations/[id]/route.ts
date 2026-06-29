import { db } from "../../../../server/db";
import { resolveClientId } from "../../../../server/identity";

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v;
  }
  return undefined;
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const { clientId } = resolveClientId(
    readCookie(req.headers.get("cookie"), "clientId")
  );
  const conversation = await db.conversation.findUnique({
    where: { id: ctx.params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation || conversation.clientId !== clientId) {
    return new Response("not found", { status: 404 });
  }
  return Response.json(
    conversation.messages.map((m) => ({ role: m.role, content: m.content }))
  );
}
