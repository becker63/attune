## Context

The active `standardize-nx-nix-build` change already establishes the big architecture decision: Nx owns repo task orchestration and code generation, while Nix owns the reproducible toolchain. The repo has mostly moved in that direction, but the enforcement layer is incomplete.

Current gaps:

- Root scripts and agent docs still contain `corepack pnpm` as the normal command surface.
- `scripts/codex/pnpm.mjs` can fall through to Corepack or a downloaded pnpm tarball instead of requiring the Nix-provisioned package manager.
- `flake.nix` already provides Node, pnpm, OpenSpec, Joern, architecture tools, and a dev shell, but it does not install or run pre-commit policy hooks.
- `packages/attune-architecture-lint` already exists and uses Effect/Schema, but its catalog is still narrow: lifecycle helper bans, Effect service/schema boundaries, and generator availability checks.
- The repo has a large architecture-check catalog in root scripts (`arch:loc`, `arch:deps`, `arch:cycles`, `arch:unused`, `arch:complexity`, `arch:duplicates`, `arch:types`, `arch:churn`, `arch:effect`, `arch:mutation`, and `arch:scan`), but those checks are not organized into fast local hooks versus heavier CI/proof-pressure gates.
- Agent instructions say to use Nx generators, but there is no auditable Source BOM that records which generator produced each repeated source shape, which sync target owns generated outputs, or which waiver temporarily permits hand-authored architecture.

This change adds the enforcement layer that turns "Nx owns source grammar; Nix provisions tools" into concrete checks that run the same way for local WSL users, cloud Codex sessions, remote agents, and CI.

## Goals / Non-Goals

**Goals:**

- Make Nx the only supported public workflow surface for active workspace commands, with Nix as the pinned toolchain substrate.
- Remove undeclared workflow surfaces such as Corepack, random helper scripts, `node_modules/.bin` command paths, and env-prefix command soup from root scripts, active docs, and agent workflows except for explicitly allowlisted migration/historical text.
- Add Nix-backed pre-commit hooks that install from the dev shell and can also run in `nix flake check`.
- Extend `attune-architecture-lint` into a policy catalog that protects environment usage, source-generation discipline, package metadata, lifecycle boundaries, and secret-path hygiene.
- Preserve and compose the existing architecture-check tools into fast pre-commit hooks, targeted pre-push or PR checks, and heavy/manual proof-pressure checks.
- Add an Attune Source BOM so repeated source shapes can be traced to generator ownership, sync ownership, editable regions, inputs, outputs, OpenSpec context, or temporary waivers.
- Give policy waivers an explicit schema with owner, rule id, reason, expiry, and evidence.

**Non-Goals:**

- Do not replace Nx with Nix task orchestration or expose Nix apps as the normal public command surface.
- Do not make every heavy architecture scan run on every commit.
- Do not require the first implementation pass to prove Source BOM ownership for all historical files.
- Do not block day-0 host deployment work on unrelated Discovery/FoldKit generator expansion.
- Do not introduce broad generic style lint rules when a narrow Attune rule will do.
- Do not enforce policies by private reviewer memory or chat instructions.

## Decisions

### Decision: Nx is public, Nix is the substrate

Active repo workflows should be exposed as Nx targets or Nx generators:

```bash
nx run workspace:policy-fast
nx run workspace:policy-architecture
nx run workspace:source-bom-check
nx sync
nx generate @attune/nx:effect-service ...
```

Nix still provisions the pinned Node, pnpm, Nx, OpenSpec, Joern, oxlint, and policy tooling. Humans and agents should not see Nix as the product workflow API except when entering the dev shell or CI bootstrap.

Root scripts may remain as convenience aliases, but they must delegate to Nx targets and must not invoke `corepack`, `node_modules/.bin`, random `node scripts/*`, or ad hoc env-prefixed shell workflows as public APIs. CI may wrap Nx in `nix develop`, but repository docs should present Nx targets as the stable command surface.

Alternative considered: document `nix run .#attune -- policy fast` as the primary command surface. Rejected because it pollutes the public workflow API with the provisioning layer and weakens the rule that Nx owns orchestration and source grammar.

