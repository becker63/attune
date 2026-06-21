## Context

Attune is being consolidated into one monorepo from several in-progress repositories and imported working trees. The docs under `attuned` describe an Effect-first product architecture where the model proposes bounded decisions, Effect validates and executes, Joern proves through known templates, Effect EventLog/Telemetry primitives provide the event model, Drizzle materializes read models, Reactivity invalidates run-scoped facts, and atoms derive reasoning views.

Before the application can be migrated safely, the repo needs a single build and generation spine. The prior Buck2 experiment introduced a second orchestration model that is too sophisticated for the current stage. The repo will instead use Nx for workspace orchestration and source-code generation, with Nix providing reproducible tools and runtime dependencies.

`joern-effect` is the first package that makes this decision concrete. It has generated schemas, generated traversal DSL surface, generated template registries, property-test artifacts, and real Joern/runtime boundaries. Those generated outputs must be reproducible through Nx targets running inside the Nix-provisioned environment.

The prior work also includes an important `joern-effect` property-testing substrate: FastCheck can generate small repositories, write them into a memory-backed filesystem such as `/dev/shm`, run Joern over them, and compare decoded/materialized evidence. That direction should be preserved. The build-system change should make it easier to run by giving it Nx targets and a Nix-owned local/container runtime, not by reducing it to ordinary unit tests.

The active package set should stay smaller than the imported experiments. Prior standalone `eventing` and `fork` work remains useful as historical source material, but this migration does not promote either package into the active workspace. Eventing should follow the attuned docs and lean on Effect's EventLog/Telemetry model. Architectural correctness should come first from generated structure, type safety, Effect schemas, and property pressure. The effect-oxlint rules can remain as a future rule library/reference, but linting is not the primary substrate for this migration.

## Goals / Non-Goals

**Goals:**

- Establish Nx as the only supported workspace orchestrator for package targets, dependency graph execution, affected runs, and code generation.
- Establish Nix as the only supported toolchain/runtime provisioning layer for local development, CI, WSL, Joern, Node, OpenSpec, and Nx.
- Remove Buck2 from the supported path and make any remaining Buck2 artifacts migration inputs only.
- Migrate `joern-effect` generation to Nx-owned generators and targets.
- Make generated code reproducible, diff-checkable, and documented through package targets.
- Preserve cheap and Joern-gated property tests as first-class Nx targets.
- Preserve the memory-backed property/e2e execution path through `/dev/shm` or an equivalent tmpfs mount.
- Organize Nix files so local shells, generated packages, containers, and compose/runtime definitions can evolve without mixing concerns.
- Promote the `attuned` docs into a tracked root `docs/` area as the current architectural canon.
- Preserve the Attune architecture constraints from the imported docs while choosing the simpler build substrate.

**Non-Goals:**

- Do not implement the full Attune Discovery runtime in this change.
- Do not redesign the public `joern-effect` TypeScript API unless generation requires small mechanical adjustments.
- Do not introduce Buck2 compatibility wrappers.
- Do not make Nix replace Nx task orchestration.
- Do not make Nx provision system tools outside the Nix environment.
- Do not solve remote CI in detail beyond defining the local/CI contract.
- Do not require every property target to run Joern; cheap property targets must remain available separately.
- Do not check local trace/event/jsonl artifacts into the repo as part of property runs.
- Do not promote standalone `eventing` or `fork` packages into the active workspace in this migration.
- Do not make lint rules the primary correctness substrate for `joern-effect`; generated types, Effect schemas, and properties carry the first line of enforcement.

## Decisions

### Decision: Nx owns orchestration and generation

Nx will own package targets such as `build`, `test`, `typecheck`, `lint`, `generate`, `property`, and package-specific phase targets. Nx will also own code-generation entrypoints through generators or executor-style scripts checked into the repo.

Rationale: the Attune docs already describe generators as the source-code grammar. Nx gives agents and humans a familiar package graph, affected runs, cacheable targets, and a clear way to add generated files without inventing ad hoc scripts.

Alternative considered: Buck2 as the primary orchestrator. Rejected because it adds another conceptual system before the product architecture is stable and makes code generation harder for Codex/humans to reason about during consolidation.

Alternative considered: Nix-only task orchestration. Rejected because Nix is excellent at reproducible environments and derivations, but Nx better expresses TypeScript monorepo package targets and generator workflows.

### Decision: Nx generators follow the attuned source-code grammar

Nx generators will be used where they can prevent drift and make the architecture easier to construct. The generic generator vocabulary should follow the `attuned` docs because that is the future direction of the product, not an unrelated local convention.

