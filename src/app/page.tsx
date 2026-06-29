"use client";

import { useEffect, useState } from "react";

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

  async function send() {
    const content = input.trim();
    if (!content) return;
    setInput("");
    setStreamError(false);
    setSending(true);
    setMessages((m) => [...m, { role: "user", content }, { role: "assistant", content: "" }]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, content }),
    });
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
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
    setSending(false);
    refreshConversations();
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
          <b>{m.role}:</b> {m.content}
        </p>
      ))}
        {sending && <p>응답 받는 중...</p>}
        {streamError && <p>응답이 중단되었습니다</p>}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send}>전송</button>
      </main>
    </div>
  );
}
