---
name: claude-kit
description: "Skills, scripts, hooks and this memory live in the git repo D:\\Projects\\claude-kit; ~/.claude links to it; shared with the user's Windows laptop"
metadata:
  node_type: memory
  type: project
  originSessionId: 4b557c4e-72ae-45c9-8356-8c77dbf86c35
  modified: 2026-11-12T17:46:10.274Z
---

Since 2026-11-13 the user's Claude setup is a git repo at `D:\Projects\claude-kit` (shared with their Windows laptop). `~/.claude/skills/<name>`, `~/.claude/scripts` and this memory folder are junctions into it, so editing them edits the kit. Per-machine code folders: `machine.json` (not in git) via `node ~/.claude/scripts/kit.js set-root`; read them with `kit.js root PY` / `kit.js projects` (replaced `~/.claude/triage-projects.json`). New machine: `node setup.js --root PY=<path> --nextask-url <url>`.

**Why:** the user wants the same workflow on both machines and asked to keep working in the project folder, not the kit.

**How to apply:** after changing a skill, script or memory, mention it and offer "save the kit" (`node ~/.claude/scripts/kit.js save "<msg>"`, commits + pushes). The SessionStart hook pulls updates and warns about unsaved changes. Never put the NexTask MCP URL, emails or passwords in the kit. The kit's own `.gitattributes` is fine (it is the user's repo, unlike [[line-endings-local]]). Related: [[session-handoff]], [[ship-report-workflow]].
