# Package Migration Inventory

This inventory is the package-by-package source map for the
`standardize-effect-package-contracts` migration. The completed state is not a
compatibility layer over the current repo. The root `framework/` layer defines
the Attune programming model, and every active product/proof/platform package
under `packages/` migrates to the canonical contract, generated property
evidence, atom/Reactivity package views, and typed Nx command surface with no
dangling migration material.

## Repo-Wide Findings

- Active packages: `attune-nx`, `attune-architecture`,
  `effect-oxlint-policy`, `attuned-discovery`, `cocoindex-effect`,
  `attune-foldkit`, `attune-pi-agent`, `joern-effect`,
  `joern-effect-properties`, `platform-alchemy-k8s`, `home-deployment`.
- Planned root framework projects: `framework/protocol`, `framework/runtime`,
  `framework/sqlite`, `framework/language-service`, `framework/nx`, and
  `framework/testing`. These may be Nx/pnpm workspace projects, but they are
  framework internals/substrate, not product packages under `packages/`.
- Final architecture package identity: `attune-architecture`, with final path
  `packages/attune-architecture`. The old architecture-lint identity is only a
  historical migration note and must not remain in final docs, ledgers,
  binaries, package ids, or public targets.
- Every active package now exports a contract surface:
  `attune-nx`, `attune-architecture`, `effect-oxlint-policy`,
  `attuned-discovery`, `cocoindex-effect`, `attune-foldkit`,
  `attune-pi-agent`, `joern-effect`, `joern-effect-properties`,
  `platform-alchemy-k8s`, and `home-deployment` each have
  `src/attune.package.ts`, compile-only typecheck assertions,
  `PackageContractSchema`, `PackageContract`, `PackageLayer`, and
  `PackageTestLayer`.
- Source BOM and generator-shape shards remain as legacy migration
  compatibility views. Final semantic truth is framework DSL declarations,
  generated source required by build/typecheck, and local gitignored framework
  runtime/cache. Agents must not hand-edit Source BOM/generator-shape as the
  workflow source of truth.
- Active project/package configs no longer expose direct `package.json`
  scripts or `nx:run-commands` public surfaces. Heavy actions are behind typed
  Nx executors or inferred targets with contract-visible options.
- The stale `workspace:policy-architecture` aggregate has been removed from
  the active root workspace target set. Architecture checks compose through
  `workspace:policy-fast`, `workspace:policy-proof-pressure`, and focused
  diagnostics such as `workspace:package-contracts-check`.
- Effect DI is inconsistent. Packages use `Effect.Service`, `Context.Service`,
  `Context.Tag`, hand-rolled interfaces, plain functions, Alchemy provider
  collections, and pure module exports.
- Effect Schema usage is strong across domain packages, but property generation
  is not yet uniformly rooted in `Arbitrary.make(schema)`.
- Atom/Reactivity is strong in `attuned-discovery` and consumed by
  `attune-foldkit`, but the other packages need package view graphs.
- FastCheck/property pressure exists in `attune-pi-agent`, `joern-effect`, and
  especially `joern-effect-properties`, but evidence shape, workers, V8
  feedback, transform/filter telemetry, and package-boundary harnesses are not
  uniform.

## Simplification Rules

- Treat `src/attune.package.ts` as the package boundary contract, not a
  manifest for every private helper. Operation entries are required for public
  auditable boundaries: exported services, generators, providers, policy rules,
  codecs, projections, atom families, queries, commands, and meaningful
  package state transitions.
- Treat the package contract as the authored package-level Attune Protocol
  declaration using the public framework DSL. The private framework runtime,
  not hand-authored ledgers or reports, owns descriptor hashes, obligations,
  generated artifact state, evidence, deltas, waivers, and repair suggestions.
- Author contracts through `definePackageContract`, `definePackageViews`,
  `touches`, and kind-specific operation builders. Raw `as const` contract
  objects may be generated/encoded artifacts, but agents should normally use
  the builder surface so TypeScript can infer operation ids, Schema decoded and
  encoded types, valid laws, valid views, RPC shapes, handlers, evidence,
  replay, and layer requirements.
- Generate a compile-only package typecheck module for each migrated package.
  It should assert the contract shape, exact handler and property maps,
  inferred laws, view references, layer requirements, replay/evidence envelopes,
  and type-guidance completeness before runtime conformance runs.
- Let pure schema, policy, generator-template, fixture, and data packages use
  `Layer.empty` or generated no-op package layers when they do not own runtime
  services. Do not invent fake services for shape compliance.
- Use a compact shared law kernel first: schema validation,
  determinism/idempotence where declared, side-effect boundary checks, and
  view-movement checks. Add package-specific laws only where domain behavior
  needs them.
- Prefer `laws: inferLaws()` for base laws. Law inference should use operation
  kind, schemas, annotations, touched views, destructive/resource metadata,
  projection/generator metadata, policy finding metadata, and Joern/template
  metadata before custom laws are added.
- Expose package-level atom/Reactivity views, not atoms for every helper.
  Stable status, evidence, coverage, readiness, registry, plan, result, or
  domain atoms are enough when they observe the public operation effects.
- Treat Source BOM, generator-shape, waiver, coverage, and architecture files
  as legacy migration scaffolding or temporary compatibility views. Final
  diagnostics come from the language service and Nx output over private
  framework runtime/cache; checked-in ProtocolDelta/report artifacts are not
  part of the framework workflow.
- Route repeated workflows through the generic Nx executor family:
  `attune:package-check`, `attune:generated`, and `attune:toolchain`.
  Specialized executors require typed evidence that the generic family would
  hide important options or outputs.
- Generate Schema-coded internal package harnesses from each package contract.
  Optional RPC-backed harnesses may carry Schema-derived payload/success/error
  values when compatible; control operations expose
  reset/snapshot/observe/evidence/replay/coverage/atom-graph behavior, and
  handlers run through `PackageTestLayer` against public package boundaries
  only.
- Generate `PackageTypeGuidance` from contracts and Schema metadata. Property
  evidence should record type-partition hits and misses, and targeted fuzz runs
  should bias toward missing type partitions alongside missing atom graph
  movement, V8/Istanbul coverage, and retained corpus entries.
- Apply the invariant ownership ladder before adding policy rules:
  TypeScript contract builders own type-expressible local invariants; Effect
  Schema owns runtime/encoded boundary values; Nx and generated sync own
  missing files, stale outputs, target names, and docs; FastCheck/provider runs
  own behavior, coverage, atom movement, provider state, and destructive gates;
  `attune-architecture` owns only residual repo-wide policy facts.

## Migration Archetypes

- Generator/tooling packages: `attune-nx` and generator surfaces in
  `attune-pi-agent`.
- Policy packages: renamed `attune-architecture` and `effect-oxlint-policy`.
- Product/runtime packages: `attuned-discovery`, `cocoindex-effect`,
  `attune-foldkit`, and `attune-pi-agent`.
- Proof packages: `joern-effect` and `joern-effect-properties`.
- Platform/resource packages: `platform-alchemy-k8s` and `home-deployment`.
- Framework projects: `framework/protocol`, `framework/runtime`,
  `framework/sqlite`, `framework/language-service`, `framework/nx`, and
  `framework/testing`.

Generators and sync generators should create the archetype defaults first, then
package-specific refinements should be added only where the package boundary
genuinely differs from its archetype.

