/// The one native DSH tool of the narrow evidence substrate.
///
/// This is an ordinary Cordis plugin registering ONE model-facing tool through
/// the real DSH `defineTool`/tool-registry surface. It is the smallest genuine
/// path between the generated evidence contract and a DSH execution:
///
///  - its parameter spec is projected from the generated wire contract by the
///    tiny supported-subset bridge (`tool_schema.mjs`), so an unsupported
///    constraint is refused rather than widened;
///  - its body enforces the runtime world/range/permission boundary
///    (`boundary.mjs`) BEFORE any sealed source byte is read;
///  - the projection it returns is the COMPILED Flix operation's own
///    materialized record, served from the declared `evidence_operation` stage
///    tree (`reference-projections.tsv`), and validated against the generated
///    contract factories.
///
/// The tool therefore computes NO projection field and classifies no delivery:
/// world, revision, path, digest, range, byte count and delivery all come from
/// the canonical `Attune.Study.EvidenceOperation` meaning the pinned compiler
/// actually ran, and this module only verifies that the served record is the
/// requested region and that the sealed bytes match the declared identity
/// digest. Typert does not register this tool and this plugin does not consume
/// the Typert declaration as a tool schema; the two schema systems stay distinct
/// and the bridge is the only lowering step between them. The tool acquires
/// evidence; it decides no defect and no policy.
///
/// @module attune.dsh.evidence-tool

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { defineTool } from '@deepseek-ai/dsh-tools'

import { BoundaryRefusal, acquireRegion, parseWorldManifest } from './boundary.mjs'
import { defineToolParametersFromWire } from './tool_schema.mjs'

/// The declared fixture world of the tool, resolved beside the plugin module.
/// A run may override the world manifest, the sealed source root and the wire
/// contract through its declared config or environment; when it does not, the
/// declared fixtures that ship with the plugin are the world it reads.
export const DECLARED_WORLD_MANIFEST = fileURLToPath(
  new URL('./fixtures/boundary-world.tsv', import.meta.url),
)
export const DECLARED_SOURCE_ROOT = fileURLToPath(new URL('./fixtures/', import.meta.url))

/// The declared generated contract package of the narrow evidence substrate,
/// resolved beside the plugin module. Every acquisition is validated against
/// these generated factories, so the tool can never emit a reference document
/// the generated contract would reject.
export const DECLARED_CONTRACT_PACKAGE = fileURLToPath(
  new URL('../typert_package_a/package', import.meta.url),
)

/// The declared COMPILED evidence operation of the narrow evidence substrate:
/// the tree the `//platform/dsh:evidence_operation_projection` stage action
/// materialized from the canonical Flix operation. The tool serves these
/// records, so the live tool path returns the compiled operation's output
/// rather than a TypeScript re-derivation of it. A run may override the
/// location through its declared config or the `ATTUNE_EVIDENCE_PROJECTION`
/// environment variable.
export const DECLARED_OPERATION_PROJECTION = fileURLToPath(
  new URL('../evidence_operation_projection/reference-projections.tsv', import.meta.url),
)

/// The frozen versioned wire contract of the narrow evidence substrate. It is a
/// declared input of every action that loads this plugin. The location is
/// resolved at load time, never assumed: an explicit `contractWire` config value
/// or the `ATTUNE_EVIDENCE_WIRE` environment variable wins, and the plugin's own
/// sibling `typert/` directory is the fallback the offline law uses.
export function loadWireContract(config) {
  const explicit = config?.contractWire ?? process.env.ATTUNE_EVIDENCE_WIRE
  const source =
    typeof explicit === 'string' && explicit.length > 0
      ? explicit
      : new URL('../typert/contract.wire.v1.json', import.meta.url)
  return JSON.parse(readFileSync(source, 'utf8'))
}

