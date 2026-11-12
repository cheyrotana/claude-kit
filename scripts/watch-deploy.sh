#!/usr/bin/env bash
# Wait until commits are merged into a base branch (and optionally live on a server),
# then show a Windows toast and exit 0. Meant to run in the background of a session.
#
#   watch-deploy.sh [--base origin/dev] [--every 600] [--max-hours 12]
#                   [--probe "URL|METHOD|expected status"]... <repo-dir>:<sha> ...
#
# Example:
#   watch-deploy.sh --probe "https://phumiyerng-api.dev.camcyber.com/api/public/trips/16/contact|POST|200" \
#     "$(node ~/.claude/scripts/kit.js root PY)/api:58754de" "$(node ~/.claude/scripts/kit.js root PY)/mobile:12f8dc8"
# A probe passes when the URL answers with the expected status (e.g. a new endpoint stops
# returning 404). Exit 0 = merged (+ probes pass), 1 = gave up after --max-hours.
set -u
BASE=origin/dev EVERY=600 MAXH=12 PROBES=() TARGETS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE=$2; shift 2 ;;
    --every) EVERY=$2; shift 2 ;;
    --max-hours) MAXH=$2; shift 2 ;;
    --probe) PROBES+=("$2"); shift 2 ;;
    *) TARGETS+=("$1"); shift ;;
  esac
done
[ ${#TARGETS[@]} -gt 0 ] || { echo "usage: watch-deploy.sh [opts] <repo>:<sha> ..."; exit 2; }

TOAST="$HOME/.claude/scripts/toast.ps1"
toast() { powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(cygpath -w "$TOAST" 2>/dev/null || echo "$TOAST")" "$1" "$2" >/dev/null 2>&1; }
deadline=$(( $(date +%s) + MAXH * 3600 ))
merged_told=0

while :; do
  pending=()
  for t in "${TARGETS[@]}"; do
    repo=${t%:*} sha=${t##*:}
    git -C "$repo" fetch --quiet origin 2>/dev/null
    git -C "$repo" merge-base --is-ancestor "$sha" "$BASE" 2>/dev/null || pending+=("$(basename "$repo")@$sha")
  done
  now=$(date '+%H:%M')
  if [ ${#pending[@]} -gt 0 ]; then
    echo "[$now] not in $BASE yet: ${pending[*]}"
  else
    if [ $merged_told -eq 0 ]; then echo "[$now] all merged into $BASE"; merged_told=1; fi
    failing=()
    for p in "${PROBES[@]+"${PROBES[@]}"}"; do
      IFS='|' read -r url method want <<<"$p"
      got=$(curl -s -o /dev/null -w '%{http_code}' -X "${method:-GET}" --max-time 20 "$url")
      [ "$got" = "${want:-200}" ] || failing+=("$url → $got (want ${want:-200})")
    done
    if [ ${#failing[@]} -eq 0 ]; then
      msg="Merged into $BASE${PROBES:+ and live on dev}. Ready to /report."
      echo "[$now] DONE: $msg"
      toast "Deployed: ${TARGETS[*]##*/}" "$msg"
      exit 0
    fi
    echo "[$now] merged, not live yet: ${failing[*]}"
  fi
  [ "$(date +%s)" -ge "$deadline" ] && { echo "gave up after ${MAXH}h"; exit 1; }
  sleep "$EVERY"
done
