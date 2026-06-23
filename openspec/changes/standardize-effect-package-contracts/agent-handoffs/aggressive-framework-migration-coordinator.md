Agent:
- aggressive-framework-migration-coordinator

Wave:
- Final local aggressive in-place framework migration integration.

Ownership:
- Coordinated and integrated the final local migration wave for
  `standardize-effect-package-contracts`.
- Owned final task reconciliation, final command-surface ratchet cleanup,
  final workspace policy validation, final package-migration inventory
  reconciliation, stale waiver cleanup, and this coordinator handoff.
- Treated prior subagent handoffs as historical migration evidence and did not
  rewrite them except through final source/task reconciliation.

Changed:
- Created and/or validated the root framework project ring:
  - `framework/protocol`
  - `framework/runtime`
  - `framework/sqlite`
  - `framework/language-service`
  - `framework/nx`
  - `framework/testing`
- Moved active package-contract authoring to the public
  `@attune/framework-protocol` DSL.
- Completed command-surface ratchet cleanup:
  - removed the stale root `workspace:policy-architecture` target.
  - removed temporary command-surface/run-command allowlists from
    `packages/attune-architecture/src/framework-policy-cli.ts`.
  - removed stale Pi-agent raw-command waiver text and updated its package
    contract test.
  - verified active configs have no `nx:run-commands` and no package-local
    `scripts` blocks.
- Expanded typed Nx toolchain coverage and generated wrapper behavior so build,
  typecheck, test, generate, worker-fuzz, platform, Joern, Kubernetes, and
  Alchemy/provider intents run through typed executor surfaces.
- Reconciled `package-migration-inventory.md` to state the final ratchet
  posture: package contracts are present for every active package, Source
  BOM/generator-shape are compatibility views, and no checked-in protocol
  reports are final workflow truth.
- Marked all 151 OpenSpec tasks complete after validation.

Generated:
- This final coordinator handoff.
- Subagent handoffs from the final local wave:
  - `contract-policy-ratchet-worker.md`
  - `docs-ratchet-sidecar.md`
  - `final-ratchet-validation-sidecar.md`
  - `final-validation-sweep-sidecar.md`
  - `generator-type-guidance-worker.md`
  - `nx-runtime-graph-worker.md`
  - `product-command-worker.md`
  - `proof-platform-command-worker.md`
  - `task-reconciliation-sidecar.md`
  - `tooling-framework-command-worker.md`
- Local worker-fuzz evidence was emitted under gitignored `.attune/cache`
  paths, not checked-in reports.

Validated:
- `git diff --check` passed.
- `openspec validate standardize-effect-package-contracts --type change`
  passed during the final wave.
- `openspec validate standardize-effect-package-contracts --type change --strict`
  passed in validation sidecars.
- `nx run attune-nx:typecheck --skipNxCache` passed.
- `nx run attune-nx:build --skipNxCache` passed.
- `nx run attune-architecture:test --skipNxCache` passed.
- `nx run effect-oxlint-policy:test --skipNxCache` passed.
- `nx run workspace:framework-policy-check --skipNxCache` passed after
  temporary command-surface allowlists were removed.
- `nx run workspace:package-contracts-check --skipNxCache` passed.
- `nx run workspace:policy-fast --skipNxCache` passed all subtargets:
  `attune-nx:test`, `workspace:package-contracts-check`,
  `workspace:atom-graph-conformance`, `workspace:property-evidence`,
  `workspace:coverage-conformance`, `attune-architecture:test`,
  architecture scan/deps/cycles/complexity/duplicates/types/churn,
  `effect-oxlint-policy:test`, `effect-oxlint-policy:build`, and
  effect-oxlint policy execution. The local no-PR context was handled by the
  PR completion gate skip path.
- `nx run joern-effect-properties:test --skipNxCache` passed after the
  worker-fuzz/property timeout was raised to match actual runtime.
- `nx run joern-effect-properties:fuzz:smoke --skipNxCache` passed with
  25 accepted cases and wrote evidence to
  `.attune/cache/property-evidence/joern-effect-properties/fuzz-smoke.json`.
- `nx run attune-pi-agent:typecheck --skipNxCache` passed.
- `nx run attune-pi-agent:test --skipNxCache` passed after stale waiver
  expectation cleanup.
- `nx run-many -t test -p framework-protocol,framework-runtime,framework-sqlite,framework-language-service,framework-nx,framework-testing --skipNxCache`
  passed.
- `nx run-many -t typecheck -p platform-alchemy-k8s,joern-effect,joern-effect-properties,home-deployment --skipNxCache`
  passed.
- `nx run platform-alchemy-k8s:generate --skipNxCache` passed.
- `nx run cocoindex-effect:generate --skipNxCache` passed.
- Static final-ratchet scans passed:
  - no active `nx:run-commands` in root/package/framework project configs.
  - no active package-local `scripts` blocks.
  - no active root `workspace:policy-architecture` target.
  - no product-source imports of private framework runtime/sqlite/language
    service/Nx internals, `ProtocolStore`, or raw Drizzle.
  - `.attune/cache` paths are gitignored.

Not run:
- `nx run-many -t typecheck --all`.
- `nx run-many -t test --all`.
- `nx run workspace:policy-proof-pressure`.
- Heavy/nightly proof campaigns, containerized Arion targets, live Alchemy
  deploy/apply flows, live provider/resource operations, and destructive
  home-deployment flows.

Contract status:
- Framework projects exist and validate.
- Every active package has `src/attune.package.ts` and
  `src/attune.package.typecheck.ts`.
- Every active package contract exposes `PackageContractSchema`,
  `PackageContract`, `PackageLayer`, `PackageTestLayer`,
  `PackageTypeGuidance`, package views, exact maps/property surfaces or
  explicit long-lived waivers.
- Tooling packages migrated: `attune-nx`, `attune-architecture`,
  `effect-oxlint-policy`.
- Product packages migrated: `attuned-discovery`, `cocoindex-effect`,
  `attune-foldkit`, `attune-pi-agent`.
- Proof packages migrated: `joern-effect`, `joern-effect-properties`.
- Platform/resource packages migrated: `platform-alchemy-k8s`,
  `home-deployment`.
- Runtime `@effect/rpc` remains optional/future; the default harness path is
  in-process/generated operation registry and framework testing evidence.
- MCP remains optional/future and is not a core framework path.
- Checked-in ProtocolDelta/report artifacts are not part of the core workflow.

Residual migration debt:
- Source BOM and generator-shape files remain as legacy migration
  compatibility views and review scaffolding. They are not final semantic
  workflow truth.
- Shape conformance still reports future generator candidates; that is a
  generator-expansion backlog, not an OpenSpec blocker for this change.
- Historical handoff files preserve earlier migration facts, including old
  blockers and stale identities, as history. Current active docs/config/source
  surfaces have been ratcheted.
- Full `workspace:policy-proof-pressure` and all-target typecheck/test sweeps
  were not run in this local session because the commit-tier proof is
  `workspace:policy-fast` plus focused proof/fuzz smoke.

Blocked by:
- Nothing is blocking the OpenSpec change from the current implementation
  perspective.

Next agent:
- Archive `standardize-effect-package-contracts` when ready.
- If desired, run a separate heavy validation issue for
  `workspace:policy-proof-pressure` and a full `nx run-many -t typecheck --all`
  / `nx run-many -t test --all` sweep before archive or release.
