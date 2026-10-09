/// The declared local import action of the partial historical Codex trace.
///
/// It builds the ONE bounded partial historical bundle from a declared record
/// derived from the preserved historical `codex-app-server` trace and imports it
/// into a store root through the SAME supported session-persistence API the
/// native bundle path uses, then prints one JSON summary line. The stored session
/// is read-only and cannot resume model execution. It is `manual`, so the
/// ordinary gate never writes a store.
///
/// Usage: historical_import <fixture.tsv> <storeRoot>
///
/// @module attune.dsh.historical-import

import { importBundle, readImported } from './importer.mjs'
import { buildHistoricalBundle } from './historical_trace.mjs'

const [fixturePath, storeRoot] = process.argv.slice(2)
if (fixturePath === undefined || storeRoot === undefined) {
  process.stderr.write('usage: historical_import <fixture.tsv> <storeRoot>\n')
  process.exit(2)
}

const bundle = buildHistoricalBundle({ fixturePath })
const result = await importBundle({ manifestText: bundle.manifestText, contents: bundle.contents, storeRoot })
const after = await readImported(storeRoot, result.id)
process.stdout.write(JSON.stringify({
  status: result.status,
  sessionId: result.id,
  contentDigest: result.contentDigest,
  harness: 'codex-app-server',
  partial: true,
  readOnly: true,
  resumable: false,
  declaredEvents: result.events,
  storedEvents: after.events,
  readAccess: after.access,
  appendRefused: after.appendRefused,
}) + '\n')
