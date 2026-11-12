---
name: ship
description: Finish a fix end to end in the PhumiYerng repos (api, mobile, web, website) - run the checks, commit, push the working branch, give the GitLab MR links, set the NexTask tasks to In Progress, log it in the Notion dev log, and leave a handoff while it waits for merge/deploy. Use when the user says "ship it", "commit and push", "push this", "wrap this fix up", or runs /ship; also offer it (ask first) when a fix is done and tested.
argument-hint: "[task ids e.g. Mobile-141 Mobile-143] [repo ...]"
---

# Ship a fix

The user asking for this (`/ship`, "ship it", "commit and push") is the go-ahead to commit and
push the working branch. If **you** decide a fix is ready, ask once before starting.
Never push to `dev`, `master` or `main`: only the user's own branch (e.g. `dev-rotana`).

Repos live one level down from the PY folder (`node ~/.claude/scripts/kit.js root PY`). Remote host:
`https://gitlab.camcyber.com/system/phumiyerng/<repo>`.

## 1. Scope

- `git -C <repo> status -sb` for each repo; ship only repos with changes or unpushed commits.
- Task ids: from the argument, else the tasks this conversation fixed. List what goes into
  each repo and which task each change belongs to. Leave unrelated changes alone (for example
  website `package-lock.json`); if unsure whether a change belongs, ask.

## 2. Checks (stop at the first failure, fix or report it)

- **api**: `npm run build`, `npm test`. Run `npm run test:e2e` only if a local DB/API is set up.
  Also `npx eslint <changed .ts files>` (not `npm run lint`: it runs `--fix` over everything).
- **mobile**: `flutter analyze`, then the tests for the changed area, then the full
  `flutter test` (run in the background; if it hangs over 10 min, look for a `runAsync` wait,
  see `pumpUntilDone` in `test/ui/customer/customer_flow_test.dart`).
- **web/website**: their `lint`/`build` scripts from package.json.
- Line endings: `git -C <repo> diff --name-only HEAD | xargs -r file | grep CRLF`. Convert any
  CRLF files to LF (`sed -i 's/\r$//'`) unless the file was CRLF before.
- New SQL in `api/src/database/sql/`: it must follow the sql folder rules (memory:
  project-fields-handoff) and be listed for DevOps in the report.

## 3. Commit and push

- One commit per repo unless the changes are unrelated. Message style as in `git log`
  (`fix: …` / `feat: …`, plain words, the tasks it covers), ending with the Co-Authored-By
  line from the current attribution instructions.
- Stage named files (no `git add -A`). Commit, then `git push origin <branch>`.
- If the branch is behind its remote or dev moved: `pull-latest` skill first, then re-run checks.

## 4. MR links

For each pushed repo:
`https://gitlab.camcyber.com/system/phumiyerng/<repo>/-/merge_requests/new?merge_request%5Bsource_branch%5D=<branch>&merge_request%5Btarget_branch%5D=dev`
Mention how many commits it carries (`git rev-list --count origin/dev..HEAD`).

## 5. Trackers

- **NexTask**: tasks still New (1094) or Re Open (1099) → In Progress (1097) with one
  `update_tasks` call (`get_task` each first for `version`). Don't move to Request Review here:
  that needs the deploy (`report` skill).
- **Notion**: a Work log row and a status page refresh (memory: notion-dev-log). Commits,
  tests run and their results, "Left to do" = merge + deploy (+ DevOps SQL) + report.

## 6. Watch for the merge

Start the watcher in the background (Bash `run_in_background`), one call for all pushed repos:
`bash ~/.claude/scripts/watch-deploy.sh --every 600 <repo-dir>:<sha> ...`
Add `--probe "URL|METHOD|status"` only when a dev URL shows the change without side effects
(e.g. a new GET endpoint going from 404 to 200; never a POST that writes data). It toasts the
user and exits when merged (and the probes pass); when notified, offer `/report`.

## 7. Hand off the wait

The work now waits on the MR merge and deploy. Run the `handoff` skill (trigger **Blocked**)
so the next session knows what to do once it is deployed. Next steps: merge check → DevOps SQL →
`report` skill.

## 8. Tell the user

Short: per repo the commit sha, checks passed, MR link; tasks moved; SQL for DevOps (if any).
