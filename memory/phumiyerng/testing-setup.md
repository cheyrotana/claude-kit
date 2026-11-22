---
name: testing-setup
description: "How to test PhumiYerng end to end - Claude in Chrome on the web app, seeded dev accounts, local API/DB prep, screenshots for task reports"
metadata:
  node_type: memory
  type: project
  originSessionId: 4b557c4e-72ae-45c9-8356-8c77dbf86c35
  modified: 2026-11-13T10:50:46.164Z
---

- The user wants testing done with **Claude in Chrome** (not a headless Chrome I drive myself). If the extension isn't connected: first open Chrome myself (`Start-Process chrome` in PowerShell), wait a few seconds and retry `tabs_context_mcp`; only ask the user if it still fails (user, 2026-11-13: "can you not open chrome yourself"). Never switch to another browser tool.
- Uploading screenshots to NexTask: `create_upload_link`, then `curl -F file=@...` from the shell, then pass each `upload_id` as an attachment on `post_task_chat_message`. Don't base64 images into tool calls (~16k tokens each).
- Web admin against the dev API: `API_BASE_URL=https://phumiyerng-api.dev.camcyber.com/api npm start` in `web/` (port 4006; shell env wins over `.env`). Every seeded account is Super Admin.
- Take a screenshot of each verified fix (`save_to_disk` zoom) and copy it to a named file (`mobile-<task>-<what>.png`), so the user can attach it to the NexTask report.
- Seeded accounts (password `SHARED_DEV_PASSWORD` in api `src/database/seed/user/user.seed.ts`): `0100000001` is a community admin of Preah Phos (enter community mode by tapping the Home logo, then the community); `098787839` works for /customer routes.
- On web the map picker has no Maps key: add a delivery address through `#/profile/addresses/new` without the map.
- Local DB: if sign-in fails with a missing column, run `npm run migrate` (syncs the schema with the entities, documented as safe) and any `src/database/sql` file that is newer than the DB.
- API end-to-end checks: a node script with `pg` from the api's node_modules plus `fetch` against http://localhost:3000/api.

Related: [[web-run-hot-reload]], [[nextask-mcp]], [[notion-dev-log]].