## Final Ratchet Status

- Framework layout: root `framework/` projects exist for protocol, runtime,
  sqlite, language-service, nx, and testing.
- Contract migration: every active package listed above has a package contract,
  typecheck module, package views, test layer, type guidance, and package-local
  contract tests.
- Command surface: active package `package.json` manifests have no `scripts`
  blocks, active `project.json` targets have no `nx:run-commands`, and
  package-manager/tool shell details are hidden behind typed executor options.
- Runtime/cache posture: protocol deltas, evidence summaries, generated
  artifact hashes, and replay facts materialize through language-service/Nx
  diagnostics and gitignored `.attune/cache` state, not checked-in reports.
- Legacy ledgers: Source BOM and generator-shape files remain only as migration
  scaffolding/compatibility views until the framework cache fully replaces
  them as a review aid; they are not final semantic workflow truth.

The per-package "Historical command surface before final ratchet" notes below
are retained to explain what each package moved away from. They are not active
implementation debt after the final ratchet.

## Framework Ring

### `framework/protocol`

Current role:
- Planned public framework DSL and Schema model for Attune Protocol.

Target public API:
- Package name: `@attune/framework-protocol`.
- Public DSL: `defineAttunePackage`, `views`, `query`, `command`,
  `projection`, `eventFacade`, `atomFamily`, `resourceProvider`, `generator`,
  `policyRule`, `inferLaws`, and schema/law/view helpers.

Information hiding rule:
- Product packages may import this public API.
- Product packages must not import descriptor internals unless they are exposed
  as public framework types.

Target contract:
- Package kind: `framework-protocol`.
- Services/operations: builders, descriptors, obligations, evidence/delta
  schemas, diagnostics schemas, waiver/repair-action schemas, descriptor
  hashing, and materialization contracts.

Property/evidence obligations:
- Schema round-trip tests for descriptors, obligations, evidence, internal
  deltas, diagnostics, waivers, and repair actions.
- Deterministic descriptor hash checks.
- Obligation derivation fixtures for every operation kind.

Final cleanup:
- No separate JSON contract model.
- No non-Effect sidecar architecture source of truth.
- No generated-looking reports hand-authored as semantic state.

### `framework/runtime`

Current role:
- Planned private runtime service layer over protocol descriptors, obligations,
  evidence, generated artifact state, waivers, diagnostics, and repair plans.

Target internal API:
- Package name: `@attune/framework-runtime`.
- Services: `ProtocolRuntime`, `ProtocolQuery`, `ProtocolDiagnostics`,
  `ProtocolProjection`, repair-plan services, and diagnostic source model.

Information hiding rule:
- Product packages must not import `@attune/framework-runtime/internal` or
  ProtocolStore internals.
- `framework/language-service`, `framework/nx`, and `framework/testing` may
  depend on runtime query/diagnostic services.

Target contract:
- Package kind: `framework-runtime`.
- Operations:
  - `command`: materialize descriptor, record generated artifact state, record
    evidence, compute internal deltas.
  - `query`: package summary, diagnostic state, obligation explanation, repair
    plan, generated source ownership.
  - `projection`: descriptor plus obligations plus evidence plus waivers to
    framework diagnostics.

Property/evidence obligations:
- ProtocolDelta-to-diagnostic projection fixtures.
- Repair-plan fixtures.
- Invalid internal payload error projection fixtures.

Final cleanup:
- Internal deltas are not checked-in report files.
- Normal agents repair diagnostics and Nx output, not raw runtime state.

### `framework/sqlite`

Current role:
- Planned local protocol compiler/runtime database.

Target internal API:
- Package name: `@attune/framework-sqlite`.
- Services: `ProtocolStore`, `ProtocolStoreLive`, `ProtocolStoreTest`,
  migrations, store health, and Schema-coded row codecs.

Information hiding rule:
- Product packages must not import `@attune/framework-sqlite`, raw Drizzle
  tables, Drizzle clients, or SQLite schema internals.
- Only framework internals may depend on this package.

Target contract:
- Package kind: `framework-sqlite`.
- Operations:
  - `codec`: descriptor/evidence/delta/generated-artifact/waiver/repair decode.
  - `command`: initialize store, apply migrations, record descriptors, record
    obligations, record generated artifacts, record evidence, compute deltas.
  - `query`: store health, package summary, obligations, diagnostics.

Property/evidence obligations:
- SQLite lifecycle and migration tests.
- Schema-coded row encode/decode tests.
- Deterministic stale generated source/artifact detection.
- Local gitignored cache path tests for `.attune/cache/protocol.sqlite`,
  `.attune/cache/protocol/*`, or `.nx/cache/*`.

Final cleanup:
- No raw Drizzle exposure outside framework/sqlite.
- No checked-in protocol database or report projections.

### `framework/language-service`

Current role:
- Planned TypeScript language-service plugin or companion over private runtime
  projections.

Target public UX:
- Diagnostics, quick info, code actions, and code lenses at
  `src/attune.package.ts` and generated framework-facing source boundaries.

Information hiding rule:
- Product packages must not import `@attune/framework-language-service`.
- The language service reads runtime query/diagnostic services and does not
  reimplement protocol semantics independently.

Target contract:
- Package kind: `framework-language-service`.
- Services: diagnostics, quick info, code-action planner, code lenses, source
  range mapper, generated source ownership lookup.
- Operations:
  - `query`: diagnostics for file, operation obligations, inferred laws,
    touched views, evidence status, package layer requirements.
  - `command`: plan deterministic Nx generator/check code actions.
  - `projection`: internal ProtocolDelta to file-positioned diagnostics.

Property/evidence obligations:
- Diagnostic Schema encode/decode tests.
- ProtocolDelta-to-diagnostic projection fixtures.
- Quick info, code action, code lens, and source range fixtures.

Final cleanup:
- No dependency on checked-in reports.
- No direct mutation of generated artifacts by code actions.

### `framework/nx`

Current role:
- Planned deterministic action and materialization layer for the framework.
- Long-term home for framework-specific generators/executors/graph integration,
  even if migration aliases begin in `packages/attune-nx`.

Target API:
- Package name: `@attune/framework-nx`.
- Generators/executors: framework sync, protocol materialization, diagnostics,
  generated source freshness, import-boundary checks, local cache checks,
  property/evidence hooks, and language-service code-action actions.

Information hiding rule:
- Product packages must not import `@attune/framework-nx/internal`.
- Public access is through Nx generator/target names and language-service code
  actions.

Target contract:
- Package kind: `framework-nx`.
- Operations:
  - `generator`: generated source and evidence scaffold materialization.
  - `policy-rule`: import-boundary, no checked-in reports, command-surface
    rules.
  - `projection`: framework diagnostics to Nx CLI/check output.

Property/evidence obligations:
- Deterministic generator snapshot tests.
- No checked-in report fixtures.
- Code-action compatibility fixtures.

Final cleanup:
- Move framework-specific work out of product `packages/attune-nx` surface or
  keep only a migration alias with explicit removal plan.

### `framework/testing`

Current role:
- Planned package evidence and adversarial testing support.

Target test API:
- Package name: `@attune/framework-testing`.
- Test-only helpers: operation registry, evidence producer, FastCheck hooks,
  replay helpers, and atom graph observer helpers.

Information hiding rule:
- Product packages may import this package only from evidence/property tests or
  generated local test artifacts.
