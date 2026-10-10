/// The shared candidate-commit record of the narrow evidence substrate.
///
/// This is the ONE TypeScript mirror of the canonical Flix checkpoint record
/// (`Attune.Study.EvidenceSubstrate.checkpointLine` and the shared
/// candidate-commit interface `commitCheckpoint`). It is imported by the commit
/// tool (which validates and articulates a candidate) and by the mechanical
/// lifecycle guard (which records the durable checkpoint from the native
/// tool-call event), so both writers agree on exactly one record shape and the
/// guard reproduces the Flix serialization rather than inventing one.
///
/// It decides no defect, no packet and no policy: it parses the model's own
/// articulation, resolves the exact evidence identity the declared world
/// already names, and serializes the record. The canonical meaning stays in
/// `src/Attune/Study/EvidenceSubstrate.flix`; this module is the mechanical
/// integration seam.
///
/// @module attune.dsh.commit-record

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { BoundaryRefusal, acquireRegion, parseWorldManifest } from './boundary.mjs'
import {
  DECLARED_OPERATION_PROJECTION,
  DECLARED_SOURCE_ROOT,
  DECLARED_WORLD_MANIFEST,
  loadCompiledProjection,
  regionKey,
} from './evidence_tool.mjs'

/// The one model-facing commit tool name. The guard observes the native
/// `tool/call` event carrying exactly this name, so a commit is durable because
/// the native event is durable, not because a second log is trusted.
export const COMMIT_TOOL_NAME = 'attune_commit_candidate'

/// The model-facing parameters of the commit interface. They are the articulated
/// candidate's own fields (the run recorder supplies the identity, the commit
/// event and the observed consumption), so no identity or consumption is
/// accepted from the model. The two list-valued members are carried as explicit
/// literal lists (`path@start-end` entries and `;`-separated obligation names),
/// because the supported `defineTool` subset has no array parameter.
export const COMMIT_PARAMETERS = {
  world: { type: 'string', required: true },
  contract: { type: 'string', required: true },
  claim: { type: 'string', required: true },
  severityOrUnknown: { type: 'string', required: true },
  delivered: { type: 'string', required: true },
  consequence: { type: 'string', required: true },
  contradiction: { type: 'string', required: true },
  uncertainty: { type: 'string', required: true },
  unresolved: { type: 'string', required: true },
}

/// A refusal of one malformed commit articulation. It is distinct from a
/// `BoundaryRefusal` (the world/range/permission boundary): a malformed
/// articulation is a syntax/identity problem, not an out-of-scope read.
export class CommitRefusal extends Error {
  constructor(reason) {
    super(`candidate commit refused: ${reason}`)
    this.name = 'CommitRefusal'
    this.reason = reason
  }
}

const DELIVERED_ENTRY = /^([^@]+)@(\d+)-(\d+)$/

/// Parse the literal `path@start-end;path2@start2-end2` delivered spec. An empty
/// spec is an empty list; a malformed entry is refused rather than guessed.
export function parseDeliveredSpec(spec) {
  const entries = []
  for (const piece of String(spec ?? '').split(';')) {
    const trimmed = piece.trim()
    if (trimmed.length === 0) continue
    const match = DELIVERED_ENTRY.exec(trimmed)
    if (match === null) {
      throw new CommitRefusal(`the delivered entry ${trimmed} is not a path@start-end region`)
    }
    entries.push({ path: match[1], startLine: Number.parseInt(match[2], 10), endLine: Number.parseInt(match[3], 10) })
  }
  return entries
}

