---
name: report
description: After PhumiYerng fixes are merged and deployed to dev - verify each fix on dev in Claude in Chrome, screenshot it, then (after one confirmation) post a short fix comment with the screenshot on each NexTask task and move it to Request Review, and log it in Notion. Use when the user says "it's deployed", "report the tasks", "move them to review", "send for review", or runs /report.
argument-hint: "[task ids e.g. Mobile-141 Mobile-143]"
---

# Report fixed tasks for review

NexTask status ids differ per project: Mobile App uses In Progress 1097, Request Review 1098.
For another project, find the "Request Review" id by name (`get_project_write_context` or the
project's `task.by_status` in `list_projects`). Projects → code folders:
`node ~/.claude/scripts/kit.js projects`. Always `get_task` for the current `version` right before each
write: every write changes it.

## 1. Which tasks, and are they live?

- Tasks: from the argument; else the open handoff's list; else my NexTask tasks in the Mobile
  project with status In Progress. Show the list if it came from a guess.
- `git -C <repo> fetch` and check each fix commit is in `origin/dev`
  (`git -C <repo> merge-base --is-ancestor <sha> origin/dev`). Not merged → stop and say which.
- Merged but maybe not deployed: step 2 tells. New SQL files need DevOps first; ask the user if
  it was run when a fix depends on it.

## 2. Verify on dev and screenshot

- The app against the dev API: the running `flutter run -d web-server --web-port 4444
  --dart-define=FLAVOR=dev --dart-define=DEV_TOOLS=true` (in `mobile/`), started if not running.
  Pull `origin/dev` into the local branch first so the app has the merged code.
- Test in **Claude in Chrome** (a hook shows the user a toast when it starts). Accounts and
  routes: memory `testing-setup`. API-only fixes: check them with requests against the dev API
  and describe the evidence (a screenshot of the UI effect where there is one).
- Per task, one screenshot showing the fix, saved to the project's handoff folder:
  `$(node ~/.claude/scripts/handoff.js dir)/shots/<task-id>-<what>.png`.
- A fix that doesn't hold on dev: don't report it. Tell the user, and keep it In Progress.

## 3. Draft, then confirm once

Per task, draft a comment (polite, plain, 3–6 lines):

```
Fixed and deployed to dev.
Problem: <one line>
Change: <one line, user-visible> (<repo> <short sha>)
Checked on dev: <what was tested, account/route>
Screenshot attached.
```

Show all drafts plus the planned status change in one message and ask to post. Posting
comments speaks for the user, so wait for a yes (a `/report ... post` or "yes post them"
already counts).

## 4. Post

For each task, in this order:
1. **Screenshot**: `powershell -NoProfile -File ~/.claude/scripts/shrink-shot.ps1 <png> <jpg>`.
   If the jpg is ≤ 20 KB: base64 it (`base64 -w0 <jpg>`) and `upload_task_attachment`
   (`image/jpeg`, filename = the jpg name). Bigger ones cost too many tokens: leave them for the
   user, and at the end open the folder for them (`explorer.exe <shots folder>`).
2. **Comment**: `post_task_chat_message` with the approved text (say "screenshot below/attached"
   only if it was attached).
3. Status: collect, then one `update_tasks` call moving all of them to 1098.

Use a stable `idempotency_key` per write (e.g. `report-<task>-<step>-<date>`) so a retry
doesn't post twice.

## 5. Wrap up

- Notion Work log row (memory: notion-dev-log): tasks reported, how they were checked.
- If an open handoff was about this work, set its Notion `Status` to `Picked up` (done) and
  `node ~/.claude/scripts/handoff.js set status=done`.
- Tell the user: tasks moved (with links), which screenshots they still need to drag in, any
  task held back and why.
