Changed:
- Completed Ring A package validation handoffs for `effect-oxlint-policy`,
  `attuned-discovery`, and `attune-foldkit`.
- Removed the package-local compatibility tests for all three Ring A packages.
- Trimmed Ring A shape/artifact ownership metadata so deleted compatibility tests
  are no longer expected outputs.

Validated:
- `pnpm exec nx run effect-oxlint-policy:test --skipNxCache`
- `pnpm exec nx run effect-oxlint-policy:typecheck --skipNxCache`
- `pnpm exec nx run effect-oxlint-policy:attune-check --skipNxCache`
- `pnpm exec nx run attuned-discovery:test --skipNxCache`
- `pnpm exec nx run attuned-discovery:typecheck --skipNxCache`
- `pnpm exec nx run attuned-discovery:attune-check --skipNxCache`
- `pnpm exec nx run attune-foldkit:test --skipNxCache`
- `pnpm exec nx run attune-foldkit:typecheck --skipNxCache`
- `pnpm exec nx run attune-foldkit:attune-check --skipNxCache`
- `pnpm exec nx run workspace:shape-conformance --skipNxCache`
- `pnpm exec nx run workspace:attune-check --skipNxCache`

Ring checkpoint:
- `workspace:attune-check` passed after Ring A package-local compatibility
  tests were removed.
- Program-index materialization reported 18 projects, 227 targets, 152 source
  files, 1,231 symbols, 526 schema descriptors, 9,005 edges, 264 artifacts,
  207 observations, 27 diagnostics, and 27 repairs.
- Source ownership, shape conformance, and framework policy checks passed.

Not run:
- Ring A repair execution; project checks did not require executing safe cache
  repairs.
- Live provider, Kubernetes, Alchemy, destructive, container fuzzing, and heavy
  proof-pressure actions were not run.

Risks:
- Framework-owned compatibility generated outputs and cache helper APIs remain
  as implementation routes behind the public `attune-repair` surface after Ring B and Ring C validation.

Follow-ups:
- Continue Ring B validation.
- Keep task 6.11 open until Ring B and Ring C also have workspace checkpoints.
