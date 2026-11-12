---
name: session-handoff
description: "Handoff flow set up 2026-11-12: /handoff writes Notion \"Session handoffs\" + local copy; /pickup reads it; hooks nudge at low usage/context"
metadata:
  node_type: memory
  type: project
  originSessionId: 4b557c4e-72ae-45c9-8356-8c77dbf86c35
  modified: 2026-11-12T15:57:11.143Z
---

The user wants context saved for other sessions/agents (set up 2026-11-12).

- Write: skill `handoff` (~/.claude/skills/handoff). Read: skill `pickup` (not "resume": that is a built-in command).
- Notion: database "Session handoffs" inside "PhumiYerng Dev Log", data source `collection://824e0692-61f5-42cf-99bc-574b36ac7f3b`. Status Open → Picked up / Superseded.
- Local: `~/.claude/handoffs/D--Projects-Intern-Project-PY/` (latest.md, latest.json, history.jsonl, shots/ with the fix screenshots). Helper: `~/.claude/scripts/handoff.js`.
- Hooks (~/.claude/settings.json): SessionStart tells a new session about an open handoff; PostToolUse + UserPromptSubmit send a "HANDOFF NUDGE" at 5h ≥85/95%, 7d ≥90/97%, context ≥80%. Usage numbers come from statusline.js → `~/.claude/state/usage-<session>.json`.

**Why:** the user asked to save context when usage runs out, at the end of a session, and in other such cases.

**How to apply:** on a HANDOFF NUDGE, finish the current step, then run `handoff`. Also write one before long waits (MR merge, deploy, DevOps) and when the user wraps up. Related: [[notion-dev-log]], [[testing-setup]].
