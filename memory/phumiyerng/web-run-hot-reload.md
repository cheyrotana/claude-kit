---
name: web-run-hot-reload
description: "After code changes, hot-reload the running `flutter run -d chrome` app; never kill and rebuild it"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 29370d02-00bc-49cd-8b5d-749921ad8632
  modified: 2026-11-09T15:21:32.192Z
---

After changing code while the app runs in Chrome, reload the running app instead of killing `flutter run` and building again.

**Why:** the user asked: "just hard refresh when make change dont kill and build again". A debug web rebuild takes 60–90 s, and each restart left an orphaned dartvm holding the port.

**How to apply:**
- Run once on mocks with **`-d web-server`, never `-d chrome`**: `flutter run -d web-server --web-port 4444 --dart-define=FLAVOR=dev --dart-define=DATA_SOURCE=mock --dart-define=DEV_TOOLS=true` (the user wants dev tools on when running).
- `-d chrome` launches its own Chrome window on every run (and up to 3 on a failed debugger attach, 2026-11-11), so the user kept seeing multiple tabs of the app. `web-server` opens no browser: the user keeps one tab on http://localhost:4444, and I open at most one extension tab when testing.
- Take the `ws://127.0.0.1:<port>/<token>/ws` debug-service URI from its output.
- Call the "Flutter Tools" `reloadSources` service with the isolate id from `getVM`. That recompiles and hot-reloads, like pressing `r`. On Node 20 the WebSocket needs `node --experimental-websocket`.
- DWDS's own `hotRestart` fails without a recompile, so don't use it. The **Flutter Tools-registered** `hotRestart` service (method name from `ServiceRegistered` events on the `Service` stream) restarts in ~1 s but does **NOT recompile on web**: it reruns the last compiled code. On 2026-11-09 several fixes silently never reached the browser this way.
- On web the only `hotRestart` service is DWDS's (`s1.hotRestart`, alias DWDS); Flutter Tools registers just `reloadSources`. Pick services by alias, not by name.
- `reloadSources` can be **rejected** ("Hot reload rejected due to unsupported changes", e.g. "Const class cannot remove fields"). The RPC still returns Success, so check the run log for "Reloaded application in …". When rejected, nothing new reaches the browser until a real rebuild. Workaround: make the change reload-compatible (e.g. keep a removed field for now), or ask the user before rerunning `flutter run`.
- So **always call `reloadSources` first** (it compiles, ~3–10 s), then `hotRestart` if a restart is needed. Check the run log for a new "Reloaded application in …" line.
- Use that hot restart, not reload, after changing `const` objects or top-level consts (e.g. adding a field to a `*Strings` l10n class). Hot reload keeps the old const instances, so the new field reads as null (`Null is not a subtype of ...`). On 2026-11-09 this broke the sign-out button until a restart.
- Hot restart resets in-app state (e.g. sign-in), so tell the user.
- If the user approves stopping a web server we started, stop it by PID, never by process name.
