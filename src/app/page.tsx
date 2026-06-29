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
  const [model, setModel] = useState("gpt-5.4");
  const [search, setSearch] = useState(false);
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
      body: JSON.stringify({ conversationId, content, model, search }),
      signal: ctrl.signal,
    });
    const newId = res.headers?.get?.("x-conversation-id");
    if (newId && !conversationId) setConversationId(newId);
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) {
          if (frame.startsWith("event: error")) {
            setStreamError(true);
            continue;
          }
          if (!frame.startsWith("data: ")) continue;
          const tok = frame.slice(6);
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
    <div className="app">
      <aside className="sidebar">
        <button className="new-chat" onClick={newChat}>새 대화</button>
        <ul className="conv-list">
          {conversations.map((c) => (
            <li className="conv-item" key={c.id}>
              {editingId === c.id ? (
                <form onSubmit={(e) => { e.preventDefault(); renameConversation(c.id); }}>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </form>
              ) : (
                <button className="title" onClick={() => loadConversation(c.id)}>{c.title}</button>
              )}
              <button className="icon" aria-label={`이름 변경 ${c.title}`} onClick={() => { setEditingId(c.id); setEditTitle(c.title); }}>
                ✎
              </button>
              <button className="icon" aria-label={`삭제 ${c.title}`} onClick={() => deleteConversation(c.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="chat">
        <div className="thread">
          <div className="thread-inner">
            {messages.length === 0 && <p className="empty">무엇이든 물어보세요</p>}
            {messages.map((m, i) => (
              <div className={`msg ${m.role}`} key={i}>
                <div className="bubble">
                  {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
                </div>
                {m.role === "assistant" && m.content && (
                  <button className="copy" aria-label="복사" onClick={() => navigator.clipboard.writeText(m.content)}>
                    복사
                  </button>
                )}
              </div>
            ))}
            {sending && <p className="status">응답 받는 중...</p>}
            {streamError && <p className="status">응답이 중단되었습니다</p>}
            {streamError && !sending && <button onClick={retry}>재시도</button>}
            <div ref={bottomRef} />
          </div>
        </div>
        <div className="composer">
          <div className="composer-inner">
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
            <div className="composer-row">
              <select aria-label="모델" value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="gpt-5.4">gpt-5.4</option>
                <option value="gpt-5.4-mini">gpt-5.4-mini</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
              <label className="search-toggle">
                <input type="checkbox" checked={search} onChange={(e) => setSearch(e.target.checked)} />
                웹 검색
              </label>
              <button className="send" onClick={() => send()} disabled={sending || !input.trim()}>전송</button>
              {sending && <button onClick={stop}>중지</button>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
