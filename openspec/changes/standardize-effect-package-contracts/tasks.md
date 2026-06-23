## 1. Contract Model

- [x] 1.1 Define the Effect Schema-backed Attune package contract model as the package-level descriptor/materialization of an Attune Protocol boundary, including package id, source root, package kind, public auditable operations, optional/minimal package layers, schemas, compact law primitives, inferred law descriptors, coverage expectations, Reactivity keys, package-level atom graph metadata, provenance, and waivers.
- [x] 1.2 Make Effect Schema the authoritative contract authoring, decoding, validation, descriptor-emission, diagnostic projection, and private framework materialization surface.
- [x] 1.3 Add `definePackageContract`, `definePackageViews`, `touches`, `inferLaws`, kind-specific operation builders, branded type diagnostics, compile-only assertion module support, and type helpers for operation ids, Schema decoded/encoded types, valid laws, valid views, RPC specs, exact handler maps, property maps, evidence, replay, counterexamples, type-guidance partitions, and required services.
- [x] 1.4 Classify package-contract invariants by enforcement boundary: TypeScript contract builders for type-expressible local invariants, Effect Schema for runtime/encoded boundary values, Nx/generated sync for repo/file/freshness/command-surface facts, FastCheck/provider observation for behavioral facts, and `attune-architecture` only for residual repo-wide policy.
- [x] 1.5 Define waiver categories and validation rules for lower-level `Context.Tag`, hidden configuration reads, unauditable operations, atom write violations, invalid explicit law claims, invalid view references, and legacy boundaries.
- [x] 1.6 Add contract decoding and validation helpers to the architecture policy package while avoiding duplicate checks for invariants already rejected by typed helpers or Schema decoders.
- [x] 1.7 Rename `attune-architecture-lint` to final package identity `attune-architecture`, including package id, project id, path, bin/docs references, generated ledger owner, and public API surfaces where applicable.
- [x] 1.8 Add fixture contracts that cover canonical services, waived `Context.Tag` services, pure packages with empty/minimal layers, private helpers excluded from operation metadata, duplicate operation ids, invalid law ids, invalid view references, missing kind-specific metadata, missing layers, missing schemas, missing atom view graphs, hidden configuration dependency failures, and the expected boundary that rejects each case.
- [x] 1.9 Add waiver diagnostics/Nx output sourced from local `src/attune.package.ts` waivers, without checked-in waiver summary reports as source truth.
- [x] 1.10 Add final-ratchet checks that reject migration-only aliases, duplicate public command surfaces, expired temporary waivers, stale generated files, checked-in protocol reports, and manually maintained derived ledger/report truth.
- [x] 1.11 Use `package-migration-inventory.md` as the migration checklist and update it only as packages reach their final contract shape.

## 1A. Attune Framework Runtime

- [x] 1A.1 Define root `framework/` project layout outside `packages/`, including `framework/protocol`, `framework/runtime`, `framework/sqlite`, `framework/language-service`, `framework/nx`, and `framework/testing`, plus workspace/Nx inclusion rules.
- [x] 1A.2 Add `framework/protocol` public DSL and Effect Schema descriptors for protocol descriptors, obligations, generated artifact records, evidence events, deltas, waivers, repair actions, and diagnostics.
- [x] 1A.3 Add `framework/runtime` private `ProtocolRuntime`, `ProtocolQuery`, `ProtocolDiagnostics`, and `ProtocolProjection` services behind Effect layers.
- [x] 1A.4 Add `framework/sqlite` local SQLite/Drizzle store behind Effect services, with deterministic descriptor hashing and generated artifact hash recording in gitignored runtime/cache.
- [x] 1A.5 Add `framework/language-service` diagnostics, quick info, code actions, and code lenses as the primary rich framework view over ProtocolDiagnostics.
- [x] 1A.6 Add `framework/nx` generators, executors, graph integration, and materialization actions used by language-service code actions and checks.
- [x] 1A.7 Add `framework/testing` evidence producers, FastCheck hooks, operation registry, replay helpers, and atom graph observer helpers.
- [x] 1A.8 Add import-boundary and information-hiding checks so product packages cannot import framework runtime/sqlite/language-service/Nx internals, raw Drizzle tables, or ProtocolStore internals.
- [x] 1A.9 Add no-checked-in-report policy for ProtocolDelta reports, obligation reports, evidence summaries, Markdown/JSON architecture summaries, Linear/GitHub summaries, and cloud-agent report artifacts.
- [x] 1A.10 Add validation tests for descriptor encoding/decoding, SQLite lifecycle, deterministic hashing, stale generated source diagnostics, ProtocolDelta-to-language-service diagnostic projection, quick info, code-action planning, code lenses, import-boundary rejection, local cache behavior, and no-report-file drift.

