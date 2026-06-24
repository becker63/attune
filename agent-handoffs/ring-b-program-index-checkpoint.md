Changed:
- Completed Ring B package validation handoffs for `attune-nx`,
  `cocoindex-effect`, and `joern-effect`.
- Removed the package-local compatibility tests for all three Ring B packages.
- Trimmed Ring B shape/source ownership metadata where stale compatibility
  tests were still expected outputs.

Validated:
- `pnpm exec nx run attune-nx:test --skipNxCache`
- `pnpm exec nx run attune-nx:typecheck --skipNxCache`
- `pnpm exec nx run attune-nx:attune-check --skipNxCache`
- `pnpm exec nx run attune-nx:attune-repair --dryRun --skipNxCache`
- `pnpm exec nx run cocoindex-effect:test --skipNxCache`
- `pnpm exec nx run cocoindex-effect:typecheck --skipNxCache`
- `pnpm exec nx run cocoindex-effect:attune-check --skipNxCache`
- `pnpm exec nx run joern-effect:test --skipNxCache`
- `pnpm exec nx run joern-effect:typecheck --skipNxCache`
- `pnpm exec nx run joern-effect:attune-check --skipNxCache`
- `pnpm exec nx run workspace:attune-check --skipNxCache`

Ring checkpoint:
- `workspace:attune-check` passed after Ring B package-local compatibility
  tests were removed.
- Program-index materialization reported 18 projects, 227 targets, 152 source
  files, 1,231 symbols, 526 schema descriptors, 9,005 edges, 264 artifacts,
  207 observations, 27 diagnostics, and 27 repairs.
- Source ownership, shape conformance, and framework policy checks passed.

Not run:
- Ring B repair execution except `attune-nx:attune-repair --dryRun`.
- Live Joern, live CocoIndex/MCP provider actions, proof-pressure, container
  fuzzing, Kubernetes, Alchemy, and destructive actions were not run.

Risks:
- Framework-owned compatibility generated outputs, cache helper APIs, and
  internal old-noun repair target names remain as demolition scaffolding until
  Phase 7 can delete, rename, or quarantine them after Ring C validation.

Follow-ups:
- Continue Ring C validation with cheap tests only.
- Keep task 6.11 open until Ring C also has a workspace checkpoint.
