# Parallel Agent Migration Plan

This migration is an aggressive in-place fork of the package architecture. It
is complete only when every active package has moved to the canonical
Effect-first Attune Framework/package contract shape, every public workflow is
Nx-owned, protocol descriptors and evidence are materialized through the local
private framework runtime/cache, language-service diagnostics are the primary
rich UX, and no migration-only aliases, stale command surfaces, manual source
ledgers, checked-in protocol reports, or diagnostics-only exceptions remain.

The implementation should use parallel subagents as first-class implementers,
not just readers. Each wave has implementation agents and independent
validation agents. Agents work in disjoint ownership slices, produce concrete
patches, run focused validation, and hand off exact changed files, generated
artifacts, diagnostics, and remaining blockers.

## Operating Rules

- Treat the OpenSpec change as the contract of record:
  `standardize-effect-package-contracts`.
- Work in-place on the repository. Do not build a compatibility fork,
  sidecar package, or long-lived migration layer.
- Keep write ownership disjoint within each wave. If a slice needs another
  agent's files, stop and hand off instead of silently expanding scope.
- Prefer `@attune/nx` generators and sync generators over hand-written repeated
  shapes. If a generator is missing, implement or extend it before migrating
  many packages by hand.
- Treat language-service diagnostics and Nx check output as the agent starting
  point once the framework runtime exists. Agents should repair diagnostics,
  use deterministic generators/code actions, and run whitelisted checks rather
  than inspect raw repo internals, raw SQLite, checked-in reports, or generated
  ledger files.
- Make type-level guarantees first. Architecture policy should consume typed
  helper output, generated assertion modules, Schema-backed ledgers, and
  property evidence rather than duplicate local package checks.
- Validation agents are not passive reviewers. They add or tighten tests,
  create failing fixtures, run Nx/OpenSpec checks, and file concrete findings
  back to the owning implementation agent.
- Do not mark a package migrated until its final package contract, compile-only
  type assertions, package view graph, generated property/evidence surface,
  Nx targets, docs/generator provenance, and cleanup are all complete.

## Handoff Packet

Every subagent final report and every integration checkpoint must use this
packet:

```text
Agent:
Wave:
Ownership:
Changed:
- ...

Generated:
- ...

Validated:
- ...

Not run:
- ...

Contract status:
- package:
- PackageContract:
- PackageLayer:
- PackageTestLayer:
- attune.package.typecheck:
- PackageTypeGuidance:
- package views:
- property evidence:
- Nx targets:

Residual migration debt:
- ...

Blocked by:
- ...

Next agent:
- ...
```

## Phase 0: Foundation Freeze And Worktree Survey

Purpose: establish the common ground for parallel work and prevent agents from
optimizing against stale package names or stale command surfaces.

Implementation agents:

- `foundation-rename-agent`
  - Owns: final `attune-architecture` package rename plan and initial rename
    patch.
  - Writes: package/project/bin/docs references for the architecture package,
    plus compatibility cleanup required by the rename.
  - Must not modify package contract runtime semantics beyond rename support.
- `workspace-surface-agent`
  - Owns: root `project.json`, package target inventory, command-surface scan,
    and initial target naming cleanup.
  - Writes: workspace target definitions and architecture command-surface
    fixtures only.
- `generator-inventory-agent`
  - Owns: `packages/attune-nx` generator inventory and gaps.
  - Writes: generator planning fixtures/tests or generator TODO fixtures only
    unless assigned an implementation wave.

Validation agents:

- `openspec-validation-agent`
  - Runs OpenSpec validation after each integrated foundation patch.
  - Adds spec conformance notes when tasks and design drift.
- `workspace-validation-agent`
  - Runs `nx graph`, target discovery, and command-surface checks.
  - Produces a package/target debt table for Phase 1.

Exit criteria:

- Final package identity is `attune-architecture`; old
  `attune-architecture-lint` references are migration notes only.
- The minimal public Nx surface is visible:
  `workspace:policy-fast`, `workspace:policy-proof-pressure`, and focused
  diagnostic targets such as `workspace:package-contracts-check`.
