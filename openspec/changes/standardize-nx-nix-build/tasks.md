## 1. Workspace Baseline

- [x] 1.1 Inventory active root files, imported package roots, Buck2 artifacts, Nx artifacts, Nix artifacts, and `joern-effect` generation scripts.
- [x] 1.2 Decide which imported package directories become active workspace packages and which remain under `imports/**` as historical source material.
- [x] 1.3 Add or update root documentation to state that active workflows use Nx inside Nix and do not use Buck2.
- [x] 1.4 Ignore `imports/**` in git while keeping it available on disk as migration source material.
- [x] 1.5 Promote the `attuned` architecture documents into `docs/attuned/` and add a root docs index.
- [x] 1.6 Confirm standalone `eventing` and `fork` packages are not part of the active workspace package set.

## 2. Nix Toolchain

- [x] 2.1 Add a root Nix flake or shell that provisions Node, the selected package manager, Nx access, OpenSpec access, Joern runtime support, and required shell tools.
- [x] 2.2 Ensure the Nix environment works under WSL without relying on Windows global Node, npm, or shell shims.
- [x] 2.3 Add a single documented local entrypoint for entering the environment and running Nx commands.
- [x] 2.4 Add a validation command that prints the pinned tool versions used by active targets.
- [x] 2.5 Create the root Nix directory layout for toolchains, package wrappers, containers, compose definitions, shared modules, and helper libraries.
- [x] 2.6 Migrate reusable Joern, Node, OpenSpec, and tmpfs/runtime path constants from imported Nix work into the root Nix layout.

## 3. Nx Workspace

- [x] 3.1 Add root Nx workspace configuration and package discovery for active packages.
- [x] 3.2 Add explicit Nx targets for active package workflows: build, test, typecheck, lint/check, generate where applicable, and property where applicable.
- [x] 3.3 Configure Nx target inputs and outputs for build artifacts and generated files.
- [x] 3.4 Add an Nx workspace validation target that can run from the Nix environment.
- [x] 3.5 Add internal helper generators for repeated mechanics: `project-target`, `package-json`, `tsconfig`, `barrel-export`, and `generated-file-header`.
- [x] 3.6 Add the first attuned architecture generator needed by `joern-effect`: `effect-service`.
- [x] 3.7 Add the Joern-specific attuned source-template generator: `joern-template`.
- [x] 3.8 Add sync generator support for generated barrels, template registries, and Effect layer composition.
- [x] 3.9 Defer Discovery-specific generators until their packages are active: `event`, `decision`, `projection`, `atom-family`, `derived-atom`, `score-feature`, `decision-packet-field`, and `foldkit-scene-atom`.
- [x] 3.10 Configure active Nx project discovery to exclude ignored `imports/**`.

## 4. Remove Active Buck2 Path

- [x] 4.1 Remove Buck2 from active build, test, check, generation, and validation documentation.
- [x] 4.2 Delete or quarantine active Buck2 configuration so no supported target requires Buck2.
- [x] 4.3 Add a guard or validation note that prevents reintroducing Buck2 as an active workflow without a new OpenSpec change.

## 5. joern-effect Nx Code Generation

- [x] 5.1 Identify current `joern-effect` generation inputs: Joern schema inputs, DSL generator source, template definitions, docs metadata, and property fixture generators.
- [x] 5.2 Split the current hand-rolled `joern-effect` generation pipeline into explicit planned stages: extract CPG schema, enrich docs, normalize schema, emit schema modules, emit node types, emit property metadata, emit traversal DSL, emit template registry, emit template bindings, emit template evidence, emit optional FastCheck arbitraries, render README, aggregate generate, and check generated.
- [x] 5.3 Create Nx targets or executor steps for the first generation stages while initially reusing existing implementation functions where practical.
- [x] 5.4 Declare stage-specific Nx inputs and outputs for generated schemas, traversal DSL, template registry, bindings, evidence types, docs, and optional generated arbitrary helpers.
- [x] 5.5 Create an aggregate `joern-effect:generate` target that runs the stage targets in dependency order.
- [x] 5.6 Create a `joern-effect:check-generated` target that fails when generated output is stale.
- [x] 5.7 Ensure generation is deterministic by running generation twice inside the Nix environment and verifying the second run has no source diff.
- [x] 5.8 Ensure generated public surfaces remain descriptive and do not execute Joern, spawn processes, read filesystem/env, parse runtime JSON, or emit telemetry during construction.
- [x] 5.9 Decide whether schema-derived FastCheck arbitrary helpers are generated outputs, and if so place them under an internal/test-support generated path covered by freshness checks.
- [x] 5.10 Use `@attune/nx:joern-template` to create known Joern proof-template source inputs, including binding schema, evidence schema, renderer shell, decoder test, fixture test, and registry participation.
- [x] 5.11 Use `@attune/nx:effect-service` where `joern-effect` needs Effect service boundaries such as `JoernTemplateExecutor` or runtime clients.
- [x] 5.12 Keep pipeline execution in stage targets/executors; do not hide the Joern generation pipeline inside a broad macro generator.

