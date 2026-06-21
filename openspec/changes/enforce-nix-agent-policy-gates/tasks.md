## 1. Inventory and Policy Boundaries

- [x] 1.1 Inventory active `corepack`, global package-manager bootstrap, random helper script, `node_modules/.bin`, env-prefix command, and other undeclared workflow references across root scripts, package scripts, Nx targets, agent docs, platform docs, fixtures, and generated text.
- [x] 1.2 Classify each undeclared workflow reference as active workflow, historical/imported text, test fixture, generated output, or migration note.
- [x] 1.3 Inventory the current architecture target catalog in `package.json`, including `arch:loc`, `arch:deps`, `arch:cycles`, `arch:unused`, `arch:complexity`, `arch:duplicates`, `arch:types`, `arch:churn`, `arch:effect`, `arch:mutation`, and `arch:scan`.
- [x] 1.4 Inventory repeated source-shape families that should eventually require Source BOM ownership: Effect services, Alchemy resources, provider boundaries, Joern templates, Kubernetes resources, generated registries, event facades, projections, atoms, score features, decision packet fields, and FoldKit scene atoms.
- [x] 1.5 Inventory existing generated architecture per active package and identify the first package-local Source BOM shards to backfill.
- [x] 1.6 Define the initial policy allowlist and waiver file shape for historical docs, fixtures, imported material, hand-authored source shapes, and temporary migration exceptions.

## 2. Nix Pre-Commit Wiring

- [ ] 2.1 Add `pre-commit-hooks.nix` as a flake input and expose a `checks.${system}.pre-commit` gate.
- [ ] 2.2 Install or refresh pre-commit hooks from the default dev shell without requiring global Node, pnpm, Corepack, or Python hook tooling.
- [ ] 2.3 Add fast hooks for Nix formatting, undeclared workflow policy, secret-path hygiene, focused architecture lint, touched Source BOM ownership, and feasible OpenSpec validation.
- [ ] 2.4 Ensure hook commands use Nix-provided binaries and set the same `NX_DAEMON=false`, `TMPDIR`, `TEMP`, and `TMP` behavior as existing repo commands.
- [ ] 2.5 Document and validate the manual command that runs the same hook set through `nix flake check`.

## 3. Nx Public Command Cleanup

- [ ] 3.1 Replace Corepack-first root scripts with Nx-owned public commands backed by the Nix-provisioned toolchain.
- [ ] 3.2 Update `scripts/codex/pnpm.mjs` and cloud helpers so active validation resolves the owning Nx target instead of falling through to Corepack or downloaded pnpm.
- [ ] 3.3 Update `scripts/architecture/ts-extended-diagnostics.mjs` and other architecture helpers so they are invoked through Nx policy targets rather than public random scripts.
- [ ] 3.4 Update `AGENTS.md`, Codex cloud docs, platform docs, and runbooks to show Nx targets and Nx generators as the public workflow surface.
- [ ] 3.5 Add migration notes or explicit allowlist entries for fixture/historical references that intentionally retain Corepack text.

## 4. Architecture Policy Suite Composition

- [ ] 4.1 Add composed workspace Nx targets for `workspace:policy-fast`, `workspace:policy-architecture`, `workspace:policy-proof-pressure`, and `workspace:policy-all`.
- [ ] 4.2 Wire `workspace:policy-fast` to the pre-commit-safe checks: undeclared workflow policy, secret-path hygiene, focused `arch:effect`, Nix formatting, feasible OpenSpec validation, and touched Source BOM checks.
- [ ] 4.3 Wire `workspace:policy-architecture` to compose `arch:loc`, `arch:deps`, `arch:cycles`, `arch:unused`, `arch:complexity`, `arch:duplicates`, `arch:types`, `arch:churn`, `arch:effect`, and Source BOM full validation.
- [ ] 4.4 Keep `arch:mutation` explicit and wire it into `workspace:policy-proof-pressure` instead of ordinary fast or architecture scans.
- [ ] 4.5 Decide whether `arch:scan` becomes a compatibility alias for `workspace:policy-architecture` or remains a lower-level command, then update scripts and docs accordingly.
- [ ] 4.6 Ensure each architecture target runs through the Nix-provisioned toolchain and reports enough context for agents and CI.

