---
name: pickup
description: Load the latest open session handoff (Notion "Session handoffs" + local copy), check it against the real repo state, mark it picked up, and continue from its next steps. Use when the user says "pickup", "continue where we left off", "what was I doing", "load the handoff", "resume the last session's work", or when a session-start note says an open handoff exists and the user wants to continue. Runs /pickup.
argument-hint: "[notion url]"
---

# Pick up a session handoff

## 1. Find it

1. `node ~/.claude/scripts/handoff.js show` prints the local latest handoff and its meta
   (status, notion url, session).
2. If the user gave a Notion URL, or the local meta has `notion`, fetch that page: Notion is the
   source of truth (the user or another agent may have edited it).
3. No local copy (other machine)? Query `collection://824e0692-61f5-42cf-99bc-574b36ac7f3b` for the
   newest row with `Status` = `Open` **and `Project` = this project** (sort by
   `date:Created:start`), and fetch it. Project name: the PY folder (`node ~/.claude/scripts/kit.js root PY`)
   is `PhumiYerng`; otherwise the name the user uses or the project folder's name. Never pick up
   another project's handoff; if the project is unclear, list the open ones and ask.
4. Nothing open: say so and stop. If the newest is already `Picked up`, tell the user who picked it
   up and ask before taking it again.

## 2. Check it is still true

Handoffs go stale. Before acting:
- For each repo in its State table: `git -C <repo> status -sb` and `git -C <repo> log --oneline -3`.
  Note differences (new commits, a different branch, changes that were pushed or merged).
- Processes it lists as running: check whether they still are (port or process). Don't start
  duplicates.
- Waiting-on items: check their current state if a tool can (tracker status, MR state).

## 3. Mark it picked up

- Notion: `Status` = `Picked up`, `Picked up by` = this session id (last folder of the scratchpad
  path) and the date.
- Local: `node ~/.claude/scripts/handoff.js set status=picked-up picked_up_by=<session id>`

## 4. Brief the user, then continue

Short: the goal in one line, what is done, what changed since it was written, and the next step
you will take. Then do the next steps in order. Ask first only where the handoff lists an open
question, or where the drift from step 2 makes a step unsafe (e.g. the branch moved).