/// The model-facing parameters are a NAMED SUBSET of the generated contract: the
/// exact region identity a bounded acquisition reads. The tool computes the
/// digest and the completeness itself, so the model never supplies either.
export const PARAMETER_MEMBERS = [
  'EvidenceRef.world',
  'EvidenceRef.revision',
  'EvidenceRef.path',
  'EvidenceRef.startLine',
  'EvidenceRef.endLine',
]

/// The eight canonical reference-projection fields, in the order the Flix
/// operation emits them. The projection is the compiled operation's record,
/// never authored separately here.
export const PROJECTION_FIELDS = [
  'world',
  'revision',
  'path',
  'sha256',
  'startLine',
  'endLine',
  'bytes',
  'delivery',
]

export const name = 'attune-evidence-tool'
export const inject = ['tools']

function requireDeclared(config, key, envName, fallback) {
  const value = config?.[key] ?? process.env[envName] ?? fallback
  if (typeof value !== 'string' || value.length === 0) {
    throw new BoundaryRefusal(`the ${key} is not declared for this run`)
  }
  return value
}

/// The exact identity key of one acquired region, in the canonical
/// `world|revision|path|sha256|startLine|endLine` form the Flix contract's
/// `evidenceKey` emits. The tool looks a request up by this key; it never
/// fabricates a key for a region the compiled operation did not materialize.
export function regionKey(acquired) {
  return [
    acquired.world,
    acquired.revision,
    acquired.path,
    acquired.sha256,
    String(acquired.startLine),
    String(acquired.endLine),
  ].join('|')
}

/// Load the compiled Flix operation's materialized records: one canonical
/// projection per declared region, keyed by the exact evidence identity. An
/// absent or unreadable file fails closed rather than falling back to a
/// TypeScript re-derivation of the projection.
export function loadCompiledProjection(config) {
  const path = requireDeclared(
    config,
    'projection',
    'ATTUNE_EVIDENCE_PROJECTION',
    DECLARED_OPERATION_PROJECTION,
  )
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch (cause) {
    throw new BoundaryRefusal(
      `the compiled evidence operation is not present at ${path}: ${cause.code ?? cause.message}`,
    )
  }
  const rows = new Map()
  for (const line of text.split('\n')) {
    if (line.trim().length === 0) continue
    const separator = line.indexOf('\t')
    if (separator < 0) {
      throw new BoundaryRefusal('the compiled evidence operation carries a malformed record')
    }
    const key = line.slice(0, separator)
    const fields = Object.fromEntries(
      line
        .slice(separator + 1)
        .split('\t')
        .map((entry) => {
          const equals = entry.indexOf('=')
          return [entry.slice(0, equals), entry.slice(equals + 1)]
        }),
    )
    if (!sameFieldSet(Object.keys(fields), PROJECTION_FIELDS)) {
      throw new BoundaryRefusal(
        'the compiled evidence operation does not carry the declared projection field set',
      )
    }
    rows.set(key, fields)
  }
  return { path, rows }
}

function sameFieldSet(candidate, declared) {
  return candidate.length === declared.length && declared.every((field) => candidate.includes(field))
}

/// Validate the served reference document against the generated contract
/// factories of the declared package, so the tool can never emit a document the
/// generated contract would reject.
async function validateAgainstGeneratedContract(fields, packageRoot) {
  const module = await import(pathToFileURL(join(packageRoot, 'lib', 'typert.host.js')).href)
  if (typeof module.EvidenceRef !== 'function') {
    throw new BoundaryRefusal('the declared generated contract does not expose the EvidenceRef factory')
  }
  const document = {
    world: fields.world,
    revision: fields.revision,
    path: fields.path,
    sha256: fields.sha256,
    startLine: Number.parseInt(fields.startLine, 10),
    endLine: Number.parseInt(fields.endLine, 10),
    bytes: Number.parseInt(fields.bytes, 10),
    delivery: fields.delivery,
  }
  const result = module.EvidenceRef().safeParse(document)
  if (!result.success) {
    throw new BoundaryRefusal('the acquired reference is not a valid generated-contract document')
  }
}