Alternative considered: keep Corepack as a cloud fallback. Rejected for active workflow because it keeps two package-manager authorities alive and undermines the repo rule the user is trying to enforce. If a hosted environment lacks Nix, the bootstrap path should install or enter Nix intentionally, then run Nx targets.

### Decision: pre-commit-hooks.nix owns local hook installation

Add `pre-commit-hooks.nix` as a flake input and wire:

- `checks.${system}.pre-commit`
- dev shell `shellHook` installation script
- workspace-level Nx policy targets for manual runs

The hooks should use Nix-packaged tools and repo scripts, with `pass_filenames = false` for graph-level checks that already know how to scan the repo.

Alternative considered: a standalone `.pre-commit-config.yaml`. Rejected as the primary contract because it reintroduces host-managed tool installation. It may be generated or kept as editor integration later, but Nix remains the source of truth.

### Decision: hooks are tiered by cost

Fast hooks run on ordinary commits. Heavier checks run in CI or explicit commands.

Fast pre-commit hooks:

- `nixfmt` for Nix files.
- an undeclared workflow policy scan.
- secret-path hygiene scan.
- `attune-architecture-lint:scan` once it is fast enough for full-repo use.
- Source BOM and generated freshness checks for files touched by known generators.
- OpenSpec validation for changed active changes when feasible, or all active changes when the CLI is fast enough.

Targeted pre-push or PR checks:

- `nx affected -t typecheck,test,lint,check-generated`.
- dependency and cycle checks.
- `knip` unused export checks.
- TypeScript extended diagnostics.
- architecture duplicate/complexity checks.

Heavy/manual checks:

- mutation testing.
- Joern-gated property campaigns.
- containerized property campaigns.
- full architecture scans across historical/imported material.

Alternative considered: run the whole architecture catalog pre-commit. Rejected because slow hooks train humans and agents to bypass the hook. The repo should keep the hook annoying enough to catch real drift, not so slow that it becomes ceremonial.

### Decision: architecture targets are composed into named policy suites

The root `arch:*` target catalog should remain visible, but the repo needs composed commands that declare intent:

| Suite | Includes | Intended trigger |
| --- | --- | --- |
| `workspace:policy-fast` | undeclared workflow surface scan, secret-path hygiene, focused `arch:effect`, Nix formatting, feasible OpenSpec validation, Source BOM touched-file checks | pre-commit, quick local agent checks |
| `workspace:policy-architecture` | `arch:loc`, `arch:deps`, `arch:cycles`, `arch:unused`, `arch:complexity`, `arch:duplicates`, `arch:types`, `arch:churn`, `arch:effect`, Source BOM full check | pre-push, PR validation, explicit architecture review |
| `workspace:policy-proof-pressure` | `workspace:policy-architecture`, `arch:mutation`, Joern-gated property checks when requested | scheduled/manual high-confidence runs |
| `workspace:policy-all` | fast, architecture, generated freshness, targeted Nx typecheck/test/build, optional proof-pressure by flag | CI or release-quality validation |

The existing `arch:scan` can become an alias for `workspace:policy-architecture` or remain as a low-level compatibility target, but it must be Nx-owned and must not hide mutation testing inside a target that developers expect to be cheap. `arch:mutation` should stay explicit because Stryker runs are intentionally expensive and produce different signal from static architecture scans.

Alternative considered: leave `arch:*` as independent package scripts. Rejected because agents need a small set of named gates that explain when to run each kind of check.

### Decision: Attune architecture lint becomes the policy engine for source rules

`packages/attune-architecture-lint` should continue using Effect services and Effect Schema. New rules should be added as first-class rule ids with tests and JSON/text reporting.

Initial rule catalog:

