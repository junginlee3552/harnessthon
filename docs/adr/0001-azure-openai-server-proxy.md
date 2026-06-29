# 0001 — Azure OpenAI via server-side proxy with SSE streaming

## Status
Accepted

## Context
harnessthon needs assistant replies that stream token-by-token (the core ChatGPT
experience). The model credentials must never reach the browser, and we want a
managed, enterprise-aligned provider rather than direct consumer OpenAI.

## Decision
Use **Azure OpenAI** as the model provider. All calls go through a server-side
route that holds the API key; the assistant reply is streamed to the browser over
**Server-Sent Events (SSE)**.

## Consequences
- API keys stay on the server; no secret exposure in the client.
- SSE gives incremental token delivery without WebSocket complexity.
- Bound to Azure OpenAI for now. To keep provider switching cheap later, model
  calls are isolated behind a thin server boundary rather than spread across routes.
