---
name: pull-latest-dev-raksa
description: "Pulling latest into dev-rotana means origin/dev AND origin/dev-raksa (teammate's branch can be ahead of dev); 2026-11-11 merges + mobile fixes are local, unpushed"
metadata:
  node_type: memory
  type: project
  originSessionId: e78da72b-25d9-4712-b8f3-50f48cec4de3
  modified: 2026-11-11T17:41:34.662Z
---

When the user asks to "pull the latest code into dev-rotana", check both `origin/dev` and `origin/dev-raksa` in every repo (api, mobile, web, website). On 2026-11-11 mobile's newest commit (8cacd4c) was only on `dev-raksa`; the user had to point it out after I merged only `origin/dev`.

**Why:** a teammate works on `dev-raksa` and merges into `dev` later, so `dev` can lag behind it.

**How to apply:** `git rev-list --count HEAD..origin/dev-raksa` per repo, and merge whichever branch has commits that `dev-rotana` lacks.

State on 2026-11-11: **pushed** to `dev-rotana` in all four repos (not merged to dev; the user opens the MRs).
- mobile 80786fb: timing fixes (`Command(latestWins)`, `LatestSender`, `AuthRepository.userChanges`, in-flight guards), the technical-4xx-message safety net in `dio_error_mapper.dart`, and "try again later" in the server error.
- api 7c75111: `rethrowRefusalAsBadRequest` (`src/app/common/utils/refusal.util.ts`), so DB/code errors aren't sent as 400 messages. **Merged into dev 2026-11-12** (c30d94d), pipeline deploying.
- mobile: still not merged into dev (6 fix commits ahead; teammate's 8cacd4c is in dev now).
- 2026-11-12: ran the `/pull-latest` skill (~/.claude/skills/pull-latest) and merged origin/dev into dev-rotana in api/mobile/web (8e31c8b, 963118a, 52cf26f). Local only, NOT pushed yet. Then committed the Mobile-141/143/144/145/146/147 fixes: api 58754de, mobile 12f8dc8 (not pushed; DevOps SQL 20261112-order-accept-window.sql + 20261112-favorite-orphans.sql).
- Dev sign-in works again (checked 2026-11-12); the privacy SQL was run on dev. See [[project-fields-handoff]].
- website still has an uncommitted `package-lock.json` change that isn't mine.