- Product runtime code must not depend on testing internals.

Target contract:
- Package kind: `framework-testing`.
- Operations:
  - `generator`: operation registry and evidence producer scaffolds.
  - `command`: run generated property/evidence producers.
  - `projection`: evidence events to runtime diagnostic source state.

Property/evidence obligations:
- FastCheck arbitrary derivation fixtures.
- Worker/replay metadata fixtures.
- Atom graph observer fixtures.
- Counterexample replay in local runtime/cache.

Final cleanup:
- Evidence artifacts are stored in local runtime/cache or surfaced through
  diagnostics/Nx output, not checked-in reports.

Future optional adapter:
- MCP is not part of the core Framework Ring. A future MCP adapter may consume
  `ProtocolDiagnostics`/`ProtocolQuery`, but it must not expose raw SQLite,
  raw Drizzle, arbitrary shell, arbitrary `nx run`, package-manager commands,
  secret reads, provider apply, or checked-in report edits.

## Tooling Ring

### `attune-nx`

Current role:
- Generator grammar package for Attune source shapes.
- Public generator catalog includes `effect-service`, `discovery-event`,
  `joern-template`, `cocoindex-mcp-tool`, `k8s-resource`, and sync generators.
- Current `effect-service` generator emits lower-level `Context.Tag` and
  `Layer.succeed`, not canonical `Effect.Service`.
- Current Source BOM helper writes package shards and root index.

Historical command surface before final ratchet:
- `package.json` scripts for `build` and `typecheck`.
- `project.json` uses direct `pnpm`, `tsc`, `vitest`, oxlint, and codex
  wrapper commands.

Target contract:
- Package kind: `generator-tooling`.
- Services: generator registry service, virtual tree service, source provenance
  ledger service, package-contract sync service.
- Operations:
  - `generator`: every source generator and sync generator.
  - `codec`: generator option decoding and generated ledger decoding.
  - `policy-rule`: generator provenance/conformance checks.
- Layers: canonical `Effect.Service` classes for generator registry and
  provenance helpers; deterministic `PackageTestLayer` using an in-memory
  virtual tree.
- Schemas: Effect Schema contract for generator options, generated file
  summaries, provenance records, and generated ledger outputs.

Target atom/Reactivity views:
- `generatorCatalogAtom`
- `generatorPlanAtom`
- `generatedFileDiffAtom`
- `sourceProvenanceAtom`
- `generatorShapeCoverageAtom`
- Reactivity keys for generator catalog changes, schema changes, generated file
  diffs, provenance changes, and package-contract sync changes.

Target property evidence:
- Schema-derived generator option arbitraries.
- Determinism laws for virtual tree output, registry order, generated barrels,
  Source BOM review artifacts, and package-contract registration.
- V8 feedback over template branches, path normalization, source provenance,
  and sync generator ordering.
- Worker shards by generator id and seed range in proof-pressure tier.

Phase 4 status:
- Package contract shard: generated and ledger-tracked as
  `attune-nx.package-contract` in `attune.generator-shapes.json`.
- Source BOM contract shard: generated in
  `packages/attune-nx/attune.source-bom.json`, generated by
  `@attune/nx:package-contract` through `sync-package-contract`.
- Owning implementation agent: `attune-nx-migration-agent`.
- Ledger agent status:
  `packages/attune-nx/src/attune.package.ts` and
  `packages/attune-nx/src/attune.package.typecheck.ts` are present and tracked
  by generator-shape conformance as generated package contract outputs.
- Contract status: present with generator, query, command, and policy-rule
  operations for effect-service generation, package-contract generation,
  atom-view generation, generator inventory, package-contract graph inference,
  Source BOM provenance upsert, and typed executor intent normalization.
- Package views: generator plan, generated diff, provenance, contract graph,
  generator inventory, and executor intent atoms/Reactivity keys are declared.
- Package evidence: `PackageLayer`, `PackageTestLayer`, exact
  `PackageFuzzHandlers`, exact `PackageProperties`, and
  `PackageTypeGuidance` are present with commit-tier coverage-search hints.

Phase 4 final-ratchet result:
- Direct package scripts and raw project command strings have been replaced
  by typed Nx executors or inferred targets in active configs.
- Stale-output checks now prove generated contract and materialization files
  match framework/Nx output where required by build/typecheck.
- Direct package-contract generation is routed through the framework/Nx
  wrapper path so source-local `.js` import drift is covered by generator tests.
- Product contracts now import `@attune/framework-protocol`; old
  architecture package-contract surfaces are historical or internal only.

Final cleanup:
- Replace `Context.Tag` service template with canonical `Effect.Service`.
- Remove stale generator defaults tied to older OpenSpec changes.
- Stop exporting internal Source BOM helpers as a general public API unless the
  package contract deliberately exposes them.
- Package scripts and arbitrary `run-commands` have been removed from active configs; build/test/typecheck and
  generator sync move behind typed Nx executors or inferred targets.
- Convert current BOM/generator-shape manifests to generated review outputs.

Historical pre-ratchet waiver notes:
- CJS wrapper generation while generator packaging is being moved behind a
  typed executor.
- Bootstrap status of generator package as the source of the generator grammar.

### `attune-architecture` (formerly `attune-architecture-lint`)

Current role:
- Architecture policy scanner for workflow surfaces, Source BOM ownership, and
  generator shape conformance.
- Slated to become the broader architecture package, not only lint.
- Uses Effect Schema to decode rule ids, manifests, Source BOM shards, and
  generator-shape manifests.
- Uses direct filesystem reads, `git ls-files`, `process.argv`, and
  `process.cwd`.

Historical command surface before final ratchet:
- `package.json` scripts for build/typecheck/test.
- `project.json` uses direct `pnpm`, `tsc`, and `vitest`.
- CLI bin is named `attune-architecture`.

Target contract:
- Final package path: `packages/attune-architecture`.
- Package kind: `architecture-policy`.
- Services: workspace file inventory service, tracked-file inventory service,
  package contract decoder, policy runner, generated ledger validator.
- Operations:
  - `policy-rule`: workflow-surface, package-contract, generator-shape,
    Source BOM review, command-surface, and waiver checks.
  - `codec`: policy manifest and generated ledger decoders.
  - `query`: architecture graph summaries.
- Layers: canonical services with test layer backed by in-memory files and
  tracked-file fixtures.
- Schemas: package contract schema imports, policy finding schema, waiver
  summary schema, generated ledger schemas.

Target atom/Reactivity views:
- `policyFindingsAtom`
- `waiverSummaryAtom`
- `packageContractCoverageAtom`
- `commandSurfaceDebtAtom`
- `generatedLedgerDriftAtom`
- Reactivity keys for contract files, generator catalogs, Nx graph metadata,
  generated ledgers, and policy config.

Target property evidence:
- Schema-derived arbitrary manifests, paths, package contracts, command
  surfaces, and waiver records.
- Policy-rule laws for deterministic findings, no duplicate diagnostics,
  waiver suppression, stale ledger detection, and final-ratchet failure.
- V8 feedback over glob/path matching, command detection, and schema-decode
  error branches.

Phase 4 status:
- Package contract shard: generated and ledger-tracked as
  `attune-architecture.package-contract` in `attune.generator-shapes.json`.
- Source BOM contract shard: generated in
  `packages/attune-architecture/attune.source-bom.json`, generated by
  `@attune/nx:package-contract` through `sync-package-contract`.
