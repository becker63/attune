/// The laws of the declared REVIEWER-profile binding of the gated pilot.
///
/// The earlier live dispatch proved the binding false in practice: the composed
/// profile exposed broad native filesystem, shell, subagent, collaboration, web
/// and workflow tools BESIDE the authored operations, so the reviewer could read
/// the packet / evaluator / hidden-detector files directly. These laws are the
/// offline half of the fix: they pin the DECLARED overlays the pilot composes, so
/// a later edit that re-enables a broad surface fails here.
///
/// The runtime half is separate and is not a `--dump-config` declaration: the
/// provider-free catalog proof composes the real profile through the real loader
/// and reads the ACTUAL registered model-facing tool names
/// (`library/dsh-gate-evidence/verify-binding-provider-free.sh`, which asserts the
/// R0 catalog is exactly the two shared operations and the R1 catalog is exactly
/// those two plus the R1-only packet operation).
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.binding-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

/// The ids of the broad native surfaces the reviewer profile must disable. Every
/// one is a declared row id of the shipped composition, and every one appeared in
/// the ACTUAL model-facing catalog of a defective attempt (directly or through the
/// tool it registers).
const DISABLED_ROWS = [
  'tool-bash',
  'tool-pwsh',
  'tool-fs',
  'tool-fs-search',
  'tool-subagent',
  'tool-subagent-fork',
  'tool-subagent-control',
  'tool-subagent-list-agents',
  'subagent',
  'subagent-spawn-in-process',
  'subagent-fork-in-process',
  'tool-workflow',
  'workflow-ptc',
  'tool-web',
  'web',
  'web-search-deepseek',
  'web-fetch-http',
  'tool-skill',
  'tool-todo',
  'tool-goal',
  'tool-ralph',
  'tool-jobs',
  'plan-mode',
]

/// The declared id a patch row addresses and whether it disables it.
function disabledRow(line) {
  const match = /^-\s+id:\s*(\S+)\s*$/.exec(line)
  return match === null ? null : match[1]
}

function overlayRows(name) {
  const text = readFileSync(join(HERE, name), 'utf8')
  const rows = []
  for (const line of text.split('\n')) {
    const id = disabledRow(line)
    if (id !== null) rows.push(id)
  }
  return { text, rows }
}

test('the reviewer profile disables exactly the declared broad native rows', () => {
  const { rows } = overlayRows('attune-reviewer.plugin.yml')
  assert.deepEqual(rows, DISABLED_ROWS)
  assert.match(readFileSync(join(HERE, 'attune-reviewer.plugin.yml'), 'utf8'),
    /^\s+disabled: true$/m)
})

test('every disabled reviewer row is a declared disable and nothing is inserted', () => {
  const text = readFileSync(join(HERE, 'attune-reviewer.plugin.yml'), 'utf8')
  const disables = text.split('\n').filter((line) => line.trim() === 'disabled: true')
  assert.equal(disables.length, DISABLED_ROWS.length)
  assert.doesNotMatch(text, /^\s*insert:/m, 'the reviewer overlay inserts no row')
})

test('the pilot commit overlay mounts the commit tool alone', () => {
  const text = readFileSync(join(HERE, 'attune-commit.plugin.yml'), 'utf8')
  const inserts = text.split('\n').filter((line) => /^\s+name:\s*\.\//.test(line))
  assert.deepEqual(inserts.map((line) => line.trim()), ['name: ./commit_tool.mjs'])
  assert.doesNotMatch(text, /evidence_tool\.mjs/,
    'the fixture evidence operation is not mounted in a pilot observation')
})

test('the pre-fix combined overlay really mounted the fixture evidence operation', () => {
  // The declaration the six defective attempts composed with. It is kept as the
  // record of what the live runs actually mounted, so the defect is stated by the
  // retained bytes rather than by memory.
  const text = readFileSync(join(HERE, 'attune-tool.plugin.yml'), 'utf8')
  assert.match(text, /evidence_tool\.mjs/)
  assert.match(text, /commit_tool\.mjs/)
})
