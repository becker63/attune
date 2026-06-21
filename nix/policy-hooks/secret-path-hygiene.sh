#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/nx-env.sh"

staged_paths=$(git diff --cached --name-only --diff-filter=ACMRT || true)
[ -n "$staged_paths" ] || exit 0

matches=$(printf '%s\n' "$staged_paths" | grep -E '(^|/)(\.env($|\.)|secrets?/|.*secret.*|.*token.*|.*credential.*|id_rsa|id_ed25519)' | grep -Ev '^nix/policy-hooks/' || true)

if [ -n "$matches" ]; then
  echo "Secret-path hygiene failed: staged paths look like runtime secrets or credentials." >&2
  printf '%s\n' "$matches" >&2
  echo "Move runtime secrets outside the repo or add a narrow, reviewed allowlist." >&2
  exit 1
fi