- Owning implementation agent: `attune-architecture-migration-agent`.
- Ledger agent status: `packages/attune-architecture/src/attune.package.ts`
  and `packages/attune-architecture/src/attune.package.typecheck.ts` are
  present and tracked by generator-shape conformance as generated package
  contract outputs. The package path rename to `packages/attune-architecture`
  has landed.
- Contract status: present with codec, query, and policy-rule operations for
  package-contract decoding/assertions, law inference, type-guidance
  validation, RPC descriptor derivation, command-surface conformance,
  generator-shape conformance, Source BOM policy scanning, and workspace
  policy summary.
- Package views: policy findings, waiver summary, package contract coverage,
  command-surface findings, generator-shape findings, Source BOM findings,
  RPC descriptors, type-guidance coverage, law inference, and workspace policy
  summary atoms/Reactivity keys are declared.
- Package evidence: `PackageLayer`, `PackageTestLayer`, exact
  `PackageFuzzHandlers`, exact `PackageProperties`, `PackageFuzzRpcGroup`,
  and `PackageTypeGuidance` are present.

Phase 4 final-ratchet result:
- Burn down stale historical references outside OpenSpec handoff history if
  any are promoted into current guidance.
- Wrap raw filesystem, git, process, and CLI access behind typed services or
  typed executor inputs.
- Direct package scripts and raw project command strings have been replaced
  by typed Nx executors or inferred targets in active configs.
- Stale-output checks now prove generated contract and materialization files
  match framework/Nx output where required by build/typecheck.

Final cleanup:
- Keep package, project, bin, docs, generated ledger owner, and public surfaces
  on `attune-architecture`.
- Treat the old architecture-lint identity as a historical migration note only.
- Replace raw filesystem/git/process access with typed services or typed
  executor inputs.
- Package scripts and arbitrary `run-commands` have been removed from active configs.
- Remove diagnostics-only/manual generator-shape statuses after ratchet.

Historical pre-ratchet waiver notes:
- Policy nucleus bootstrapping itself before all checks are generated.
- Filesystem/git inventory adapters until wrapped as typed services.

### `effect-oxlint-policy`

Current role:
- Private Effect-oxlint plugin enforcing no raw env, no raw Node APIs, and no
  hand-authored architecture shapes.
- Contains hard-coded adapter allowlists.
- Uses Effect values internally, but no package DI, Effect Schema, atoms, or
  property evidence.

Historical command surface before final ratchet:
- No meaningful package scripts, but `project.json` uses direct `pnpm`, `tsup`,
  `tsc`, and `vitest`.

Target contract:
- Package kind: `policy-plugin`.
- Services: oxlint rule registry service, adapter allowlist service, rule test
  fixture service.
- Operations:
  - `policy-rule`: every oxlint rule.
  - `codec`: rule metadata and finding shape decoding.
  - `query`: rule registry listing.
- Layers: canonical rule registry service with test layer backed by
  `effect-oxlint/testing` fixtures.
- Schemas: rule metadata, finding, adapter allowlist, AST/file fixture summary.

Target atom/Reactivity views:
- `policyRuleRegistryAtom`
- `adapterAllowlistAtom`
- `policyResultAtom`
- `rawEnvFindingAtom`
- `serviceShapeFindingAtom`
- Reactivity keys for rule source, oxlint config, adapter allowlist, and scanned
  source partitions.

Target property evidence:
- Schema-derived rule fixture summaries plus generated AST/filepath inputs.
- Policy-rule laws for deterministic diagnostics, allowlist behavior, stable
  metadata, and no duplicate messages.
- V8 feedback for visitor branches and allowed/disallowed path branches.

Phase 4 status:
- Package contract shard: generated and ledger-tracked as
  `effect-oxlint-policy.package-contract` in `attune.generator-shapes.json`.
- Source BOM contract shard: generated in
  `packages/effect-oxlint-policy/attune.source-bom.json`, generated by
  `@attune/nx:package-contract` through `sync-package-contract`.
- Owning implementation agent: `effect-oxlint-policy-migration-agent`.
- Ledger agent status:
  `packages/effect-oxlint-policy/src/attune.package.ts` and
  `packages/effect-oxlint-policy/src/attune.package.typecheck.ts` are present,
  with `packages/effect-oxlint-policy/test/attune-package-contract.test.ts`,
  and tracked by generator-shape conformance as generated package contract
  outputs.
- Contract status: present with policy-rule operations for raw process env
  access, raw Node API access, arbitrary package-manager/script surfaces, and
  non-generated repeated architecture shapes.
- Package views: policy result, rule finding, waiver summary, adapter
  allowlist, raw env finding, raw Node API finding, package-manager surface
  finding, and service-shape finding atoms/Reactivity keys are declared.
- Package evidence: `PackageLayer`, `PackageTestLayer`, exact
  `PackageFuzzHandlers`, exact `PackageProperties`, and
  `PackageTypeGuidance` are present with commit-tier coverage-search hints.

Phase 4 final-ratchet result:
- Direct package scripts and raw project command strings have been replaced
  by typed Nx executors or inferred targets in active configs.
- Stale-output checks now prove generated contract and materialization files
  match framework/Nx output where required by build/typecheck.
- Implement the concrete oxlint runtime rule for the contract-visible
  `no-arbitrary-package-manager-surfaces` operation, or move it into
  `attune-architecture` if the final policy boundary belongs there.
- Product contracts now import `@attune/framework-protocol`; old
  architecture package-contract surfaces are historical or internal only.

Final cleanup:
- Move hard-coded allowlists into typed contract/config metadata.
- Convert warning/diagnostics-only rule posture into ratcheted package-contract
  policy.
- Arbitrary `run-commands` have been removed from active configs.

Historical pre-ratchet waiver notes:
- Policy infrastructure touching the forbidden APIs it exists to detect.
- Temporary generator-shape allowances during `attune-nx` migration.

## Core Product Ring

### `attuned-discovery`

Current role:
- Core semantic discovery runtime: domain schemas, DiscoveryEvents facade,
  EventLog abstraction, replay projections, read model, Reactivity keys,
  atom workspace, DecisionPacket, FoldScene, WorkbenchSnapshot, and fixtures.
- Large consolidated `src/index.ts` contains most service, schema, projection,
  atom, and fixture material.
- Separate memory read model and projection modules exist under `src/memory`
  and `src/projection`.

Historical command surface before final ratchet:
- `package.json` scripts for build/typecheck/test.
- `project.json` uses direct package-manager/test/build commands.

Current DI/schema/atoms:
- Uses `Context.Service` for `DiscoveryEvents` and `DiscoveryEventLog`, with
  `DiscoveryEventsLive` and `InMemoryDiscoveryEventLogLive`.
- Strong Effect Schema model for run, hypotheses, evidence, decisions, report
  actions, events, and snapshots.
- Strong Reactivity and atom raw material: `ViewKeys`, projection reactivity,
  in-memory reactivity, `viewKeysForDiscoveryEvent`, append/project mutation,
  base atoms, derived atoms, run-scoped atom workspace, and read-model atom
  service.
- Tests already assert event facade usage, projection replay, WorkbenchSnapshot
  decoding, read-model atom refresh, and atom-derived snapshot movement.

Target contract:
- Package kind: `core-discovery-runtime`.
- Services: `DiscoveryEvents`, `DiscoveryEventLog`, read model, projection
  service, Reactivity runtime, atom workspace service, fixture harness service.
