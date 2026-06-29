import { it, expect, vi } from "vitest";
import { searchWeb, groundingPrompt } from "../src/server/webSearch";

const SAMPLE = `
<a class="result__a" href="https://example.com/1">First Result</a>
<a class="result__snippet">First snippet text</a>
<a class="result__a" href="https://example.com/2">Second &amp; Result</a>
<a class="result__snippet">Second snippet</a>
`;

it("parses duckduckgo html results", async () => {
  const fetchImpl = vi.fn(async () => new Response(SAMPLE)) as unknown as typeof fetch;
  const r = await searchWeb("test", fetchImpl, 5);
  expect(r).toHaveLength(2);
  expect(r[0]).toMatchObject({ url: "https://example.com/1", title: "First Result" });
  expect(r[1].title).toBe("Second & Result");
});

it("builds grounding prompt with citations", () => {
  const p = groundingPrompt("q", [
    { title: "T", url: "u", snippet: "s" },
  ]);
  expect(p).toContain("[1]");
  expect(p).toContain("q");
});

it("returns empty prompt when no results", () => {
  expect(groundingPrompt("q", [])).toBe("");
});
