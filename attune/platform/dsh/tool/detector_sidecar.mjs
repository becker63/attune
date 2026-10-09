/// The declared detector sidecar of the narrow evidence substrate.
///
/// This is an ordinary Cordis plugin that materializes the two detector
/// families' declared outputs as a MODEL-HIDDEN sidecar of one run. It exists so
/// an actual DSH run carries the detector sidecar without ever presenting it:
///
///  - it READS the declared `detector-sidecar.tsv` tree the pinned compiler's
///    native Tester materialized from `Attune.Study.EvidenceSubstrate` (the
///    declared `evidence_detectors` stage action). It computes no detector result
///    here and restates no rule;
///  - it writes that sidecar to the declared sidecar path and records the
///    declared model visibility of each family in this run's arm;
///  - it registers NO model-facing tool and writes NOTHING to the session, so a
///    detector output is never part of the model-visible stream in either arm.
///
/// The detectors are therefore sidecars of BOTH prospective arms, never the
/// definition of one: R0 is never family A and R1 is never family B.
///
/// @module attune.dsh.detector-sidecar

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/// The declared detector sidecar tree of the narrow evidence substrate: the
/// `//platform/dsh:evidence_detector_sidecar` stage action materialized it from
/// the canonical Flix detector meaning. A run may override the location through
/// its declared config or the `ATTUNE_DETECTOR_SOURCE` environment variable.
export const DECLARED_DETECTOR_SIDECAR = fileURLToPath(
  new URL('../evidence_detector_sidecar/detector-sidecar.tsv', import.meta.url),
)

/// The declared model-visibility record of the same stage action: the canonical
/// visibility of each family in each prospective arm, which is false in both.
export const DECLARED_DETECTOR_VISIBILITY = fileURLToPath(
  new URL('../evidence_detector_sidecar/detector-visibility.tsv', import.meta.url),
)

export const name = 'attune-detector-sidecar'
export const inject = []

/// The declared sidecar lines of the run, in declared order. An absent tree
/// fails the run rather than fabricating an empty sidecar.
export function declaredSidecar(path) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim().length > 0)
}

/// The declared model visibility of one family in one arm, from the canonical
/// visibility record. An absent row is refused rather than guessed.
export function declaredVisibility(rows, family, arm) {
  for (const line of rows) {
    const cells = line.split('\t')
    if (cells[0] === family && cells[1] === arm) return cells[2] === 'true'
  }
  throw new Error(`the declared detector visibility record names no ${family} in ${arm}`)
}

/// Register the detector sidecar on the composed profile. It never registers a
/// tool and never touches the session, so nothing it materializes is visible to
/// the model.
export function apply(ctx, config) {
  const source = config?.source ?? process.env.ATTUNE_DETECTOR_SOURCE ?? DECLARED_DETECTOR_SIDECAR
  const visibilitySource =
    config?.visibility ?? process.env.ATTUNE_DETECTOR_VISIBILITY_SOURCE ?? DECLARED_DETECTOR_VISIBILITY
  const sidecarPath = process.env.ATTUNE_DETECTOR_SIDECAR ?? config?.sidecar
  const recordPath = process.env.ATTUNE_DETECTOR_VISIBILITY ?? config?.record
  const arm = process.env.ATTUNE_RUN_ARM ?? process.env.ATTUNE_GUARD_ARM ?? config?.arm ?? ''

  const lines = declaredSidecar(source)
  if (lines.length === 0) throw new Error('the declared detector sidecar carries no outcome')
  if (typeof sidecarPath === 'string' && sidecarPath.length > 0) copyFileSync(source, sidecarPath)

  const families = ['import-publication', 'required-cli-input']
  const visibility = declaredSidecar(visibilitySource)
  const records = families.map((family) => `${family}\t${arm}\t${declaredVisibility(visibility, family, arm)}`)
  if (typeof recordPath === 'string' && recordPath.length > 0) {
    writeFileSync(recordPath, records.join('\n') + '\n')
  }
  // A model-hidden sidecar: no tool is registered and no session event is
  // written, so these lines are never part of the model-visible stream.
  ctx.logger?.debug?.(`attune detector sidecar carries ${lines.length} hidden outcome(s)`)
}
