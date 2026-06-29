import { db } from "../../../server/db";
import { resolveClientId } from "../../../server/identity";

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v;
  }
  return undefined;
}

export async function GET(req: Request) {
  const { clientId } = resolveClientId(
    readCookie(req.headers.get("cookie"), "clientId")
  );
  const list = await db.conversation.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
  });
  return Response.json(list);
}