## 1B. Static DSL And Mostly-Deduced IDs

- [x] 1B.1 Keep `docs/attuned/Attune Framework Core Primitives.md` current as the canonical primitive vocabulary for packages, services, layers, schemas, operations, commands, queries, projections, codecs, event facades, Reactivity keys, atoms/views, resource providers, generators, policy rules, Joern templates, obligations, evidence, diagnostics, and repair actions.
- [x] 1B.2 Add static framework DSL extraction APIs that use TypeScript compiler/language-service APIs to resolve source declarations, symbols, imports, source ranges, and type information for protocol declarations.
- [x] 1B.3 Add symbol/object-reference authoring helpers for operations, services, schemas, Reactivity keys, atoms/views, laws, waivers, generators, providers, and generated artifact owners.
- [x] 1B.4 Derive stable protocol IDs, explicit ID override behavior, descriptor identity, source ranges, artifact ownership, and repair-action metadata from static source declarations.
- [x] 1B.5 Derive operation-to-view edges by traversing declared Reactivity key -> base atom -> derived atom -> package view atom dataflow.
- [x] 1B.6 Generate exact operation registries, handler maps, property maps, evidence producer maps, type-guidance partitions, and optional RPC descriptors from the operation tuple.
- [x] 1B.7 Add string-reference ratchet diagnostics for avoidable raw string cross-references while preserving serialized IDs for cache, replay, diagnostics, external boundaries, and generated artifacts.
- [x] 1B.8 Add derived ID roundtrip validation for symbol -> descriptor -> serialized ID -> cache/evidence/diagnostic flows.

## 2. Canonical Nx Generators

- [x] 2.1 Update `@attune/nx:effect-service` to emit canonical `Effect.Service` classes with `accessors: true`.
- [x] 2.2 Add generated operation schema slots, operation-kind metadata, kind-specific operation builder usage, inferred-law registration, and law-extension hooks to the service generator.
- [x] 2.3 Add generated `PackageLayer` and `PackageTestLayer` registration to service scaffolds.
- [x] 2.4 Add or extend a package-contract generator or sync generator that creates `src/attune.package.ts`.
- [x] 2.5 Add generators or sync generators for Reactivity keys, base atoms, derived atoms, package view atoms, and package atom graph registration.
- [x] 2.6 Generate Schema-coded internal package harness modules from package contracts, including optional RPC-backed harness groups, operation-specific harness entries, control operations, handler layers backed by `PackageTestLayer`, and operation registries.
- [x] 2.7 Generate worker-compatible property modules with hoisted properties and `propertyFor(new URL(import.meta.url))` for workerized targets.
- [x] 2.8 Add `framework-sync`, `framework-diagnostics`, `protocol-materialize`, language-service materialization hooks, and local cache/check generators or equivalent deterministic framework Nx actions.
- [x] 2.9 Update generator tests to assert canonical service shape, minimal/pure package contract output, package contract registration, typed builder output, compile-only type assertion module output, inferred law output, atom graph registration, optional Effect RPC harness shape, worker-compatible property shape, generated type-guidance output, protocol descriptor/materialization output, language-service diagnostic ownership, no checked-in report output, and deterministic output.

## 3. Nx Graph Integration

