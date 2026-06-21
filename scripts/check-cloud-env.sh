#!/usr/bin/env bash
set -euo pipefail

export NX_DAEMON=false
export TMPDIR=/tmp
export TEMP=/tmp
export TMP=/tmp

if ! command -v pnpm >/dev/null 2>&1; then
  echo "missing cloud dependency: pnpm is not available on PATH" >&2
  echo "enter the Nix dev shell first: nix develop" >&2
  exit 1
fi

pnpm install --frozen-lockfile
pnpm exec nx graph --file=/tmp/attune-nx-graph.json
pnpm exec nx run attune-nx:typecheck
pnpm exec nx run attuned-discovery:typecheck