- Operations:
  - `event-facade`: event appends through `DiscoveryEvents`.
  - `projection`: event replay and read-model projection.
  - `query`: read-model reads and snapshot derivation.
  - `atom-family`: base/derived/workbench atoms.
  - `codec`: domain packet and event decoding.
- Layers: canonical `Effect.Service` replacements or generated wrappers, plus
  deterministic in-memory `PackageTestLayer`.
- Schemas: all existing domain and event schemas become operation and view
  contract inputs/outputs.

Target atom/Reactivity views:
- Existing run, metrics, anchors, families, hypotheses, evidence, review queue,
  score features, plateau, decision packet, FoldScene, and WorkbenchSnapshot
  atoms become contract-declared graph nodes.
- Operation-to-view edges start from event facade and projection operations,
  through `ViewKeys`, into base atoms and derived package views.

Target property evidence:
- Schema-derived event sequences and report action sequences.
- Projection laws: deterministic replay, idempotent duplicate behavior where
  declared, monotonic versioning, required Reactivity key movement.
- Atom-family laws: base atoms refresh on keys, derived atoms compose base
  atoms, WorkbenchSnapshot changes coherently with projection changes.
- V8 feedback over event variants, invalid promotion paths, and atom derivation
  branches.

Phase 5 integration status:
- Package contract shard: generated and root-ledger tracked as
  `attuned-discovery.package-contract` in `attune.generator-shapes.json`.
- Generated paths:
  `src/attune.package.ts`, `src/attune.package.typecheck.ts`, and
  `test/attune-package-contract.test.ts`.
- Owning implementation agent: `attuned-discovery-migration-agent`.
- Source BOM contract shard status: generated and reconciled in the package
  Source BOM shard.
- Integration validation: `attuned-discovery` typecheck/test,
  product boundary validation, `workspace:package-contracts-check`, and
  OpenSpec validation passed after root manifest reconciliation.

Phase 5 final-ratchet result:
- Replace descriptor-only property/RPC evidence with generated runtime
  execution once the shared harness lands.
- Keep consolidated-file and `Context.Service` waivers visible until the
  service/event/projection/atom generators migrate those shapes.

Final cleanup:
- Split the consolidated `src/index.ts` by generated event/projection/atom
  grammar where practical.
- Package scripts and arbitrary `run-commands` have been removed from active configs.
- Replace Source BOM migration waiver for consolidated files with generated
  package-contract provenance.

Historical pre-ratchet waiver notes:
- Existing `Context.Service` DI until canonical service migration lands.
- Drizzle table ownership boundary while persistence layer is separated.
- Consolidated file shape until generators own event/projection/atom families.

### `cocoindex-effect`

Current role:
- Effect boundary for CocoIndex semantic recall and repository intelligence.
- Normalizes command/MCP search results into Attune anchor cards.
- Owns generated MCP schema and generated MCP tool registry.

Historical command surface before final ratchet:
- `package.json` scripts for build/typecheck/test.
- `project.json` has direct build/test/lint commands plus generation targets
  for MCP schema and tool registry.
- Generator scripts read `COCOINDEX_MCP_*` environment variables.

Current DI/schema/properties:
- `CocoIndexClient` and `RepositoryIntelligence` use `Context.Service`.
- Live clients spawn subprocesses or MCP stdio and merge `process.env`.
- Fixture client exists as deterministic layer.
- Strong Effect Schema validation for client inputs/outputs, raw CocoIndex
  hits, command envelopes, generated MCP inputs/results, repository sessions,
  and status packets.
- No package atoms, Reactivity keys, FastCheck, worker evidence, or V8 feedback.

Target contract:
- Package kind: `semantic-recall-service`.
- Services: CocoIndex client, RepositoryIntelligence, MCP lifecycle, command
  lifecycle, fixture lifecycle, repository tool status service.
- Operations:
  - `query`: search anchors, similar anchors, get anchor, repository session.
  - `command`: ensure indexed and command/MCP execution.
  - `codec`: raw hit normalization and MCP result decoding.
  - `generator`: generated MCP schema and tool registry sync.
- Layers: canonical `Effect.Service` or generated wrappers; `PackageTestLayer`
  uses fixture anchors and no live subprocess.
- Schemas: all existing request/result schemas plus repository session/status
  schemas.

Target atom/Reactivity views:
- `indexStatusAtom`
- `searchRequestAtom`
- `searchResultAtom`
- `normalizedAnchorsAtom`
- `anchorLookupAtom`
- `repositoryToolStatusAtom`
- Reactivity keys for index freshness, search result, anchor lookup, MCP tool
  registry, and repository lifecycle status.

Target property evidence:
- Schema-derived search and raw hit inputs.
- Codec laws for normalization stability, score clamping, top-K ordering,
  location normalization, vocabulary tokenization, and missing-anchor failures.
- Query laws for fixture determinism and schema-valid outputs.
- V8 feedback over MCP decode fallbacks, subprocess error paths, and filter
  branches.

Phase 5 integration status:
- Package contract shard: generated and root-ledger tracked as
  `cocoindex-effect.package-contract` in `attune.generator-shapes.json`.
- Generated paths:
  `src/attune.package.ts`, `src/attune.package.typecheck.ts`, and
  `test/attune-package-contract.test.ts`.
- Owning implementation agent: `cocoindex-effect-migration-agent`.
- Source BOM contract shard status: generated and reconciled in the package
  Source BOM shard.
- Integration validation: `cocoindex-effect` typecheck/test,
  product boundary validation, `workspace:package-contracts-check`, and
  OpenSpec validation passed after root manifest reconciliation.

Phase 5 final-ratchet result:
- Replace hidden CocoIndex/MCP environment and subprocess dependencies with
  contract-visible Effect Config/service boundaries or explicit temporary
  waivers.
- Replace descriptor-only property/RPC evidence with generated runtime
  execution once the shared harness lands.

Final cleanup:
- Replace hidden environment reads with Effect Config/service dependencies.
- Move MCP schema generation behind a typed Nx executor.
- Package scripts, arbitrary `run-commands`, and direct generation shell
  surfaces have been removed from active configs or routed through typed
  executor boundaries.
- Generate Source BOM/tool registry review artifacts from contract and
  generator provenance.

Historical pre-ratchet waiver notes:
- Live subprocess/MCP boundary.
- Current `Context.Service` shape.
- Checked-in MCP schema snapshot while toolchain versioning is made typed.

### `attune-foldkit`

Current role:
- Product FoldKit UI package: model/message/update/view, activity helpers,
  fixture route, constrained MDX/site fixtures, and Workbench views consuming
  Attuned Discovery atom-derived snapshots.

Historical command surface before final ratchet:
- `package.json` scripts for build, lib build, serve, typecheck, and test.
- `project.json` uses direct Vite, tsup, TypeScript, oxlint, and Vitest
  commands.

Current DI/schema/atoms:
- No package-owned Effect service or Layer.
- Uses Effect Schema for UI, activity, MDX, model, and fixture-route data.
- Consumes discovery Reactivity and atom workspace in fixture route and
  workbench fixtures.
- Owns UI read/reasoning state but not durable discovery truth.
- Has a global dev fixture session surface.

Target contract:
- Package kind: `foldkit-ui`.
- Services: FoldKit model/update/view service, fixture route service, MDX/site
  fixture service, UI package view service.