- The package migration inventory matches the real workspace project list.

## Phase 1: Contract Type Kernel

Purpose: build the type-level compiler first so package migrations fail at
typecheck before runtime policy tries to infer local mistakes.

Implementation agents:

- `contract-types-agent`
  - Owns: Effect Schema-backed contract model, operation taxonomy,
    `definePackageContract`, `definePackageViews`, `touches`, `inferLaws`,
    branded diagnostics, and type helper exports.
  - Writes: architecture/contract model source and tests only.
- `compile-assertion-agent`
  - Owns: generated `src/attune.package.typecheck.ts` shape and assertion
    helpers such as `AssertPackageContract`, `AssertExactHandlers`,
    `AssertPropertyHarnesses`, `AssertLayerSatisfiesRequiredServices`, and
    `AssertTypeGuidanceComplete`.
  - Writes: type assertion helpers, fixture contracts, and typecheck tests.
- `law-inference-agent`
  - Owns: operation-kind metadata gates and inferred law maps.
  - Writes: law inference helpers and fixtures for every canonical operation
    kind.
- `type-guidance-agent`
  - Owns: `PackageTypeGuidance` type model, Schema-backed guidance encoding,
    and type partition derivation from Schema/contract metadata.
  - Writes: guidance model, generation helpers, and tests.

Validation agents:

- `type-negative-fixture-agent`
  - Adds negative fixture contracts for duplicate ids, invalid laws, invalid
    views, missing metadata, handler extras/gaps, layer gaps, stale guidance,
    and incorrect replay/evidence types.
- `type-budget-agent`
  - Measures TypeScript diagnostics and extended compile-time cost for contract
    typechecking; recommends cached target boundaries.

Exit criteria:

- Type-level fixture tests fail for the right reason before runtime checks.
- Runtime conformance has explicit backstop coverage only for TypeScript
  limitations and generated-file boundaries.
- Agents can generate a minimal package contract and see compile-only
  diagnostics for missing pieces.

## Phase 1A: Attune Framework Foundation

Purpose: establish root `framework/` as the programming model and hide protocol
runtime internals before more package waves produce additional generated
source, property evidence, and agent-facing diagnostics.

Implementation agents:

- `framework-layout-agent`
  - Owns: root `framework/` layout, workspace inclusion plan, Nx project naming,
    package names, and import-boundary plan.
  - Writes: framework project scaffolding plan, workspace configuration, and
    import-boundary fixtures when implementation begins.
- `framework-protocol-agent`
  - Owns: `framework/protocol` public DSL, descriptors, operation builders,
    obligations, evidence/delta schemas, waiver/repair-action schemas, and
    descriptor hashing.
  - Writes: public framework protocol package/module, tests, and generator
    fixtures.
- `framework-runtime-agent`
  - Owns: private `framework/runtime` `ProtocolRuntime`, `ProtocolQuery`,
    `ProtocolDiagnostics`, `ProtocolProjection`, diagnostic source model, and
    repair-plan services.
  - Writes: runtime package/module, Effect layers, Schema-coded service
    boundaries, and projection tests.
- `framework-sqlite-agent`
  - Owns: `framework/sqlite` local SQLite/Drizzle lifecycle, schema,
    migrations, store health, row codecs, and gitignored cache paths.
  - Writes: sqlite package/module, Drizzle schema/migrations, Effect layers,
    and SQLite lifecycle tests.
- `framework-language-service-agent`
  - Owns: diagnostics, quick info, code actions, code lenses, source range
    mapping, and code-action planning.
  - Writes: `framework/language-service` package/module and projection tests.
- `framework-nx-agent`
  - Owns: deterministic framework generators/executors/materialization actions,
    graph integration, local cache checks, and language-service code-action
    compatibility.
  - Writes: `framework/nx` package/module, generator/executor tests, and no
    checked-in report checks.
