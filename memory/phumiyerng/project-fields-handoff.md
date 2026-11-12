---
name: project-fields-handoff
description: "Mobile-109/119 project fields: done and pushed to dev-rotana (2026-11-10); NOT merged to dev; DevOps must run the SQL on deploy"
metadata:
  node_type: memory
  type: project
  originSessionId: 0585e0f7-869b-4c94-9c25-1971ece1c8ee
  modified: 2026-11-09T19:23:23.202Z
---

Mobile-109/119 (dynamic project fields; Project tab like Facebook's About) is committed and pushed to `dev-rotana` in all three repos on 2026-11-10: api d19847a (+ merge of origin/dev, README restore 89168d0), mobile c57c05a, web 263e8ca (+ merge of origin/dev). The user said **don't merge anything into dev yet**; they open the merge requests themselves.

**Why:** the server database needs `src/database/sql/20261110-project-fields.sql` (api repo) run by DevOps when the API deploys; deploys never change the DB, and `npm run seed` erases it.

**How to apply:**
- New server-side SQL goes in api `src/database/sql/YYYYMMDD-what.sql` (the user's choice); don't edit that folder's README (the user rejected it).
- web `npm run build` runs a `prebuild` version bump in package.json/package-lock.json; revert it before committing.
- A stash in mobile holds a formatting-only `realtime_service.dart` change from another agent (no logic change).
- Next: NexTask Mobile-129 (check commit 71f4a4d first), then [[followed-communities-list]]. See [[web-run-hot-reload]].