- Operations:
  - `atom-family`: route, selected item, server snapshot lens, scene graph,
    export packet, settings, and route trace views.
  - `codec`: model/message/activity/fixture schemas.
  - `query`: view model derivation.
  - `command`: fixture route commands only when scoped to deterministic test/dev
    harnesses.
- Layers: `PackageTestLayer` runs without live browser, network, or durable
  writes; app/runtime layer optional.

Target atom/Reactivity views:
- `currentRouteAtom`
- `selectedHypothesisAtom`
- `selectedEvidenceAtom`
- `serverSnapshotLensAtom`
- `routeTraceAtom`
- `foldkitSceneAtom`
- `exportPacketAtom`
- Reactivity keys for route changes, fixture route events, server snapshot
  refresh, selected item changes, and scene export changes.

Target property evidence:
- Schema-derived messages, route actions, activity entries, and fixture states.
- Update laws for deterministic state transition, no durable writes from atoms,
  route trace coherence, and snapshot/view consistency.
- V8 feedback over update branches and view-state partitions.

Phase 5 integration status:
- Package contract shard: generated and root-ledger tracked as
  `attune-foldkit.package-contract` in `attune.generator-shapes.json`.
- Generated paths:
  `src/attune.package.ts`, `src/attune.package.typecheck.ts`, and
  `test/attune-package-contract.test.ts`.
- Owning implementation agent: `attune-foldkit-migration-agent`.
- Source BOM contract shard status: generated and reconciled in the package
  Source BOM shard.
- Integration validation: `attune-foldkit` typecheck/test,
  product boundary validation, `workspace:package-contracts-check`, and
  OpenSpec validation passed after root manifest reconciliation.

Phase 5 final-ratchet result:
- Decide the minimal service/layer shape for the UI package without inventing
  fake durable ownership; keep app/runtime layers optional.
- Replace descriptor-only property/RPC evidence with generated runtime
  execution once the shared harness lands.

Final cleanup:
- Generate FoldKit scene atom and fixture shapes.
- Package scripts and arbitrary `run-commands` have been removed from active configs.
- Isolate or eliminate global dev-only fixture session from production
  contract.
- Replace hand-authored fixture waiver with generated provenance.

Historical pre-ratchet waiver notes:
- UI package has no canonical service while model/update/view generator lands.
- Hand-authored fixtures until `foldkit-scene-atom` and fixture generators
  exist.
- Dev-only active fixture session until scoped service exists.

### `attune-pi-agent`

Current role:
- Private Pi agent extension with schemas, permission policy helpers, evidence
  matrices, spec conversation flow, run artifacts, and four Nx-style generators.
- Has the strongest existing property/mutation slice among product packages.

Historical command surface before final ratchet:
- `package.json` scripts for build, lint, mutation, property, test, and
  typecheck.
- `project.json` uses codex package-manager wrappers, direct Vitest/Stryker,
  and direct tsup commands.

Current DI/schema/properties:
- No Effect service or Layer.
- Heavy Effect Schema catalog for implementation specs, permissions, evidence,
  tasks, mutations, property obligations, run events, and Pi conversations.
- Hand-authored FastCheck arbitraries in property tests.
- Mutation target focuses on permission/evidence classifiers.
- Filesystem writes for `.attune-runs`; Pi extension reads repo docs/root.

Target contract:
- Package kind: `agent-extension`.
- Services: permission decision service, spec interview service, evidence
  matrix service, run artifact writer service, Pi extension boundary, generator
  registry service.
- Operations:
  - `policy-rule`: permission classification.
  - `codec`: schema catalog decoding.
  - `generator`: spec, permission-policy, test-obligation, taskplane-task.
  - `command`: run artifact writes through typed service.
  - `query`: evidence matrix/spec conversation views.
- Layers: deterministic `PackageTestLayer` with in-memory artifact store and
  fixture Pi host boundary.

Target atom/Reactivity views:
- `permissionDecisionAtom`
- `specConversationAtom`
- `evidenceMatrixAtom`
- `runArtifactManifestAtom`
- `generatorOutputAtom`
- Reactivity keys for permission profile changes, schema changes, generated
  artifact changes, run artifact writes, and spec conversation updates.

Target property evidence:
- Replace hand-authored arbitraries with Schema-derived base arbitraries plus
  measured transforms/filters where needed.
- Policy-rule laws for deny-first secret path behavior, path normalization,
  command classification, and evidence matrix support status.
- Generator laws for deterministic outputs and provenance.
- Mutation survivors become weak-oracle findings.
- V8 feedback over classifier branches and generator rendering branches.

Phase 5 integration status:
- Package contract shard: generated and root-ledger tracked as
  `attune-pi-agent.package-contract` in `attune.generator-shapes.json`.
- Generated paths:
  `src/attune.package.ts`, `src/attune.package.typecheck.ts`, and
  `test/attune-package-contract.test.ts`.
- Owning implementation agent: `attune-pi-agent-migration-agent`.
- Source BOM contract shard status: generated and reconciled in the package
  Source BOM shard.
- Integration validation: `attune-pi-agent` typecheck/test,
  product boundary validation, `workspace:package-contracts-check`, and
  OpenSpec validation passed after root manifest reconciliation.

Phase 5 final-ratchet result:
- Move hand-authored property arbitraries toward Schema-derived arbitraries
  with measured transforms/filters and preserve mutation survivors as
  weak-oracle findings.
- Replace descriptor-only property/RPC evidence with generated runtime
  execution once the shared harness lands.

Final cleanup:
- Move filesystem writing and Pi host access behind typed services.
- Package scripts and arbitrary `run-commands` have been removed from active configs.
- Replace custom arbitrary-only tests with generated boundary properties.
- Convert Pi generator provenance into contract-derived ledgers.

Historical pre-ratchet waiver notes:
- Pi host extension boundary.
- Filesystem run artifact writer.
- Existing custom FastCheck arbitraries until Schema-derived harnesses cover
  the same partitions.

## Proof Ring

### `joern-effect`

Current role:
- Generated TypeScript and Effect bindings for Joern CPGQL.
- Split between pure query/program builder, generated Joern schema/traversal
  modules, edge runtime/process/transport, examples, and tests.
- Uses Effect 3 while other newer platform packages use Effect 4 beta.

Historical command surface before final ratchet:
- `package.json` scripts for build/test/typecheck/generate/readme/schema
  extraction.
- `project.json` has many direct generation and toolchain command strings,
  including environment-dependent Joern schema extraction.
- `scripts/generationStage.ts` is currently a migration stub for many stage
  names.

Current DI/schema/properties:
- Runtime `Joern` and `CpgProgramBuilder` use `Context.Tag`.
- Joern runtime reads environment through an `EnvVars` module and resolves
  binaries from `JOERN_BINARY` or `PATH`.
- Pure program/evidence model uses Effect Schema classes for evidence graphs,
  findings, graph facts, and protocol deviations.
- Generated property metadata uses Effect Schema.
- Property tests exist in `joern-effect-properties`, not uniform package
  contract evidence here.

Target contract:
- Package kind: `joern-runtime-and-dsl`.
- Services: Joern runtime, Joern server/process boundary, transport, CPG program
  builder, schema/codegen service, template registry service.