The project-wide generator set should start with the attuned architecture verbs:

```txt
@attune/nx:effect-service
@attune/nx:event
@attune/nx:decision
@attune/nx:projection
@attune/nx:atom-family
@attune/nx:derived-atom
@attune/nx:score-feature
@attune/nx:decision-packet-field
@attune/nx:foldkit-scene-atom
@attune/nx:joern-template
@attune/nx:sync-effect-layers
```

These are still intentionally narrow: each generator should create one architectural move and typed TODOs rather than a whole feature. For example, `effect-service` creates a `Context.Tag`, live `Layer`, test shell, and export boundary for one service; `event` updates the Effect EventGroup/facade/projection path for one semantic event; `atom-family` creates one base atom with the correct Reactivity subscription; `derived-atom` creates one derived atom skeleton and must not add Reactivity unless explicitly generating a base atom.

Small internal helper generators can still exist under `tools/nx-generators/internal/` for shared mechanics such as:

```txt
project-target
package-json
tsconfig
barrel-export
generated-file-header
readme-template
nix-app
nix-container
arion-service
```

Those helpers are not the primary user-facing grammar. They support the attuned generators.

Rationale: linting can reject bad shapes after the fact, but generators can make the right shape the default. This also matches the docs directly: Effect gives runtime grammar; Nx gives source-code grammar; the agent fills implementation inside generated boundaries.

Alternative considered: generic low-level generators only, such as `effect-schema` and `effect-layer`. Rejected as the visible project vocabulary because they are useful mechanics but do not encode the Attune architecture as described in the docs.

Alternative considered: broad package-level macro generators such as `effect-package`. Rejected as the primary model because they hide too many choices, are harder to reuse across the future product, and make agent edits less inspectable.

### Decision: joern-effect uses Nx to replace the generation pipeline

`joern-effect` is the exception where Nx generation is not merely safety scaffolding. Its existing hand-rolled generation pipeline should be migrated into Nx-owned generation stages. The pipeline should be fine-grained and explicit, with Nx targets declaring inputs and outputs for each stage.

The Joern-specific generation stages should look more like:

```txt
joern-effect:extract-cpg-schema
joern-effect:enrich-schema-docs
joern-effect:normalize-schema
joern-effect:emit-schema-modules
joern-effect:emit-node-types
joern-effect:emit-property-metadata
joern-effect:emit-traversal-dsl
joern-effect:emit-template-registry
joern-effect:emit-template-bindings
joern-effect:emit-template-evidence
joern-effect:emit-fast-check-arbitraries
joern-effect:render-readme
joern-effect:generate
joern-effect:check-generated
```

Where possible, each stage should be implemented as a small library function plus an Nx target/executor wrapper. Some stages may also expose a small generator when they create new source files, such as adding a known Joern template or creating a new generated output module.

The initial migration may wrap the existing scripts, but the direction is to replace the from-scratch pipeline with Nx-owned stages rather than preserve a large opaque `generate.ts` forever. Over time, Nx generation can create or update:

- `JoernTemplateExecutor` service boundaries through `effect-service`
- Joern schema snapshot extraction configuration
- generated traversal DSL and property metadata
- known Joern template definitions, bindings, and evidence schemas through `joern-template`
- internal FastCheck arbitrary helpers derived from schemas/templates
- property files and harness pieces that depend only on the public `joern-effect` package
- Nix runtime stubs for Joern-gated property targets
- docs/spec indexes that keep the attuned canon visible

Rationale: `joern-effect` is fundamentally generated from Joern schema/template inputs. Nx gives that pipeline a visible graph, cacheable stages, explicit inputs/outputs, and agent-addressable steps. This is more important than a one-shot safety template.

Alternative considered: wrap the old `generate.ts` script as one permanent Nx target. Rejected because it would keep the old pipeline opaque and make it harder to property-test or repair individual generation stages.

### Decision: Nix owns the reproducible toolchain

Nix will provide the exact Node runtime, package manager, Nx CLI, OpenSpec CLI, Joern runtime or wrapper, Java/Scala dependencies as needed, Docker/Podman helpers if needed, and WSL-compatible shell entrypoints.

Rationale: Nix prevents the Windows/WSL/tool-version drift that previously blocked validation. Nx targets should run inside the Nix shell so task behavior is reproducible locally and in CI.

Alternative considered: relying on global npm tools. Rejected because it recreates the Node/OpenSpec mismatch already seen during setup.

### Decision: Buck2 artifacts are removed or quarantined as historical imports

