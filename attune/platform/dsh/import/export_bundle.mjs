/// The declared export action of the DSH integration profile.
///
/// It produces one immutable native session bundle from a REAL declared session
/// tree (a native `session.jsonl` plus the native `--json` `events.jsonl`) and a
/// declared run identity, computing every file digest and byte count from the
/// actual bytes. It is the actual export run, not a test: it prints one JSON
/// summary line so a caller can record the exact identity/digest/byte counts it
/// produced.
///
/// Usage: export_bundle.mjs <sessionDir> <identityFile> <outputDir>
///
/// The identity file is a TSV of `key<TAB>value` pairs. A key the run did not
/// observe is declared as the literal `Unavailable` and is carried through
/// verbatim; the exporter never fabricates an identity it was not given.
///
/// @module attune.dsh.export-action

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { exportBundle } from './exporter.mjs'

const [sessionDir, identityFile, outputDir] = process.argv.slice(2)
if (sessionDir === undefined || identityFile === undefined || outputDir === undefined) {
  process.stderr.write('usage: export_bundle.mjs <sessionDir> <identityFile> <outputDir>\n')
  process.exit(2)
}

const identity = {}
if (existsSync(identityFile)) {
  for (const line of readFileSync(identityFile, 'utf8').split('\n')) {
    if (line.trim().length === 0) continue
    const cells = line.split('\t')
    if (cells.length < 2) continue
    identity[cells[0]] = cells.slice(1).join('\t')
  }
}

const bundled = exportBundle({ sessionDir, identity, outputDir })

process.stdout.write(
  JSON.stringify(
    {
      status: 'exported',
      sessionId: bundled.sessionId,
      contentDigest: bundled.contentDigest,
      protocol: bundled.identity.protocol,
      exporter: bundled.identity.exporter,
      harness: bundled.identity.harness,
      provider: bundled.identity.provider,
      model: bundled.identity.model,
      effort: bundled.identity.effort,
      world: bundled.identity.world,
      task: bundled.identity.task,
      arm: bundled.identity.arm,
      buildbuddy: bundled.identity.buildbuddy,
      createdAt: bundled.identity.createdAt,
      exportedAt: bundled.identity.exportedAt,
      manifest: join(outputDir, 'manifest.tsv'),
      files: bundled.files,
    },
    null,
    0,
  ) + '\n',
)
