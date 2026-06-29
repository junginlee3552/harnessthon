import { describe, it, expect } from "vitest";
import { streamReply } from "../src/server/azureOpenAI";

function mockReader(parts: string[]) {
  const enc = new TextEncoder();
  const chunks = parts.map(
    (p) => enc.encode(`data: {"choices":[{"delta":{"content":"${p}"}}]}\n\n`)
  );
  let i = 0;
  return {
    read: async () =>
      i < chunks.length
        ? { value: chunks[i++], done: false }
        : { value: undefined, done: true },
  };
}

it("yields token chunks from a mocked fetch", async () => {
  const fakeFetch = async () => ({
    ok: true,
    body: { getReader: () => mockReader(["He", "llo"]) },
  });
  const out: string[] = [];
  for await (const t of streamReply([{ role: "user", content: "hi" }], fakeFetch as any)) {
    out.push(t);
  }
  expect(out.join("")).toBe("Hello");
});
