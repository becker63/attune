# Attune Codex Agent Guide

This file is the standing contract for Codex agents working in the Attune
monorepo. Read it before editing. If a task conflicts with this file, stop and
ask for clarification in the Codex thread before changing files.

## Mission

Attune is an Effect-first code intelligence system with an agent-legible
program index. Codex is the implementation agent, OpenSpec is the planning
gate, Nx check/repair targets are the public workflow surface, and GitHub PRs
are the review boundary.

The northstar loop is:

```text
CocoIndex finds.
Pi proposes.
Effect validates.
Joern proves.
EventLog remembers.
Drizzle materializes.
Reactivity refreshes.
Atoms reason.
FoldKit explains.
Humans promote.
```

## Cloud Codex Environment

Cloud Codex work should run in the Attune ChatGPT/Codex workspace and the
Attune cloud environment for the GitHub repository `becker63/attune`. Local
worker tasks may run from this checkout when explicitly requested. Do not
continue from an unrelated workspace/environment; report the mismatch before
editing files.

The canonical remote is:

```bash
git remote add attune https://github.com/becker63/attune.git 2>/dev/null || true
git fetch attune main
```

Use Nx targets as the public workflow API. Nix is the reproducible toolchain
substrate for those targets; do not teach Corepack, global package-manager
bootstrap, raw generators, or ad-hoc package scripts as the normal agent
entrypoint.

The canonical cloud smoke checks are Nx-owned targets:

```bash
nx graph --file=/tmp/attune-nx-graph.json
nx run workspace:policy-fast
nx run attune-nx:typecheck
nx run attuned-discovery:typecheck
```

When an Nx binary is not already on PATH, enter the repository dev shell and run
the same public targets from there. Inside the dev shell, `pnpm exec nx ...` is
only an implementation detail for reaching Nx; the stable workflow surface is
still the Nx target or generator name. See
`docs/platform/codex-cloud-environment.md` before changing environment or
validation guidance.

Use Nix when the cloud runner needs the repository toolchain, policy gates,
Joern runtime/schema work, OpenSpec shell tooling, CocoIndex toolchains,
Kubernetes generator/toolchain work, Docker/Arion property campaigns, or local
reproducibility. If `nix` is needed and missing in the cloud environment,
install it intentionally and report why:

```bash
if ! command -v nix >/dev/null 2>&1; then
  curl -fsSL https://install.determinate.systems/nix | sh -s -- install --no-confirm
  . /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh 2>/dev/null || true
fi
```

## Primary References

Read the relevant source docs before broad changes:

- `docs/attuned/Attune Discovery v0 Technical spec.md`
- `docs/attuned/Attune Atom, Reactivity, and State Philosophy.md`
- `docs/attuned/Attune Discovery v0 Architecture Model.md`
- `docs/attuned/Attune Discovery v0 Joern and Cocoindex.md`
- `docs/attuned/Attune Discovery v0 Performance Model.md`
- `docs/platform/autonomous-codex-workstation.md`
- The active OpenSpec change under `openspec/changes/<change>/`

For material product changes, create or link an OpenSpec proposal before
implementation. Small docs and narrow follow-ups may proceed directly when the
task is explicit and low risk.

## Attune Framework Workflow

Attune Framework lives under root `framework/` and defines the programming
model. Packages under `packages/` expose their small authored Attune
declaration through `src/attune.package.ts`. Framework runtime,
SQLite/Drizzle store, language-service internals, and Nx internals are private
framework implementation details.

For package or framework-facing work, use the simple loop:

```bash
nx run workspace:attune-check
nx run workspace:attune-repair
nx run <project>:attune-check
nx run <project>:attune-repair
nx run <project>:typecheck
nx run <project>:test
```

Use `workspace:framework-policy-check`, `workspace:policy-fast`, and
generator-specific targets only as advanced or debugging surfaces. The normal
first response is check output, then the repair target suggested by
diagnostics.

For package declarations:

1. Read TypeScript language-service diagnostics and Nx check output.
2. Open the referenced `src/attune.package.ts` declaration.
3. Keep `attune.package.ts` small: package id/kind, source-facing action
   entries, schemas, services, rendered state roots, waivers, and rare custom
   validation metadata only.
