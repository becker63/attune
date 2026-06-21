## 1. Nx public policy gates

- [ ] 1.1 Add `workspace:policy-fast` as the ordinary Codex policy gate.
- [ ] 1.2 Add `workspace:policy-architecture` for architecture boundary checks.
- [ ] 1.3 Add `workspace:policy-proof-pressure` for proof-pressure checks.
- [ ] 1.4 Add `workspace:source-bom-check` for Source BOM provenance checks.

## 2. Source BOM workflow

- [ ] 2.1 Add Source BOM shard lookup helpers.
- [ ] 2.2 Integrate Source BOM ownership into repeated-shape generators.
- [ ] 2.3 Backfill the first package Source BOM shards.

## 3. Agent documentation migration

- [ ] 3.4 Replace active Corepack-first examples with Nx-owned commands.
- [ ] 3.5 Document `pnpm exec nx ...` only as an inside-dev-shell detail when unavoidable.

## 4. Nix-backed policy wiring

- [ ] 4.1 Keep Nix as the reproducible toolchain substrate behind policy targets.
- [ ] 4.2 Avoid documenting global package-manager bootstrap as an active workflow.

## 5. Generated-source policy docs

- [ ] 5.3 Document that agents query Source BOM ownership before editing repeated or generated shapes.
- [ ] 5.4 Document that agents prefer `@attune/nx` generators and sync generators for owned shapes.

## 6. Validation

- [ ] 6.1 Validate this OpenSpec change.
- [ ] 6.2 Run `nx run workspace:policy-fast` when available.
- [ ] 6.3 If policy targets are not ready, run docs grep checks and report remaining transitional references.

## 7. Existing documentation updates

- [ ] 7.7 Update active agent/workstation/runbook docs to mention `workspace:policy-fast`, `workspace:policy-architecture`, `workspace:policy-proof-pressure`, and `workspace:source-bom-check`.
