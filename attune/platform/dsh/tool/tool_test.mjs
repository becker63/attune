/// The laws of the one native DSH evidence tool.
///
/// These laws run over the REAL declared inputs of the tool: the frozen wire
/// contract, the declared world manifest, the declared sealed source root and
/// the frozen cross-language parity target the Flix operation law also asserts.
/// They register the plugin through a capturing registry and then drive the REAL
/// `defineTool` definition the DSH `@deepseek-ai/dsh-tools` surface produced, so
/// the argument validation, the boundary and the projection are the actual DSH
/// ones rather than a re-implementation.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.dsh.evidence-tool-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { BridgeRefusal } from '../typert/bridge.mjs'
import { acquireRegion, parseWorldManifest } from './boundary.mjs'
import { apply, loadWireContract, PARAMETER_MEMBERS, PROJECTION_FIELDS } from './evidence_tool.mjs'
import { defineToolParametersFromWire } from './tool_schema.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const TMP = process.env.TEST_TMPDIR ?? tmpdir()
const MANIFEST = join(HERE, 'fixtures', 'boundary-world.tsv')
const SEALED_ROOT = join(HERE, 'fixtures')
const EXPECTED_REFERENCE = join(HERE, 'fixtures', 'expected-reference-projection.tsv')
const CONTRACT_PACKAGE = resolve(HERE, '..', 'typert_package_a', 'package')

/// The frozen expected reference projection, parsed into its declared fields.
function expectedReference() {
  const line = readFileSync(EXPECTED_REFERENCE, 'utf8').trim()
  return Object.fromEntries(line.split('\t').map((entry) => entry.split('=')))
}

/// Register the plugin into a capturing registry and return the definition the
/// real DSH `defineTool` produced.
function registeredDefinition(config) {
  let captured
  const ctx = { tools: { register(definition) { captured = definition } } }
  apply(ctx, config)
  assert.ok(captured, 'the plugin must register exactly one tool definition')
  return captured
}

const ALLOWED = { world: 'world-evidence-1', revision: 'rev-1', path: 'source/shop.ts', startLine: 1, endLine: 2 }

// -------------------------------------------------------- schema projection

test('the tool parameters are projected from the frozen generated contract', () => {
  const { contract, parameters } = defineToolParametersFromWire(loadWireContract({}), PARAMETER_MEMBERS)
  assert.equal(contract, 'attune.evidence-substrate/1')
  assert.deepEqual(Object.keys(parameters).sort(), ['endLine', 'path', 'revision', 'startLine', 'world'])
  assert.deepEqual(parameters.world, { type: 'string', required: true })
  assert.deepEqual(parameters.startLine, { type: 'number', required: true })
})

test('the projection bridge refuses an unsupported construct instead of widening it', () => {
  assert.throws(
    () => defineToolParametersFromWire(loadWireContract({}), ['FindingCheckpoint.delivered']),
    (error) => error instanceof BridgeRefusal && /array/.test(error.message),
  )
  assert.throws(
    () => defineToolParametersFromWire(loadWireContract({}), ['EvidenceRef.notAMember']),
    (error) => error instanceof BridgeRefusal && /not a declared contract member/.test(error.message),
  )
  // A union of string literals stays a union (a DSH enum), never a `oneOf`.
  const { parameters } = defineToolParametersFromWire(loadWireContract({}), ['EvidenceRef.delivery'])
  assert.deepEqual(parameters.delivery, {
    type: 'string',
    required: true,
    enum: ['complete', 'overflow', 'partial', 'unsupported'],
  })
})

test('the registered definition carries the compiled DSH parameter schema', () => {
  const definition = registeredDefinition({})
  assert.equal(definition.name, 'attune_evidence_operation')
  assert.equal(definition.parameters.type, 'object')
  assert.deepEqual(definition.parameters.required.sort(), ['endLine', 'path', 'revision', 'startLine', 'world'])
  assert.equal(definition.parameters.properties.world.type, 'string')
})

// --------------------------------------------------------------- the boundary

test('an allowed region is acquired and projected to the frozen parity target', async () => {
  const definition = registeredDefinition({
    worldManifest: MANIFEST,
    sourceRoot: SEALED_ROOT,
    contractPackage: CONTRACT_PACKAGE,
  })
  const value = await definition.execute(ALLOWED, {})
  assert.deepEqual(Object.keys(value), PROJECTION_FIELDS)
  assert.deepEqual(value, expectedReference())
})

test('an out-of-scope region is refused before any sealed source is read', async () => {
  // The sealed root deliberately does not exist: a refusal that still returned
  // source, or that surfaced ENOENT, would prove the read happened first.
  const definition = registeredDefinition({
    worldManifest: MANIFEST,
    sourceRoot: join(TMP, 'attune-tool-absent-sealed-root'),
  })
  await assert.rejects(
    definition.execute({ ...ALLOWED, path: 'source/other.ts' }, {}),
    (error) => error.name === 'BoundaryRefusal' && /not a declared region/.test(error.message),
  )
})

test('a denied permission and an out-of-range request are refused', async () => {
  const denied = join(TMP, 'attune-tool-denied.tsv')
  writeFileSync(denied, readFileSync(MANIFEST, 'utf8').replace('read-only', 'workspace-write'))
  await assert.rejects(
    registeredDefinition({ worldManifest: denied, sourceRoot: SEALED_ROOT }).execute(ALLOWED, {}),
    (error) => error.name === 'BoundaryRefusal' && /permission/.test(error.message),
  )
  await assert.rejects(
    registeredDefinition({ worldManifest: MANIFEST, sourceRoot: SEALED_ROOT }).execute(
      { ...ALLOWED, endLine: 3 },
      {},
    ),
    (error) => error.name === 'BoundaryRefusal' && /outside the declared region/.test(error.message),
  )
})

test('a traversal path and a mismatched digest are refused', () => {
  const manifest = parseWorldManifest(readFileSync(MANIFEST, 'utf8'))
  // A declared region whose path escapes the sealed root is refused by the path
  // resolver before the digest is ever computed or the file is opened.
  const escaping = manifest.map((row) => ({ ...row, path: '../escape.ts' }))
  assert.throws(
    () => acquireRegion({ ...ALLOWED, path: '../escape.ts' }, { manifest: escaping, sourceRoot: SEALED_ROOT }),
    (error) => error.name === 'BoundaryRefusal' && /escapes the declared world root/.test(error.message),
  )
  const tampered = manifest.map((row) => ({ ...row, sha256: '0'.repeat(64) }))
  assert.throws(
    () => acquireRegion(ALLOWED, { manifest: tampered, sourceRoot: SEALED_ROOT }),
    (error) => error.name === 'BoundaryRefusal' && /declared world identity digest/.test(error.message),
  )
})

test('an invalid argument is rejected by the real DSH argument validation', async () => {
  const definition = registeredDefinition({ worldManifest: MANIFEST, sourceRoot: SEALED_ROOT })
  await assert.rejects(definition.execute({ ...ALLOWED, startLine: 'one' }, {}), /INVALID_ARGS|invalid arguments/)
})
