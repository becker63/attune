/// The one declared provider-free catalog probe of the gated ReviewBench pilot.
///
/// The earlier live dispatch exposed the whole broad native tool catalog to the
/// reviewing model even though the reviewer profile was DECLARED to disable it,
/// so a `--dump-config` composition dump is not sufficient evidence about the
/// ACTUAL model-facing catalog. This probe is the declared offline check: it is
/// mounted as an ordinary profile row beside the reviewer overlay, waits until
/// the composed profile has finished mounting, and then reads the REAL pinned
/// tool registry (`ctx.tools.schemas()`, the same projection the provider
/// request header is built from) to write the ACTUAL registered model-facing
/// tool names to `ATTUNE_CATALOG_OUT`.
///
/// It makes NO provider call, reads no secret and runs no model: the declared
/// catalog-proof invocation disables the headless app runner through the same
/// `--patch` mechanism, so nothing dispatches a task. It registers no tool, so
/// it cannot change the catalog it measures.
///
/// @module attune.dsh.catalog-probe

import { writeFileSync } from 'node:fs'

export const name = 'attune-catalog-probe'
export const inject = ['tools']

/// The declared output path of the probe. It is the only side effect.
export const CATALOG_OUT_ENV = 'ATTUNE_CATALOG_OUT'

/// The bounded stability window of the probe: the composed tool catalog is
/// dumped once the set of registered names has not changed for this many
/// consecutive samples, so a probe can never report a half-mounted profile.
export const STABLE_SAMPLES = 5

/// The declared sample interval and hard bound of the probe, in milliseconds.
export const SAMPLE_INTERVAL_MS = 100
export const PROBE_BOUND_MS = 30000

/// The ACTUAL registered model-facing tool catalog of the composed profile, in
/// registry order. This is the same `schemas()` projection the provider request
/// header carries, so the probe measures exactly what a model would receive.
export function registeredNames(ctx) {
  const tools = ctx.get('tools')
  if (tools === undefined || tools === null) return []
  return tools.schemas().map((schema) => schema.name)
}

/// Watch the composed catalog until it is stable, then return it.
export function watchCatalog(ctx, options = {}) {
  const stableSamples = options.stableSamples ?? STABLE_SAMPLES
  const intervalMs = options.intervalMs ?? SAMPLE_INTERVAL_MS
  const boundMs = options.boundMs ?? PROBE_BOUND_MS
  const clock = options.setIntervalImpl ?? setInterval
  const cancel = options.clearIntervalImpl ?? clearInterval
  return new Promise((resolve) => {
    let previous = null
    let stable = 0
    const started = Date.now()
    const handle = clock(() => {
      let names
      try {
        names = registeredNames(ctx)
      } catch {
        return
      }
      const key = names.join('\n')
      if (key === previous) stable += 1
      else {
        previous = key
        stable = 0
      }
      const expired = Date.now() - started >= boundMs
      if (stable >= stableSamples || expired) {
        cancel(handle)
        resolve({ names, stable, expired })
      }
    }, intervalMs)
    if (typeof handle?.unref === 'function') handle.unref()
  })
}

/// Mount the probe: wait for the composed catalog to settle, write it, and end
/// the process with the probe's own exit status.
export function apply(ctx, config) {
  const out = config?.out ?? process.env[CATALOG_OUT_ENV]
  if (typeof out !== 'string' || out.length === 0) {
    throw new Error('the declared catalog probe requires ' + CATALOG_OUT_ENV)
  }
  void watchCatalog(ctx).then(({ names, stable, expired }) => {
    writeFileSync(out, names.join('\n') + '\n')
    // A catalog that never reached the stability window is an INCOMPLETE
    // measurement, so the probe reports failure rather than a partial catalog.
    process.exitCode = stable >= STABLE_SAMPLES ? 0 : 1
    void expired
    process.exit(process.exitCode)
  })
}