- Operations:
  - `query`: typed Joern query execution and raw query escape hatch.
  - `joern-template`: known template registry operations.
  - `codec`: query result, evidence graph, schema/codegen decoding.
  - `generator`: schema modules, node types, property metadata, traversal DSL,
    README, template registry/bindings/evidence, fast-check arbitraries.
  - `resource-provider`: scoped Joern server lifecycle.
- Layers: canonical wrappers where possible; lower-level scoped runtime may need
  temporary `Context.Tag` waiver until generator supports scoped services.
- Schemas: generated schema metadata, Query outputs, EvidenceGraph, Finding,
  GraphFact, ProtocolDeviation, codegen input/output summaries.

Target atom/Reactivity views:
- `joernSchemaAtom`
- `templateRegistryAtom`
- `queryPlanAtom`
- `queryEvidenceAtom`
- `generatedDslCoverageAtom`
- `serverLifecycleAtom`
- Reactivity keys for schema snapshot changes, generated module changes,
  query/template execution, server lifecycle, and evidence graph materializing.

Target property evidence:
- Schema-derived query result rows and evidence graph values.
- Joern-template laws for binding/evidence schema decode and deterministic
  emitted CPGQL.
- Generator laws for deterministic generated DSL, generated schema order, and
  README rendering.
- Resource-provider laws for scoped server observed-state behavior.
- V8 feedback over CPGQL emission, schema normalization, graph algorithms, and
  runtime error paths.

Phase 6 preflight status:
- Package contract shard: not yet added to the root generator-shape manifest.
- Package Source BOM ratchet state: not yet added.
- Coordinator rule: do not add planned proof package-contract entries or spawn
  proof migration agents until the contract metadata assertion, product
  contract decode/summary guard, and package-contract generator executability
  checks are fixed.

Phase 6 final-ratchet result:
- Add the package-local contract, compile-only assertions, focused contract
  test, and Source BOM contract shard.
- Preserve descriptor-first RPC/property evidence until the shared runtime
  harness can import the target Effect/RPC versions safely.
- Rehome generation-stage stubs, Joern schema extraction, README rendering, and
  proof-pressure command strings behind typed Nx executors or inferred targets.
- Make environment and Joern binary discovery contract-visible through Effect
  Config/service boundaries or explicit waivers.

Final cleanup:
- Replace generation-stage stub with real typed Nx executor stages.
- Package scripts and arbitrary `run-commands` have been removed from active configs.
- Replace env reads with Effect Config/service boundary.
- Make raw CPGQL an explicit contract operation with policy visibility.
- Convert generated artifacts and README to contract-derived generated ledgers.

Historical pre-ratchet waiver notes:
- Scoped Joern server/process lifecycle.
- Raw CPGQL escape hatch.
- Effect version split until workspace chooses a migration path.
- External Joern binary/schema extraction boundary.

### `joern-effect-properties`

Current role:
- Property/fuzz/proof-pressure package for `joern-effect`.
- Owns `attuneProperty`, Axiom/local event telemetry, source-sink pipeline,
  semantic corpus, counterexample store, mutator, admission, oracle, workspace
  pool, scheduler, and CLI scripts.

Historical command surface before final ratchet:
- `package.json` scripts for property, test, typecheck, fuzz tiers.
- `project.json` has direct Nix, Arion, timeout, codex wrappers, TSX scripts,
  environment variables, and direct Vitest wrapper spawning.
- CLI scripts parse args and environment directly.

Current DI/schema/properties:
- Many services use `Context.Tag`: property runtime, corpus store,
  counterexample store, semantic mutator, admitter, oracle, telemetry,
  workspace pool, scheduler.
- Strong Effect Schema model for corpus, mutations, expectations,
  counterexamples, cases, admissions, run summaries, source-sink pipeline
  observations, oracle comparisons, and recipe candidates.
- Existing property tests use FastCheck and some Effect Schema `Arbitrary.make`.
- `attuneProperty` emits run/case/counterexample/shrink evidence but is
  package-local and non-workerized.
- Fuzzer has seed/replay/counterexample concepts already, but not the new
  package-boundary evidence shape.

Target contract:
- Package kind: `property-proof-runtime`.
- Services: property evidence runner, event telemetry, corpus store,
  counterexample store, mutator, admission, oracle, workspace pool, scheduler,
  coverage feedback service.
- Operations:
  - `query`: corpus/counterexample listing and telemetry summaries.
  - `command`: record counterexample and run fuzzer.
  - `projection`: event/evidence summary projection.
  - `generator`: semantic case/mutation generation.
  - `resource-provider`: workspace pool allocation and container/Joern
    execution boundaries.
  - `codec`: all fuzz/source-sink schemas.
- Layers: canonical services where possible; temporary scoped/resource
  boundaries for workspace pool and Joern/container execution.
- Schemas: all fuzz domain and source-sink pipeline schemas plus new property
  evidence, transform/filter, worker, V8, and atom graph coverage schemas.

Target atom/Reactivity views:
- `propertyRunAtom`
- `fuzzRunAtom`
- `corpusAtom`
- `counterexampleAtom`
- `workerShardAtom`
- `coverageFeedbackAtom`
- `weakOracleFindingAtom`
- Reactivity keys for corpus changes, promoted counterexamples, worker shard
  completion, telemetry flush, coverage feedback, and oracle findings.

Target property evidence:
- Promote `attuneProperty` into shared package-boundary property runtime.
- Use `@fast-check/worker` for workerized targets.
- Preserve seed/path/shrink when main-thread random source is possible.
- Record transform/filter metadata and rejection rates.
- Capture V8/Istanbul batch and shard deltas.
- Merge evidence by package, operation, coverage point, atom graph edge, seed,
  shrink path, worker, and shard.

Phase 6 preflight status:
- Package contract shard: not yet added to the root generator-shape manifest.
- Package Source BOM ratchet state: not yet added.
- Coordinator rule: do not add planned proof package-contract entries or spawn
  proof migration agents until the contract metadata assertion, product
  contract decode/summary guard, and package-contract generator executability
  checks are fixed.

Phase 6 final-ratchet result:
- Add the package-local contract, compile-only assertions, focused contract
  test, and Source BOM contract shard.
- Wire the package-boundary property, coverage-search, worker, corpus, mutator,
  oracle, telemetry, and counterexample surfaces into the shared evidence
  shape without deleting existing stronger proof-pressure behavior.
- Rehome direct Nix/Arion/env command strings, CLI argument parsing, Vitest
  spawning wrappers, and proof/fuzz package scripts behind typed Nx executors
  or inferred targets.
- Convert Axiom/local telemetry configuration and workspace/container
  lifecycle boundaries to Effect Config/service boundaries or explicit waivers.

Final cleanup:
- Replace CLI scripts with typed Nx property/fuzz executors.
- Package scripts, arbitrary `run-commands`, direct env variables, direct
  Nix/Arion command strings, and Vitest spawning wrappers have been removed
  from active configs or routed through typed executor boundaries.
- Convert Axiom/local event config to Effect Config/service boundary.
- Move package-local evidence shape into shared contract evidence shape.

Historical pre-ratchet waiver notes:
- Workspace pool filesystem/container lifecycle.
- Joern execution boundary.
- Axiom telemetry adapter.
- Effect version split with `joern-effect`.

## Platform Ring

### `platform-alchemy-k8s`

