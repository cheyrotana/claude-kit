---
name: notion-dev-log
description: "After each fix/merge/push, add a Work log row in Notion \"PhumiYerng Dev Log\" and refresh its \"Where we are now\" + to-do sections"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e78da72b-25d9-4712-b8f3-50f48cec4de3
  modified: 2026-11-11T17:29:25.561Z
---

The user wants a Notion workflow that records what we did and where things stand (set up 2026-11-12). After every piece of work (fix, feature, merge, push, investigation that finds a blocker), before reporting it done:

1. Add a row to the **Work log** database (data source `collection://6fd86d55-7e76-4c70-92d8-a7d59d0454ca`). Properties: Work (title), Date, Repos (api/mobile/web/website), Type (Fix/Feature/Merge/Push/Investigation/Setup), Status (Waiting/In progress/Done), Commits, Tested, Left to do. Put a short problem/fix/tests write-up in the page body.
2. Update the main page **PhumiYerng Dev Log** (page id `41530ad9892d81bc8974d82185279508`). Refresh the "Where we are now" repo table (from `git fetch`, then comparing `dev-rotana` with `origin/dev`, `origin/dev-raksa` and `origin/dev-rotana`), the Blockers callout, the to-do checklist, and the "Last updated" date. Use targeted `update_content` edits and keep the `<database>` tag.

**Why:** the user asked to "keep note of all of these: what we did, where are we".

**How to apply:** the page is a private draft at workspace level; move it only if the user names a destination. Write in plain words, like the explainer artifact. Related: [[pull-latest-dev-raksa]], [[project-fields-handoff]].
