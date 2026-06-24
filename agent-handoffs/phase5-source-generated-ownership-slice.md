Changed:
- Added a final-ratchet diagnostic for package source imports or re-exports of
  project-local generated companions such as `src/attune.generated.ts`,
  `src/attune.contract.generated.ts`, and
  `src/attune.package.typecheck.ts`.
- Completed one-file roots now error when package source imports local generated
  companions after the framework-owned replacement path exists; other roots
  remain warning-first while parity is incomplete.
- Framework-owned generated contract materialization remains allowed to import
  adjacent compatibility helper files under
  `framework/architecture/src/generated/project-facts/**`.
- The actual repository scan now asserts that no package-local generated
  companion files or imports are present in the active package source surface.

Ownership Proof:
- `attune.source-bom.index.json` points all 11 registered projects at
  `framework/architecture/src/generated/source-bom/<project>.json`.
- `rg --files | rg '(^|/)src/attune\.(generated|contract\.generated|package\.typecheck)\.ts$|(^|/)attune\.source-ownership\.json$'`
  returns no project-local generated companion or package-root source ownership
  files in the active workspace.
- `.attune/cache/` remains gitignored, and no-report policy tests continue to
  reject checked-in report artifacts while allowing local cache artifacts.
- `nix/policy-hooks/touched-source-ownership-ownership.sh` accepts staged
  package/framework source when the root source ownership artifact index points at either the
  framework-owned or cache-owned projection.
- No active ring-specific handoff existed before Phase 6. The Phase 6 ring
  handoffs must describe replacements as project, source_file, symbol,
  schema_descriptor, edge, artifact, observation, diagnostic, repair, and
  invalidation facts; old generated/source ownership terms are retained only as
  compatibility labels or deletion blockers.

Validated:
- `pnpm exec nx run attune-architecture:test --skipNxCache`
- `pnpm exec nx run attune-architecture:build --skipNxCache`
- `pnpm exec nx run workspace:attune-check --skipNxCache`
- `pnpm exec nx run workspace:source-bom-check --skipNxCache`
- `bash -n nix/policy-hooks/touched-source-ownership-ownership.sh`
- `pnpm exec nx run workspace:policy-commit --timeoutSeconds=600`

Not run:
- Ring-specific project check/test targets remain pending in Phase 6.

Risks:
- Framework-owned generated companions still exist as compatibility material.
  They are not package-local source truth, but they are not deleted in this
  slice.
- Active docs still need a later cleanup pass to remove old generated/source
  ownership wording once each ring handoff is validated.

Follow-ups:
- Remove or quarantine remaining framework-owned compatibility generated
  outputs ring by ring only after check/repair/freshness parity passes for that
  ring.
- Keep Phase 6 ring handoffs in mechanical vocabulary and record old terms only
  as compatibility labels, deletion blockers, or future-change risks.
