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

staged_sources=$(git diff --cached --name-only --diff-filter=ACMRT -- 'packages/**/*.ts' 'packages/**/*.tsx' || true)
[ -n "$staged_sources" ] || exit 0

missing=0
while IFS= read -r source_path; do
  [ -n "$source_path" ] || continue
  package_dir=$(printf '%s\n' "$source_path" | awk -F/ '{print $1"/"$2}')
  if [ ! -f "$package_dir/attune.source-bom.json" ]; then
    echo "Source BOM ownership missing for $source_path (expected $package_dir/attune.source-bom.json)." >&2
    missing=1
  fi
done <<< "$staged_sources"

exit "$missing"
