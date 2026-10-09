/// The one native DSH candidate-commit tool of the narrow evidence substrate.
///
/// This is an ordinary Cordis plugin registering the shared candidate-commit
/// interface as ONE model-facing `defineTool` tool through the real pinned DSH
/// tool registry. It is the operation by which a reviewing model articulates a
/// candidate in EITHER arm:
///
///  - it resolves every delivered region against the declared world through the
///    runtime boundary, so a candidate can only rest on physical exact evidence
///    (a named obligation is never satisfied by model understanding);
///  - it refuses a candidate that names no world, no governing contract or no
///    claim, mirroring the canonical Flix `candidateCommitFindings`;
///  - it returns the deterministic commit id of the articulation. It writes no
///    second log: the native `tool/call` event is the durable commit event, and
///    the mechanical lifecycle guard converts it into the canonical durable
///    checkpoint with the consumption it actually observed.
///
/// It decides no defect and no policy; it validates and articulates.
///
/// @module attune.dsh.commit-tool

import { defineTool } from '@deepseek-ai/dsh-tools'

import { CommitRefusal, COMMIT_PARAMETERS, COMMIT_TOOL_NAME, articulate, articulationFindings, commitIdOf } from './commit_record.mjs'

export const name = 'attune-commit-tool'
export const inject = ['tools']

/// The declared run identity the commit shares with the lifecycle guard. It is
/// read from the same names the guard uses, so one run has one identity.
export function runIdentity(config) {
  const pick = (configKey, envName) => config?.[configKey] ?? process.env[envName] ?? ''
  return {
    task: pick('task', 'ATTUNE_RUN_TASK'),
    arm: pick('arm', 'ATTUNE_RUN_ARM'),
    observation: Number.parseInt(pick('observation', 'ATTUNE_RUN_OBSERVATION') || '1', 10),
  }
}

/// Articulate one candidate: resolve the delivered evidence and validate the
/// articulation. A refused articulation throws rather than returning a
/// candidate the canonical meaning would reject.
export function executeCommit(args, config) {
  const identity = runIdentity(config)
  const articulation = articulate(args, { ...identity, config })
  const findings = articulationFindings(articulation)
  if (findings.length > 0) {
    throw new CommitRefusal(findings.join('; '))
  }
  return { articulation, commitId: commitIdOf(articulation) }
}

/// Register the commit tool on `ctx.tools`.
export function apply(ctx, config) {
  ctx.tools.register(
    defineTool({
      name: COMMIT_TOOL_NAME,
      description:
        'Commit one articulated candidate finding to the durable review checkpoint. ' +
        'Supply the exact delivered evidence as path@start-end entries (semicolon ' +
        'separated); each must be a declared region of the named world, so the ' +
        'candidate rests on physical exact evidence. The run recorder adds the ' +
        'identity, the commit event and the observed usage. Committing does NOT end ' +
        'the review: continue investigating.',
      parameters: COMMIT_PARAMETERS,
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            commitId: { type: 'string', required: true },
            claim: { type: 'string', required: true },
            delivered: { type: 'number', required: true },
          },
        },
        render: (_args, value) => [
          {
            type: 'text',
            text:
              `Committed candidate ${value.commitId} (${value.delivered} delivered region(s)). ` +
              'The review continues; the committed candidate is durably recorded.',
          },
        ],
      },
      execute(args) {
        const { articulation, commitId } = executeCommit(args, config)
        return { commitId, claim: articulation.claim, delivered: articulation.delivered.length }
      },
    }),
  )
}
