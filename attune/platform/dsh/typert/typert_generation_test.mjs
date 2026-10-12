/// The real Typert generation, parity, drift and supported-subset laws of the
/// narrow Attune evidence contract.
///
/// Every law here runs the actual pinned `@deepseek-ai/dsh-typert-generator`
/// 0.2.0-rc.2 analyzer/emitter over the checked-in contract fixture; nothing is
/// mocked, no provider is contacted and no model runs. The laws assert:
///
///  - the versioned wire fixture, the generated declaration and the generated
///    schema factories agree on one canonical exported surface, and the frozen
///    parity fixture is that surface;
///  - generation is deterministic (two runs are byte-identical) and the
///    selected reflection of the package is stable;
///  - an intentional contract change regenerates, and a drifted declaration is
///    detected rather than accepted;
///  - the supported-subset bridge fails closed on unsupported constructs and
///    never widens, deletes or rewrites a constraint;
///  - the generated union meaning is preserved (`z.union` of literals, no
///    `oneOf`), `$ref` references survive as lazy schema references, and no
///    Remote descriptor or DSH tool registration is produced by Typert.
///
/// @module attune.typert.generation-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { WorkspaceAnalyzer, WorkspaceTypertGenerator } from '@deepseek-ai/dsh-typert-generator'
import { BridgeRefusal, canonicalSurface, contractDigest, lowerWireContract } from './bridge.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE = '@attune/evidence-contract'
const CONTRACT = 'attune.evidence-substrate/2'
const WIRE = readFileSync(join(HERE, 'contract.wire.v2.json'), 'utf8')
/// The frozen parity fixture: `#` lines are comments and are not part of the
/// surface.
const FROZEN_SURFACE = canonicalSurface(readFileSync(join(HERE, 'contract-surface.v2.txt'), 'utf8').split('\n').filter((line) => !line.trimStart().startsWith('#')))
const TMP = process.env.TEST_TMPDIR ?? tmpdir()

let scratch = 0

/// Copy the declared fixture into a fresh writable workspace. The declared
/// bytes arrive read-only from the build, so the copy is dereferenced and made
/// writable; the generator writes artifacts beside the fixture, and every law
/// works on its own copy.
function freshWorkspace(label) {
  scratch += 1
  const root = join(TMP, `attune-typert-${label}-${String(scratch)}`)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  copyTree(join(HERE, 'tsconfig.host.json'), join(root, 'tsconfig.host.json'))
  copyTree(join(HERE, 'packages'), join(root, 'packages'))
  return root
}

/// A dereferencing copy: the declared fixture may arrive through the runfiles
/// tree, so every entry is followed to its real bytes and written as an
/// ordinary writable file.
function copyTree(source, target) {
  const info = statSync(source)
  if (info.isDirectory()) {
    mkdirSync(target, { recursive: true })
    for (const entry of readdirSync(source)) copyTree(join(source, entry), join(target, entry))
  } else {
    writeFileSync(target, readFileSync(source))
  }
}

/// The pinned generator over one workspace copy: real discovery, real
/// analysis, real emission.
function generate(root) {
  const generator = new WorkspaceTypertGenerator(root)
  const discovered = generator.discover()
  const artifacts = generator.generate()
  return { discovered, artifacts }
}

/// Write the emitted artifacts where the fixture package's `./typert` export
/// points, exactly as a real build would.
function materialize(root, artifacts) {
  for (const artifact of artifacts) {
    const dir = resolve(root, artifact.packageRoot, 'lib')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `typert.${artifact.face}.js`), artifact.js)
    writeFileSync(join(dir, `typert.${artifact.face}.d.ts`), artifact.dts)
  }
}

/// The selected reflection of the contributor package: every exported
/// declaration the package owns, with its member names.
function reflectedSurface(root) {
  const analyzer = new WorkspaceAnalyzer({ root })
  const model = analyzer.analyze()
  const face = model.faces.find((candidate) => candidate.face === 'host')
  assert.ok(face !== undefined, 'the host face must be analyzed')
  const declarations = face.graph.declarations
    .filter((declaration) => declaration.package === PACKAGE)
    .sort((left, right) => left.name.localeCompare(right.name))
  assert.ok(declarations.length > 0, 'the contract package must own declarations')
  const lines = []
  for (const declaration of declarations) {
    lines.push(declaration.name)
    for (const member of [...declaration.members].sort((left, right) => left.name.localeCompare(right.name))) {
      lines.push(`${declaration.name}.${member.name}`)
    }
  }
  return canonicalSurface(lines)
}