- [x] 3.1 Add contract discovery for `src/attune.package.ts` across active Nx projects.
- [x] 3.2 Derive package-level DI dependency summaries from package contracts and Effect layer requirements.
- [x] 3.3 Derive package-level atom/Reactivity graph summaries from package contracts and source discovery.
- [x] 3.4 Add Nx graph metadata or project graph plugin output for contract-derived package dependencies and package view graph facts.
- [x] 3.5 Add inferred or verified targets for `sync-package-contract`, `protocol-materialize`, `framework-diagnostics`, `service-conformance`, `property`, `coverage-conformance`, `atom-graph-conformance`, and `check-generated`.
- [x] 3.6 Add affected-run coverage so schema, service, package-contract, Reactivity key, and atom graph changes trigger dependent property and conformance targets.
- [x] 3.7 Add workerized property shard targets for package, operation, seed range, coverage corpus, worker count, timeout, isolation level, and resource tier.
- [x] 3.8 Add deterministic merge targets for workerized property evidence and atom graph coverage summaries.
- [x] 3.9 Replace package-local shell `run-commands` surfaces with the generic typed Nx executor family (`attune:package-check`, `attune:generated`, `attune:toolchain`) or inferred contract-derived targets for build, typecheck, test, lint, generate, property, mutation, fuzz, serve, CRD, Joern, Alchemy, and provider workflows.
- [x] 3.10 Remove package-local `scripts` entries and codex package-manager wrapper command surfaces from migrated packages.
- [x] 3.11 Add final-ratchet policy that rejects arbitrary project-local shell command strings invoking package managers, Nix, shell, TypeScript runners, test runners, mutation tools, containers, Alchemy, or workspace wrappers.
- [x] 3.12 Add tests for contract discovery, invalid contract failure, branded type/conformance diagnostics, derived DI dependency propagation, atom graph propagation, workerized shard metadata, deterministic merge output, generic typed executor behavior, specialized executor justification, and direct command surface rejection.
- [x] 3.13 Add Nx-owned checks that verify agent-facing docs name the contract-first workflow and do not promote stale private script surfaces.
- [x] 3.14 Add framework runtime/read-model integration so Nx-derived affected runs can consume descriptor hashes, generated artifact hashes, internal protocol deltas, and repair actions through framework services without treating generated ledgers or reports as source truth.

## 4. Atom/Reactivity Package Views

- [x] 4.1 Define the package-level atom graph model for public auditable operations, Reactivity keys, base atoms, derived atoms, package view atoms, and operation-to-view graph edges without requiring atoms for private helpers.
- [x] 4.2 Add conformance checks that reject active packages with service operations but no package atom/Reactivity view graph.
- [x] 4.3 Add architecture checks that reject durable writes, provider actions, external service calls, scheduler/resource lifecycle, EventLog appends, and hidden mutable state inside atoms.
- [x] 4.4 Add conformance checks that require operations mutating meaningful package facts to connect to Reactivity keys and base atoms.
- [x] 4.5 Add dead-invalidation detection for Reactivity keys with no subscribing base atoms.
- [x] 4.6 Add checks that derived atoms compose base atoms or other derived atoms instead of manually subscribing to Reactivity keys unless they directly read durable facts.
- [x] 4.7 Add tests for coherent operation-to-Reactivity-to-base-atom-to-derived-atom graph movement.

## 5. Framework Materialization And Runtime Cache

- [x] 5.1 Move final semantic protocol truth into package source declarations, generated source required by build/typecheck, and gitignored framework runtime/cache rather than checked-in report/ledger artifacts.
- [x] 5.2 Materialize DI graph summaries, atom/Reactivity graph summaries, property evidence indexes, atom graph coverage facts, generated artifact hashes, and waiver state inside framework runtime/cache or language-service/Nx diagnostics.
- [x] 5.3 Treat Source BOM and generator-shape manifests as legacy migration scaffolding or temporary compatibility views, not final semantic workflow surfaces.
- [x] 5.4 Add checks that fail checked-in ProtocolDelta reports, obligation reports, evidence summaries, Markdown/JSON architecture summaries, Linear/GitHub summaries, cloud-agent report artifacts, and manually maintained report truth.
- [x] 5.5 Add sync/check targets that fail stale generated source required by build/typecheck while allowing ephemeral debug/CI output under gitignored cache paths.
- [x] 5.6 Add language-service and Nx diagnostic projections for missing materialization, stale generated source, missing evidence, stale local cache, and import-boundary violations.

## 6. Property Evidence Runtime

