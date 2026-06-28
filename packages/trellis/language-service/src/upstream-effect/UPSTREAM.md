# Upstream Effect Language Service

This subtree is the Trellis-owned adapter boundary for the upstream Effect
language-service fork.

- Repository: `https://github.com/Effect-TS/language-service`
- Inspected commit: `df50dfce9ab8b299f6d21c35c231bcc12cbca4ee`
- Inspected package: `@effect/language-service@0.86.2`
- License: MIT, copyright Effectful Technologies Inc.

Copied source:

- `packages/language-service/src/**` -> `src/upstream-effect/vendor/**`

Compiled local adapters:

- `src/upstream-effect/index.ts` keeps the Trellis-facing wrapper and an
  adapted `LSP.getSemanticDiagnosticsWithCodeFixes` entrypoint.

The Trellis implementation adapts the upstream CLI concepts, diagnostic family
naming, `LSP.getSemanticDiagnosticsWithCodeFixes` execution shape, and quickfix
projection shape into a CLI-only agent surface. Local code outside this subtree
owns Trellis JSON contracts, recipe facts, repair safety, and
receipt/observation routing.

Major local deviations:

- The raw upstream source is retained under `vendor/**` for attribution and
  sync review, but it is excluded from the package TypeScript build.
- The compiled adapter currently runs a focused adapted `floatingEffect`
  diagnostic through the upstream LSP function shape.
- Trellis adds a safe local `void` quickfix for the floating-effect fixture so
  agents can exercise the diagnostics -> fixes -> apply loop; upstream marks
  that diagnostic itself as non-fixable.

Future upstream syncs should compare upstream `src/cli/**`, `src/core/**`,
`src/diagnostics/**`, and quickfix rendering behavior before changing this
adapter. Do not import undocumented `@effect/language-service/dist/*` paths at
runtime.
