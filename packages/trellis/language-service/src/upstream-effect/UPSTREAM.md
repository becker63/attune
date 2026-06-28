# Upstream Effect Language Service

This subtree is the Trellis-owned adapter boundary for the upstream Effect
language-service fork.

- Repository: `https://github.com/Effect-TS/language-service`
- Inspected commit: `df50dfce9ab8b299f6d21c35c231bcc12cbca4ee`
- Inspected package: `@effect/language-service@0.86.2`
- License: MIT, copyright Effectful Technologies Inc.

The initial Trellis implementation adapts the upstream CLI concepts,
diagnostic family naming, and quickfix projection shape into a CLI-only agent
surface. Local code outside this subtree owns Trellis JSON contracts, recipe
facts, repair safety, and receipt/observation routing.

Future upstream syncs should compare upstream `src/cli/**`, `src/core/**`,
`src/diagnostics/**`, and quickfix rendering behavior before changing this
adapter. Do not import undocumented `@effect/language-service/dist/*` paths at
runtime.
