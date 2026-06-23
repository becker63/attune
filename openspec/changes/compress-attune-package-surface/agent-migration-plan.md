## Agent Migration Plan

### Phase 1: Inventory And Ratchet

Owner: framework policy agent.

- Inventory every active Attune root with package-local companion files.
- Keep `src/attune.package.ts` as the only authored package-local Attune file.
- Emit `attune/package-local-surface/one-attune-file` warnings for existing
  companions.
- Do not fail the repo until generated companion lookup has moved out of
  package source.

Validation:

- `nx run workspace:framework-policy-check`
- `nx run workspace:package-contracts-check`

### Phase 2: Public Check/Repair Surface

Owner: framework Nx agent.

- Ensure workspace and project public aliases exist:
  `attune-check` and `attune-repair`.
- Keep lower-level generators and checks as internal implementation details.
- Route repairable diagnostics to public repair targets with internal generator
  metadata in repair plans.

Validation:

- `nx run workspace:attune-check`
- `nx run workspace:attune-repair --dryRun`
- `nx run <project>:attune-check`
- `nx run <project>:attune-repair --dryRun`

### Phase 3: Generated Companion Relocation

Owner: framework materialization agent.

- Add central/cache-owned typecheck aggregate.
- Move `src/attune.contract.generated.ts`, `src/attune.generated.ts`, and
  `src/attune.package.typecheck.ts` out of package source.
- Teach package-contract semantic checks to read framework-owned materialized
  state.
- Upgrade one-file diagnostics from warning to error for product packages.

Validation:

- `nx run workspace:attune-check`
- `nx run-many -t typecheck -p <migrated projects>`
- `nx run workspace:policy-fast`

### Phase 4: Source BOM Projection Relocation

Owner: framework architecture/storage agent.

- Move package-local `attune.source-bom.json` shards to cache or ProtocolStore
  projection state.
- Keep reviewable ownership summaries available through diagnostics and Nx
  output, not package-local source.
- Remove Source BOM as public agent workflow truth.

Validation:

- `nx run workspace:source-bom-check`
- `nx run workspace:package-contracts-check`

### Phase 5: Final Ratchet

Owner: final validation agent.

- Error on package-local Attune companions unless explicitly waived.
- Error on public docs that teach raw generator invocation as the default path.
- Keep advanced/internal generator references allowed in generator reference
  documentation.

Validation:

- `openspec validate compress-attune-package-surface --type change`
- `nx run workspace:policy-fast`
- `git diff --check`