## 5. Architecture Lint Policy Rules

- [ ] 5.1 Add an `effect-oxlint`-backed Attune oxlint plugin for TypeScript AST policy rules.
- [x] 5.2 Extend `attune-architecture-lint` rule infrastructure to scan active JSON, Markdown, Nix, package metadata, project metadata, Source BOM shards, and policy manifests.
- [x] 5.3 Add `attune/no-undeclared-workflow-surface` with tests for root scripts, package scripts, Nx targets, active docs, fixtures, and allowlisted historical text.
- [ ] 5.4 Add `attune/nx-public-workflow-surface` and `attune/no-package-manager-bootstrap-outside-nix` with tests for agent docs and validation examples.
- [ ] 5.5 Add effect-oxlint rules for raw `process.env`, raw Node filesystem/process APIs outside approved Effect Platform adapters, and hand-authored TypeScript architecture shapes where AST matching is sufficient.
- [ ] 5.6 Add `attune/nx-project-metadata` with tests for package roots and canonical Nx targets.
- [ ] 5.7 Add `attune/secret-path-hygiene` with tests for age keys, Tailscale auth material, kubeconfigs, SSH keys, token dumps, encrypted fixtures, and placeholders.
- [ ] 5.8 Add waiver decoding and `attune/policy-waiver-expiry` with tests for valid, expired, malformed, unknown-rule, and path-mismatch waivers.
- [x] 5.9 Keep existing Alchemy lifecycle, provider command facade, Effect service, Effect Schema, and generator catalog rules passing under the expanded scanner.

## 6. Attune Source BOM

- [x] 6.1 Define the root Source BOM index schema and per-project Source BOM shard schema using Effect Schema and deterministic sorting.
- [x] 6.2 Add Source BOM helpers to `@attune/nx` so generators can record generator identity, normalized options, options hash, affected project, owned files, editable regions, sync/check targets, and OpenSpec change id when available.
- [ ] 6.3 Add Source BOM output to active generators such as `effect-service`, `joern-template`, `discovery-event`, `cocoindex-mcp-tool`, `k8s-resource`, and sync generators.
- [ ] 6.4 Add `workspace:source-bom-check` and package-level Source BOM check targets that validate the root index, project shards, owned paths, duplicate entries, malformed waivers, and deterministic ordering.
- [ ] 6.5 Add Source BOM query targets so agents can ask which generator owns a file, which files belong to a shape, and which generator should be used for a new shape family.
- [x] 6.6 Add `attune/source-bom-ownership` in warning or inventory mode for historical shapes and error mode for new high-confidence repeated shapes.
- [ ] 6.7 Add `attune/no-manual-generated-file` for generated output paths owned by Source BOM sync or generation targets.
- [ ] 6.8 Add Effect consistency checks that use Source BOM entries to require companion service, layer, schema, fake/test, registry, and export shapes for generated Effect boundaries.
- [ ] 6.9 Add Source BOM support to generator migrations so changed generator templates can target entries by generator name, version, project, and shape kind.
- [ ] 6.10 Surface Source BOM shard metadata through an Nx project graph plugin or equivalent Nx-readable metadata path.
- [ ] 6.11 Keep CycloneDX/SPDX export as optional follow-up output from Source BOM data, not the internal enforcement store.
- [ ] 6.12 Include Source BOM validation in the appropriate policy suites.

## 7. Validation and Documentation

- [x] 7.1 Run and fix `openspec validate enforce-nix-agent-policy-gates --type change`.
- [ ] 7.2 Run and fix `nix flake check` or the narrow Nix check that includes pre-commit policy hooks.
- [ ] 7.3 Run and fix `nx run attune-architecture-lint:test` inside the Nix-provisioned dev shell.
- [ ] 7.4 Run and fix the composed `workspace:policy-fast` target.
- [ ] 7.5 Run and report the composed `workspace:policy-architecture` target, including any accepted transitional findings.
- [ ] 7.6 Run `workspace:policy-proof-pressure` or `arch:mutation` when practical, or document why mutation testing was not run.
- [ ] 7.7 Update the repo agent guide and platform docs with the new policy suites, Source BOM shard workflow, waiver workflow, generator ownership expectations, and Nx-public command examples.
