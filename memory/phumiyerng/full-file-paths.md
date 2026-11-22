---
name: full-file-paths
description: "Name project files by their path relative to the PY root, starting with the repo folder (api/src/..., mobile/lib/...), never a bare filename"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0754a4e6-6979-40aa-8c03-a69a3710a4dc
  modified: 2026-11-13T11:05:41.189Z
---

Name each project file by its path relative to the project root `D:\Projects\Intern-Project\PY`, starting with the repo folder: `api/src/database/sql/20261112-order-accept-window.sql`, `mobile/lib/ui/2-community/3-orders/views/order_detail_screen.dart`. One complete path per file, never a bare filename or "folder: a, b, c".

Files outside the project (handoff screenshots, scratchpad) keep their full absolute path, since a relative path wouldn't resolve.

**Why:** the user asked (2026-11-13) "give the file name as file path from now on include root project path", then clarified "what i mean is relative path", after I wrote bare names like `20261112-order-accept-window.sql`.

**How to apply:** in replies, reports, handoffs and NexTask/Notion text. Related: [[testing-setup]], [[ship-report-workflow]].