| Rule id | Scope | Enforcement |
| --- | --- | --- |
| `attune/no-undeclared-workflow-surface` | root scripts, project targets, scripts, active docs | Reject `corepack`, random script entrypoints, `node_modules/.bin`, env-prefix command soup, and other non-Nx public workflows outside explicit allowlist entries. |
| `attune/nx-public-workflow-surface` | docs, agent guides, package scripts | Require active validation examples to expose Nx targets or Nx generators as the public workflow surface. |
| `attune/no-package-manager-bootstrap-outside-nix` | docs, scripts | Reject global Node/pnpm/npm bootstrap instructions unless they are Nix installation instructions or historical imports. |
| `attune/no-local-lifecycle-helper` | Alchemy packages | Keep the existing ban on local deploy/status/phase/reconcile helper surfaces. |
| `attune/no-command-runner-facade` | provider code | Keep the existing ban on command-runner facades around provider execution. |
| `attune/effect-service-boundary` | provider/service code | Keep the existing Effect service boundary rule. |
| `attune/effect-schema-boundary` | provider/service code | Keep the existing Effect Schema boundary rule. |
| `attune/nx-project-metadata` | packages | Require package roots to declare Nx project metadata and canonical targets where applicable. |
| `attune/source-bom-ownership` | repeated source shapes | Require matching Source BOM ownership or an explicit waiver. |
| `attune/no-manual-generated-file` | generated outputs | Reject edits to generated output paths unless a sync/check target owns them. |
| `attune/secret-path-hygiene` | repo files | Reject plaintext age keys, Tailscale auth material, kubeconfigs, and common secret filenames outside encrypted fixtures or explicit placeholders. |
| `attune/policy-waiver-expiry` | policy waiver file | Reject waivers without owner, reason, rule id, created date, expiry, and path scope. |

Alternative considered: encode the rules as ESLint. Rejected for repo-wide policy because many rules need to scan JSON, Markdown, Nix, project metadata, and generator manifests. ESLint remains useful for TypeScript style/complexity.

### Decision: Attune Source BOM is the enforcement substrate

Every public Nx generator that creates repeated Attune source shapes should write or update a machine-readable Source BOM shard in the owning package, proposed as:

```text
packages/<project>/attune.source-bom.json
```

The root should keep a small index, proposed as:

```text
attune.source-bom.index.json
```

The Source BOM is not a dependency SBOM. It is a source-shape bill of materials: a machine-readable record of how architectural source files came into existence and which generator, sync generator, or waiver owns them. Because Attune packages are relatively uniform and already do extensive code generation, per-project shards make the system more useful: each package carries its own generated architecture ledger, while the root index lets Nx compose the workspace view.

Entries should include:

- stable entry id.
- source-shape kind such as `effect-service`, `alchemy-resource`, `joern-template`, `k8s-resource`, `event-facade`, `projection`, `atom-family`, `foldkit-scene-atom`, or `generated-registry`.
- owning Nx project.
- generator or sync generator name.
- generator version, package hash, or workspace generator revision.
- normalized options and options hash.
- source inputs and generated outputs.
- files owned by the entry.
- editable regions, when the generated shape intentionally contains hand-authored implementation areas.
- sync targets and check targets that reproduce generated outputs.
- OpenSpec change id when known.
- waiver id when the entry is intentionally hand-authored during migration.

Policy checks then ask: "Does this source shape have Source BOM ownership, or is it covered by an explicit waiver?" They do not ask an agent to remember what it did.

Historical code should begin in warning/report mode and graduate to error rule-by-rule after generators have been backfilled. New repeated architecture shapes should fail immediately when they do not have Source BOM ownership.

The Source BOM buys the repo:

- aggressive generator enforcement: new repeated architecture shapes without Source BOM ownership fail policy.
- architecture ownership beyond imports: Nx knows project dependencies, while the Source BOM knows which generator created service boundaries, registries, templates, projections, and atoms.
- generated freshness without guessing: generated outputs name their inputs and sync/check targets.
- better agent behavior: agents can inspect ownership before editing and run the owning generator instead of hand-authoring structure.
- visible waiver debt: temporary exceptions carry owner, rule, path, reason, expiry, and follow-up.
- architectural migrations: generator version changes can target all entries produced by an older generator.
- Nx graph metadata: Source BOM entries can be surfaced through project graph plugins, dashboards, and affected policy checks.
- consistent Effect codebase pressure: package shards can require companion service, layer, schema, fake/test, registry, and export shapes for each generated architecture move.
- external provenance export: the native Source BOM can later emit CycloneDX custom properties or SPDX build records, but those standards are export formats rather than the internal enforcement store.

