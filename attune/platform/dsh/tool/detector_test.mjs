/// The laws of the model-hidden detector sidecar.
///
/// They run over the REAL declared sidecar the pinned compiler's native Tester
/// materialized from `Attune.Study.EvidenceSubstrate` (the declared
/// `evidence_detectors` stage action): the two detector families' outcomes, the
/// honest funnel record and the declared model visibility. They assert the
/// sidecar plugin materializes exactly those declared bytes, that it registers
/// NO model-facing tool, and that the declared visibility of both families is
/// false in BOTH prospective arms.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.detector-sidecar-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  DECLARED_DETECTOR_SIDECAR,
  DECLARED_DETECTOR_VISIBILITY,
  apply,
  declaredSidecar,
  declaredVisibility,
} from './detector_sidecar.mjs'

const TMP = process.env.TEST_TMPDIR ?? tmpdir()

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

test('the declared detector sidecar carries both families and their honest losses', () => {
  const lines = declaredSidecar(DECLARED_DETECTOR_SIDECAR)
  assert.ok(lines.length > 0)
  const kinds = lines.map((line) => line.split('\t')[3])
  assert.ok(kinds.includes('hypothesis'))
  assert.ok(kinds.includes('refused'))
  assert.ok(kinds.includes('unresolved'))
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

test('the sidecar plugin materializes the declared bytes and registers no tool', () => {
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
  // The sidecar is byte-identical to the declared tree the Flix owner
  // materialized, so the run carries the canonical detector meaning.
  assert.equal(readFileSync(sidecar, 'utf8'), readFileSync(DECLARED_DETECTOR_SIDECAR, 'utf8'))
  const visibility = readFileSync(record, 'utf8').trim().split('\n')
  assert.deepEqual(visibility, [
    'import-publication\tR1_PACKETS\tfalse',
    'required-cli-input\tR1_PACKETS\tfalse',
  ])
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
