export type WebResult = { title: string; url: string; snippet: string };

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchWeb(
  query: string,
  fetchImpl: typeof fetch = fetch,
  limit = 5
): Promise<WebResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetchImpl(url, {
    headers: { "user-agent": "Mozilla/5.0" },
  });
  const html = await res.text();
  const results: WebResult[] = [];
  const re =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && results.length < limit) {
    results.push({
      url: stripHtml(m[1]),
      title: stripHtml(m[2]),
      snippet: stripHtml(m[3]),
    });
  }
  return results;
}

export function groundingPrompt(query: string, results: WebResult[]): string {
  if (results.length === 0) return "";
  const lines = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
    .join("\n\n");
  return `Web search results for "${query}":\n\n${lines}\n\nUse these results when relevant to answer with up-to-date information. Cite as [1], [2] inline. Separate distinct ideas into paragraphs with a blank line between them. After your answer, add a blank line and a final paragraph starting with "출처:" that lists the sources you used as a markdown link list, e.g. [1] [title](url). If they are irrelevant to the user's request, ignore them and continue the ongoing conversation naturally.`;
}

// Scopes the web search to Microsoft's official Azure documentation so answers
// are grounded in the Azure manual site first.
export async function searchAzureDocs(
  query: string,
  fetchImpl: typeof fetch = fetch,
  limit = 5
): Promise<WebResult[]> {
  return searchWeb(`site:learn.microsoft.com/azure ${query}`, fetchImpl, limit);
}

export function azureGroundingPrompt(query: string, results: WebResult[]): string {
  if (results.length === 0) return "";
  const lines = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
    .join("\n\n");
  return `Azure documentation results for "${query}":\n\n${lines}\n\nAnswer using these official Azure docs first. Cite as [1], [2] inline. Separate distinct ideas into paragraphs with a blank line between them. After your answer, add a blank line and a final paragraph starting with "출처:" that lists the sources you used as a markdown link list, e.g. [1] [title](url). If they don't cover the request, say so and rely on your general Azure knowledge.`;
}