/// Make the generated artifact importable: the emitted code imports `zod`, so
/// the scratch workspace gets the declared link tree's own `zod` package.
function linkZod(root) {
  const nodeModules = join(root, 'node_modules')
  mkdirSync(nodeModules, { recursive: true })
  symlinkSync(new URL('../node_modules/zod', import.meta.url), join(nodeModules, 'zod'), 'dir')
}

function readArtifact(root, face = 'host') {
  return readFileSync(join(root, 'packages/attune-evidence/lib', `typert.${face}.js`), 'utf8')
}

// ------------------------------------------------------------------- parity

test('the wire fixture, the generated declaration and the frozen surface agree', () => {
  const lowered = lowerWireContract(JSON.parse(WIRE))
  assert.deepEqual(canonicalSurface(lowered.surface), FROZEN_SURFACE)
  assert.equal(lowered.contract, CONTRACT)

  const root = freshWorkspace('parity')
  const { discovered, artifacts } = generate(root)
  assert.deepEqual(
    discovered.map((entry) => entry.package),
    [PACKAGE],
    'the real discovery must find exactly the contract package',
  )
  assert.equal(artifacts.length, 1)
  assert.equal(artifacts[0].face, 'host')
  assert.deepEqual([...artifacts[0].exports].sort(), ['EvidenceObservation', 'EvidenceRef'])
  assert.deepEqual(reflectedSurface(root), FROZEN_SURFACE)
  assert.equal(contractDigest(CONTRACT, lowered.surface), contractDigest(CONTRACT, FROZEN_SURFACE))
})

test('generation is deterministic and the emitted artifacts are the declared ones', () => {
  const first = freshWorkspace('det-a')
  const second = freshWorkspace('det-b')
  const a = generate(first).artifacts[0]
  const b = generate(second).artifacts[0]
  assert.equal(a.js, b.js)
  assert.equal(a.dts, b.dts)
  assert.match(a.dts, /export declare const TYPERT: unknown/)
  assert.match(a.js, /Generated by @deepseek-ai\/dsh-typert-generator/)
  assert.deepEqual(reflectedSurface(first), reflectedSurface(second))
})

test('the generated schemas accept the canonical contract documents and preserve the unions', async () => {
  const root = freshWorkspace('schemas')
  const { artifacts } = generate(root)
  materialize(root, artifacts)
  linkZod(root)

  const generated = await import(pathToFileURL(join(root, 'packages/attune-evidence/lib/typert.host.js')).href)
  const reference = {
    world: 'world-1',
    revision: 'rev-1',
    path: 'src/example.ts',
    sha256: '0'.repeat(64),
    startLine: 1,
    endLine: 2,
    bytes: 10,
    delivery: 'complete',
  }
  assert.equal(generated.EvidenceRef().safeParse(reference).success, true)
  assert.equal(generated.EvidenceObservation().safeParse({ outcome: 'NO-MATCH', ref: reference, provenance: 'world-1' }).success, true)
  assert.equal(generated.EvidenceObservation().safeParse({ outcome: 'MAYBE', ref: reference, provenance: 'world-1' }).success, false)
  assert.equal(generated.EvidenceRef().safeParse({ ...reference, delivery: 'maybe' }).success, false)
  const js = readArtifact(root)
  assert.match(js, /z\.union\(\[z\.literal\('WITNESS'\), z\.literal\('NO-MATCH'\), z\.literal\('UNKNOWN'\), z\.literal\('FAILED'\)\]\)/)
  assert.match(js, /z\.lazy\(\(\) => EvidenceRef\$schema\(\)\)/, 'a $ref must survive as a schema reference')
  assert.doesNotMatch(js, /oneOf/, 'a union must never be rewritten as an exclusive oneOf')
  assert.doesNotMatch(js, /z\.object\(\{\s*\}\)/, 'a schema must never be widened to an empty object')
})

test('Typert emits no Remote descriptor and registers no DSH tool', async () => {
  const root = freshWorkspace('registration')
  const { artifacts } = generate(root)
  materialize(root, artifacts)
  linkZod(root)
  assert.equal(artifacts[0].remote, undefined)
  const files = readdirSync(join(root, 'packages/attune-evidence/lib'))
  assert.equal(files.filter((name) => name.startsWith('typert.remote')).length, 0)
  const generated = await import(pathToFileURL(join(root, 'packages/attune-evidence/lib/typert.host.js')).href)
  assert.equal('tools' in generated.TYPERT, false)
  assert.equal(generated.TYPERT.invocations.length, 0)
  assert.equal(generated.TYPERT.package, PACKAGE)
})

// -------------------------------------------------------------------- drift

