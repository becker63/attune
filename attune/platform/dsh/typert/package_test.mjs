/// The declared laws of the installable narrow evidence contract package.
///
/// These laws run over the ACTUAL declared build outputs of two independent
/// `typert_package` actions. They assert:
///
///  - the two builds of the same declared inputs are byte-identical, so the
///    generation is deterministic and cacheable;
///  - the assembled package carries the required installable metadata: the
///    `dsh.bundle` patch, its exports, its declared files, its Cordis peer
///    dependency and the bundle patch itself;
///  - the generated transport declaration, the generated contract identity and
///    the emitted canonical surface/digest agree with the frozen parity fixture;
///  - the built package LOADS through the real `@deepseek-ai/cordis` `Context`
///    as an ordinary plugin and registers no DSH tool;
///  - the generated package typechecks under the pinned `typescript` compiler.
///
/// Nothing here contacts a provider, runs a model or fetches a package.
///
/// @module attune.typert.package-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'

import { Context } from '@deepseek-ai/cordis'
import ts from 'typescript'

const HERE = dirname(fileURLToPath(import.meta.url))
const A = resolve(HERE, '..', 'typert_package_a')
const B = resolve(HERE, '..', 'typert_package_b')
const TMP = process.env.TEST_TMPDIR ?? tmpdir()
const CONTRACT = 'attune.evidence-substrate/2'
const FROZEN_SURFACE = readFileSync(join(HERE, 'contract-surface.v2.txt'), 'utf8')
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('#'))
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .sort()

/// The relative file listing of one declared package tree.
function listing(root) {
  const entries = []
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else entries.push(relative(root, path))
    }
  }
  walk(root)
  return entries
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/// Materialize a declared package tree into a writable scratch directory with a
/// linked `zod`, exactly as an installed package would resolve its dependency.
function materialize(source, label) {
  const root = join(TMP, `attune-package-${label}`)
  rmSync(root, { recursive: true, force: true })
  mkdirSync(root, { recursive: true })
  const walk = (dir, target) => {
    mkdirSync(target, { recursive: true })
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path, join(target, name))
      else writeFileSync(join(target, name), readFileSync(path))
    }
  }
  walk(source, root)
  const nodeModules = join(root, 'node_modules')
  mkdirSync(nodeModules, { recursive: true })
  symlinkSync(new URL('../node_modules/zod', import.meta.url), join(nodeModules, 'zod'), 'dir')
  // The package's own name resolves to itself, exactly as an installed package's
  // self-reference does, so the generated declaration's reference to
  // `@attune/evidence-contract` resolves to this package's root types.
  mkdirSync(join(nodeModules, '@attune'), { recursive: true })
  symlinkSync(root, join(nodeModules, '@attune', 'evidence-contract'), 'dir')
  return root
}

// --------------------------------------------------------------- determinism

test('two declared builds of the same inputs are byte-identical', () => {
  const left = listing(A)
  const right = listing(B)
  assert.deepEqual(left, right, 'the declared package trees must hold the same files')
  assert.ok(left.includes(join('package', 'package.json')), 'the manifest must be emitted')
  assert.ok(left.includes(join('package', 'lib', 'typert.host.js')), 'the generated declaration must be emitted')
  assert.ok(left.includes(join('package', 'cordis.patch.yml')), 'the bundle patch must be emitted')
  for (const file of left) {
    assert.equal(
      readFileSync(join(A, file)).equals(readFileSync(join(B, file))),
      true,
      `${file} must be byte-identical across builds`,
    )
  }
})

// ------------------------------------------------------- installable metadata

