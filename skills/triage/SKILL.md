---
name: triage
description: Start-of-day check of the user's NexTask work in ANY project (PhumiYerng Mobile/Web/Website, HRM, CCN, …) - list tasks that are new, reopened, confirmed or in progress, check the code (commits on the user's branch and the base branch) for ones already fixed, and say what still needs work and what to do first. Read-only. Use when the user says "triage", "check my tasks", "what's new", "any new or reopened tasks", "what should I work on", or runs /triage [project].
argument-hint: "[project name e.g. mobile | web | hrm | all]"
---

# Triage my tasks

Read-only: change no task, branch or file. Write-backs (status changes) only if the user asks
after seeing the list.

## 1. Which projects

- Argument given: match it against NexTask project names (`list_projects`, `name_en` /
  `short_name_en`, case-insensitive; "mobile" → "Mobile App"). Several matches → ask.
- No argument: the projects from the current folder's entries in
  `node ~/.claude/scripts/kit.js projects` (by `root`); if none match, every project where I have open
  tasks (`list_my_tasks` with no project filter).
- `all`: every project with open tasks.

## 2. Tasks

For each project, `list_my_tasks` with `project_id`. **Status ids differ per project**: go by
status `name_en`. Keep the ones named New, Re Open, Confirm, Unconfirm, In Progress (skip
Completed, Suspended). Note Request Review / Waiting Deployment ones separately (waiting on
others). For Re Open tasks, `read_task_chat` for the reason they came back.

## 3. Check the code

Look up the project in `node ~/.claude/scripts/kit.js projects`. Not there → ask the user where its
code is (or "no code here"), and add an entry to `$(node ~/.claude/scripts/kit.js dir)/config/projects.json`
(`workspace`, `repos`, `branch`, `base`, `also_check`; a new workspace also goes under `workspaces`),
then `node ~/.claude/scripts/kit.js set-root <WORKSPACE> <folder>` for this machine. A `root_missing`
note means the workspace exists but this machine has no folder for it: ask, then `set-root`.

For each repo: `git -C <repo> fetch --quiet`, then for each task search commits since the task
was created on the user's branch, the base and `also_check` branches:
`git -C <repo> log <branches> --since=<created_at> --oneline -i --grep "<task code>"`,
then by distinctive words from the title (screen/feature names) if the code finds nothing.
Open the likely commit (`git show --stat`) to confirm it really addresses the task. For Re Open
tasks, check whether a commit came after the reopen.

Classify each task:
- **Fixed, waiting to report**: a matching commit is in the base branch → `/report`.
- **Fixed, not merged**: commit only on the user's branch → MR / `/ship`.
- **Partly done**: commit touches it but the description has unmet points (say which).
- **To do**: nothing found.
- **Unclear**: say what is missing (needs the reporter, needs design).

## 4. Report

Grouped by project, most urgent first (Re Open, then due date, then priority):

| Task | Title | Status | Code | Next |
|---|---|---|---|---|

Then: the open handoff for this folder, if any (`node ~/.claude/scripts/handoff.js show`, one
line); tasks waiting on others (Request Review / Waiting Deployment); and a recommendation of
what to start with and why (one or two lines). Offer, don't do: move tasks, start fixing.
