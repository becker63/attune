/// The declared local import action of the DSH integration profile.
///
/// It materializes one native session bundle (a directory holding the manifest,
/// the canonical session log and the native event stream) into a dedicated
/// local integration store through the supported persistence API, then reads it
/// back to prove the history survived and is read-only. It is the actual
/// export/import run, not a test: it prints one JSON summary line so a caller
/// can record the exact identity/digest/event counts it observed.
///
/// Usage: import_bundle.mjs <bundleDir> <storeRoot>
///
/// @module attune.dsh.import-action

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parseManifest, validateBundle } from './bundle.mjs'
import { importBundle, readImported, readLedger } from './importer.mjs'

const [bundleDir, storeRoot] = process.argv.slice(2)
if (bundleDir === undefined || storeRoot === undefined) {
  process.stderr.write('usage: import_bundle.mjs <bundleDir> <storeRoot>\n')
  process.exit(2)
}

const manifestText = readFileSync(join(bundleDir, 'manifest.tsv'), 'utf8')
const contents = new Map()
for (const file of parseManifest(manifestText).files) {
  contents.set(file.path, readFileSync(join(bundleDir, file.path)))
}

// Validate once up front so the refusal is visible without a store write.
const bundle = validateBundle({ manifestText, contents })

const result = await importBundle({ manifestText, contents, storeRoot })
const after = await readImported(storeRoot, result.id)

process.stdout.write(
  JSON.stringify(
    {
      status: result.status,
      sessionId: result.id,
      contentDigest: result.contentDigest,
      task: bundle.identity.task,
      arm: bundle.identity.arm,
      world: bundle.identity.world,
      provider: bundle.identity.provider,
      model: bundle.identity.model,
      effort: bundle.identity.effort,
      declaredEvents: bundle.parsedLog.events.length,
      storedEvents: after.events,
      readAccess: after.access,
      appendRefused: after.appendRefused,
      ledgerRows: readLedger(storeRoot).length,
    },
    null,
    0,
  ) + '\n',
)
