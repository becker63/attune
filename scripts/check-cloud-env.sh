#!/usr/bin/env bash
set -euo pipefail

export NX_DAEMON=false
export TMPDIR=/tmp
export TEMP=/tmp
export TMP=/tmp

if ! command -v corepack >/dev/null 2>&1; then
  echo "missing cloud dependency: corepack is not available on PATH" >&2
  exit 1
fi

corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm exec nx graph --file=/tmp/attune-nx-graph.json
corepack pnpm exec nx run attune-nx:typecheck
corepack pnpm exec nx run attuned-discovery:typecheck
