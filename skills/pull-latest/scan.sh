#!/usr/bin/env bash
# Usage: scan.sh <target-branch> [repo-dir ...]
# Fetches every remote, then lists the remote branches that have commits
# <target-branch> does not have yet. Read-only apart from `git fetch`.
# With no repo dirs: the current repo, or every git repo one level down.
set -u
target="${1:?usage: scan.sh <target-branch> [repo-dir ...]}"; shift

if [ $# -eq 0 ]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    set -- "$(git rev-parse --show-toplevel)"
  else
    for d in */; do [ -e "$d.git" ] && set -- "$@" "${d%/}"; done
  fi
fi
[ $# -eq 0 ] && { echo "No git repositories found."; exit 1; }

for repo in "$@"; do
  g() { git -C "$repo" "$@"; }
  echo "=== $repo ==="
  if ! g fetch --all --prune --quiet; then echo "  FETCH FAILED - skipping"; echo; continue; fi

  if g show-ref --verify --quiet "refs/heads/$target"; then base="$target"
  elif g show-ref --verify --quiet "refs/remotes/origin/$target"; then base="origin/$target"
  else echo "  target '$target' does not exist locally or on origin - skipping"; echo; continue; fi

  default=$(g symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null)
  echo "  current branch : $(g branch --show-current)"
  echo "  target base    : $base   (pre-merge sha $(g rev-parse --short "$base"))"
  echo "  default branch : ${default:-unknown}"
  echo "  dirty files    : $(g status --porcelain | wc -l | tr -d ' ')"

  cands=()
  while read -r ref; do
    case "$ref" in */HEAD|origin) continue;; esac
    [ "$ref" = "$base" ] && continue
    n=$(g rev-list --count "$base..$ref")
    [ "$n" -eq 0 ] && continue
    cands+=("$ref")
    printf '  %-26s +%-4s last: %s\n' "$ref" "$n" "$(g log -1 --format='%cs %an - %s' "$ref")"
  done < <(g for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/)

  if [ ${#cands[@]} -eq 0 ]; then echo "  UP TO DATE - no branch has commits $base lacks"; echo; continue; fi

  merge=()
  for a in "${cands[@]}"; do
    within=""
    for b in "${cands[@]}"; do
      [ "$a" = "$b" ] && continue
      if g merge-base --is-ancestor "$a" "$b"; then
        # identical tips: keep only the first one alphabetically
        if [ "$(g rev-parse "$a")" = "$(g rev-parse "$b")" ] && [[ "$a" < "$b" ]]; then continue; fi
        within="$b"; break
      fi
    done
    if [ -n "$within" ]; then echo "  skip $a (already contained in $within)"; else merge+=("$a"); fi
  done
  echo "  TO MERGE: ${merge[*]}"
  echo
done