/// Acquire one exact declared region and return the compiled operation's
/// canonical projection of it.
export async function executeEvidenceOperation(args, config) {
  const manifestPath = requireDeclared(
    config,
    'worldManifest',
    'ATTUNE_EVIDENCE_WORLD',
    DECLARED_WORLD_MANIFEST,
  )
  const sourceRoot = requireDeclared(
    config,
    'sourceRoot',
    'ATTUNE_EVIDENCE_SOURCE_ROOT',
    DECLARED_SOURCE_ROOT,
  )
  const manifest = parseWorldManifest(readFileSync(manifestPath, 'utf8'))
  // The mechanical boundary: scope, range, permission and traversal are all
  // refused here, and the sealed bytes are read and digest-verified only after
  // every refusal.
  const acquired = acquireRegion(args, { manifest, sourceRoot })
  // The semantic half is the compiled Flix operation's own record. The tool
  // serves it verbatim; it classifies no delivery and orders no field itself.
  const compiled = loadCompiledProjection(config)
  const fields = compiled.rows.get(regionKey(acquired))
  if (fields === undefined) {
    // A declared region of the complete authorized population that the compiled
    // operation's bounded materialization does not cover is still exact source:
    // the sealed bytes were read and the declared whole-file identity digest
    // verified before this point, so the acquisition's own measured reference is
    // served rather than refused. A region the world does not declare was already
    // refused before any byte was read.
    if (typeof acquired.delivery !== 'string' || acquired.delivery.length === 0) {
      throw new BoundaryRefusal(
        'the compiled evidence operation carries no projection for the requested region of that world',
      )
    }
    return {
      world: acquired.world,
      revision: acquired.revision,
      path: acquired.path,
      sha256: acquired.sha256,
      startLine: String(acquired.startLine),
      endLine: String(acquired.endLine),
      bytes: String(acquired.byteLength),
      delivery: acquired.delivery,
    }
  }
  if (fields.sha256 !== acquired.sha256) {
    throw new BoundaryRefusal(
      'the compiled evidence operation projection does not match the sealed source bytes',
    )
  }
  const packageRoot =
    config?.contractPackage ?? process.env.ATTUNE_EVIDENCE_CONTRACT ?? DECLARED_CONTRACT_PACKAGE
  if (typeof packageRoot === 'string' && packageRoot.length > 0) {
    await validateAgainstGeneratedContract(fields, packageRoot)
  }
  // The returned record is the compiled operation's canonical projection, in
  // the declared field order, as the strings the Flix projection emits.
  return Object.fromEntries(PROJECTION_FIELDS.map((field) => [field, fields[field]]))
}

/// Register the tool on `ctx.tools`. The parameter spec is projected from the
/// generated contract at apply time, so a drifted or unsupported contract fails
/// the load instead of registering a widened tool.
export function apply(ctx, config) {
  const { contract, parameters } = defineToolParametersFromWire(loadWireContract(config), PARAMETER_MEMBERS)
  ctx.tools.register(
    defineTool({
      name: 'attune_evidence_operation',
      description:
        'Acquire the exact declared source region of one evidence world. ' +
        'Returns the canonical evidence reference (world, revision, path, digest, ' +
        'range, byte count and delivery). It reads only a region the declared world ' +
        'names, and refuses an out-of-scope or denied request before reading source.',
      parameters,
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: Object.fromEntries(
            PROJECTION_FIELDS.map((field) => [field, { type: 'string', required: true }]),
          ),
        },
        render: (_args, value) => [
          {
            type: 'text',
            text:
              `Acquired ${value.delivery} evidence ${value.path}@${value.revision} ` +
              `lines ${value.startLine}-${value.endLine} (${value.bytes} bytes).\n` +
              `world: ${value.world}\nsha256: ${value.sha256}\ndelivery: ${value.delivery}`,
          },
        ],
      },
      execute(args) {
        return executeEvidenceOperation(args, config)
      },
    }),
  )
  return contract
}