## 6. joern-effect Validation Targets

- [x] 6.1 Move or create the active `joern-effect` property harness package/slice so it depends on generated `joern-effect` outputs through normal workspace imports.
- [x] 6.2 Add cheap `joern-effect` property targets for generated traversal descriptions, builder determinism, decoding, and evidence/materialization boundaries where available.
- [x] 6.3 Add explicit temp-store mode support to the property harness for host `/dev/shm`, container tmpfs, normal temp fallback, and unavailable-mode reporting.
- [x] 6.4 Add a separate Joern-gated property or integration target that uses the Nix-provisioned Joern runtime.
- [x] 6.5 Add a Nix-managed nix2container image and Arion runtime definition for Joern-gated property runs with tmpfs-backed storage.
- [x] 6.6 Expose the containerized property runtime through Nx targets rather than direct container commands.
- [x] 6.7 Ensure property failures record seed, path, generated-case summary, temp-store mode, and target metadata through the configured report/telemetry path.
- [x] 6.8 Add `joern-effect` typecheck, build, and package validation targets to Nx.
- [x] 6.9 Verify cheap local `joern-effect` targets run without optional telemetry credentials.
- [x] 6.10 Ensure `joern-effect-properties` imports only public `joern-effect` package entrypoints or explicit public test-support entrypoints.

## 7. Documentation and Agent Workflow

- [x] 7.1 Document the standard developer workflow: enter Nix, run Nx, generate `joern-effect`, check generated freshness, run tests.
- [x] 7.2 Document the package target map so Codex and humans can discover the correct Nx entrypoints.
- [x] 7.3 Document the division of responsibilities: Nix provisions tools, Nx orchestrates tasks, OpenSpec governs build-contract changes.
- [x] 7.4 Update agent-facing notes to instruct agents to use Nx targets instead of package-private scripts.
- [x] 7.5 Document the Nix directory layout and where to add future toolchains, packages, containers, compose definitions, and shared modules.
- [x] 7.6 Document property target modes: cheap, Joern-gated local `/dev/shm`, and Joern-gated container tmpfs.
- [x] 7.7 Document the attuned Nx generator catalog and which generators are active in the `joern-effect` migration.
- [x] 7.8 Document which Discovery-specific generators are deferred until their packages are promoted.
- [x] 7.9 Document the `joern-effect` generation stage graph and how it replaces the previous hand-rolled generation pipeline.
- [x] 7.10 Document that Effect EventLog/Telemetry primitives are the future event model and that standalone `eventing` is not active.

## 8. Verification

- [x] 8.1 Run the root Nx workspace validation target from inside the Nix environment.
- [x] 8.2 Run `joern-effect` generation and generation check targets from inside the Nix environment.
- [x] 8.3 Run cheap `joern-effect` property/typecheck/build targets from inside the Nix environment.
- [x] 8.4 Run the Joern-gated property target with host `/dev/shm` when available.
- [ ] 8.5 Run the containerized Joern-gated property target through the Nx surface.
- [x] 8.6 Confirm no active supported workflow invokes Buck2.
- [x] 8.7 Confirm active workspace/package discovery ignores `imports/**`.
- [x] 8.8 Run OpenSpec validation for this change.
