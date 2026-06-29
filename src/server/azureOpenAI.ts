export async function* streamReply(
  messages: { role: string; content: string }[],
  fetchImpl: typeof fetch = fetch,
  model?: string
) {
  const deployment = model ?? process.env.AZURE_OPENAI_DEPLOYMENT;
  const url = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${deployment}/chat/completions?api-version=2025-04-01-preview`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.AZURE_OPENAI_API_KEY) {
    headers["api-key"] = process.env.AZURE_OPENAI_API_KEY;
  } else {
    const { DefaultAzureCredential } = await import("@azure/identity");
    const token = await new DefaultAzureCredential().getToken(
      "https://cognitiveservices.azure.com/.default"
    );
    headers["authorization"] = `Bearer ${token.token}`;
  }
  const res = await fetchImpl(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, stream: true }),
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const m = line.replace(/^data: /, "").trim();
      if (!m || m === "[DONE]") continue;
      try {
        const tok = JSON.parse(m).choices?.[0]?.delta?.content;
        if (tok) yield tok;
      } catch {
        // skip incomplete/non-JSON frames
      }
    }
  }
}