4. Run the suggested `attune-repair` target before choosing a generator by hand.
5. Implement behavior inside generated `Effect.Service` boundaries and update
   Effect Schema-backed source metadata, validation metadata, waivers, and
   provenance.
6. Expose or update Reactivity keys, base atoms, derived atoms, package state
   atoms, and source-to-artifact edges for meaningful package state.
7. Run the smallest Nx-owned conformance, property, coverage, typecheck, or
   policy target that proves the slice.
8. Report validation results plus any remaining diagnostics.

Agents repair diagnostics rather than raw framework internals. Do not hand-edit
raw descriptor JSON, SQLite rows, Drizzle tables, private store internals,
diagnostic dumps, validation summaries, architecture summaries, or generated
ledger/status files as source truth. Property and fuzz validation output belongs
in framework services, stdout/CI artifacts, or gitignored local cache such as
`.attune/cache`; checked-in validation reports are not part of the core
workflow.

Each package should normally have exactly one package-local Attune file:

```text
src/attune.package.ts
```

Do not create package-local Attune compiler output as the normal path:

```text
src/attune.generated.ts
src/attune.contract.generated.ts
src/attune.package.typecheck.ts
attune.source-bom.json
```

Existing legacy generated companions and source ownership shards are migration
scaffolding until Nx repair and the program-index projection fully own their
materialization. Compile-only package assertions live in the framework-owned
aggregate, not package-local typecheck files.

The new consolidation direction is that Attune indexes the TypeScript/Effect/Nx
program first. Nx project graph facts, TypeScript exported symbols, Effect
Schema descriptor rows, generated artifact freshness, observations,
diagnostics, repairs, and invalidation events belong in the local SQLite
program index under `.attune/cache`. Legacy project-facts/generated-companion
compatibility inputs are transitional scaffolding, not a second public ontology
agents should memorize.

Do not manually expand `attune.package.ts` with derived handler maps, property
tables, type partitions, RPC descriptors, coverage-search plans, validation
producer maps, worker metadata, or generated artifact ledgers. Those belong in
framework-owned generated/cache materialization, focused validation modules, or
private program-index projections. Run the suggested Nx repair target before
editing generated or derived program-index artifacts by hand.

## Repo Map

- `packages/attune-nx`: local Nx generators and sync generators. Reach them
  through Attune check/repair diagnostics and repair plans unless debugging an
  advanced generator issue.
- `packages/attuned-discovery`: current semantic discovery package. It contains
  the first schema, fixture, event replay, projection, and WorkbenchSnapshot
  slice.
- `packages/cocoindex-effect`: Effect service boundary and MCP-facing code for
  CocoIndex semantic recall. MCP is not a core Attune Framework path; future
  MCP work should adapt framework diagnostics/query services rather than expose
  raw internals.
- `packages/joern-effect`: generated Joern CPGQL bindings and proof-template
  DSL surface.
- `packages/joern-effect-properties`: property, fuzzer, Axiom, and Joern-backed
  validation workbench.
- `docs/dispatch-app-boundaries.md`: current FoldKit app boundary. Dispatch
  packages were removed from this project; product Workbench/FoldKit UI must not
  hide Dispatch as an incidental page.
- `packages/attune-foldkit`: product FoldKit model, update, messages, render
  logic, constrained MDX fixtures, activity helpers, and Vite web boot
  (`attune-foldkit`, `@attune/foldkit-ui`).
- `packages/platform-alchemy-k8s`: Kubernetes/Alchemy platform resource package.
  Kubernetes generation should become an `@attune/nx` generator issue before
  repeated hand-written resource shapes expand.

## Agent Operating Loop

For every delegated task:

1. Read the task and relevant OpenSpec/source docs fully.
2. Identify the source doc or OpenSpec change.
3. Confirm the issue is low risk or has explicit human-review gates.
4. Work one implementation slice only.
5. Run targeted validation.
6. Report files changed, validation commands, failures, and follow-up issues.
7. Open a PR when requested or when the issue explicitly asks for it.
8. Never silently merge.

