#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/nx-env.sh"

if git diff --cached --name-only --diff-filter=ACMRT -- 'packages/**/*.ts' 'packages/**/*.tsx' | grep -q .; then
  pnpm exec nx run workspace:lint
fi
