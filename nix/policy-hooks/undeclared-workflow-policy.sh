#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/nx-env.sh"

staged_paths=$(git diff --cached --name-only --diff-filter=ACMRT || true)
[ -n "$staged_paths" ] || exit 0

if printf '%s\n' "$staged_paths" | grep -Eq '(^|/)\.github/workflows/'; then
  if ! printf '%s\n' "$staged_paths" | grep -Eq '(^|/)project\.json$|^nx\.json$|^package\.json$|^flake\.nix$|^nix/'; then
    echo "Workflow policy failed: workflow files changed without a Nix/Nx policy surface update." >&2
    echo "Declare the workflow through an Nx target or Nix-backed policy hook in the same change." >&2
    exit 1
  fi
fi