- [x] 6.1 Add `@fast-check/worker` and `@effect/rpc` to the workspace dependency set through the Nx/Nix-owned dependency workflow.
- [x] 6.2 Extract the existing `attuneProperty` wrapper into reusable package-boundary property infrastructure.
- [x] 6.3 Add Effect Schema arbitrary derivation with `Arbitrary.make` for operation inputs and generated output/error schema validation.
- [x] 6.4 Add coverage-search transform support over Schema-derived arbitraries, including transform ids, target partitions, weighted corpus replay, and deterministic replay metadata.
- [x] 6.5 Add measured filter support that records filter id, reason, rejection count, acceptance rate, and generator-quality findings for high-rejection filters.
- [x] 6.6 Add a generated package harness runtime so generated property and fuzz runners invoke public package operations through Schema-backed harness protocols instead of private package functions or custom invocation envelopes. Runtime `@effect/rpc` is optional until Effect 4 compatibility is resolved.
- [x] 6.7 Add workerized property execution using `@fast-check/worker` `propertyFor` and worker-aware `assert`.
- [x] 6.8 Run generated audits through generated Schema-coded harness clients whose handlers call public service accessors and `PackageTestLayer`; use Effect RPC only as an optional backend once compatible.
- [x] 6.9 Observe Reactivity keys, base atom refreshes, derived atom recomputations, package view atom diffs, and view transitions through generated Schema-backed harness control operations during property runs.
- [x] 6.10 Emit structured protocol evidence through the private framework runtime/store for package id, service id, operation id, optional RPC id, inferred law ids, seed, run count, Reactivity keys hit, atoms refreshed, view atoms changed, laws checked, missing graph coverage, transform/filter metadata, worker id, shard id, isolation level, random source, timeout settings, and counterexample references.
- [x] 6.11 Persist replay metadata for failures in local framework runtime/cache and surface it through language-service/Nx diagnostics or optional ephemeral debug/CI output, including seed, shrink path, generated value summary, Schema-coded harness payload/exit summary, transform/filter metadata, worker metadata, and Attune failure context.
- [x] 6.12 Add deterministic configuration for commit-tier property audits.
- [x] 6.13 Add timeout and synchronous-loop failure reporting for workerized predicates.
- [x] 6.14 Generate Schema-backed `PackageTypeGuidance` artifacts from operation ids, operation kinds, Schema AST/annotations, input/output/error variants, inferred laws, declared views, resource/destructive metadata, projection/generator/policy/Joern metadata, and custom law extensions.
- [x] 6.15 Add TypeScript assertions that `PackageTypeGuidance` is complete and current for each package contract, then record type-partition hits, misses, filters, unreachable partitions, and retained corpus seeds in property evidence.
- [x] 6.16 Compute internal ProtocolDeltas by comparing generated obligations against property evidence, atom/Reactivity observations, generated artifact state, waiver state, and coverage feedback, then project them into language-service and Nx diagnostics.

## 7. Law Packs And Graph Coverage

- [x] 7.1 Implement the compact shared law kernel for schema validation, determinism/idempotence, side-effect boundaries, and view movement, then map `query`, `command`, `codec`, `projection`, `event-facade`, `atom-family`, `resource-provider`, `generator`, `policy-rule`, and `joern-template` operations onto that kernel with package-specific extension hooks.
- [x] 7.2 Implement metadata-driven law inference from operation kind, input/output/error schemas, Schema annotations, touched views, resource observation metadata, destructive proof/approval metadata, projection event/state metadata, generator option/tree/output/provenance metadata, policy finding metadata, and Joern/template metadata.
- [x] 7.3 Add package-specific law-pack extension hooks to package contracts.
- [x] 7.4 Add atom/Reactivity graph coverage recording to generated property audits.
- [x] 7.5 Add coverage conformance checks for missing required Reactivity keys, atom refreshes, package view atom changes, schema variants, type-guidance partitions, transitions, and expected error paths.
- [x] 7.6 Add targeted rerun support that biases arbitraries toward missing atom/Reactivity graph movement and missing type-guidance partitions while preserving deterministic replay metadata.
- [x] 7.7 Add a coverage-guided property target that records V8/Istanbul deltas and uses them with atom graph coverage gaps to retain or bias useful seeds.
- [x] 7.8 Run coverage-guided property targets through workerized shards for proof-pressure and fuzz tiers.
- [x] 7.9 Add dead-harness detection when generated cases execute but implementation coverage remains absent or implausibly shallow.
- [x] 7.10 Add weak-oracle findings when mutation survives on code paths that are covered by atom graph movement.
- [x] 7.11 Add commit-tier batch coverage sampling that retains seeds for newly reached implementation coverage points without making raw V8 percentages a pass/fail contract.
- [x] 7.12 Add deterministic V8/Istanbul evidence merging across worker shards by package, operation, source coverage point, atom graph edge, seed, shrink path, worker id, and shard id.
- [x] 7.13 Add weak-oracle findings when implementation coverage is reached but required law observations, atom graph movement, view diffs, or expected error paths are missing.

## 8. Policy Wiring

