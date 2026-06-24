Changed:
- `package-local-attune-companion` policy diagnostics are now parity-aware for
  completed one-file roots.
- Completed roots keep a warning when a project-local generated companion exists
  but the framework-owned or cache-owned replacement path is incomplete.
- Completed roots escalate to an error only when every remaining project-local
  companion has a concrete replacement path:
  `framework/architecture/src/generated/project-facts/<project>/attune.contract.generated.ts`,
  `framework/architecture/src/generated/project-facts/<project>/attune.generated.ts`,
  `framework/architecture/src/generated/project-facts.typecheck.generated.ts`,
  or a root artifact ownership index entry pointing at an existing framework/cache
  artifact ownership projection.
- Policy diagnostics now explain which replacement paths are missing, or state
  that program-index replacement paths exist for the remaining companion files.

Validated:
- `pnpm exec nx run attune-architecture:test --skipNxCache`
- `pnpm exec nx run attune-architecture:build --skipNxCache`

Not run:
- Full Phase 5 validation remains pending until the remaining artifact ownership,
  import lookup, cache/report, and generated companion removal tasks are done.

Risks:
- This slice does not remove project-local generated companions by itself. It
  only prevents a migrated completed root from treating those companions as
  acceptable once replacement parity exists.
- The replacement matrix is intentionally narrow and names the current
  framework-owned generated/cache projections; future generated lookup cleanup
  may delete or rename those paths.

Follow-ups:
- Complete generated companion import lookup cleanup for packages whose local
  companions are removed.
- Validate and, if needed, tighten the touched artifact ownership hook against
  framework-owned and cache-owned projections.
- Remove or quarantine package-local generated companions ring by ring once
  program-index freshness and check/repair parity pass.
