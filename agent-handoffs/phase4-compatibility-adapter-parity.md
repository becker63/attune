Changed:
- `ProgramCompatibilityRows` now carries mechanical `symbol`, `schema_descriptor`, and `edge` rows in addition to source_file, artifact, observation, diagnostic, and repair rows.
- Package-contract compatibility text is projected as exported symbol rows, old operation ids as `compatibility-operation-id` symbol rows, schema roles as schema_descriptor rows, and relationships as edge rows.
- artifact ownership compatibility JSON is projected as artifact ownership rows plus observations marked `source-ownership-compat`.
- Type-guidance, generated property maps, fuzz handler maps, and RPC group traces are projected as transitional observations marked `type-guidance-compat` or `generated-companion-compat`.
- Framework-owned generated contract companions and generated cache artifacts are indexed as generated artifacts when present.

Parity:
- `effect-oxlint-policy` fixture now proves four policy rule ids are symbol facts, schema roles have descriptors, contract-to-symbol and schema edges exist, artifact ownership rows exist, and generated guidance/property/fuzz observations are present.
- `attuned-discovery` fixture now proves eight legacy operation ids are symbol facts and have contract/schema edges without adding Operation, Law, Evidence, SourceBOM, TypeGuidance, FuzzHandler, PropertyMap, or RpcGroup tables.
- Package-local generated companion diagnostics remain staged warnings/review repairs. Framework-owned current artifact ownership shards are observations/artifact ownership facts, not noisy repair rows.

Mismatches:
- No unresolved Ring A adapter mismatch is known for the fields covered here.
- The old generated outputs are still active compatibility inputs for project-facts and artifact ownership validation until the project-ring tasks remove the safe surfaces.

Deletion Candidates:
- `framework/architecture/src/generated/project-facts/<project>/attune.generated.ts`
- `framework/architecture/src/generated/project-facts/<project>/attune.contract.generated.ts`
- `framework/architecture/src/generated/artifact-ownership/<project>.json`
- `.attune/cache/generated/<project>/attune-*`

Surfaces Removed:
- None in Phase 4. The condition for immediate deletion was not met because these outputs still back active validation targets. They are compatibility-only and should be deleted, quarantined, or archived in the ring and final demotion phases once those checks pass through program-index facts.

Validated:
- `pnpm exec nx run framework-runtime:test --skipNxCache`
- `pnpm exec nx run framework-runtime:typecheck --skipNxCache`
- `pnpm exec nx run framework-protocol:test --skipNxCache`
- `pnpm exec nx run attune-architecture:test --skipNxCache`
- `pnpm exec nx run workspace:artifact-ownership-check --skipNxCache`
- `pnpm exec nx run workspace:attune-check --skipNxCache --timeoutSeconds=600`
- `pnpm exec nx run workspace:attune-repair --dryRun --skipNxCache --timeoutSeconds=600`
- `pnpm exec nx run workspace:policy-commit --timeoutSeconds=600`