- [x] 8.1 Add `workspace:package-contracts-check`.
- [x] 8.2 Add `workspace:atom-graph-conformance`.
- [x] 8.3 Add `workspace:property-evidence`.
- [x] 8.4 Add `workspace:coverage-conformance`.
- [x] 8.5 Compose cheap deterministic contract, atom graph, and property checks into `workspace:policy-fast`.
- [x] 8.6 Compose workerized property shards, mutation, Joern, container, coverage-search, and fuzz campaigns into first-class `workspace:policy-proof-pressure` targets where package targets support them.
- [x] 8.7 Add policy checks that workerized targets declare worker count, timeout, isolation level, seed range, shard id, and random source.
- [x] 8.8 Update precommit and push policy hooks to use the minimal Nx-owned public surface: `workspace:policy-fast` for the default local/commit gate, `workspace:policy-proof-pressure` for heavy push/manual/nightly campaigns, and focused diagnostics such as `workspace:package-contracts-check` for contract repair.
- [x] 8.9 Add command-surface checks that reject `workspace:policy-architecture` as stale final public guidance and require architecture checks to compose through `workspace:policy-fast`, `workspace:policy-proof-pressure`, or focused diagnostic targets.
- [x] 8.10 Add framework runtime checks to `workspace:package-contracts-check` and later `workspace:policy-fast`, including descriptor decode, descriptor hash, generated artifact hash, internal ProtocolDelta diagnostics, waiver checks, import-boundary checks, local cache checks, and no-checked-in-report checks.

## 9. Tooling Package Migration

- [x] 9.1 Migrate `attune-nx` to `src/attune.package.ts` with canonical generator service contracts, generator plan atoms, generated file diff atoms, provenance atoms, and generated property audit coverage.
- [x] 9.2 Migrate the renamed architecture package to a package contract with policy-rule operation metadata, policy findings atoms, waiver summary atoms, package contract coverage atoms, and coverage expectations.
- [x] 9.3 Migrate `effect-oxlint-policy` to a package contract with policy-rule operation metadata, policy result atoms, and generated property audit coverage.
- [x] 9.4 Remove tooling package scripts, codex wrapper command surfaces, arbitrary `run-commands`, and manual BOM/generator-shape truth after typed Nx executors and generated ledgers land.

## 10. Core Product Package Migration

- [x] 10.1 Migrate `attuned-discovery` to package contracts for discovery events, event log, projections, reactivity keys, base atoms, derived atoms, DecisionPacket atoms, and WorkbenchSnapshot atoms.
- [x] 10.2 Migrate `cocoindex-effect` to package contracts for client and repository intelligence service boundaries plus recall/result package view atoms.
- [x] 10.3 Migrate `attune-foldkit` to package contracts for model/update/view, scene atoms, fixtures, and generated evidence boundaries.
- [x] 10.4 Migrate `attune-pi-agent` to package contracts for decision, permission, taskplane, evidence matrix generator boundaries, and decision/evidence package view atoms.
- [x] 10.5 Remove core product package scripts, arbitrary `run-commands`, hidden env/filesystem surfaces, and hand-maintained BOM truth after typed services/executors and generated ledgers land.

## 11. Proof Package Migration

- [x] 11.1 Migrate `joern-effect` to package contracts for Joern runtime, CPG program builder, generated traversal DSL, generated properties, template operations, template registry atoms, query evidence atoms, and generated schema coverage atoms.
- [x] 11.2 Migrate `joern-effect-properties` to package contracts for property harness runtime, corpus store, mutator, scheduler, workspace pool, oracle, telemetry, counterexample store services, fuzz run atoms, and counterexample corpus atoms.
- [x] 11.3 Connect existing Joern property and fuzz targets to the shared property evidence and atom graph coverage summary shape.
- [x] 11.4 Replace Joern/proof CLI scripts, direct Nix/Arion/env command strings, Vitest spawning wrappers, and generation stubs with typed Nx executors and contract-visible options.

## 12. Platform Package Migration

- [x] 12.1 Migrate `platform-alchemy-k8s` to package contracts for Kubernetes resource/provider operations, generated resource shapes, resource readiness atoms, and provider evidence atoms.
- [x] 12.2 Migrate `home-deployment` to package contracts for Day-0 providers, runbook resources, observed idempotence checks, destructive gate law packs, host readiness atoms, provider gate atoms, and destructive approval state atoms.
- [x] 12.3 Add explicit waivers for any platform service that must remain lower-level `Context.Tag` or resource-scoped during migration.
- [x] 12.4 Replace platform/home direct generation scripts, Alchemy env entrypoints, local cluster command arrays, and shell command plans with typed Nx executors, typed provider command intents, and contract-visible resource evidence.

