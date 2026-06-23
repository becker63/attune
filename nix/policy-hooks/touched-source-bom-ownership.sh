#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
if [ -f "$script_dir/nx-env.sh" ]; then
  source "$script_dir/nx-env.sh"
elif [ -f "nix/policy-hooks/nx-env.sh" ]; then
  source "nix/policy-hooks/nx-env.sh"
else
  export NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp
fi

staged_sources=$(git diff --cached --name-only --diff-filter=ACMRT -- 'packages/**/*.ts' 'packages/**/*.tsx' 'framework/**/*.ts' 'framework/**/*.tsx' || true)
[ -n "$staged_sources" ] || exit 0

export STAGED_SOURCES="$staged_sources"
node <<'NODE'
const fs = require("node:fs")

const normalize = (value) =>
  String(value).replace(/\\/gu, "/").replace(/^\.\//u, "").replace(/\/+/gu, "/")

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"))
const failures = []
const fail = (message) => failures.push(`Source BOM ownership missing: ${message}`)

const sourcePaths = (process.env.STAGED_SOURCES ?? "")
  .split(/\n/u)
  .map((sourcePath) => normalize(sourcePath.trim()))
  .filter(Boolean)

const indexPath = "attune.source-bom.index.json"
if (!fs.existsSync(indexPath)) {
  fail(`root index ${indexPath} is required for staged package/framework source files.`)
} else {
  const index = readJson(indexPath)
  const shards = Array.isArray(index.shards) ? index.shards : []

  if (index.schemaVersion !== 1 || shards.length === 0) {
    fail(`${indexPath} must have schemaVersion 1 and a non-empty shards array.`)
  }

  const indexedShards = shards
    .filter((entry) => entry?.project && entry?.projectRoot && entry?.shard)
    .map((entry) => ({
      project: String(entry.project),
      projectRoot: normalize(entry.projectRoot),
      shard: normalize(entry.shard),
    }))

  const matchesProjectRoot = (sourcePath, projectRoot) =>
    sourcePath === projectRoot || sourcePath.startsWith(`${projectRoot}/`)

  const matchesOwnedPattern = (pattern, relativePath) => {
    const normalizedPattern = normalize(pattern)
    if (normalizedPattern === relativePath || normalizedPattern === "**") return true
    if (normalizedPattern.endsWith("/**")) {
      const prefix = normalizedPattern.slice(0, -3)
      return relativePath === prefix || relativePath.startsWith(`${prefix}/`)
    }
    if (!normalizedPattern.includes("*")) return false

    const escaped = normalizedPattern
      .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
      .replace(/\*\*/gu, ".*")
      .replace(/\*/gu, "[^/]*")
    return new RegExp(`^${escaped}$`, "u").test(relativePath)
  }

  for (const sourcePath of sourcePaths) {
    const entry = indexedShards
      .filter((candidate) => matchesProjectRoot(sourcePath, candidate.projectRoot))
      .sort((left, right) => right.projectRoot.length - left.projectRoot.length)[0]

    if (!entry) {
      fail(`${sourcePath} is not covered by any projectRoot in ${indexPath}.`)
      continue
    }

    const legacyShard = `${entry.projectRoot}/attune.source-bom.json`
    const cacheShard = `.attune/cache/source-bom/${entry.project}.json`
    const frameworkShard = `framework/architecture/src/generated/source-bom/${entry.project}.json`
    if (entry.shard !== legacyShard && entry.shard !== cacheShard && entry.shard !== frameworkShard) {
      fail(`${sourcePath} maps to ${entry.project}, but ${indexPath} points to ${entry.shard}; expected ${legacyShard}, ${cacheShard}, or ${frameworkShard}.`)
      continue
    }

    if (!fs.existsSync(entry.shard)) {
      fail(`${sourcePath} maps to ${entry.project}, but indexed shard ${entry.shard} does not exist.`)
      continue
    }

    const shard = readJson(entry.shard)
    if (shard.schemaVersion !== 1 || shard.project !== entry.project || normalize(shard.projectRoot) !== entry.projectRoot) {
      fail(`${sourcePath} maps to ${entry.shard}, but the shard identity does not match ${indexPath}.`)
      continue
    }

    const relativePath = sourcePath.slice(entry.projectRoot.length + 1)
    const ownedFiles = Array.isArray(shard.ownedFiles) ? shard.ownedFiles : []
    if (!ownedFiles.some((pattern) => matchesOwnedPattern(pattern, relativePath))) {
      fail(`${sourcePath} is not covered by ownedFiles in indexed shard ${entry.shard}.`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}
NODE

exit 0
