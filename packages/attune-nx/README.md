# @attune/nx generator guide

`@attune/nx` is the source-code grammar for recurring Attune shapes. Prefer a
local generator over hand-rolling repeated boundaries so future agents can spot
ownership, validation, and fake-client seams quickly.

## Inventory

| Generator | Covered Attune shape | Use it when |
| --- | --- | --- |
| `@attune/nx:discovery-event` | Effect Schema event, `DiscoveryEvents` append facade helper, projection handler skeleton, durable Reactivity ViewKey, replay fixture | Adding a new EventLog fact. Raw EventLog writes remain behind `DiscoveryEvents`/facade boundaries. |
| `@attune/nx:effect-service` | Canonical `Effect.Service`, operation metadata, `PackageLayer`, `PackageTestLayer`, Source BOM provenance | Adding world-changing effects. Effects live in services, not atoms. Add fake/test layers beside this boundary. |
| `@attune/nx:package-contract` | `src/attune.package.ts`, compile-only assertions, `PackageTypeGuidance`, minimal `PackageLayer`/`PackageTestLayer` | Creating or repairing a package boundary before agents add repeated service, property, or atom-view shapes. |
| `@attune/nx:atom-view` | Reactivity key declarations, base atom shell, derived atom shell, package view atom shell, atom graph registration | Exposing package-level semantic view movement for public auditable operations. |
| `@attune/nx:joern-template` | Typed binding schema, evidence schema, known proof-template renderer | Adding a known Joern proof template. Agents must not expand this into arbitrary proof-router queries. |
| `@attune/nx:cocoindex-mcp-tool` | Typed request/result schemas for a CocoIndex MCP tool wrapper | Adding recall tools. Normalize CocoIndex output before turning it into AnchorCards/evidence. Fake clients are acceptable for closed-loop tests. |
| `@attune/nx:k8s-resource` | Existing Kubernetes resource shell | Human-review-only area; do not expand platform generation from Codex-safe issues. |
| `sync-*` generators | Generated registries/barrels for service layers, Joern templates, CocoIndex tools, and Kubernetes resources | Rebuild registries after adding generated modules. |

## Phase 0 migration inventory

`src/generator-inventory.ts` is the checked inventory for the
`standardize-effect-package-contracts` migration. It is intentionally
package-local and test-backed so Phase 2 agents can extend the generator grammar
without hunting through prose.

Phase 2 generator work now has these homes:

- `@attune/nx:effect-service`: canonical `Effect.Service` output,
  operation schema slots, `PackageLayer`, `PackageTestLayer`, and service
  provenance.
- `@attune/nx:package-contract`: `src/attune.package.ts`,
  generated companion material, framework-owned compile-only assertions, and
  `PackageTypeGuidance`.
- `@attune/nx:atom-view`: Reactivity keys, base atoms, derived atoms, package
  view atoms, and package atom graph registration.
- `sync-*`: deterministic registries/barrels only. Add new sync generators when
  generated package-contract, atom-view, RPC harness, or property modules need a
  repo-visible registry.

## App boundaries

Attune's product app is the discovery/FoldKit experience that explains durable
facts, decisions, evidence, and WorkbenchSnapshot projections. The Dispatch app
is an operator/content surface under `packages/dispatch-*`. Do not mix generated
Attune discovery events, Reactivity keys, or atom/read-view shapes into Dispatch
unless a future issue explicitly asks for a bridge.

## Follow-up generator families

The next high-value families are projection/read-model modules, atom/read-view
families (`Atom.withReactivity(ViewKeys.*)` base atoms plus derived atoms),
DecisionPacket field helpers, and FoldKit scene projections. They should carry
the same ownership comments: Drizzle stays behind persistence boundaries,
Reactivity keys name durable facts rather than UI components, and durable writes
must not live inside atoms.
