---
name: chrome-test-alert
description: "Before testing in Chrome the user gets a Windows toast - now automatic via a PreToolUse hook (PushNotification doesn't show for them)"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 4b557c4e-72ae-45c9-8356-8c77dbf86c35
  modified: 2026-11-12T16:14:28.479Z
---

The user wants to watch Chrome testing live. Since 2026-11-12 a PreToolUse hook does it:
`~/.claude/scripts/chrome-toast.js` runs before Claude in Chrome navigate/computer/etc. calls and shows a Windows toast ("Claude: testing in Chrome"), again only after 30 min without Chrome activity. Don't send it by hand any more.

Manual toast if ever needed: `powershell -NoProfile -File "C:\Users\JuKer\.claude\scripts\toast.ps1" "Title" "Message"`.

**Why:** the PushNotification tool's terminal notification never showed for the user; the toast did.

**How to apply:** nothing to do before testing; the test tab opens in the "Claude" tab group. Related: [[testing-setup]], [[ship-report-workflow]].
