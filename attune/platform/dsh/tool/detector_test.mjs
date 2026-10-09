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
  const kinds = lines.map((line) => line.split('\t')[2])
  // The supported literal subset refuses what it cannot decide, so the real
  // world carries refusals and unresolved outcomes and no fabricated hypothesis.
  assert.ok(kinds.includes('refused'))
  assert.ok(kinds.includes('unresolved'))
  assert.ok(!kinds.includes('hypothesis'))
  const families = new Set(lines.map((line) => line.split('\t')[0]))
  assert.deepEqual([...families].sort(), ['import-publication', 'required-cli-input'])
})

test('the declared visibility of both families is false in both arms', () => {
  const rows = declaredSidecar(DECLARED_DETECTOR_VISIBILITY)
  assert.equal(declaredVisibility(rows, 'import-publication', 'R0_PLAIN'), false)
  assert.equal(declaredVisibility(rows, 'import-publication', 'R1_PACKETS'), false)
  assert.equal(declaredVisibility(rows, 'required-cli-input', 'R0_PLAIN'), false)
  assert.equal(declaredVisibility(rows, 'required-cli-input', 'R1_PACKETS'), false)
  assert.throws(() => declaredVisibility(rows, 'import-publication', 'R2_STOP'))
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
