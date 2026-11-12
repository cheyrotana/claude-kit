---
name: line-endings-local
description: Repos had core.autocrlf=true (cause of CRLF diffs); fixed LOCALLY only on 2026-11-12 — never push a .gitattributes; website still pending
metadata:
  node_type: memory
  type: project
  originSessionId: 4b557c4e-72ae-45c9-8356-8c77dbf86c35
  modified: 2026-11-12T16:28:04.459Z
---

Cause of the whole-file CRLF diffs: each repo's local `core.autocrlf=true`. On 2026-11-12 api, mobile and web were switched to `core.autocrlf=false` + `* text=auto eol=lf` in `.git/info/attributes` (not committed) and their files rewritten as LF. **website** was skipped (uncommitted package-lock.json): do the same there once it is clean.

**Why:** the user wants the fix local only: "i dont want to push it to dev or anything like that".

**How to apply:** don't add a committed `.gitattributes` or suggest pushing one. If CRLF shows up again, check `git config core.autocrlf` in that repo. Related: [[ship-report-workflow]].
