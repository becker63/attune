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

if git diff --cached --name-only --diff-filter=ACMRT | grep -Eq '^openspec/'; then
  openspec validate --all --no-interactive
fi
