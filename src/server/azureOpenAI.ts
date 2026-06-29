export async function* streamReply(
  messages: { role: string; content: string }[],
  fetchImpl: typeof fetch = fetch,
  model?: string
) {
  const deployment = model ?? process.env.AZURE_OPENAI_DEPLOYMENT;
  const url = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      "api-key": process.env.AZURE_OPENAI_API_KEY ?? "",
      "content-type": "application/json",
    },
    body: JSON.stringify({ messages, stream: true }),
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split("\n\n")) {
      const m = line.replace(/^data: /, "").trim();
      if (!m || m === "[DONE]") continue;
      const tok = JSON.parse(m).choices?.[0]?.delta?.content;
      if (tok) yield tok;
    }
  }
}
