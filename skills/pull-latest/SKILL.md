---
name: pull-latest
description: Pull the newest code into a chosen branch by checking EVERY remote branch (dev, teammates' dev-* branches, master, the branch's own origin copy) for commits the target branch lacks, then merging the ones that carry new code. Use when the user says "pull latest into <branch>", "update <branch> with the latest code", "get the newest code into my branch", or runs /pull-latest <branch>. Works on one repo or every git repo one folder down (api, mobile, web, website).
argument-hint: "<target-branch> [repo ...]"
---

# Pull the latest code into a branch

The user names a **target branch** (for example `dev-rotana`) and optionally some repos. Find every
remote branch that has commits the target lacks and merge those into the target. Do **not** just
merge `origin/dev`: a teammate's branch (such as `dev-raksa`) can be ahead of `dev`.

If no target branch is given, use the current branch of the repos and say which one you used.

## 1. Scan (read-only apart from `git fetch`)

From the folder that contains the repos (or from inside one repo), run:

```bash
bash ~/.claude/skills/pull-latest/scan.sh <target-branch> [repo-dir ...]
```

With no repo dirs it scans the current repo, or every git repo one level down. For each repo it
prints the remote branches with commits the target lacks (`+N`, last commit date, author and
subject), skips branches whose commits are already inside another candidate, and ends with a
`TO MERGE:` line. It also prints the **pre-merge sha**; keep it for the undo command.

## 2. Merge, one repo at a time

For each repo whose scan has a `TO MERGE` line:

1. **Be on the target branch.** If the current branch is not the target, `git checkout <target>`
   (if it exists only on origin, `git checkout -t origin/<target>`). If checkout is refused
   because of local changes, skip the repo and report it. Never stash, reset or discard the
   user's uncommitted changes on your own; files that aren't yours (such as a stray
   `package-lock.json`) stay untouched.
2. **Merge in this order:** `origin/<target>` first (to pick up the branch's own pushed
   commits), then the default branch (`origin/dev` / `origin/master`), then the other branches
   newest-first. Use `git merge --no-edit <ref>`; git fast-forwards when it can.
3. **If a merge is refused** because uncommitted changes would be overwritten, skip that repo
   and report it.
4. **If a merge conflicts:** list the conflicted files (`git diff --name-only --diff-filter=U`).
   Resolve them only when the fix is clearly mechanical: both sides added different lines, or a
   lockfile or generated file can be regenerated. Then `git add` the files and
   `git commit --no-edit`. Otherwise run `git merge --abort`, leave the repo at its pre-merge
   state, and show the user the conflicting files and both sides' commits so they can decide.

## 3. After merging

- Show what came in: `git log --oneline <pre-merge-sha>..HEAD --no-merges` per repo.
- Point out follow-ups the new commits need. Use `git diff --stat <pre-merge-sha>..HEAD` to check:
  - `pubspec.yaml` changed → `flutter pub get`
  - `package.json` changed → `npm install`
  - new `.sql` / migration files → the database needs them
  - `.env.example` changed → new env vars
- **Do not push** unless the user asks. Merges stay local.

## 4. Report

End with a short table, one row per repo: repo, what was merged (branch and number of commits),
the result (fast-forward / merged / conflict aborted / skipped and why / up to date), and the
undo command `git reset --hard <pre-merge-sha>` for repos that changed. Mention any
skipped-as-contained branches only if that's useful (for example, "dev-raksa was already in dev").
