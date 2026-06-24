Changed:
- Completed Ring C package validation handoffs for `attune-pi-agent`,
  `joern-effect-properties`, `home-deployment`, and `platform-alchemy-k8s`.
- Removed package-local compatibility tests for all four Ring C packages.
- Trimmed `attune-pi-agent` shape/source ownership metadata where stale
  compatibility tests were still expected outputs.

Validated:
- `pnpm exec nx run attune-pi-agent:test --skipNxCache`
- `pnpm exec nx run attune-pi-agent:typecheck --skipNxCache`
- `pnpm exec nx run attune-pi-agent:attune-check --skipNxCache`
- `pnpm exec nx run joern-effect-properties:test --skipNxCache`
- `pnpm exec nx run joern-effect-properties:typecheck --skipNxCache`
- `pnpm exec nx run joern-effect-properties:attune-check --skipNxCache`
- `pnpm exec nx run home-deployment:test --skipNxCache`
- `pnpm exec nx run home-deployment:typecheck --skipNxCache`
- `pnpm exec nx run home-deployment:attune-check --skipNxCache`
- `pnpm exec nx run platform-alchemy-k8s:check-generated --skipNxCache`
- `pnpm exec nx run platform-alchemy-k8s:typecheck --skipNxCache`
- `pnpm exec nx run platform-alchemy-k8s:test --skipNxCache`
- `pnpm exec nx run platform-alchemy-k8s:attune-check --skipNxCache`
- `pnpm exec nx run workspace:attune-check --skipNxCache`

Ring checkpoint:
- `workspace:attune-check` passed after all Ring C package-local compatibility
  tests were removed.
- Program-index materialization reported 18 projects, 227 targets, 152 source
  files, 1,231 symbols, 526 schema descriptors, 9,005 edges, 264 artifacts,
  207 observations, 27 diagnostics, and 27 repairs.
- Source ownership, shape conformance, and framework policy checks passed.
- No live provider, Kubernetes, Alchemy apply/deploy, container fuzzing, or
  destructive actions were run during Ring C.

Not run:
- `attune-pi-agent:mutation`.
- `joern-effect-properties:property-joern`, `fuzz:*`, container direct,
  nightly, campaign, and four-hour DSL targets.
- `home-deployment:alchemy:plan`, `home-deployment:alchemy:deploy`, and
  `home-deployment:safety-simulation`.
- Live Kubernetes or Alchemy apply/deploy targets for `platform-alchemy-k8s`.

Risks:
- Shared framework-owned compatibility generated outputs, cache helper APIs,
  and authored declaration helpers remain as demolition scaffolding. Phase 9.5
  renamed the internal repair target names; the user expectation is explicit:
  remaining compatibility APIs and helpers should be removed, renamed,
  quarantined, or archived by the time this migration is finished, not
  preserved permanently.
- Ring C provider-domain language still includes terms such as proof,
  observation, evidence, and operation. Phase 7 must separate legitimate
  product/provider vocabulary from old framework ontology before final drift
  checks ratchet public docs and runtime APIs.

Follow-ups:
- Start Phase 7 inventory and demolition.
- Delete or mechanically rename safe compatibility APIs/helpers after
  inventory proves their program-index replacement path.
- Record any truly unsafe deletion as a future OpenSpec blocker with owner,
  replacement path, and validation gate.
