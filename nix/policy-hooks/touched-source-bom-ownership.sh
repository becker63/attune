#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/nx-env.sh"

staged_sources=$(git diff --cached --name-only --diff-filter=ACMRT -- 'packages/**/*.ts' 'packages/**/*.tsx' || true)
[ -n "$staged_sources" ] || exit 0

missing=0
while IFS= read -r source_path; do
  [ -n "$source_path" ] || continue
  package_dir=$(printf '%s\n' "$source_path" | awk -F/ '{print $1"/"$2}')
  if [ ! -f "$package_dir/source-bom.json" ] && [ ! -f "$package_dir/SOURCE_BOM.json" ] && [ ! -f "$package_dir/source-bom.yaml" ]; then
    echo "Source BOM ownership missing for $source_path (expected $package_dir/source-bom.json, SOURCE_BOM.json, or source-bom.yaml)." >&2
    missing=1
  fi
done <<< "$staged_sources"

exit "$missing"
