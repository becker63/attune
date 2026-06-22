# Attune Codex Agent Guide

This file is the standing contract for Codex agents delegated from Linear in the
`attune1` workspace. Read it before editing. If a Linear issue conflicts with
this file, stop and ask for clarification in Linear or in the Codex thread.

## Mission

Attune is an Effect-first code intelligence system. Linear is the work ledger,
Codex is the implementation agent, OpenSpec is the planning gate, Nx generators
are the source-code grammar, and GitHub PRs are the review boundary.

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

Linear-delegated Codex work must run in the Attune ChatGPT/Codex workspace and
the Attune cloud environment for the GitHub repository `becker63/attune`.
Do not continue from a home-network or unrelated Codex workspace. If the Linear
session opens in the wrong workspace/environment, stop and report the mismatch
in Linear instead of editing files.

The canonical remote is:

```bash
git remote add attune https://github.com/becker63/attune.git 2>/dev/null || true
git fetch attune main
```

Use Nx targets and `@attune/nx` generators as the public workflow API. Nix is
the reproducible toolchain substrate for those targets; do not teach Corepack,
global package-manager bootstrap, or ad-hoc package scripts as the normal agent
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
Linear issue is explicit and low risk.

## Repo Map

- `packages/attune-nx`: local Nx generators and sync generators. Prefer these
  over hand-building repeated code shapes.
- `packages/attuned-discovery`: current semantic discovery package. It contains
  the first schema, fixture, event replay, projection, and WorkbenchSnapshot
  slice.
- `packages/cocoindex-effect`: Effect service boundary and MCP-facing code for
  CocoIndex semantic recall.
- `packages/joern-effect`: generated Joern CPGQL bindings and proof-template
  DSL surface.
- `packages/joern-effect-properties`: property, fuzzer, Axiom, and Joern-backed
  validation workbench.
- `docs/dispatch-app-boundaries.md`: current FoldKit app boundary. Dispatch
  packages were removed from this project; product Workbench/FoldKit UI must not
  hide Dispatch as an incidental page.
- `packages/attune-foldkit`: product FoldKit model, update, messages, view
  logic, constrained MDX fixtures, activity helpers, and Vite web boot
  (`attune-foldkit`, `@attune/foldkit-ui`).
- `packages/platform-alchemy-k8s`: Kubernetes/Alchemy platform resource package.
  Kubernetes generation should become an `@attune/nx` generator issue before
  repeated hand-written resource shapes expand.

## Linear Operating Loop

For every delegated issue:

1. Read the Linear issue fully.
2. Identify the source doc or OpenSpec change.
3. Confirm the issue is low risk or has explicit human-review gates.
4. Work one implementation slice only.
5. Run targeted validation.
6. Report files changed, validation commands, failures, and follow-up issues.
7. Open a PR when requested or when the issue explicitly asks for it.
8. Never silently merge.

Keep Linear current. A good status update says what changed, what passed, what
failed, what is blocked, and what the next issue should be.

## Scheduling Rules

The queue should always have ready work, but a single Codex run should stay
narrow. Prefer a chain of small issues over a heroic multi-day issue.

Default order:

1. Codex agent contract and Linear delegation protocol.
2. Northstar backlog projection from docs.
3. EventLog and `DiscoveryEvents` facade.
4. Drizzle/Neon durable projections.
5. Effect Reactivity keys.
6. Server-side effect-atom view graph.
7. DecisionPacket, score, plateau, and FoldKit scene atoms.
8. FoldKit workbench progress projection.
9. Nx generator expansion for repeated shapes.

CocoIndex MCP and Joern proof-router DSL work may be tracked elsewhere. Do not
block this bootstrap queue on them unless the issue explicitly says so.

## Nx, Nix, Source BOM, And Generators

Use Nx targets/generators as the public command surface. Use Nix as the
substrate that supplies the reproducible tools behind those targets, not as a
replacement public API. Useful commands:

```bash
nx show projects
nx run <project>:typecheck
nx run <project>:test
nx run <project>:build
nx run workspace:policy-fast
nx run workspace:policy-proof-pressure
nx run workspace:package-contracts-check
```

When the local shell lacks `nx`, enter the dev shell first and invoke the same
targets from inside it. `pnpm exec nx ...` may appear there only as an
inside-dev-shell detail; docs and Linear reports should name the Nx target or
generator that is the stable workflow contract.

Before editing repeated or generated shapes, query Source BOM shard ownership
and prefer an `@attune/nx` generator or sync generator over hand-written drift.
If the Source BOM shard is missing, ambiguous, or points to another owner, stop
and report the follow-up instead of guessing.

Current `@attune/nx` generators:

- `@attune/nx:effect-service`
- `@attune/nx:joern-template`
- `@attune/nx:cocoindex-mcp-tool`
- `@attune/nx:sync-effect-layers`
- `@attune/nx:sync-joern-templates`
- `@attune/nx:sync-cocoindex-mcp-tools`

The northstar docs call for more generators: event, decision, projection,
atom-family, derived-atom, score-feature, decision-packet-field, and
foldkit-scene-atom. If an issue needs one of those repeated shapes, create or
extend a generator when practical. Otherwise, leave a Linear follow-up explaining
the missing generator.

## Safety Rules

- Do not write raw EventLog events outside `DiscoveryEventsLive`.
- Do not import Drizzle tables outside the memory/persistence boundary.
- Do not put durable writes inside atoms.
- Projection writes should announce Reactivity keys.
- Base atoms may subscribe to Reactivity keys; derived atoms should compose.
- Do not manually invalidate derived views.
- FoldKit owns interaction state, not durable discovery truth.
- Pi/local model output is a bounded `AgentDecision`, not state ownership.
- Agents must not author arbitrary Joern queries in v0.
- CocoIndex recall is not proof; normalize results before use.
- Joern proof output should be normalized into evidence packets.
- Rego, Nix, Kubernetes, scheduler/admission, worker safety, budget/lease, and
  app-server exposure work require human review unless explicitly downgraded.

## Validation

Run the smallest validation that proves the slice:

- Package typecheck for schema/API changes.
- Package tests for behavior changes.
- Build only when packaging or app boot changes.
- OpenSpec validation when changing OpenSpec artifacts.
- Generator typecheck/tests when changing `@attune/nx`.
- `workspace:policy-fast` for normal policy coverage.
- `workspace:package-contracts-check` when the slice touches package contract,
  generated ledger, generator provenance, or Source BOM ownership.
- `workspace:policy-proof-pressure` when the slice touches proof pressure,
  workerized fuzzing, mutation, Joern, container, or provider/resource evidence.

If validation cannot run, report why and include the exact command attempted.

## Reporting Template

Use this shape in Linear comments or PR summaries:

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
