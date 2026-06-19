# @attune/nx generator guide

`@attune/nx` is the source-code grammar for recurring Attune shapes. Prefer a
local generator over hand-rolling repeated boundaries so future agents can spot
ownership, validation, and fake-client seams quickly.

## Inventory

| Generator | Covered Attune shape | Use it when |
| --- | --- | --- |
| `@attune/nx:discovery-event` | Effect Schema event, `DiscoveryEvents` append facade helper, projection handler skeleton, durable Reactivity ViewKey, replay fixture | Adding a new EventLog fact. Raw EventLog writes remain behind `DiscoveryEvents`/facade boundaries. |
| `@attune/nx:effect-service` | Effect service tag, live layer shell, export boundary | Adding world-changing effects. Effects live in services, not atoms. Add fake/test layers beside this seam. |
| `@attune/nx:joern-template` | Typed binding schema, evidence schema, known proof-template renderer | Adding a known Joern proof template. Agents must not expand this into arbitrary proof-router queries. |
| `@attune/nx:cocoindex-mcp-tool` | Typed request/result schemas for a CocoIndex MCP tool wrapper | Adding recall tools. Normalize CocoIndex output before turning it into AnchorCards/evidence. Fake clients are acceptable for closed-loop tests. |
| `@attune/nx:k8s-resource` | Existing Kubernetes resource shell | Human-review-only area; do not expand platform generation from Codex-safe issues. |
| `sync-*` generators | Generated registries/barrels for service layers, Joern templates, CocoIndex tools, and Kubernetes resources | Rebuild registries after adding generated modules. |

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
