// The installable Cordis plugin entry of the narrow evidence contract.
//
// This module is the runtime face of the package: it imports the real
// Typert-generated transport declaration and the generated contract identity,
// and it loads as an ordinary Cordis plugin. It deliberately registers NO DSH
// tool: Typert does not turn the contract into a tool, and neither does this
// entry. The contract is a transport declaration whose schema factories and
// selected reflection a runtime consumer validates documents against; the model
// never sees it as an affordance.
//
// The `apply` body is a real load assertion rather than a no-op: a load only
// succeeds when the generated declaration actually resolved and exposes each of
// the two declared roots. A missing or drifted artifact therefore fails the
// load instead of silently presenting an empty contract.
import * as contract from './typert.host.js'
import { CONTRACT, DIGEST } from './contract.digest.js'

const ROOTS = ['EvidenceRef', 'EvidenceObservation']

export const name = '@attune/evidence-contract'
export const inject = []

/// The generated factories of the two declared contract roots, re-exported so a
/// consumer that loads the plugin can validate canonical documents without a
/// second schema compiler.
export const factories = contract

/// The contract identity of the loaded declaration.
export const identity = { contract: CONTRACT, digest: DIGEST }

/// The Cordis plugin body. It asserts the generated contract really loaded; it
/// registers no tool and adds no second schema authority.
export function apply(ctx) {
  for (const root of ROOTS) {
    if (typeof contract[root] !== 'function') {
      throw new Error(`@attune/evidence-contract: the generated declaration is missing ${root}`)
    }
  }
  if (typeof DIGEST !== 'string' || DIGEST.length === 0) {
    throw new Error('@attune/evidence-contract: the generated contract digest is empty')
  }
  return ctx
}
