"use client";

import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "./markdown";

type Msg = { role: "user" | "assistant"; content: string };
type ConversationSummary = { id: string; title: string; createdAt: string };

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [streamError, setStreamError] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [editTitle, setEditTitle] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.();
  }, [messages]);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then(setConversations)
      .catch(() => {});
  }, []);

  function refreshConversations() {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then(setConversations)
      .catch(() => {});
  }

  async function loadConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`);
    const msgs: Msg[] = await res.json();
    setConversationId(id);
    setMessages(msgs);
  }

  function newChat() {
    setConversationId(undefined);
    setMessages([]);
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (conversationId === id) newChat();
    refreshConversations();
  }

  async function renameConversation(id: string) {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: editTitle }),
    });
    setEditingId(undefined);
    refreshConversations();
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;
    lastSentRef.current = content;
    if (text === undefined) setInput("");
    setStreamError(false);
    setSending(true);
    setMessages((m) => [...m, { role: "user", content }, { role: "assistant", content: "" }]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, content }),
      signal: ctrl.signal,
    });
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n\n")) {
          if (line.startsWith("event: error")) {
            setStreamError(true);
            continue;
          }
          const tok = line.replace(/^data: /, "");
          if (!tok) continue;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = {
              role: "assistant",
              content: copy[copy.length - 1].content + tok,
            };
            return copy;
          });
        }
      }
    } catch {
      /* aborted */
    }
    abortRef.current = undefined;
    setSending(false);
    refreshConversations();
  }

  function stop() {
    abortRef.current?.abort();
    abortRef.current = undefined;
    setSending(false);
  }

  function retry() {
    if (lastSentRef.current) send(lastSentRef.current);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 240, borderRight: "1px solid #ddd", padding: 12 }}>
        <button onClick={newChat}>새 대화</button>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {conversations.map((c) => (
            <li key={c.id}>
              {editingId === c.id ? (
                <form onSubmit={(e) => { e.preventDefault(); renameConversation(c.id); }}>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </form>
              ) : (
                <button onClick={() => loadConversation(c.id)}>{c.title}</button>
              )}
              <button aria-label={`이름 변경 ${c.title}`} onClick={() => { setEditingId(c.id); setEditTitle(c.title); }}>
                ✎
              </button>
              <button aria-label={`삭제 ${c.title}`} onClick={() => deleteConversation(c.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main style={{ maxWidth: 640, margin: "0 auto", padding: 24, flex: 1 }}>
        {messages.length === 0 && <p>무엇이든 물어보세요</p>}
      {messages.map((m, i) => (
        <p key={i}>
          <b>{m.role}:</b> {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
          {m.role === "assistant" && m.content && (
            <button aria-label="복사" onClick={() => navigator.clipboard.writeText(m.content)}>
              복사
            </button>
          )}
        </p>
      ))}
        {sending && <p>응답 받는 중...</p>}
        {streamError && <p>응답이 중단되었습니다</p>}
        {streamError && !sending && <button onClick={retry}>재시도</button>}
        <div ref={bottomRef} />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={() => send()} disabled={sending || !input.trim()}>전송</button>
        {sending && <button onClick={stop}>중지</button>}
      </main>
    </div>
  );
}