- `framework-testing-agent`
  - Owns: operation registry, evidence producers, FastCheck hooks, replay
    helpers, and atom graph observer helpers.
  - Writes: `framework/testing` package/module and evidence fixtures.

Validation agents:

- `framework-information-hiding-validation-agent`
  - Adds import-boundary fixtures rejecting product package imports of
    framework runtime/sqlite/language-service/Nx internals, raw Drizzle, and
    ProtocolStore internals.
- `framework-diagnostics-validation-agent`
  - Adds ProtocolDelta-to-diagnostic projection, quick info, code-action, code
    lens, source range, and generated source ownership fixtures.
- `framework-cache-validation-agent`
  - Adds SQLite lifecycle, deterministic hashing, stale generated source,
    gitignored cache, no checked-in reports, and cache invalidation fixtures.

Exit criteria:

- Root `framework/` shape is implemented or explicitly staged with equivalent
  boundaries.
- Product packages see only public framework DSL/testing imports and generated
  local artifacts.
- Protocol descriptors, obligations, generated artifact records, evidence
  events, deltas, waivers, repair actions, and diagnostics are Effect
  Schema-coded.
- SQLite Protocol Store can initialize, migrate, record descriptors and
  evidence, compute internal deltas, and answer package summaries through
  private framework services.
- Language service is the primary rich view: diagnostics, quick info, code
  actions, and code lenses read `ProtocolQuery`/`ProtocolDiagnostics`.
- Nx can materialize descriptors, obligations, generated source, generated
  artifact hashes, and local cache state deterministically.
- MCP and checked-in reports are not required for the core framework path.
- Source BOM and generator-shape are legacy migration scaffolding or temporary
  compatibility views, not final semantic workflow surfaces.

## Phase 2: Nx Generator And Executor Surface

Purpose: make generated source the normal path before migrating packages.

Implementation agents:

- `effect-service-generator-agent`
  - Owns: `@attune/nx:effect-service` canonical `Effect.Service` output,
    operation schema slots, contract registration, `PackageLayer`, and
    `PackageTestLayer`.
- `package-contract-generator-agent`
  - Owns: package-contract generator or sync generator for
    `src/attune.package.ts`, compile-only assertion module, and
    `PackageTypeGuidance`.
- `atom-view-generator-agent`
  - Owns: Reactivity key, base atom, derived atom, package view atom, and atom
    graph registration generators.
- `executor-surface-agent`
  - Owns: generic Nx executor family:
    `attune:package-check`, `attune:generated`, and `attune:toolchain`.
- `nx-graph-agent`
  - Owns: contract discovery, inferred targets, affected-run propagation, and
    generated graph metadata.

Validation agents:

- `generator-snapshot-agent`
  - Adds deterministic generator snapshot tests for canonical service,
    package contract, assertion module, type guidance, atom graph,
    Schema-coded harness, optional RPC backend, property harness, and generated
    ledger outputs.
- `command-surface-validation-agent`
  - Adds tests that reject arbitrary `run-commands`, package scripts,
    package-manager wrappers, raw Nix/tool invocations, and stale
    `workspace:policy-architecture` guidance.

Exit criteria:

- Repeated package shapes can be created or synced with `@attune/nx`.
- Generated outputs are deterministic and stale output checks fail cleanly.
- Public workflow examples use Nx targets/generators only.

## Phase 3: Property, Harness, Worker, And Evidence Runtime

Purpose: make every package boundary fuzzable and evidence-producing through a
uniform generated harness.

Implementation agents:

- `harness-agent`
  - Owns: generated internal Schema-coded package harnesses, optional RPC
    backend groups, operation harness entries, control operations, handler
    layers, and operation registry.
- `property-runtime-agent`
  - Owns: reusable package-boundary property wrapper, Schema arbitrary
    derivation, output/error validation, replay metadata, and evidence schema.
- `worker-fuzz-agent`
  - Owns: `@fast-check/worker` integration, worker-aware assertions,
    isolation levels, shard metadata, timeout reporting, and random-source
    tradeoffs.