Alternative considered: generated file headers only. Rejected as insufficient because headers are easy to copy and do not describe the generator inputs or ownership graph. Headers are still useful as a secondary signal.

Alternative considered: CycloneDX or SPDX as the primary internal store. Rejected because dependency/build BOM standards are excellent export targets but do not natively encode Attune's generator-specific source-shape invariants as directly as a purpose-built Source BOM.

### Decision: waivers are explicit and expiring

Introduce a small policy waiver file, proposed as:

```text
attune.policy-waivers.json
```

Each waiver must name the rule id, path scope, owner, reason, creation date, expiration date, and migration/follow-up. Architecture lint fails expired or malformed waivers.

Alternative considered: inline comments. Rejected for repo policy because many violations live in JSON, Nix, Markdown, package metadata, or generated output where inline comments are inconsistent.

### Decision: existing architecture checks stay cataloged

The current root `arch:*` scripts are useful and should be preserved, exposed through Nx, backed by the Nix-provisioned toolchain, and composed into policy suites:

- `arch:effect`: Attune-specific policy and architecture rules.
- `arch:loc`: size/line-count signal for package growth.
- `arch:deps`: dependency-cruiser boundaries.
- `arch:cycles`: circular dependency detection.
- `arch:unused`: unused file/export checks.
- `arch:complexity`: ESLint/SonarJS complexity/style checks.
- `arch:duplicates`: copy/paste and repeated code checks.
- `arch:types`: TypeScript extended diagnostics.
- `arch:churn`: churn/complexity hotspots.
- `arch:mutation`: mutation testing.
- `arch:scan`: compatibility alias for the composed architecture suite once the migration is complete.

The implementation should make those commands Nx-owned and decide which are hooked, which are CI-only, and which are manual heavy gates.

## Risks / Trade-offs

- [Risk] Historical code produces too many generator-provenance violations. -> Mitigation: start provenance checks in report/warning mode for existing paths and enforce errors only for new repeated shapes or touched paths.
- [Risk] Agents bypass hooks in cloud environments. -> Mitigation: mirror hooks in `nix flake check` and CI, and make agent docs require the same commands.
- [Risk] Nix startup cost slows ordinary commits. -> Mitigation: install hooks from the dev shell and keep expensive checks behind pre-push/CI targets.
- [Risk] An undeclared workflow rule breaks generated fixtures or historical docs. -> Mitigation: require explicit allowlist entries with reason and expiration instead of silent exceptions.
- [Risk] Provenance manifests become noisy merge-conflict magnets. -> Mitigation: keep entries sorted deterministically by path and generator id, and have sync generators rewrite the manifest.
- [Risk] Policy lint becomes a dumping ground. -> Mitigation: every rule needs an OpenSpec requirement, a rule id, tests, and a waiver story before it becomes an error.

## Migration Plan

1. Inventory all current Corepack, package-manager bootstrap, undeclared workflow, generated-file, and generator-coverage references.
2. Add `pre-commit-hooks.nix` to the flake and expose a `checks.${system}.pre-commit` gate.
3. Convert root scripts and active docs to Nx-owned public commands backed by the Nix-provisioned toolchain.
4. Remove Corepack fallback behavior from active Codex wrappers, or convert it into an explicit failure that points to the owning Nx target and dev-shell bootstrap.
5. Extend `attune-architecture-lint` with policy rule infrastructure, allowlists, waiver decoding, and tests.
6. Add the first undeclared-workflow and Nx-public command-surface rules.
7. Add secret-path hygiene and package metadata rules.
8. Add Source BOM support to `@attune/nx` generators and sync generators.
9. Add Source BOM ownership checks in warning mode for historical shapes and error mode for high-confidence new shapes.
10. Wire the existing architecture-check catalog into Nx policy targets and CI tiers.
11. Update `AGENTS.md`, Codex cloud docs, and platform docs to match the enforced contract.

## Open Questions

- Which Source BOM shard path and root index filename should be finalized before implementation?
- Should Corepack be allowed in archived/imported docs forever, or should imported paths be outside the active scan by default?
- Which generated shapes become error-enforced first: Effect services, Alchemy resources, Joern templates, Kubernetes resources, or FoldKit atoms?
