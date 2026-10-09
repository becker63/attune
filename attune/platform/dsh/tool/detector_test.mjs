/// The laws of the model-hidden detector sidecar.
///
/// They run over the REAL declared sidecar the pinned compiler's native Tester
/// materialized from `Attune.Study.EvidenceSubstrate` over the ACTUAL admitted
/// ReviewBench source (the declared `evidence_reviewbench_detectors` stage
/// action): the two detector families' outcomes, the honest funnel record and
/// the declared model visibility. That tree is the declared DEFAULT of the
/// common prospective profile, so these laws assert the plugin materializes
/// exactly those declared bytes, that it registers NO model-facing tool, and
/// that the declared visibility of both families is false in BOTH prospective
/// arms. They also assert the existing override hook still selects the earlier
/// synthetic declared fixture tree when a diagnostic asks for it, and that the
/// plugin loads through the REAL pinned `@deepseek-ai/cordis` `Context` (so the
/// load is a real Cordis load, not a shape check) while registering no tool.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.detector-sidecar-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Context } from '@deepseek-ai/cordis'

import * as sidecarModule from './detector_sidecar.mjs'
import {
  DECLARED_DETECTOR_SIDECAR,
  DECLARED_DETECTOR_VISIBILITY,
  apply,
  declaredSidecar,
  declaredVisibility,
} from './detector_sidecar.mjs'

const TMP = process.env.TEST_TMPDIR ?? tmpdir()

/// The earlier synthetic declared fixture tree. It is not the default any more;
/// it is reachable only through the plugin's existing override hook, which the
/// last law exercises.
const SYNTHETIC_DETECTOR_SIDECAR = new URL('../evidence_detector_sidecar/detector-sidecar.tsv', import.meta.url)
const SYNTHETIC_DETECTOR_VISIBILITY = new URL(
  '../evidence_detector_sidecar/detector-visibility.tsv',
  import.meta.url,
)

/// The one declared loader overlay that mounts this sidecar into the common
/// prospective profile. The regression laws below read its DECLARED config, so
/// the arm the declaration supplies is checked against the declared visibility
/// record rather than against a value the test invents.
const DETECTOR_OVERLAY = new URL('./attune-detector.plugin.yml', import.meta.url)

/// The declared `arm` of the overlay's single inserted row. It is a minimal read
/// of the declared overlay's own bytes (the file carries exactly one `arm:` key);
/// nothing about the arm's meaning is restated here.
function declaredOverlayArm(text) {
  for (const line of text.split('\n')) {
    const match = /^\s+arm:\s*(\S+)\s*$/.exec(line)
    if (match) return match[1]
  }
  return ''
}