Any Buck2 files that are part of imported history may remain under `imports/**` until the consolidation cleanup, but the active repo must not require Buck2 to build, test, generate, or validate packages.

Rationale: preserving imported work is useful during consolidation, but active project contracts must be unambiguous.

### Decision: `joern-effect` generation is an Nx capability

`joern-effect` will expose Nx targets for generation and checks. Generation inputs include Joern schema inputs, template definitions, DSL generator source, documentation metadata when available, and property-test generator inputs. Generated outputs must be deterministic and validated by a check target that fails when checked-in generated code is stale.

Rationale: `joern-effect` is central to Attune's proof layer. If generated code is manual or hidden behind untracked scripts, the Joern proof contract becomes fragile.

The attuned generator templates that immediately help `joern-effect` are:

- `effect-service`: generate Effect service shells such as `JoernTemplateExecutor`, Joern runtime/client boundaries, and future CocoIndex/Discovery services.
- `joern-template`: generate one known proof template with binding schema, evidence schema, query renderer, decoder test, fixture test, and registry participation.
- `sync-effect-layers`: keep package live-layer composition synchronized when services are added.
- Sync generators for registries and barrels: keep `TemplateRegistry.generated.ts`, generated template schema exports, and public package barrels idempotent.
- `event` later, but through Effect EventGroup/EventLog patterns from the attuned docs, not a standalone `eventing` package.

For the current migration, `joern-template` is the most important source-template generator. The rest of `joern-effect` code generation should be modeled as Nx generation stages, not as a single macro generator.

### Decision: property tests consume generated surfaces and may use generated arbitraries

The `joern-effect` property harness will be an active package or package slice in the Nx graph. Cheap property targets will consume generated traversal/schema/template outputs and test determinism, fingerprint stability, decode boundaries, and materialization invariants. Joern-gated property targets will additionally generate small repositories and execute real Joern through the runtime boundary.

The generation pipeline may emit internal test support such as schema-derived arbitrary helpers, fixture manifests, or template binding generators. These helpers are generation outputs only when they are deterministic and checked by the same stale-generation mechanism as other generated files.

Rationale: generation and property testing should reinforce each other. Generated schemas define the surface area to attack, and property tests validate that the generated SDK remains descriptive, deterministic, and safe under generated pressure.

Alternative considered: keep property tests as independent scripts outside Nx. Rejected because those tests are core correctness pressure and must participate in package graph orchestration, caching, and agent workflow.

### Decision: `joern-effect-properties` is separate from `joern-effect`

The property harness should live as a separate active package, likely `packages/joern-effect-properties`, that imports `joern-effect` through the public workspace package boundary. Container lifecycle code and e2e test code may live in this package or in Nix wrappers around it, but the tests should not depend on private `joern-effect` internals.

Rationale: this preserves the useful split between SDK/runtime code and correctness pressure. It also keeps the generated public API honest: if the property package cannot test something without reaching into internals, the public package probably needs a better descriptive surface or test-support output.

### Decision: memory-backed e2e storage is a runtime substrate, not a codegen concern

The property harness will choose a temp-store mode at runtime. Local runs should prefer `/dev/shm` when available and writable, falling back to a normal temporary directory for cheap or degraded local runs. Containerized runs should expose a tmpfs-backed workspace path through the container runtime and make that path visible to the test runner.

Rationale: generated repos and Joern CPG artifacts are IO-heavy. The memory-backed store is what makes e2e property testing viable, but it should not affect the generated TypeScript API or deterministic codegen outputs.

Alternative considered: require `/dev/shm` for all property tests. Rejected because WSL/dev machines vary; cheap targets should remain runnable even when memory-backed storage is unavailable.

### Decision: Nix owns container images and compose/runtime definitions

Nix will keep reusable runtime definitions under a root `nix/` tree. A proposed layout is:

```txt
nix/
  toolchains/
    node.nix
    joern.nix
    openspec.nix
  packages/
    joern-effect-codegen.nix
    joern-effect-property.nix
  containers/
    joern-effect-property.nix
  compose/
    joern-effect-property.arion.nix
  modules/
    tmpfs-property-store.nix
    axiom-env.nix
  lib/
    paths.nix
    versions.nix
```

Nx remains the developer-facing command surface. Nx property targets may call Nix apps or scripts that use nix2container/arion for containerized execution, but the package target remains discoverable as an Nx target.

Rationale: this keeps Nix maintainable as the repo grows. Toolchain pinning, package wrappers, container images, Arion definitions, and shared modules are related but distinct concerns.

### Decision: generated code is descriptive, runtime is interpreted