A good status update says what changed, what passed, what failed, what is
blocked, and what the next issue should be.

## Scheduling Rules

The queue should always have ready work, but a single Codex run should stay
narrow. Prefer a chain of small issues over a heroic multi-day issue.

Default order:

1. Codex agent contract and framework diagnostics workflow.
2. Northstar backlog projection from docs.
3. EventLog and `DiscoveryEvents` facade.
4. Drizzle/Neon durable projections.
5. Effect Reactivity keys.
6. Server-side effect-atom graph.
7. DecisionPacket, score, plateau, and FoldKit scene atoms.
8. FoldKit workbench progress projection.
9. Nx generator expansion for repeated shapes.

CocoIndex adapters and Joern proof-router DSL work may be tracked elsewhere. Do
not block this bootstrap queue on them unless the issue explicitly says so.

## Nx, Nix, And Compatibility Generators

Use Nx targets as the public command surface. Use Nix as the substrate that
supplies the reproducible tools behind those targets, not as a replacement
public API. Useful commands:

```bash
nx show projects
nx run workspace:attune-check
nx run workspace:attune-repair
nx run <project>:attune-check
nx run <project>:attune-repair
nx run <project>:typecheck
nx run <project>:test
nx run <project>:build
nx run workspace:policy-fast
nx run workspace:policy-proof-pressure
```

When the local shell lacks `nx`, enter the dev shell first and invoke the same
targets from inside it. `pnpm exec nx ...` may appear there only as an
inside-dev-shell detail; docs and agent reports should name the Nx target or
generator that is the stable workflow contract.

Before editing repeated or generated shapes, run `attune-check` and use the
repair action it suggests. Generators remain important, but they are normal
repair implementations rather than default agent memory. If a diagnostic has no
safe repair, report the follow-up instead of guessing. Treat legacy source
ownership shards and generator-shape manifests as migration scaffolding or
temporary compatibility data, not final semantic workflow surfaces.

## Safety Rules

- Do not write raw EventLog events outside `DiscoveryEventsLive`.
- Do not import Drizzle tables outside the memory/persistence boundary.
- Do not put durable writes inside atoms.
- Projection writes should announce Reactivity keys.
- Base atoms may subscribe to Reactivity keys; derived atoms should compose.
- Do not manually invalidate derived projections.
- FoldKit owns interaction state, not durable discovery truth.
- Pi/local model output is a bounded `AgentDecision`, not state ownership.
- Agents must not author arbitrary Joern queries in v0.
- CocoIndex recall is not proof; normalize results before use.
- Joern proof output should be normalized into observation packets.
- Rego, Nix, Kubernetes, scheduler/admission, worker safety, budget/lease, and
  app-server exposure work require human review unless explicitly downgraded.

## Validation

Run the smallest validation that proves the slice:

- Package typecheck for schema/API changes.
- Package tests for behavior changes.
- Focused framework diagnostics such as `workspace:framework-policy-check`
  for source metadata, generated provenance, waivers, stale generated source,
  import boundaries, local cache state, and no checked-in report checks.
- Atom graph/property/coverage conformance targets when the slice changes
  Reactivity keys, atoms, package state projections, generated FastCheck
  observations, replay, or coverage guidance.
- Build only when packaging or app boot changes.
- OpenSpec validation when changing OpenSpec artifacts.
- Generator typecheck/tests when changing `@attune/nx`.
- `workspace:policy-fast` for normal policy coverage.
- `workspace:framework-policy-check` when the slice touches generated ledgers,
  generator provenance, or legacy source ownership scaffolding.
- `workspace:policy-proof-pressure` when the slice touches proof pressure,
  workerized fuzzing, mutation, Joern, container, or provider/resource
  observations.

If validation cannot run, report why and include the exact command attempted.

## Reporting Template

Use this shape in agent handoffs or PR summaries:

```text
Changed:
- ...

Validated:
- ...

Not run:
- ...

Risks:
- ...

Follow-ups:
- ...
```

Keep the report short, concrete, and linked to the issue.
