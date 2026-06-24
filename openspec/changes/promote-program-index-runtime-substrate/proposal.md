## Why

Attune has proved the value of package contracts, generated companions, Source
BOM shards, and repair scaffolding, but that transitional layer is now too much
of a public ontology. The next cut should make the SQLite program index answer
the old layer's questions so agents can operate from mechanical TypeScript,
Effect Schema, Nx, diagnostics, and repair facts rather than memorizing package
contract internals.

This change promotes the existing program-index substrate into the primary
runtime path for `attune-check`, `attune-repair`, language-service diagnostics,
generated artifact freshness, and package-local surface cleanup while keeping
the current package-contract/generated companion outputs as compatibility
inputs until parity is proven.

## What Changes

- Make the SQLite program index the primary runtime substrate for framework
  diagnostics, repair plans, source indexing, schema descriptor projection,
  generated artifact freshness, and workspace health.
- Route check and language-service diagnostic reads through program-index
  projections first, with package-contract/generated companion diagnostics
  preserved as compatibility fallback and parity data.
- Route `attune-repair` planning through program-index repair rows before
  invoking existing Nx generators or materializers.
- Ingest existing compatibility outputs as transitional facts:
  `src/attune.package.ts`, framework-owned generated package contracts, Source
  BOM shards, type-guidance outputs, generated companions, package-contract
  typecheck aggregates, and current package-contract tests.
- Keep compatibility outputs available until ring-by-ring parity proves the
  program index can answer the same diagnostics and repair plans.
- Move package-local generated truth toward framework-owned generated/cache or
  SQLite projection state only after the program index has a proven lookup path.
- Preserve the public workflow:

```bash
nx run workspace:attune-check
nx run workspace:attune-repair
nx run <project>:attune-check
nx run <project>:attune-repair
nx run <project>:typecheck
nx run <project>:test
```

- Add explicit safety classes for repair rows:
  `safe`, `needs-review`, and `manual-only`.
- Keep provider, Kubernetes, Alchemy, destructive, long proof-pressure, and
  container fuzzing flows outside the default automatic repair path.
- Document old package-contract ontology terms as compatibility/migration terms
  rather than the primary future mental model.

This is not an immediate purge. The cut is sequenced:

```txt
1. Index facts.
2. Read diagnostics from the index.
3. Read repair plans from the index.
4. Prove old and new diagnostic surfaces agree.
5. Move package-local generated truth into framework/cache/index ownership.
6. Ratchet warnings to errors.
7. Delete old compatibility outputs only after parity.
```

## Capabilities

### New Capabilities

- `sqlite-program-index`: Defines the program index as the primary local
  compiler database for mechanical workspace facts and transitional
  compatibility facts.
- `check-repair-program-index`: Defines program-index-backed diagnostics,
  repair rows, safety classes, check output, repair dry-run, and fallback
  behavior.
- `reactive-program-projections`: Defines SQL/Reactivity/atom projections over
  indexed facts, including read-only atom constraints and invalidation flow.
- `program-index-compatibility-adapters`: Defines how package contracts, Source
  BOM shards, type guidance, generated companions, and current generated
  package-contract outputs are ingested as compatibility facts.
- `program-index-package-surface-ratchet`: Defines package-ring validation,
  generated/source ownership cleanup, one-file surface ratchets, and deletion
  preconditions.

### Modified Capabilities

- None. This change is a new staged big-cut change that builds on the completed
  `sqlite-program-index-reactive-projections`,
  `compress-attune-package-surface`, and
  `standardize-effect-package-contracts` changes without reopening them.

## Impact

- Affects `framework/sqlite`, `framework/runtime`,
  `framework/language-service`, `framework/nx`, `framework/protocol`,
  `framework/testing`, `framework/architecture`, and `framework/oxlint-policy`.
- Affects `packages/attune-nx` check/repair executor wiring and compatibility
  generator routing.
- Affects package-ring validation for `effect-oxlint-policy`,
  `attuned-discovery`, `attune-foldkit`, `attune-nx`, `cocoindex-effect`,
  `joern-effect`, `attune-pi-agent`, `joern-effect-properties`,
  `home-deployment`, and `platform-alchemy-k8s`.
- Keeps the current generated package-contract and Source BOM artifacts
  available as compatibility inputs until parity is proven.
- Does not require wholesale deletion, heavy proof-pressure, live provider
  actions, Kubernetes apply, production infra actions, or public product
  behavior changes.
- Keeps SQLite local and private under framework-owned cache/projection state;
  product packages still must not import SQLite, Drizzle, or ProtocolStore
  internals.
