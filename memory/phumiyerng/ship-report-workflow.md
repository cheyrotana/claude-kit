---
name: ship-report-workflow
description: "Task loop set up 2026-11-12: fix → /ship (checks, commit, push, MR links, NexTask In Progress, Notion, handoff) → deploy → /report (verify on dev, screenshot, comment + Request Review)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 4b557c4e-72ae-45c9-8356-8c77dbf86c35
  modified: 2026-11-12T16:14:33.296Z
---

The user wants the per-task loop streamlined (2026-11-12):
- `ship` skill: checks → commit → push the user's branch → GitLab MR links → NexTask In Progress → Notion log → handoff (Blocked) while waiting for merge/deploy.
- `report` skill: after deploy, verify each fix on dev in Chrome, screenshot to the handoff `shots/` folder, draft comments, ONE confirmation, then attach (≤ 20 KB jpg via `shrink-shot.ps1`) + comment + Request Review, and log it in Notion.

**Why:** "what more can we do to streamline our work" → the user chose these plus the automatic Chrome toast.

**How to apply:** when a fix is done and tested, offer `/ship`. When the user says it's deployed, run `report`. No GitLab CLI is installed, so give MR links (new-MR URL), not created MRs. Related: [[session-handoff]], [[notion-dev-log]], [[nextask-mcp]], [[chrome-test-alert]].