test('an intentional contract change regenerates and a drifted declaration is detected', () => {
  const root = freshWorkspace('drift')
  assert.deepEqual(reflectedSurface(root), FROZEN_SURFACE)

  const source = join(root, 'packages/attune-evidence/src/index.ts')
  writeFileSync(source, readFileSync(source, 'utf8').replace('readonly provenance: string', 'readonly provenanceDrifted: string'))
  const drifted = reflectedSurface(root)
  assert.notDeepEqual(drifted, FROZEN_SURFACE, 'a drifted declaration must not be accepted as the contract')
  assert.equal(drifted.includes('EvidenceObservation.provenanceDrifted'), true)
  assert.equal(drifted.includes('EvidenceObservation.provenance'), false)
  assert.notEqual(contractDigest(CONTRACT, drifted), contractDigest(CONTRACT, FROZEN_SURFACE))
})

test('an unsupported export target fails closed instead of publishing', () => {
  const root = freshWorkspace('export')
  const manifestPath = join(root, 'packages/attune-evidence/package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.exports['./typert'].default = './lib/typert.host.wrong.js'
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  assert.throws(() => generate(root), /must export \.\/typert as/)
})

// ----------------------------------------------------- supported subset

test('the bridge accepts the supported subset and refuses everything else by name', () => {
  const base = JSON.parse(WIRE)
  const withRefusal = (mutate) => {
    const document = JSON.parse(JSON.stringify(base))
    mutate(document)
    return document
  }

  assert.throws(() => lowerWireContract(withRefusal((d) => { d.$defs.EvidenceRef.properties.path = { oneOf: [{ type: 'string' }] } })), BridgeRefusal)
  assert.throws(() => lowerWireContract(withRefusal((d) => { d.$defs.EvidenceRef.properties.path = { type: 'string', pattern: '^a' } })), /regular-expression constraints/)
  assert.throws(() => lowerWireContract(withRefusal((d) => { delete d.$defs.EvidenceRef.additionalProperties })), /cannot be lowered without widening/)
  assert.throws(() => lowerWireContract(withRefusal((d) => { d.$defs.EvidenceRef.properties.path = { $ref: '#/$defs/Missing' } })), /does not resolve/)
  assert.throws(() => lowerWireContract(withRefusal((d) => { d.$defs.EvidenceRef.required = ['world'] })), /no optional members/)
  assert.throws(() => lowerWireContract(withRefusal((d) => { d.$defs.EvidenceRef.properties.path = { type: ['string', 'number'] } })), /multi-type member/)
  assert.throws(() => lowerWireContract(withRefusal((d) => { d.$defs.EvidenceRef.properties.path = { enum: ['a', 1] } })), /string literals/)
  assert.throws(() => lowerWireContract(withRefusal((d) => { d.$defs.EvidenceRef.extra = {} })), /unsupported keyword/)
  assert.throws(() => lowerWireContract(withRefusal((d) => { d.dialect = 'attune.wire/2' })), /dialect must be exactly/)
  assert.throws(() => lowerWireContract(withRefusal((d) => { d.$defs = {} })), /no surface to lower/)

  // A refusal never degrades into an empty or widened contract.
  let produced
  try {
    produced = lowerWireContract(withRefusal((d) => { d.$defs.EvidenceRef.properties.path = {} }))
  } catch (error) {
    assert.ok(error instanceof BridgeRefusal)
  }
  assert.equal(produced, undefined)
})

test('a recursive reference stays a preserved reference rather than being flattened', () => {
  const document = JSON.parse(WIRE)
  document.$defs.EvidenceRef.properties.path = { $ref: '#/$defs/EvidenceRef' }
  const lowered = lowerWireContract(document)
  const evidenceRef = lowered.defs.find((def) => def.name === 'EvidenceRef')
  assert.equal(evidenceRef.members.find((member) => member.name === 'path').type, 'EvidenceRef')
  assert.deepEqual(canonicalSurface(lowered.surface), FROZEN_SURFACE)
})

test('a preserved union stays a union of its alternatives', () => {
  const document = JSON.parse(WIRE)
  document.$defs.EvidenceRef.properties.delivery = {
    anyOf: [{ enum: ['complete', 'partial'] }, { enum: ['overflow', 'unsupported'] }],
  }
  const lowered = lowerWireContract(document)
  const delivery = lowered.defs.find((def) => def.name === 'EvidenceRef').members.find((member) => member.name === 'delivery')
  // Both alternatives are preserved, in the union, and none is dropped or made
  // exclusive.
  assert.equal(delivery.type, '("complete" | "partial" | "overflow" | "unsupported")')
  assert.deepEqual(canonicalSurface(lowered.surface), FROZEN_SURFACE)
})

test('the contract digest fails closed on an empty surface', () => {
  assert.equal(contractDigest(CONTRACT, ['   ', '']), undefined)
  assert.equal(contractDigest(CONTRACT, ['b', 'a', 'b']), `${CONTRACT}:a\nb`)
})