test('the package carries the required installable Cordis metadata', () => {
  const manifest = readJson(join(A, 'package', 'package.json'))
  assert.equal(manifest.name, '@attune/evidence-contract')
  assert.equal(manifest.type, 'module')
  assert.deepEqual(manifest.dsh, { bundle: { patch: './cordis.patch.yml' } }, 'the dsh.bundle patch must be declared')
  assert.equal(manifest.exports['./typert'].default, './lib/typert.host.js')
  assert.equal(manifest.exports['.'].types, './lib/types/index.d.ts')
  assert.equal(manifest.exports['./cordis'].default, './lib/index.js')
  assert.equal(manifest.exports['./cordis.patch.yml'], './cordis.patch.yml')
  assert.equal(manifest.peerDependencies['@deepseek-ai/cordis'], '~4.0.4')
  assert.ok(manifest.files.includes('lib/typert.host.js'))
  assert.ok(manifest.files.includes('lib/types/index.d.ts'))
  assert.ok(manifest.files.includes('cordis.patch.yml'))
  const patch = readFileSync(join(A, 'package', 'cordis.patch.yml'), 'utf8')
  assert.match(patch, /name: '@attune\/evidence-contract\/cordis'/, 'the bundle patch must insert the package plugin')
  // The emitted package declares no DSH tool and no Remote descriptor: the
  // contract is a transport declaration, not a model-facing affordance.
  assert.equal(readdirSync(join(A, 'package', 'lib')).some((name) => name.startsWith('typert.remote')), false)
})

test('the emitted surface, digest and reflection agree with the frozen parity fixture', () => {
  const surface = readFileSync(join(A, 'surface.txt'), 'utf8')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  assert.deepEqual(surface, FROZEN_SURFACE, 'the emitted canonical surface must equal the frozen parity fixture')
  const digest = readFileSync(join(A, 'digest.txt'), 'utf8').trim()
  assert.equal(digest, `${CONTRACT}:${FROZEN_SURFACE.join('\n')}`)
  const reflection = readJson(join(A, 'reflection.json'))
  assert.equal(reflection.contract, CONTRACT)
  assert.deepEqual(reflection.surface, FROZEN_SURFACE)
})

// ------------------------------------------------------------ Cordis load

test('the built package loads through the real Cordis Context', async () => {
  const root = materialize(join(A, 'package'), 'load')
  const module = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
  assert.equal(module.name, '@attune/evidence-contract')
  assert.equal(module.identity.contract, CONTRACT)
  assert.equal(module.identity.digest, `${CONTRACT}:${FROZEN_SURFACE.join('\n')}`)

  // A real Cordis load: the actual pinned `@deepseek-ai/cordis` root context
  // applies the plugin, and awaiting the fiber settles once loading finished.
  const ctx = new Context()
  await ctx.plugin(module)
  assert.ok(ctx.fiber, 'the root fiber must exist after loading')

  // The generated factories validate canonical documents and refuse an
  // out-of-vocabulary literal — the union meaning is preserved.
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
  assert.equal(module.factories.EvidenceRef().safeParse(reference).success, true)
  assert.equal(module.factories.EvidenceRef().safeParse({ ...reference, delivery: 'maybe' }).success, false)
  assert.equal(module.factories.EvidenceObservation().safeParse({ outcome: 'UNKNOWN', ref: reference, provenance: 'fixture' }).success, true)
  assert.equal(module.factories.EvidenceObservation().safeParse({ outcome: 'MAYBE', ref: reference, provenance: 'fixture' }).success, false)
  ctx.fiber.dispose()
})

// ------------------------------------------------------------- typecheck

test('the generated package typechecks under the pinned TypeScript compiler', () => {
  const root = materialize(join(A, 'package'), 'typecheck')
  const options = {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: false,
    types: [],
    baseUrl: root,
  }
  const program = ts.createProgram(
    [join(root, 'lib', 'types', 'index.d.ts'), join(root, 'lib', 'index.d.ts')],
    options,
  )
  const diagnostics = ts.getPreEmitDiagnostics(program).filter((diagnostic) => {
    // Only diagnostics that name a declared package file are this package's
    // responsibility; an unrelated ambient library diagnostic is not.
    return diagnostic.file !== undefined && diagnostic.file.fileName.startsWith(root)
  })
  const rendered = diagnostics.map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n') + ` (${diagnostic.file.fileName})`,
  )
  assert.deepEqual(rendered, [], 'the generated package must typecheck')
})
