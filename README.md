# Claude kit

My Claude Code setup, shared between machines: skills, scripts, hooks, status line and project
memory. `~/.claude` links to this folder, so a change made here (or by Claude while working) is
live right away, and `git` carries it to the other machine.

| Folder | What | Linked from |
|---|---|---|
| `skills/` | handoff, pickup, ship, report, triage, pull-latest, message-pack | `~/.claude/skills/<name>` |
| `scripts/` | handoff + usage nudges, Chrome toast, deploy watcher, screenshot shrink, status line, `kit.js` | `~/.claude/scripts` |
| `memory/<workspace>/` | Claude's notes per project | `~/.claude/projects/<folder-slug>/memory` |
| `config/projects.json` | NexTask project → repos, branches | read by `kit.js projects` |
| `config/hooks.json` | hooks + status line | merged into `~/.claude/settings.json` |
| `machine.json` | this machine's code folders (not in git) | written by setup / `kit.js set-root` |

Not in here: session handoffs (Notion "Session handoffs" carries them between machines),
transcripts, logins, the NexTask link (it is personal; setup takes it as an argument).

## New machine (Windows)

Needs Node.js, Git for Windows and Claude Code (signed in to the same account).

```powershell
git clone <this repo url> D:\Projects\claude-kit
cd D:\Projects\claude-kit
node setup.js --root PY=D:\Projects\Intern-Project\PY --nextask-url "<NexTask MCP url>"
```

Then restart Claude Code, open `/mcp` to sign in to NexTask, and check Notion and Claude in Chrome
are connected. `node setup.js --dry-run` shows what it would change. Anything it replaces is moved
to `~/.claude/kit-backup-<time>/`.

## Every day

- Work in the project folder as usual, not in this one.
- Session start pulls the other machine's changes automatically (when there are no local edits) and
  says when this machine has unsaved kit changes.
- To send changes to the other machine, tell Claude "save the kit", or run
  `node ~/.claude/scripts/kit.js save "what changed"`.
- `node ~/.claude/scripts/kit.js status` shows unsaved / unpushed / incoming changes.

## Adding a project

`/triage <project>` asks where an unknown project's code is and adds it to `config/projects.json`.
On the other machine, `node ~/.claude/scripts/kit.js set-root <WORKSPACE> <folder>` sets the
folder there.
