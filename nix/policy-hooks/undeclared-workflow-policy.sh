#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
if [ -f "$script_dir/nx-env.sh" ]; then
  source "$script_dir/nx-env.sh"
elif [ -f "nix/policy-hooks/nx-env.sh" ]; then
  source "nix/policy-hooks/nx-env.sh"
else
  export NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp COREPACK_ENABLE_DOWNLOAD_PROMPT=0
fi

staged_paths=$(git diff --cached --name-only --diff-filter=ACMRT || true)
[ -n "$staged_paths" ] || exit 0

if printf '%s\n' "$staged_paths" | grep -Eq '(^|/)\.github/workflows/'; then
  if ! printf '%s\n' "$staged_paths" | grep -Eq '(^|/)project\.json$|^nx\.json$|^package\.json$|^flake\.nix$|^nix/'; then
    echo "Workflow policy failed: workflow files changed without a Nix/Nx policy surface update." >&2
    echo "Declare the workflow through an Nx target or Nix-backed policy hook in the same change." >&2
    exit 1
  fi
fi
