# Wire Dispatch/FoldKit site to atom-derived fixture actions and state

## Summary

Wire the existing Dispatch/FoldKit dashboard and website routes to deterministic typed fixtures, FoldKit messages/commands, and server-side atom-derived snapshots. This change preserves the current visual product surface and only changes where state and actions come from.

## Motivation

The fixture route runtime can append semantic discovery events, project them through the read model, invalidate Reactivity keys, and read refreshed atom snapshots. The FoldKit app still initializes from an already-applied snapshot and leaves important existing actions mostly inert. The site needs a deterministic closed loop: UI message -> command -> fixture runtime -> event append/projection/reactivity -> atom snapshot -> FoldKit model/view update.

## Non-goals

- No new dashboards, panels, sidebars, inspectors, charts, trace views, decorative grammar, or layout concepts.
- No real CocoIndex, Joern, Pi/local model, Neon, queues, subscriptions, Kubernetes, or external services.
- No parallel FoldKit-owned durable projection for anchors, evidence, hypotheses, findings, reports, decisions, or promotion state.
