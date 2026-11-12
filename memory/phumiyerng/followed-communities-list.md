---
name: followed-communities-list
description: "Deferred feature (agreed 2026-11-09): a list of the communities a customer follows. Do after the Mobile task list is finished."
metadata:
  node_type: memory
  type: project
  originSessionId: 0585e0f7-869b-4c94-9c25-1971ece1c8ee
  modified: 2026-11-09T15:36:17.127Z
---

Add a way to see followed communities. The user asked to finish the current Phumiyerng Mobile tasks first, then come back to this.

**Why:** today the app has no list of followed communities. It only has the "Following" state on a community page and a non-tappable "Communities followed" count on Profile (`lib/ui/3-shared/4-profile/widgets/profile_widgets.dart`). The API only has per-community `GET/PUT/DELETE /customer/communities/:id/follow` (`api/src/app/resources/3-customer/1-community/customer-community.controller.ts`). Followers live in the `community.community_follower` table. Raised during Mobile-083 (reviewer: "Maybe show followed community here").

**How to apply:** once the Mobile tasks are done, remind the user and propose:
1. API: `GET /customer/communities/following`, returning the same community cards as the public list.
2. App: make the Profile "Communities followed" count open a Following list (community cards plus Unfollow), maybe also a tab next to Saved. Keep Saved (♥) and Follow separate (option C; the user agreed not to merge followed into Saved).

Related: [[web-run-hot-reload]]
