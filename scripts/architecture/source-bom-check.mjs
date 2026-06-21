#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs"
import { dirname, relative } from "node:path"

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))
const fail = (message) => {
  console.error(`Source BOM check failed: ${message}`)
  process.exitCode = 1
}

const indexPath = "attune.source-bom.index.json"
if (!existsSync(indexPath)) {
  fail(`missing root index ${indexPath}`)
  process.exit()
}

const index = readJson(indexPath)
if (index.schemaVersion !== 1 || !Array.isArray(index.shards)) {
  fail("root index must have schemaVersion 1 and a shards array")
  process.exit()
}

const seenProjects = new Set()
const seenRoots = new Set()
for (const [position, entry] of index.shards.entries()) {
  const label = `index shard ${position}`
  if (!entry.project || !entry.projectRoot || !entry.shard) {
    fail(`${label} must declare project, projectRoot, and shard`)
    continue
  }
  if (seenProjects.has(entry.project)) fail(`duplicate project ${entry.project}`)
  if (seenRoots.has(entry.projectRoot)) fail(`duplicate projectRoot ${entry.projectRoot}`)
  seenProjects.add(entry.project)
  seenRoots.add(entry.projectRoot)

  const expectedShard = `${entry.projectRoot}/attune.source-bom.json`
  if (entry.shard !== expectedShard) {
    fail(`${label} shard must be ${expectedShard}, got ${entry.shard}`)
  }
  if (!existsSync(entry.shard)) {
    fail(`${label} points to missing shard ${entry.shard}`)
    continue
  }

  const shard = readJson(entry.shard)
  if (shard.schemaVersion !== 1) fail(`${entry.shard} must use schemaVersion 1`)
  if (shard.project !== entry.project) fail(`${entry.shard} project must match index project ${entry.project}`)
  if (shard.projectRoot !== entry.projectRoot) fail(`${entry.shard} projectRoot must match index projectRoot ${entry.projectRoot}`)
  if (!Array.isArray(shard.ownedFiles) || shard.ownedFiles.length === 0) {
    fail(`${entry.shard} must declare ownedFiles`)
  }
  if (!Array.isArray(shard.generatedOutputs)) {
    fail(`${entry.shard} must declare generatedOutputs array`)
  }
  for (const output of shard.generatedOutputs ?? []) {
    if (!output.generator || !output.target || !Array.isArray(output.sources) || !Array.isArray(output.outputs)) {
      fail(`${entry.shard} generatedOutputs entries must declare generator, target, sources, and outputs`)
    }
  }
  const actualRoot = dirname(entry.shard)
  if (relative(entry.projectRoot, actualRoot) !== "") {
    fail(`${entry.shard} must live directly under projectRoot ${entry.projectRoot}`)
  }
}

if (!process.exitCode) {
  console.log(`Source BOM check passed: ${index.shards.length} shard(s) registered in ${indexPath}.`)
}
