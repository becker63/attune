## Long-Term Phased Implementation Plan

This change is intentionally bigger than one commit. The implementation should
move from inventory to enforcement without breaking ordinary development, while
keeping the public workflow simple: Nx owns commands and generators, Nix owns
the reproducible toolchain.

## Phase 0: Inventory and Guardrails

Goal: make the current drift visible before tightening enforcement.

- Inventory active workflow surfaces across package scripts, project targets,
  docs, agent guides, fixtures, and generated output.
- Classify every non-Nx/non-Nix workflow reference as active, historical,
  fixture, generated, migration note, or waiver candidate.
- Catalog the existing `arch:*` target suite and decide where each check belongs:
  fast, architecture, proof-pressure, or compatibility.
- Inventory repeated source-shape families and choose the first packages for
  Source BOM backfill.
- Define the first policy waiver shape so migration debt is explicit and
  expiring.

Parallel lanes:

- Workflow lane: undeclared commands, docs, scripts, and package metadata.
- Source-shape lane: repeated Effect, Alchemy, Joern, Kubernetes, event,
  projection, atom, score, and FoldKit families.
- Policy lane: initial rule ids, waiver scope, and report-only findings.

## Phase 1: Source BOM Foundation

Goal: give generators a durable place to record source ownership.

- Add Source BOM types and deterministic read/write helpers to `@attune/nx`.
- Write per-project shards at `packages/<project>/attune.source-bom.json`.
- Write the root index at `attune.source-bom.index.json`.
- Record generator identity, project, kind, normalized options, options hash,
  owned files, editable regions, sync targets, check targets, and OpenSpec
  change id when available.
- Update one high-confidence generator first, then expand to all public
  generators once the format is stable.

Parallel lanes:

- Generator lane: helper APIs, MemoryTree tests, generator integration.
- Index lane: root index shape, deterministic sorting, duplicate detection.
- Migration lane: first package shards and waiver records for historical code.

## Phase 2: Nx Public Policy Surface

Goal: make the visible workflow match the architecture rule.

- Add `workspace:policy-fast`, `workspace:policy-architecture`,
  `workspace:policy-proof-pressure`, `workspace:policy-all`, and
  `workspace:source-bom-check` as Nx targets.
- Make root scripts thin compatibility aliases that delegate to Nx targets.
- Update active docs and agent guides to show Nx commands and Nx generators as
  the public API.
- Keep Nix visible only for entering the dev shell, CI bootstrap, and flake
  validation.

Parallel lanes:

- Nx lane: workspace project metadata and composed targets.
- Docs lane: AGENTS, Codex cloud, platform docs, runbooks.
- Compatibility lane: transitional aliases and allowlisted historical text.

## Phase 3: Policy Lint Expansion

Goal: convert architecture expectations into tested rule ids.

- Expand `attune-architecture-lint` to scan active JSON, Markdown, Nix, package
  metadata, project metadata, Source BOM shards, and policy manifests.
- Add `attune/no-undeclared-workflow-surface`,
  `attune/nx-public-workflow-surface`,
  `attune/no-package-manager-bootstrap-outside-nix`,
  `attune/source-bom-ownership`,
  `attune/no-manual-generated-file`,
  `attune/nx-project-metadata`,
  `attune/secret-path-hygiene`, and
  `attune/policy-waiver-expiry`.
- Use `effect-oxlint` for TypeScript AST rules where text scanning is too blunt,
  especially raw `process.env`, raw Node APIs outside Effect Platform adapters,
  and hand-authored generated architecture shapes.
- Keep historical shapes in warning/report mode until their generator backfill
  is complete.

Parallel lanes:

- Repo scanner lane: non-TypeScript policy files and waivers.
- TypeScript AST lane: `effect-oxlint` rules.
- Source BOM lane: ownership, freshness, companion-shape consistency.

## Phase 4: Nix-Backed Hooks

Goal: make local, cloud, WSL, and CI checks run through the same toolchain.

- Add `pre-commit-hooks.nix` and expose `checks.${system}.pre-commit`.
- Install hooks from the default dev shell without global Node, pnpm, Corepack,
  or Python hook tooling.
- Wire fast hooks to Nx-owned policy targets using Nix-provided binaries.
- Keep heavy proof-pressure checks out of ordinary commits.
- Document the manual `nix flake check` path for hook parity.

Parallel lanes:

- Flake lane: inputs, checks, shell hook, formatting.
- Hook lane: fast policy target selection and pass-filenames behavior.
- CI lane: parity with existing Nx affected/typecheck/test gates.

## Phase 5: Backfill and Enforcement Ratchet

Goal: move from report-only to strong enforcement without surprising the repo.

- Backfill package-local Source BOM shards package by package.
- Add generator migrations keyed by generator name, version, project, and shape
  kind.
- Surface Source BOM metadata into the Nx project graph or an Nx-readable
  metadata path.
- Turn high-confidence new-shape violations into errors first.
- Retire waivers as generators own more architecture families.
- Export CycloneDX/SPDX metadata later from Source BOM data, without making
  those external formats the internal enforcement store.

Parallel lanes:

- Package backfill lane: uniform package shards and local check targets.
- Migration lane: generator version upgrades and generated freshness.
- Enforcement lane: warning-to-error schedule and waiver burn-down.

## Phase 6: Continuous Operation

Goal: make this boring, repeatable, and useful to agents.

- Agents query the Source BOM before editing generated or repeated shapes.
- Agents run Nx generators for new repeated architecture.
- `workspace:policy-fast` is the default local check.
- `workspace:policy-architecture` is the PR/readiness check.
- `workspace:policy-proof-pressure` remains explicit and scheduled.
- OpenSpec changes that add new source families update the generator, Source BOM,
  policy rule, and docs in the same slice.

Success looks like this:

- A file can be traced to a generator, sync target, or expiring waiver.
- Active docs never teach Corepack, global package-manager bootstrap, or random
  scripts as normal workflow.
- Nix is trusted for tools, Nx is trusted for orchestration, and agents have a
  machine-readable source grammar instead of a memory game.