## 13. Documentation And Agent Guidance

- [x] 13.1 Update root `AGENTS.md` with the diagnostics-first framework workflow: read language-service diagnostics and Nx check output, open the referenced `src/attune.package.ts`, use `@attune/nx`, implement inside generated `Effect.Service`, update Effect Schema metadata/laws, expose or update package atoms/Reactivity keys, run Nx conformance/property/coverage targets, and report validation results plus remaining diagnostics.
- [x] 13.2 Update cloud and local environment docs so validation examples name only the minimal Nx-owned public surface: `workspace:policy-fast`, `workspace:policy-proof-pressure`, focused diagnostic targets such as `workspace:package-contracts-check`, project `typecheck`/`test`, and `@attune/nx` generators. Package-manager, Nix, shell, and wrapper commands may be documented only as executor implementation internals or initial workspace bootstrap where unavoidable.
- [x] 13.3 Update generator docs/templates to describe canonical Effect Schema package contracts, Effect Schema Arbitrary input generation, package atom/Reactivity view graphs, workerized property targets, and mandatory operation-kind classification.
- [x] 13.4 Update OpenSpec/agent implementation guidance to require package-contract, atom graph, and property-evidence considerations in future changes.
- [x] 13.5 Document the canonical package contract shape, typed builder API, compile-only assertion modules, inferred type helpers, exact handler/property maps, inferred law model, invariant ownership ladder, public auditable operation boundary, pure/minimal package layer allowance, compact law kernel, package-level atom view model, generic executor family, and package archetype migration flow.
- [x] 13.6 Document generated Schema-coded package harnesses, optional Effect RPC backend tradeoffs, type-guided fuzzing, `PackageTypeGuidance`, property evidence tiers, replay metadata, atom graph coverage, targeted reruns, worker/shard metadata, `@fast-check/worker` isolation levels, random-source tradeoffs, and V8/Istanbul coverage-guided search.
- [x] 13.7 Document Source BOM/generator-shape as legacy migration scaffolding or temporary compatibility views, the local waiver source model, and the final no-checked-in-report posture.
- [x] 13.8 Document FastCheck transform/filter rules: Schema-derived base arbitraries, type-guidance partitions, search transforms before filters, measured rejection rates, corpus replay, and generator-quality findings.
- [x] 13.9 Document Attune Framework, root `framework/` layout, Protocol Runtime, Protocol Store, Protocol Obligations, Protocol Evidence, internal ProtocolDelta, language-service diagnostics, quick info, code actions, code lenses, Nx output, import boundaries, no checked-in protocol reports, and the rule that agents repair diagnostics rather than raw internals.

## 14. Validation And Ratchet

- [x] 14.1 Add unit tests for contract decoding, typed contract helper diagnostics, compile-only assertion modules, inferred law diagnostics, exact handler/property maps, type-guidance completeness, service conformance, waiver validation, graph derivation, atom graph conformance, generated Schema-coded harnesses, optional RPC-backed harnesses, generated property harnesses, workerized property execution, and coverage conformance.
- [x] 14.2 Run package typechecks and tests for changed packages.
- [x] 14.3 Run `workspace:policy-fast` with diagnostics-only contract and atom graph coverage during the first migration ring.
- [x] 14.4 Turn missing package contracts into required failures after every active package has at least a minimal contract.
- [x] 14.5 Turn missing package atom/Reactivity view graphs into required failures after every active package has minimal package view coverage.
- [x] 14.6 Turn missing generated property harnesses into required failures after every active package has cheap deterministic property evidence.
- [x] 14.7 Turn final cleanup checks into required failures once temporary migration aliases, compatibility exports, diagnostics-only exceptions, stale manual ledgers, checked-in protocol reports, duplicate public surfaces, package-local scripts, arbitrary shell command targets, wrapper command surfaces, and all migration-scaffolding waivers have been removed; allow long-lived waivers only for genuine non-migration architecture exceptions with owners and review dates.
- [x] 14.8 Validate the OpenSpec change and update task status as each implementation slice lands.

## 15. Parallel Agent Execution

