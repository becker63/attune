# Codex Cloud And Local Environment

This is the cloud and local worker setup path for Codex agents in Attune. Nx
targets, framework diagnostics, and `@attune/nx` generators are the public
workflow API. Nix supplies the reproducible toolchain substrate for those
targets; agents should not teach Corepack setup, global package-manager
bootstrap, shell wrappers, or root helper scripts as the normal workflow.

The target Attune Framework loop is diagnostics-first:

```text
language-service diagnostic or Nx check output
  -> referenced src/attune.package.ts or generated source boundary
  -> @attune/nx generator, sync generator, or framework code action
  -> generated Effect.Service / Effect Schema contract metadata
  -> framework runtime/cache evidence
  -> language-service and Nx diagnostics clear
```

Agents should repair diagnostics and package contracts, not raw protocol
runtime internals. Protocol Runtime, Protocol Store, descriptor hashes,
obligations, evidence indexes, repair plans, and ProtocolDelta facts are private
framework materialization. Public views are TypeScript language-service
diagnostics, quick info, code actions, code lenses, and Nx check output.

## Canonical smoke check

Run Nx-owned targets from the repository root:

```bash
nx graph --file=/tmp/attune-nx-graph.json
nx run workspace:policy-fast
nx run attune-nx:typecheck
nx run attuned-discovery:typecheck
```

`workspace:policy-fast` is the default policy gate for a Codex slice. The graph
command writes to `/tmp/attune-nx-graph.json` so Nx does not need to open a
browser or write generated graph output under the workspace.

If `nx` is not already on PATH, enter the repository dev shell and run the same
public Nx targets from there. Inside that shell, `pnpm exec nx ...` is an
implementation detail for reaching the Nx binary, not the workflow contract that
agents should document as user-facing guidance.

## Diagnostics And Policy Suites

Use the smallest policy target that proves the change, and report the exact Nx
target that ran:

```bash
nx run workspace:policy-fast
nx run workspace:policy-proof-pressure
nx run workspace:package-contracts-check
```

- `workspace:policy-fast` is the ordinary Codex gate.
- `workspace:policy-proof-pressure` covers proof-pressure, workerized fuzzing,
  mutation, Joern, container, and provider/resource evidence expectations.
- `workspace:package-contracts-check` is the focused diagnostic/repair target
  for package contracts, typed law metadata, generated provenance, waivers,
  stale generated source, import boundaries, local framework cache state, and
  no checked-in protocol report checks.

If a policy target is not ready on the current branch, run targeted docs grep
checks for the migration at hand and report the remaining transitional
references explicitly.

## Framework Repair Surface

For package changes, prefer this repair path:

1. Read language-service diagnostics or Nx diagnostic output.
2. Open the referenced `src/attune.package.ts`, generated typecheck module, or
   package view graph source.
3. Use `@attune/nx` generators or sync generators to refresh repeated shapes.
4. Implement behavior inside generated `Effect.Service` classes and update
   Effect Schema-backed operation metadata, laws, waivers, and provenance.
5. Update Reactivity keys, base atoms, derived atoms, package view atoms, and
   operation-to-view edges when meaningful package state changes.
6. Run the focused package check, property, atom graph, coverage, typecheck, or
   policy target that corresponds to the diagnostic.

Do not edit raw descriptor JSON, SQLite rows, Drizzle tables, ProtocolStore
internals, ProtocolDelta reports, obligation reports, evidence summaries, or
architecture summary reports as the source of truth.

## Source BOM And Generator Expectations

Before editing repeated, generated, or template-like source shapes, agents must
query the relevant Source BOM shard ownership and prefer an `@attune/nx`
generator or sync generator. Do not hand-edit repeated shapes when a generator
owns the shape. If the Source BOM shard is missing or ambiguous, document the
blocker and create a follow-up rather than inventing ownership. Source BOM and
generator-shape manifests are migration scaffolding or temporary compatibility
views; final semantic workflow surfaces are source declarations, generated
source required by build/typecheck, framework runtime/cache state,
language-service diagnostics, and Nx output.

Useful generator workflow surface:

```bash
nx generate @attune/nx:effect-service <options>
nx generate @attune/nx:joern-template <options>
nx generate @attune/nx:cocoindex-mcp-tool <options>
nx generate @attune/nx:sync-effect-layers <options>
nx generate @attune/nx:sync-joern-templates <options>
nx generate @attune/nx:sync-cocoindex-mcp-tools <options>
```

## Ordinary validation commands

Use package-level Nx targets for the smallest proof of a change:

```bash
nx run <project>:typecheck
nx run <project>:test
nx run <project>:build
```

For broad JS/TS checks, prefer the Nx target selected by the workspace policy
suite instead of teaching package-manager scripts. If a target fails, report the
exact command and classify the failure using the inventory below. Propose a
follow-up issue when the fix is larger than the current slice.

Framework evidence produced by property or fuzz targets should be stored through
framework services, printed to stdout, uploaded as CI artifacts, or written
under gitignored cache paths such as `.attune/cache`. Do not check in
ProtocolDelta reports, obligation reports, evidence summaries, Markdown/JSON
architecture summaries, cloud-agent summaries, or generated status reports as
protocol truth.

## Environment failure inventory

The ATT-24 stabilization pass found these recurring failure classes from the
issue description and direct command attempts. This table is retained as current
migration guidance, not as permission to reintroduce Corepack-first workflows.

| Failure class | Evidence | Nx/Nix response |
| --- | --- | --- |
| TMPDIR / Nx daemon instability | Older command examples carried `NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp`. | Prefer workspace-owned Nx targets. If the shell still needs these environment variables, keep them inside target implementation or the dev-shell wrapper rather than user-facing workflow docs. |
| Package manager bootstrap uncertainty | Older docs asked agents to bootstrap a package manager before invoking Nx. | Do not use global package-manager bootstrap as the public workflow. Use Nix/dev-shell tooling or the environment-provided Nx binary, then run the Nx target. |
| Nix/cloud mismatch | Previous guidance made Nix sound optional for policy/toolchain validation. | Nix is the toolchain substrate. Enter it when the current shell cannot supply the required Nx/policy/OpenSpec/Joern/CocoIndex/Kubernetes tools. |
| Heavy/local-only dependencies | Joern, Java extraction, Docker/Arion, Kubernetes runtime behavior, and browser installs may not exist in the cloud runner. | Do not block ordinary validation on those targets; use documented package typechecks/tests first and run heavy targets only when explicitly required. |
| Broken or pending targets | Targets can fail because of missing dependencies, stale target names, or expected implementation gaps. | Categorize failures as missing cloud dependency, broken repo target, package type error, heavy/local-only dependency, or expected pending implementation. |

## Optional heavy validation

Use Nix-backed tooling intentionally when a task needs one of these:

- Joern runtime or schema extraction requiring Java/Joern assets.
- Docker/Arion/container-backed property campaigns.
- Kubernetes/platform generation that depends on repo toolchains unavailable in
  the cloud runner.
- OpenSpec shell tooling if it is not already available through normal PATH.
- CocoIndex toolchains or other generated/provenance checks that the ordinary
  shell cannot supply.

When Nix is needed in cloud, document why in the validation report. Do not make
package-manager bootstrap the prerequisite for ordinary Codex package entrypoint,
typecheck, or test work.