function workdir(name) {
  const dir = join(TMP, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}

/// A minimal Cordis-shaped context that records every model-facing tool
/// registration the plugin attempts, so the law can assert there are none.
function fakeContext() {
  const registrations = []
  const ctx = {
    tools: { register(tool) { registrations.push(tool) } },
    logger: { debug() {}, warn() {} },
  }
  return { ctx, registrations }
}

test('the declared detector sidecar is the real ReviewBench tree with both families and honest losses', () => {
  const lines = declaredSidecar(DECLARED_DETECTOR_SIDECAR)
  assert.ok(lines.length > 0)
  // The real tree's column layout is family, identity, kind, resultKind, detail.
  const rows = lines.map((line) => line.split('\t'))
  const kinds = rows.map((cells) => cells[2])
  // The supported literal subset refuses what it cannot decide, so the real
  // world carries explicit refusals and honest Unknown outcomes.
  assert.ok(kinds.includes('refused'))
  assert.ok(kinds.includes('unresolved'))
  const families = new Set(rows.map((cells) => cells[0]))
  assert.deepEqual([...families].sort(), ['import-publication', 'required-cli-input'])
  // The correction makes the extraction CONSERVATIVE: a Node core module is not a
  // publication target, and a binding that is not a proven publication target (a
  // local/injected/uninitialized typed binding, or a bare absence from the declared
  // dependencies) is refused rather than hypothesized. The former seven
  // false-positive hypotheses are therefore excluded, and the honest real-world
  // result is a ZERO-hypothesis one — which is NOT a source-clean result and NOT a
  // negative behavioral finding, only the completed output of a bounded subset.
  // Every hypothesis the corrected tree DOES carry must still be source-clean:
  // its identity is the exact declared `world:relative/path#line` source identity
  // of an admitted file and its detail names that same repository-relative path,
  // with nothing branching on a fixture label, a gold line or a repository
  // identity.
  assert.ok(
    rows.some((cells) => cells[2] === 'refused' && /core module/.test(cells[4])),
    'the corrected extraction must refuse a Node core module as a publication target',
  )
  const hypotheses = rows.filter((cells) => cells[2] === 'hypothesis')
  for (const cells of hypotheses) {
    const identity = /^([^:]+):([^#]+)#(\d+)$/.exec(cells[1])
    assert.ok(identity, `a hypothesis carries no exact source identity: ${cells[1]}`)
    assert.ok(!/gold|fixture/i.test(cells[1]), `a hypothesis identity is not source-clean: ${cells[1]}`)
    assert.ok(
      cells[4].includes(identity[2]),
      `a hypothesis detail names no source path: ${cells[4]}`,
    )
  }
})

test('the declared visibility names both families in both prospective arms and the diagnostic arm, all hidden', () => {
  const rows = declaredSidecar(DECLARED_DETECTOR_VISIBILITY)
  assert.equal(rows.length, 6)
  for (const arm of ['R0_PLAIN', 'R1_PACKETS', 'DIAGNOSTIC']) {
    assert.equal(declaredVisibility(rows, 'import-publication', arm), false)
    assert.equal(declaredVisibility(rows, 'required-cli-input', arm), false)
  }
  // An arm the declared record does not name is refused, never guessed.
  assert.throws(() => declaredVisibility(rows, 'import-publication', 'R2_STOP'))
})

test('the declared detector overlay supplies an arm the visibility record names', () => {
  const arm = declaredOverlayArm(readFileSync(DETECTOR_OVERLAY, 'utf8'))
  // The mounted overlay must declare an arm: without one the sidecar refuses the
  // whole load, so the declared smoke/profile configuration would fail to boot.
  assert.notEqual(arm, '')
  const rows = declaredSidecar(DECLARED_DETECTOR_VISIBILITY)
  assert.equal(declaredVisibility(rows, 'import-publication', arm), false)
  assert.equal(declaredVisibility(rows, 'required-cli-input', arm), false)
})

test('the exact declared configuration loads through the REAL pinned Cordis Context', async () => {
  const arm = declaredOverlayArm(readFileSync(DETECTOR_OVERLAY, 'utf8'))
  const dir = workdir('attune-detector-declared-load')
  const sidecar = join(dir, 'sidecar.tsv')
  const record = join(dir, 'visibility.tsv')
  delete process.env.ATTUNE_RUN_ARM
  delete process.env.ATTUNE_GUARD_ARM
  process.env.ATTUNE_DETECTOR_SIDECAR = sidecar
  process.env.ATTUNE_DETECTOR_VISIBILITY = record
  try {
    // The declared row's config is passed to the plugin exactly as the loader
    // would, so this is a real Cordis load of the DECLARED configuration.
    const ctx = new Context()
    await ctx.plugin(sidecarModule, { arm })
    assert.ok(ctx.fiber, 'the root fiber must exist after loading')
    assert.equal(readFileSync(sidecar, 'utf8'), readFileSync(DECLARED_DETECTOR_SIDECAR, 'utf8'))
    assert.deepEqual(readFileSync(record, 'utf8').trim().split('\n'), [
      `import-publication\t${arm}\tfalse`,
      `required-cli-input\t${arm}\tfalse`,
    ])
  } finally {
    delete process.env.ATTUNE_DETECTOR_SIDECAR
    delete process.env.ATTUNE_DETECTOR_VISIBILITY
  }
})

test('an absent or unknown arm refuses rather than guessing one', () => {
  const dir = workdir('attune-detector-unarmed')
  process.env.ATTUNE_DETECTOR_SIDECAR = join(dir, 'sidecar.tsv')
  process.env.ATTUNE_DETECTOR_VISIBILITY = join(dir, 'visibility.tsv')
  delete process.env.ATTUNE_RUN_ARM
  delete process.env.ATTUNE_GUARD_ARM
  try {
    // No arm anywhere: fail closed.
    assert.throws(() => apply(fakeContext().ctx, {}))
    // An arm the declared record does not name: fail closed.
    assert.throws(() => apply(fakeContext().ctx, { arm: 'R2_STOP' }))
  } finally {
    delete process.env.ATTUNE_DETECTOR_SIDECAR
    delete process.env.ATTUNE_DETECTOR_VISIBILITY
  }
})

test('the arm the prospective runner supplies overrides the declared diagnostic default', () => {
  const dir = workdir('attune-detector-runner-arm')
  const record = join(dir, 'visibility.tsv')
  process.env.ATTUNE_DETECTOR_SIDECAR = join(dir, 'sidecar.tsv')
  process.env.ATTUNE_DETECTOR_VISIBILITY = record
  process.env.ATTUNE_RUN_ARM = 'R1_PACKETS'
  try {
    apply(fakeContext().ctx, { arm: 'DIAGNOSTIC' })
  } finally {
    delete process.env.ATTUNE_DETECTOR_SIDECAR
    delete process.env.ATTUNE_DETECTOR_VISIBILITY
    delete process.env.ATTUNE_RUN_ARM
  }
  assert.deepEqual(readFileSync(record, 'utf8').trim().split('\n'), [
    'import-publication\tR1_PACKETS\tfalse',
    'required-cli-input\tR1_PACKETS\tfalse',
  ])
})

test('the sidecar plugin materializes the real declared bytes and registers no tool', () => {
  const dir = workdir('attune-detector-sidecar')
  const sidecar = join(dir, 'sidecar.tsv')
  const record = join(dir, 'visibility.tsv')
  const { ctx, registrations } = fakeContext()
  process.env.ATTUNE_DETECTOR_SIDECAR = sidecar
  process.env.ATTUNE_DETECTOR_VISIBILITY = record
  process.env.ATTUNE_RUN_ARM = 'R1_PACKETS'
  try {
    apply(ctx, {})
  } finally {
    delete process.env.ATTUNE_DETECTOR_SIDECAR
    delete process.env.ATTUNE_DETECTOR_VISIBILITY
    delete process.env.ATTUNE_RUN_ARM
  }
  // No model-facing tool: a detector output is never presented to the model.
  assert.deepEqual(registrations, [])
  // The sidecar is byte-identical to the declared ReviewBench tree the Flix
  // owner materialized, so the run carries the canonical detector meaning.
  assert.equal(readFileSync(sidecar, 'utf8'), readFileSync(DECLARED_DETECTOR_SIDECAR, 'utf8'))
  const visibility = readFileSync(record, 'utf8').trim().split('\n')
  assert.deepEqual(visibility, [
    'import-publication\tR1_PACKETS\tfalse',
    'required-cli-input\tR1_PACKETS\tfalse',
  ])
})

test('the existing override hook still selects the synthetic declared fixture tree', () => {
  const dir = workdir('attune-detector-sidecar-override')
  const sidecar = join(dir, 'sidecar.tsv')
  const { ctx, registrations } = fakeContext()
  process.env.ATTUNE_DETECTOR_SOURCE = fileURLToPath(SYNTHETIC_DETECTOR_SIDECAR)
  process.env.ATTUNE_DETECTOR_VISIBILITY_SOURCE = fileURLToPath(SYNTHETIC_DETECTOR_VISIBILITY)
  process.env.ATTUNE_DETECTOR_SIDECAR = sidecar
  process.env.ATTUNE_RUN_ARM = 'R0_PLAIN'
  try {
    apply(ctx, {})
  } finally {
    delete process.env.ATTUNE_DETECTOR_SOURCE
    delete process.env.ATTUNE_DETECTOR_VISIBILITY_SOURCE
    delete process.env.ATTUNE_DETECTOR_SIDECAR
    delete process.env.ATTUNE_RUN_ARM
  }
  assert.deepEqual(registrations, [])
  assert.equal(readFileSync(sidecar, 'utf8'), readFileSync(SYNTHETIC_DETECTOR_SIDECAR, 'utf8'))
})

test('a run with no declared detector sidecar refuses rather than fabricating one', () => {
  const { ctx } = fakeContext()
  process.env.ATTUNE_DETECTOR_SOURCE = join(TMP, 'attune-detector-sidecar', 'absent.tsv')
  try {
    assert.throws(() => apply(ctx, {}))
  } finally {
    delete process.env.ATTUNE_DETECTOR_SOURCE
  }
})

test('the sidecar plugin loads through the REAL pinned Cordis Context without a tool or a session', async () => {
  const dir = workdir('attune-detector-sidecar-cordis')
  const sidecar = join(dir, 'sidecar.tsv')
  const record = join(dir, 'visibility.tsv')
  process.env.ATTUNE_DETECTOR_SIDECAR = sidecar
  process.env.ATTUNE_DETECTOR_VISIBILITY = record
  process.env.ATTUNE_RUN_ARM = 'R0_PLAIN'
  try {
    // The plugin requires no DSH service at all, so a bare root context is
    // enough: it can neither be handed a session nor register a model tool.
    assert.deepEqual(sidecarModule.inject, [])
    assert.equal(sidecarModule.name, 'attune-detector-sidecar')
    const ctx = new Context()
    await ctx.plugin(sidecarModule)
    assert.ok(ctx.fiber, 'the root fiber must exist after loading')
    // The real load materialized the REAL ReviewBench declared bytes and the
    // declared visibility, and registered no tool on the context.
    assert.equal(readFileSync(sidecar, 'utf8'), readFileSync(DECLARED_DETECTOR_SIDECAR, 'utf8'))
    assert.deepEqual(readFileSync(record, 'utf8').trim().split('\n'), [
      'import-publication\tR0_PLAIN\tfalse',
      'required-cli-input\tR0_PLAIN\tfalse',
    ])
  } finally {
    delete process.env.ATTUNE_DETECTOR_SIDECAR
    delete process.env.ATTUNE_DETECTOR_VISIBILITY
    delete process.env.ATTUNE_RUN_ARM
  }
})
