---
name: testing-setup
description: "How to test PhumiYerng end to end - Claude in Chrome on the web app, seeded dev accounts, local API/DB prep, screenshots for task reports"
metadata:
  node_type: memory
  type: project
  originSessionId: 4b557c4e-72ae-45c9-8356-8c77dbf86c35
  modified: 2026-11-12T14:44:03.755Z
---

- The user wants testing done with **Claude in Chrome** (not a headless Chrome I drive myself). If the extension isn't connected, ask the user to reconnect it rather than switching tools (2026-11-12).
- Take a screenshot of each verified fix (`save_to_disk` zoom) and copy it to a named file (`mobile-<task>-<what>.png`), so the user can attach it to the NexTask report.
- Seeded accounts (password `SHARED_DEV_PASSWORD` in api `src/database/seed/user/user.seed.ts`): `0100000001` is a community admin of Preah Phos (enter community mode by tapping the Home logo, then the community); `098787839` works for /customer routes.
- On web the map picker has no Maps key: add a delivery address through `#/profile/addresses/new` without the map.
- Local DB: if sign-in fails with a missing column, run `npm run migrate` (syncs the schema with the entities, documented as safe) and any `src/database/sql` file that is newer than the DB.
- API end-to-end checks: a node script with `pg` from the api's node_modules plus `fetch` against http://localhost:3000/api.

Related: [[web-run-hot-reload]], [[nextask-mcp]], [[notion-dev-log]].
