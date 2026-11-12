---
name: handoff
description: Write a session handoff (what was done, what is half-done, exact next steps, running processes, decisions, gotchas) to Notion "Session handoffs" plus a local copy, so another session or agent can continue without this context. Use when the user says "handoff", "write a handoff", "wrap up", "done for today", "save context", "I'm switching machines", "usage is running out"; when a HANDOFF NUDGE hook message arrives (usage limit or context almost full); before a long wait on something outside the session (deploy, MR review, DevOps, a teammate); or before handing work to a different agent. Runs /handoff [trigger].
argument-hint: "[usage-low|context-full|end|blocked|switching|manual] [note]"
---

# Write a session handoff

Goal: a reader with **none** of this session's context can continue in under two minutes. Write
facts and exact commands, not a story. Keep it short: aim for 60–120 lines.

## Trigger

Map the argument (or the situation) to the Notion `Trigger` value:
`usage-low` → **Usage low**, `context-full` → **Context full**, `end` → **End of session**,
`blocked` → **Blocked** (waiting on a person, deploy, review), `switching` → **Switching machine**,
anything else → **Manual**. A HANDOFF NUDGE message names its trigger.

If usage is the reason, be quick: gather, write, save. Skip anything optional.

## 1. Gather facts (don't trust memory for state)

- Session id: the last folder of this session's scratchpad path (a UUID).
- For each repo touched (one level down from the project folder, e.g. api, mobile, web, website):
  `git -C <repo> status -sb`, `git -C <repo> log --oneline -5`,
  `git -C <repo> rev-list --left-right --count HEAD...@{u}` (unpushed / behind).
- Background processes this session started (dev servers, watchers, test runs): command, port,
  the task id, and whether the next session should reuse or restart them.
- External state you changed or are waiting on: tracker task ids and statuses, MRs/PR links,
  DB/SQL to run, deploys.

## 2. Write the markdown

Write it to the scratchpad as `handoff.md`, with these sections in this order (leave a section
out if it would be empty):

```markdown
# <short title: what the work is, not "Handoff">

**Trigger:** <value> · **When:** <YYYY-MM-DD HH:MM> · **Session:** <id> · **Branch:** <branch(es)>

## Next steps
1. <the very next action, concrete: file/command/task id>
2. ...

## Goal
<1–3 lines: what the user wants overall>

## Done this session
- <item> — <commit sha / task id / proof (tests, screenshot path)>

## In progress (half-done)
- <file:line or task> — <what is done, what is missing, how to finish>

## State
| Repo | Branch | HEAD | Unpushed | Uncommitted |
|---|---|---|---|---|

- Running: <process — command — port — reuse/restart>
- Waiting on: <person/deploy/review — what unblocks it>

## Decisions (and why)
- <decision> — <reason / who decided>

## Gotchas
- <thing that cost time and will again: env quirks, flaky tests, hidden rules>

## Key files
- <path> — <why it matters>

## Open questions for the user
- <question>
```

Rules: no secrets (passwords, tokens, keys, real customer data): name where they live instead.
Paths absolute or repo-relative. Each Next step must be doable without asking what it means.

## 3. Save locally

```bash
node ~/.claude/scripts/handoff.js save "<scratchpad>/handoff.md" --title "<title>" --trigger "<Trigger>" --session "<session id>"
```

It prints the saved meta and, under `superseded`, the previous open handoff (if any).

## 4. Save to Notion

Data source `collection://824e0692-61f5-42cf-99bc-574b36ac7f3b` ("Session handoffs" inside
"PhumiYerng Dev Log"). Create one page with the same markdown as content (drop the H1; the
title is the property) and properties:
`Handoff` = title, `Status` = `Open`, `Trigger`, `Project` = the project's name (see below),
`date:Created:start` = now (ISO, `date:Created:is_datetime` = 1), `Repos` (JSON array),
`Branch`, `Next step` = step 1 in one line, `Session`, `Local file` = the saved path.

**Project name:** the PY folder (`node ~/.claude/scripts/kit.js root PY`) is `PhumiYerng`. For any other project, use the
name the user calls it, else the project root folder's name (`project_root` in the saved meta).
If that option doesn't exist in `Project` yet, add it first (update the data source), and store it
locally too: `node ~/.claude/scripts/handoff.js set project=<name>`. Use the same name every time,
so one project never ends up under two names.

Then:
- `node ~/.claude/scripts/handoff.js set notion=<page url>`
- If step 3 reported a superseded handoff with a `notion` url, set that page's `Status` to
  `Superseded`.

If Notion fails, the local copy is enough: say so and carry on.

## 5. Report

One line to the user: the title, the Notion link, and the first next step. On a usage/context
trigger, then continue the work if there is room; the handoff is a safety net, not a stop.