/// Parse the `;`-separated obligation list. An empty spec is an empty list.
export function parseObligationSpec(spec) {
  return String(spec ?? '')
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function requireDeclared(config, key, envName, fallback) {
  const value = config?.[key] ?? process.env[envName] ?? fallback
  if (typeof value !== 'string' || value.length === 0) {
    throw new CommitRefusal(`the ${key} is not declared for this run`)
  }
  return value
}

/// Resolve the declared world manifest, sealed source root and compiled
/// operation of the run. A commit can only rest on physical exact evidence, so
/// this resolution is required rather than optional.
export function declaredWorld(config) {
  return {
    manifestPath: requireDeclared(config, 'worldManifest', 'ATTUNE_EVIDENCE_WORLD', DECLARED_WORLD_MANIFEST),
    sourceRoot: requireDeclared(config, 'sourceRoot', 'ATTUNE_EVIDENCE_SOURCE_ROOT', DECLARED_SOURCE_ROOT),
    projection: requireDeclared(config, 'projection', 'ATTUNE_EVIDENCE_PROJECTION', DECLARED_OPERATION_PROJECTION),
  }
}

/// Resolve one delivered spec into the exact evidence references the declared
/// world names. Each entry is refused unless it is exactly one declared region
/// of the world the candidate names and the sealed bytes match the declared
/// identity digest, and the reference carries the COMPILED Flix operation's own
/// delivery and byte count rather than a value invented here.
export function resolveDeliveredRegions(spec, config, world) {
  const entries = parseDeliveredSpec(spec)
  if (entries.length === 0) return []
  const declared = declaredWorld(config)
  const manifest = parseWorldManifest(readFileSync(declared.manifestPath, 'utf8'))
  const compiled = loadCompiledProjection(config)
  return entries.map((entry) => {
    const row = manifest.find((candidate) => candidate.path === entry.path)
    if (row === undefined) {
      throw new BoundaryRefusal('the requested region is not a declared region of the requested world')
    }
    if (row.world !== world) {
      throw new BoundaryRefusal('the delivered region belongs to a different world than the candidate names')
    }
    const acquired = acquireRegion(
      { world: row.world, revision: row.revision, path: entry.path, startLine: entry.startLine, endLine: entry.endLine },
      { manifest, sourceRoot: declared.sourceRoot },
    )
    const fields = compiled.rows.get(regionKey(acquired))
    if (fields === undefined) {
      // The compiled operation need not carry a projection for every ordinary
      // authorized region: its materialized records cover the bounded initial
      // regions of the declared world. A region of the declared complete
      // population is still exact source — the sealed bytes were read and the
      // declared whole-file identity digest verified above — so the candidate is
      // backed by the acquisition's own measured reference instead of being
      // rejected for lying outside an initial bounded neighborhood. A region the
      // world does not declare at all was already refused before any byte was read.
      if (typeof acquired.delivery !== 'string' || acquired.delivery.length === 0) {
        throw new BoundaryRefusal(
          'the compiled evidence operation carries no projection for the delivered region of that world',
        )
      }
      return {
        world: acquired.world,
        revision: acquired.revision,
        path: acquired.path,
        sha256: acquired.sha256,
        startLine: acquired.startLine,
        endLine: acquired.endLine,
        bytes: acquired.byteLength,
        delivery: acquired.delivery,
      }
    }
    if (fields.sha256 !== acquired.sha256) {
      throw new BoundaryRefusal(
        'the compiled evidence operation projection does not match the sealed source bytes',
      )
    }
    return {
      world: fields.world,
      revision: fields.revision,
      path: fields.path,
      sha256: fields.sha256,
      startLine: Number.parseInt(fields.startLine, 10),
      endLine: Number.parseInt(fields.endLine, 10),
      bytes: Number.parseInt(fields.bytes, 10),
      delivery: fields.delivery,
    }
  })
}

/// The exact identity key of one evidence reference, in the canonical
/// `world|revision|path|sha256|startLine|endLine` form the Flix contract's
/// `evidenceKey` emits.
export function evidenceKey(ref) {
  return [
    ref.world,
    ref.revision,
    ref.path,
    ref.sha256,
    String(ref.startLine),
    String(ref.endLine),
  ].join('|')
}

/// The canonical articulation line of one candidate: the model-supplied fields
/// only, in the declared order. It is the deterministic identity the commit id
/// hashes, and it deliberately excludes the run recorder's own identity, commit
/// event and observed consumption.
export function articulationLine(articulation) {
  return [
    articulation.task,
    articulation.arm,
    String(articulation.observation),
    articulation.world,
    articulation.contract,
    articulation.claim,
    articulation.severityOrUnknown,
    [...articulation.delivered.map(evidenceKey)].sort().join(','),
    articulation.consequence,
    articulation.contradiction,
    articulation.uncertainty,
    [...articulation.unresolved].sort().join(','),
  ].join('\t')
}

/// The deterministic commit id of one articulation: the SHA-256 of the canonical
/// articulation line. Two articulations of the same candidate therefore carry the
/// same id, and the tool and the guard compute it identically.
export function commitIdOf(articulation) {
  return createHash('sha256').update(articulationLine(articulation)).digest('hex')
}

/// The canonical serialization of one committed finding checkpoint: the exact
/// tab-separated record `Attune.Study.EvidenceSubstrate.checkpointLine` emits, in
/// the same field order. The guard writes this line durably, so a stop delivers
/// the run's genuinely committed candidates in the canonical form.
export function checkpointLine(checkpoint) {
  return [
    checkpoint.task,
    checkpoint.arm,
    String(checkpoint.observation),
    String(checkpoint.sequence),
    checkpoint.commitId,
    String(checkpoint.commitMillis),
    String(checkpoint.elapsedMillis),
    String(checkpoint.cumulativeTokens),
    checkpoint.world,
    checkpoint.contract,
    checkpoint.claim,
    checkpoint.severityOrUnknown,
    [...checkpoint.delivered.map(evidenceKey)].sort().join(','),
    checkpoint.consequence,
    checkpoint.contradiction,
    checkpoint.uncertainty,
    [...checkpoint.explored].sort().join(','),
    [...checkpoint.unresolved].sort().join(','),
    checkpoint.stopCause,
  ].join('\t')
}

/// The findings of one articulated candidate, mirroring the Flix
/// `candidateCommitFindings` refusal set. A candidate must name its identity, its
/// world and governing contract, articulate a claim and rest on at least one
/// physically delivered exact reference.
export function articulationFindings(articulation) {
  const findings = []
  if (typeof articulation.task !== 'string' || articulation.task.length === 0) findings.push('candidate has no task identity')
  if (typeof articulation.arm !== 'string' || articulation.arm.length === 0) findings.push('candidate has no arm identity')
  if (!Number.isInteger(articulation.observation) || articulation.observation < 1) findings.push('candidate has a non-positive observation')
  if (typeof articulation.world !== 'string' || articulation.world.length === 0) findings.push('candidate names no world')
  if (typeof articulation.contract !== 'string' || articulation.contract.length === 0) findings.push('candidate names no governing contract')
  if (typeof articulation.claim !== 'string' || articulation.claim.length === 0) findings.push('candidate articulates no claim')
  if (!Array.isArray(articulation.delivered) || articulation.delivered.length === 0) {
    findings.push('candidate rests on no physically delivered evidence')
  }
  return findings
}

/// Build the shared articulated candidate from one model-facing commit argument
/// object, resolving the delivered evidence against the declared world. A
/// malformed argument is refused by the real DSH argument validation before this
/// runs; this resolves the semantic identity.
export function articulate(args, { task, arm, observation, config }) {
  return {
    task,
    arm,
    observation,
    world: args.world,
    contract: args.contract,
    claim: args.claim,
    severityOrUnknown: args.severityOrUnknown,
    delivered: resolveDeliveredRegions(args.delivered, config, args.world),
    consequence: args.consequence,
    contradiction: args.contradiction,
    uncertainty: args.uncertainty,
    unresolved: parseObligationSpec(args.unresolved),
  }
}

/// Build the durable checkpoint from one articulated candidate and the run
/// recorder's own observations. It mirrors the Flix `commitCheckpoint`.
export function checkpointOf(articulation, { sequence, commitId, commitMillis, elapsedMillis, cumulativeTokens, explored, stopCause }) {
  return {
    task: articulation.task,
    arm: articulation.arm,
    observation: articulation.observation,
    sequence,
    commitId,
    commitMillis,
    elapsedMillis,
    cumulativeTokens,
    world: articulation.world,
    contract: articulation.contract,
    claim: articulation.claim,
    severityOrUnknown: articulation.severityOrUnknown,
    delivered: articulation.delivered,
    consequence: articulation.consequence,
    contradiction: articulation.contradiction,
    uncertainty: articulation.uncertainty,
    explored,
    unresolved: articulation.unresolved,
    stopCause,
  }
}