Current role:
- Effect and Alchemy-shaped Kubernetes platform resource package.
- Owns CRD definitions, CRD codegen, generated CRD TypeScript and JSON
  manifests, resource builders, resource registry, Alchemy graph resource, and
  dry-run/test/live Kubernetes object-set providers.

Historical command surface before final ratchet:
- `package.json` scripts for build/generate/typecheck/test.
- `project.json` has direct tsup, TypeScript, oxlint, Vitest, TSX generation,
  sync generator, and `TMPDIR` shell fragments.
- `scripts/generationStage.ts` shells to `pnpm exec tsx` and `pnpm exec nx`.
- Local cluster helper emits command arrays for kind/k3d-style operations.

Current DI/schema/providers:
- Uses Effect Schema for Kubernetes objects, resource sets, provider results,
  CRD definitions, specs, and statuses.
- Uses Alchemy v2 provider collection and resource binding model.
- Kubernetes object provider has `Live`, `DryRun`, and `Test` modes; current
  live provider is still in-memory style and needs real observation semantics
  before promotion.
- No package atom/Reactivity graph yet.

Target contract:
- Package kind: `platform-resource-provider`.
- Services: CRD definition registry, CRD generator, Kubernetes resource
  registry, Alchemy Kubernetes graph provider, Kubernetes object-set provider,
  local cluster plan provider.
- Operations:
  - `resource-provider`: Kubernetes graph render/read/diff/apply/delete.
  - `generator`: CRD manifests, CRD types, resource registry.
  - `codec`: Kubernetes object/resource-set/CRD schema decoding.
  - `query`: plan/render/diff views.
- Layers: canonical services for registries and providers; provider collection
  exposed through package contract; deterministic test layer with in-memory
  object world.
- Schemas: CRD definitions, generated metadata, resource-set outputs,
  provider result, diff entries, local cluster plan.

Target atom/Reactivity views:
- `crdRegistryAtom`
- `resourceRegistryAtom`
- `resourcePlanAtom`
- `kubernetesDiffAtom`
- `providerEvidenceAtom`
- `resourceReadinessAtom`
- Reactivity keys for CRD definition changes, generated CRD outputs, resource
  builder changes, provider diff/apply evidence, and cluster readiness.

Target property evidence:
- Schema-derived CRD/resource inputs.
- Resource-provider laws: render/validate/read/diff/apply/delete behavior,
  non-mutating dry-run, test-mode observed-state idempotence, stable object
  keys, and no destructive apply without observation.
- Generator laws for deterministic CRD JSON/types and registry order.
- V8 feedback over schema normalization, CRD rendering, diff operations, and
  provider mode branches.

Final cleanup:
- Replace shell generation stages with typed Nx executors.
- Package scripts and arbitrary `run-commands` have been removed from active configs.
- Convert local cluster command arrays into typed executor/resource-provider
  plans or remove them from public package API.
- Generate Source BOM/resource registry review artifacts from contract and
  generator provenance.

Historical pre-ratchet waiver notes:
- Local cluster inventory mode.
- Provider live-mode placeholder semantics until real Kubernetes observation
  exists.
- Alchemy provider collection shape if canonical service generator cannot
  represent it initially.

### `home-deployment`

Current role:
- Effect/Alchemy-shaped Day-0 ThinkCentre deployment graph.
- Owns deployment model, typed runbook resources, Alchemy resource providers,
  provider transition simulation/live execution, local state, lifecycle graph,
  manual gates, destructive approvals, LAN discovery, SOPS, Tailscale, Disko,
  nixos-anywhere, comin, and network smoke.

Historical command surface before final ratchet:
- `package.json` scripts for build/typecheck/test.
- `project.json` uses direct tsup, TypeScript, and Vitest.
- `alchemy.run.ts` reads many `ATTUNE_*` environment variables and is itself a
  direct Alchemy entrypoint.
- Model emits many shell command plans for Nix, Tailscale, SOPS, SSH, USB, and
  nixos-anywhere.

Current DI/schema/providers:
- `PlatformProviderServices` uses canonical `Effect.Service`.
- Alchemy provider collection/resources are v2 resources and bind plan,
  dependency, evidence, manual action, secret, and observation metadata.
- Provider transitions already enforce typed manual proof for machine binding,
  USB write, and nixos-anywhere install.
- Destructive resources are partially idempotent-by-observation: if desired
  state is observed, return observed; otherwise require proof before apply.
- Live provider executes shell commands with `spawnSync` and redacts known
  secret patterns.
- Local state reads/writes JSON through direct filesystem APIs and env defaults.

Target contract:
- Package kind: `day0-resource-runbook`.
- Services: deployment config service, Day-0 plan service, lifecycle graph
  service, provider transition service, Alchemy stack service, local state
  service, manual proof service, command rendering/execution boundary.
- Operations:
  - `resource-provider`: every provider transition and Alchemy resource.
  - `projection`: plan-to-lifecycle graph and state-to-gate projection.
  - `query`: next agent step, plan summary, phase summary, provider blockers.
  - `command`: state record/update and proof confirmation through typed service.
  - `codec`: config, planned resource, evidence, state, provider result.
- Layers: `PackageLayer` exposes provider services and external requirements;
  `PackageTestLayer` uses test providers and in-memory state.
- Schemas: existing config/model/state/provider schemas plus package evidence,
  manual proof, destructive approval, observation proof, and typed command
  intent schemas.

Target atom/Reactivity views:
- `deploymentPlanAtom`
- `phaseSummaryAtom`
- `nextAgentStepAtom`
- `hostReadinessAtom`
- `providerGateAtom`
- `destructiveApprovalAtom`
- `tailscaleMaterialAtom`
- `sopsRecipientAtom`
- `networkSmokeAtom`
- Reactivity keys for state file changes, gate confirmation, provider
  transition evidence, host readiness, SOPS recipient rotation, Tailscale
  readiness, and destructive approval.

Target property evidence:
- Schema-derived deployment configs, gate states, host subsets, provider modes,
  resource statuses, and manual proof records.
- Resource-provider laws for every provider kind:
  - blocked resources do not apply,
  - ready resources return observed,
  - dry-run does not mutate,
  - test apply mutates only test state,
  - live apply first observes existing desired state,
  - destructive resources require current observation proof plus current manual
    approval when not already installed/observed.
- Specific law: `nixos-anywhere-install` first asks whether this host is already
  installed as the desired host. If yes, it returns Observed/Applied evidence;
  if no, it requires current disk proof and current destructive approval.
- V8 feedback over provider dispatch, proof gate matching, blocked/ready/planned
  branches, redaction paths, and state projection branches.

Final cleanup:
- Replace direct `alchemy.run.ts` environment parsing with typed Nx/Alchemy
  executor options and Effect Config-backed package services.
- Package scripts and arbitrary `run-commands` have been removed from active configs.
- Replace shell command strings in the public model with typed command intent
  records rendered only inside the typed executor/provider boundary.
- Move local filesystem state behind an Effect service.
- Keep Alchemy bindings as contract-visible resource/provider evidence, not
  ad hoc plan metadata.
- Remove Source BOM Day-0 migration waiver after generators own provider/runbook
  grammar.

Historical pre-ratchet waiver notes:
- Live shell execution boundary.
- Local filesystem state adapter.
- Day-0 resource grammar until `@attune/nx` owns provider/runbook generation.
- Human hardware/destructive review gates, which remain real but must be typed
  contract resources rather than migration exceptions.