- [x] 15.1 Use `agent-migration-plan.md` as the operational handoff plan for all implementation and validation agents.
- [x] 15.2 Run Phase 0 foundation agents for architecture package identity, workspace command surface, generator inventory, OpenSpec validation, and workspace validation.
- [x] 15.3 Run Phase 1 contract type kernel agents for contract builders, compile-only assertions, law inference, type guidance, negative type fixtures, and type budget validation.
- [x] 15.4 Run Phase 2 Nx generator/executor agents for canonical service generation, package contract generation, atom view generation, generic executors, graph integration, generator snapshots, and command-surface validation.
- [x] 15.5 Run Phase 3 property/evidence agents for generated package harnesses, property runtime, worker execution, coverage search, negative property fixtures, and worker validation.
- [x] 15.6 Run Phase 4 tooling package agents for `attune-nx`, `attune-architecture`, `effect-oxlint-policy`, and tooling policy validation.
- [x] 15.7 Run Phase 5 product package agents for `attuned-discovery`, `cocoindex-effect`, `attune-foldkit`, `attune-pi-agent`, and product boundary validation.
- [x] 15.8 Run Phase 6 proof package agents for `joern-effect`, `joern-effect-properties`, and proof-pressure validation.
- [x] 15.9 Run Phase 7 platform/resource agents for `platform-alchemy-k8s`, `home-deployment`, and provider safety validation.
- [x] 15.10 Run Phase 8 docs/ratchet agents for agent docs, generated ledger cleanup, final ratchet, and final policy validation.
- [x] 15.11 Require every agent handoff to include changed files, generated files, validation commands, package contract status, residual migration debt, blockers, and next-agent recommendations.
- [x] 15.12 Integrate each wave only after implementation and validation agents agree on exit criteria or record an explicit OpenSpec blocker.
- [x] 15.13 Run Phase 1A Attune Framework Foundation agents for framework layout, protocol DSL, private runtime, SQLite/Drizzle store, language-service view, framework Nx materialization, testing/evidence helpers, and independent validation.

## 16. Archive Hardening

- [x] 16.1 Move the canonical package-contract kernel from the residual architecture package into `framework/protocol/src/package-contract` and invert dependencies so `framework/protocol` no longer imports `attune-architecture`.
- [x] 16.2 Move the residual architecture policy project out of `packages/` into `framework/architecture`, keeping the Nx project id/bin identity `attune-architecture` while making it consume `@attune/framework-protocol`.
- [x] 16.3 Move the Effect oxlint policy plugin out of `packages/` into `framework/oxlint-policy`, keeping the Nx project id `effect-oxlint-policy` and updating the oxlint plugin load path.
- [x] 16.4 Classify historical run-report docs with an explicit migration marker and reject new checked-in generic fuzzer/proof/run reports through the no-report policy.
- [x] 16.5 Adopt source-reference view derivation in a flagship `attuned-discovery` operation and prove it feeds operation registry and operation-to-view graph derivation.
- [x] 16.6 Run archive-hardening validation: focused framework/package typechecks and tests, `workspace:package-contracts-check`, `workspace:framework-policy-check`, `workspace:policy-fast`, OpenSpec strict validation, and `git diff --check`.

## 17. Small Package Declaration Cleanup

- [x] 17.1 Audit active `src/attune.package.ts` file sizes and classify bloat into authored roots versus derived/generated handler, property, type-guidance, RPC, coverage, evidence, and artifact material.
- [x] 17.2 Add a slim authoring declaration type surface in `framework/protocol` so package declarations can model language-service roots without carrying every derived consequence.
- [x] 17.3 Move generated handler/property/type-guidance/RPC bulk from active package declarations into deterministic `src/attune.generated.ts` companion artifacts while preserving package contract exports.
- [x] 17.4 Add a staged package declaration size ratchet that warns above the configured threshold and recommends generated/materialized alternatives plus Nx repair targets.
- [x] 17.5 Add public workspace aliases `workspace:attune-check` and `workspace:attune-repair` over typed Nx actions.
- [x] 17.6 Update OpenSpec and docs to state that package declarations are source intent, SQLite is private projection state, and Nx repairs are the public action surface.
- [ ] 17.7 Expand per-project repair targets (`<project>:attune:repair-*`) from documented action names into full deterministic generators/executors for registries, properties, type guidance, evidence, and generated freshness.
- [ ] 17.8 Continue shrinking remaining package declarations below the warning threshold by moving package-specific schema/helper bulk into focused authored modules or generated artifacts.
