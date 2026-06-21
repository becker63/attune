#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/nx-env.sh"

if git diff --cached --name-only --diff-filter=ACMRT | grep -Eq '^openspec/'; then
  openspec validate --all --no-interactive
fi
