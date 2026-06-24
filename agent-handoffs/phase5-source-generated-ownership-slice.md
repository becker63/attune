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
  `framework/architecture/src/generated/package-contracts/**`.
- The actual repository scan now asserts that no package-local generated
  companion files or imports are present in the active package source surface.

Ownership Proof:
- `attune.source-bom.index.json` points all 11 registered projects at
  `framework/architecture/src/generated/source-bom/<project>.json`.
- `.attune/cache/` remains gitignored, and no-report policy tests continue to
  reject checked-in report artifacts while allowing local cache artifacts.
- `nix/policy-hooks/touched-source-bom-ownership.sh` accepts staged
  package/framework source when the root Source BOM index points at either the
  framework-owned or cache-owned projection.

Validated:
- `pnpm exec nx run attune-architecture:test --skipNxCache`
- `pnpm exec nx run attune-architecture:build --skipNxCache`
- `pnpm exec nx run workspace:package-contracts-check --skipNxCache`
- `pnpm exec nx run workspace:source-bom-check --skipNxCache`
- `bash -n nix/policy-hooks/touched-source-bom-ownership.sh`

Not run:
- Ring-specific project check/test targets remain pending in Phase 6.

Risks:
- Framework-owned generated companions still exist as compatibility material.
  They are not package-local source truth, but they are not deleted in this
  slice.
- Active docs still need a later cleanup pass to remove old generated/source
  ownership wording once each ring handoff is validated.

Follow-ups:
- Remove or quarantine remaining compatibility generated outputs ring by ring
  only after check/repair/freshness parity passes for that ring.
- Update project-ring docs and handoffs so old generated/source ownership terms
  are not presented as normal workflow.