The generated `joern-effect` surface may describe traversals, schemas, templates, and evidence shapes. It must not start Joern, execute process IO, emit telemetry directly, or parse untrusted runtime output outside approved interpreter/decode boundaries.

Rationale: this preserves the Attune rule that Joern proof is invoked through Effect/runtime boundaries and known templates, while keeping the public generated surface safe and testable.

### Decision: OpenSpec captures the build contract before implementation

This change records the build and generation contract before implementation begins. Follow-on changes can specify Attune Discovery packages, Effect-native EventLog/Telemetry behavior, and broader property-test loops.

Rationale: the repo is in consolidation; the first durable artifact should be the rule that prevents another build-system fork.

### Decision: root docs carry the attuned canon

The imported `attuned` markdown documents should be copied into `docs/attuned/` and treated as the tracked architectural canon for this stage of the repo. The raw `imports/` directory remains on disk but should be ignored by git while migration is in progress.

Rationale: imports are staging material. The active docs need a stable path that agents and humans can read without treating every imported repo as active source.

## Risks / Trade-offs

- [Risk] Nx generators can become ad hoc scripts with a different name. -> Mitigation: define generated inputs/outputs and require stale-generation checks per generated package.
- [Risk] Nix setup becomes too heavy for day-to-day iteration. -> Mitigation: keep Nix responsible for tool versions and shells, while Nx owns incremental targets and affected runs.
- [Risk] Imported Buck2 files confuse agents. -> Mitigation: active docs and specs must state Buck2 is unsupported; cleanup tasks should remove or quarantine active Buck2 references.
- [Risk] Joern installation is expensive or platform-sensitive. -> Mitigation: wrap Joern provisioning through Nix and expose Joern-gated targets separately from cheap local generation/property targets.
- [Risk] Nx cache hides generation drift. -> Mitigation: generation check targets must compare generated output against source inputs and fail on stale diffs.
- [Risk] Memory-backed property tests behave differently on host and container runtimes. -> Mitigation: model temp-store mode explicitly and run the same harness against both local `/dev/shm` and container tmpfs configurations.
- [Risk] Generated arbitrary helpers can accidentally become part of the public SDK. -> Mitigation: place generated test support under internal/test-support paths and keep public exports explicit.
- [Risk] Container configuration sprawls across package scripts. -> Mitigation: keep nix2container and Arion definitions under `nix/containers` and `nix/compose`, with Nx targets as the single command surface.
- [Risk] Removing `fork` leaves fewer static checks in the short term. -> Mitigation: rely on generated structure, TypeScript, Effect schemas, property tests, and keep effect-oxlint as a future rule source.
- [Risk] Keeping imports on disk confuses active package discovery. -> Mitigation: ignore `imports/` in git and configure Nx package discovery to active package roots only.

## Migration Plan

1. Add root Nix shell/flake exposing the repo toolchain and a single supported entrypoint for workspace commands.
2. Add root Nx workspace configuration and package discovery.
3. Convert active package scripts into Nx targets.
4. Remove active Buck2 build/test/codegen paths.
5. Promote the attuned docs into `docs/attuned/` and ignore raw `imports/`.
6. Add `joern-effect` Nx generation targets and generators.
7. Add stale-generation checks and generated-output validation.
8. Add cheap `joern-effect` property targets that consume generated outputs.
9. Add Joern-gated property/e2e targets that can run with local `/dev/shm` or container tmpfs.
10. Add root Nix layout for toolchains, package wrappers, containers, compose definitions, modules, and shared version/path constants.
11. Document local workflow: enter Nix shell, run Nx targets, regenerate `joern-effect`, validate generated output, run cheap and Joern-gated property targets.
12. Add CI later using the same Nix + Nx contract.

Rollback strategy: because this is a planning and migration change, rollback means restoring the previous active scripts from git and disabling the Nx targets. Buck2 should not be reintroduced as an active supported path without a new OpenSpec change.

## Open Questions

- Which package manager should the Nix shell expose for the workspace: pnpm from the Nix toolchain or another explicitly pinned Nix package?
- Should generated `joern-effect` files be checked in initially, or should the package publish only from generated build artifacts?
- Which Joern version should be pinned in Nix for the first validated generation pass?
- How much of the imported Buck2 work should be deleted immediately versus kept under `imports/**` until feature migration is complete?
- Should generated property arbitrary helpers be checked in with generated package output, or generated only for test-package builds?
- Should the default Joern-gated property mode prefer host `/dev/shm` or the containerized tmpfs substrate when both are available?
