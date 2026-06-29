# harnessthon

This context defines the language for **harnessthon**, a ChatGPT-style AI chat app built
with the harness-guide skill-driven development process.

## Language

**Skill-driven development**:
A development workflow where agents choose and follow named skills for alignment, design, planning, implementation, review, and release.
_Avoid_: Agent workflow, automation workflow

**Human gate**:
A decision point where the human confirms scope, design, plan, implementation evidence, or integration before the process proceeds.
_Avoid_: Automatic gate, verification gate

**Matt Pocock-led flow**:
The default flow where Matt Pocock skills drive human interaction, domain language, module design, and direct TDD implementation.
_Avoid_: Matt supplement, engineering judgment layer

**Superpowers supplement**:
The supporting role where Superpowers skills provide stage structure and optional automation, but do not own the decision gate.
_Avoid_: Superpowers spine, Superpowers-led process

**Opt-in automation**:
Automation that runs only when the human explicitly chooses it, and whose output is treated as a proposal until a human gate accepts it.
_Avoid_: Default automation, mandatory automation

**Direct TDD**:
The default implementation path where the agent reads the governing plan and uses `tdd` to implement one vertical slice at a time with human-confirmed behavior.
_Avoid_: Subagent-first implementation, batch implementation

**Parallel worktree development**:
An opt-in workflow where independent tasks run in separate git worktrees and are converged by a human gate before integration.
_Avoid_: Automatic parallel merge, default subagent development

## App Domain

**Conversation**:
An ordered thread of messages owned by one anonymous client. Persisted server-side and selectable from history. The unit of multi-session.
_Avoid_: Chat, session, thread

**Message**:
A single turn in a conversation, authored by either the user or the assistant. Stored in order under a conversation.
_Avoid_: Reply, line, bubble

**Assistant reply**:
The model-authored message produced by the LLM. Delivered incrementally as a stream, then persisted in full.
_Avoid_: Response, completion, output

**Stream**:
The incremental token-by-token delivery of an assistant reply over SSE while generation is in progress.
_Avoid_: Live response, push

**Anonymous client**:
An unauthenticated visitor identified by a clientId cookie. Owns conversations without logging in; the identity that can later be linked to an account.
_Avoid_: User, account, guest