- `coverage-search-agent`
  - Owns: type-guidance partition coverage, atom graph movement coverage,
    V8/Istanbul feedback, transform/filter telemetry, weak-oracle findings,
    and corpus retention.

Validation agents:

- `property-negative-agent`
  - Adds fixtures for dead harness paths, missing type partitions, high filter
    rejection, unreachable expected errors, missing atom movement, and
    undeclared typed errors.
- `worker-validation-agent`
  - Runs targeted workerized property tests and verifies deterministic evidence
    merge behavior.

Exit criteria:

- Generated harnesses call public package boundaries through Effect RPC and
  `PackageTestLayer`.
- Evidence records type-guidance partitions, Schema branches, laws, atom graph
  movement, V8 coverage deltas, worker/shard metadata, replay seeds, and
  counterexamples.

## Phase 4: Tooling Package Migration

Purpose: migrate the packages that define the grammar before product packages
depend on it.

Implementation agents:

- `attune-nx-migration-agent`
  - Owns: `packages/attune-nx`.
  - Migrates generator services, generator plan atoms, generated file diff
    atoms, provenance atoms, and property evidence.
- `attune-architecture-migration-agent`
  - Owns: `packages/attune-architecture`.
  - Migrates policy-rule operations, policy finding atoms, waiver summary
    atoms, package-contract coverage atoms, and final ratchet checks.
- `effect-oxlint-policy-migration-agent`
  - Owns: `packages/effect-oxlint-policy`.
  - Migrates policy-rule operations, policy result atoms, and generated
    property evidence.

Validation agents:

- `tooling-policy-validation-agent`
  - Runs package typechecks, generator tests, architecture policy tests,
    `workspace:package-contracts-check`, and stale generated output checks.

Exit criteria:

- Tooling packages are fully contract-bearing and no longer depend on manual
  BOM/generator-shape source truth.

## Phase 5: Product Package Migration

Purpose: migrate the product/runtime packages in parallel after the tooling
surface stabilizes.

Implementation agents:

- `attuned-discovery-migration-agent`
  - Owns: `packages/attuned-discovery`.
  - Migrates discovery events, EventLog facade, projections, Reactivity keys,
    base atoms, derived atoms, DecisionPacket atoms, and WorkbenchSnapshot
    atoms.
- `cocoindex-effect-migration-agent`
  - Owns: `packages/cocoindex-effect`.
  - Migrates client/repository intelligence services and recall/result package
    view atoms.
- `attune-foldkit-migration-agent`
  - Owns: `packages/attune-foldkit`.
  - Migrates model/update/view, scene atoms, fixtures, and generated evidence.
- `attune-pi-agent-migration-agent`
  - Owns: `packages/attune-pi-agent`.
  - Migrates decision, permission, taskplane, evidence matrix generator
    boundaries, and decision/evidence atoms.

Validation agents:

- `product-boundary-validation-agent`
  - Runs project typechecks/tests and validates atom/Reactivity graph movement
    evidence for product packages.

Exit criteria:

- Product packages have no hidden env/filesystem surfaces or hand-maintained
  BOM truth after typed services, executors, and generated ledgers land.

## Phase 6: Proof Package Migration

Purpose: migrate Joern and property infrastructure while preserving stronger
proof-pressure behavior.

Preflight gate:

- Do not spawn proof migration agents until the Phase 5 product truth is
  reconciled across package-local contracts, package Source BOM shards, root
  generator-shape entries, OpenSpec tasks, and workspace checks.
- The contract assertion kernel must reject kind-specific operations whose
  generic `metadata` object lacks the exact required metadata key.
- Product package validation must import and decode the real package
  contracts, summarize operation/view/layer/map/type-guidance surfaces, and
  keep the file-existence guard.
- `@attune/nx:package-contract` must execute through the real Nx generator
  surface in local source mode.
- Generated package-contract root entries must be backed by generated
  package-local Source BOM `contractShards`; generated entries must not keep
  `plannedPaths`.

Implementation agents:

- `joern-effect-migration-agent`
  - Owns: `packages/joern-effect`.
  - Migrates Joern runtime, CPG program builder, traversal DSL, template
    operations, registry atoms, query evidence atoms, and schema coverage.
- `joern-properties-migration-agent`
  - Owns: `packages/joern-effect-properties`.
  - Migrates property harness runtime, corpus store, mutator, scheduler,
    workspace pool, oracle, telemetry, counterexample store services, fuzz run
    atoms, and corpus atoms.

Validation agents:

- `proof-pressure-validation-agent`
  - Runs Joern/property/fuzz targets, mutation smoke where available, and
    evidence merge checks.

Exit criteria:

- Proof packages use the shared property evidence and atom graph coverage
  summary shape.
- Joern/proof scripts and raw command wrappers are replaced by typed Nx
  executors or inferred targets.

## Phase 7: Platform And Day-0 Resource Migration

Purpose: migrate provider/resource packages without weakening destructive
gate behavior.

Implementation agents:

- `platform-alchemy-k8s-migration-agent`
  - Owns: `packages/platform-alchemy-k8s`.
  - Migrates Kubernetes resource/provider operations, generated resource
    shapes, readiness atoms, provider evidence atoms, and CRD generation
    executors.
- `home-deployment-migration-agent`
  - Owns: `packages/home-deployment`.
  - Migrates Day-0 providers, runbook resources, observed idempotence checks,
    destructive gate law packs, host readiness atoms, provider gate atoms, and
    destructive approval state atoms.

Validation agents:

- `provider-safety-validation-agent`
  - Adds and runs non-destructive provider simulations that prove
    idempotent-by-observation behavior, current proof/approval requirements,
    manual gate evidence, and blocked live-provider states.

Exit criteria:

- Destructive providers ask "is the desired state already observed?" before
  requiring or repeating destructive work.
- Platform/home command plans are typed intents rendered only inside
  executor/provider boundaries.

## Phase 8: Docs, Agent Contract, And Final Ratchet

Purpose: make the new shape the only shape.

Implementation agents:

- `agent-docs-agent`
  - Owns: `AGENTS.md`, cloud/local environment docs, generator docs/templates,
    and OpenSpec/agent implementation guidance.
- `ledger-cleanup-agent`
  - Owns: generated BOM-like review artifacts, waiver summaries, architecture
    summaries, and cleanup of manual ledger truth.
- `ratchet-agent`
  - Owns: turning diagnostics-only checks into required failures after all
    packages satisfy minimum contract, atom graph, generated property, command
    surface, no-checked-in-report, and import-boundary requirements.

Validation agents:

- `final-policy-validation-agent`
  - Runs final repo-wide validation:
    `openspec validate standardize-effect-package-contracts --type change`,
    `nx graph`, `workspace:policy-fast`, `workspace:package-contracts-check`,
    package typechecks/tests for all active packages, and proof-pressure smoke
    where available.

Exit criteria:

- Every active package has:
  - `src/attune.package.ts`
  - `PackageContractSchema`
  - `PackageContract`
  - `PackageLayer`
  - `PackageTestLayer`
  - compile-only package typecheck assertions
  - `PackageTypeGuidance`
  - package atom/Reactivity view graph
  - generated property/RPC/evidence harness
  - Nx-owned public targets
  - no stale package scripts or arbitrary `run-commands`
- `workspace:policy-fast` and `workspace:package-contracts-check` are required.
- Heavy proof/fuzz/mutation work is reachable through
  `workspace:policy-proof-pressure`.
- The OpenSpec change is ready to archive with no dangling migration material.

## Integration Cadence

1. Spawn implementation agents for one wave.
2. Spawn validation agents for the same wave with explicit adversarial
   fixtures and commands.
3. Continue local integration work on the critical path while agents run.
4. Review agent handoff packets.
5. Integrate patches in dependency order.
6. Run the wave's validation agents again against the integrated branch.
7. Update `package-migration-inventory.md` only when each package reaches its
   final state.
8. Move to the next wave only when the current wave's exit criteria are met or
   a documented blocker is added to the OpenSpec change.
