# Attune Framework Operating Surface

## Public Loop

1. Edit small `src/attune.package.ts` declarations.
2. Run `nx run workspace:attune-check`.
3. Read language-service or Nx diagnostics.
4. Run `nx run workspace:attune-repair` or the suggested project repair target.
5. Re-run the focused project `typecheck` or `test`.

Use `workspace:package-contracts-check` for focused contract diagnostics and
`workspace:policy-fast` for the normal policy gate.

## What Belongs In `attune.package.ts`

- Package id and kind.
- Public operation declarations.
- Operation kind, input/output/error schemas, and service references.
- Semantic writes, observes, Reactivity keys, atoms, and view roots.
- Explicit waivers with owner/review metadata.
- Rare custom laws that cannot be inferred.
- Explicit stable id overrides when history or replay identity requires them.

## What Does Not Belong In `attune.package.ts`

- Handler maps and exact property maps.
- Large type-guidance partitions.
- RPC descriptors.
- Coverage-search arrays.
- Evidence producer maps and worker/fuzzer metadata.
- Generated artifact ledgers.
- Source BOM or generator-shape migration metadata.
- Replay or counterexample manifests.

Those belong in generated companions such as `src/attune.generated.ts`, focused
package-local evidence modules, framework testing helpers, or private
ProtocolStore projections.

## What SQLite Does

SQLite is the private framework projection database. It may store descriptors,
obligations, source ranges, generated artifact hashes, evidence events, replay
metadata, counterexample metadata, deltas, diagnostics, and repair plans under
gitignored cache paths such as `.attune/cache`.

Product packages must not import framework SQLite, raw Drizzle tables, or
ProtocolStore internals.

## What Nx Repairs Do

Nx repairs are the public action surface. Repairs read package declarations,
materialize descriptors and obligations, write deterministic generated files,
update freshness state, refresh private protocol projections, and print clear
diagnostics.

Agents should run the suggested Nx repair target before hand-editing generated
or derived protocol artifacts.

## Agent Rules

- Prefer framework diagnostics over local guessing.
- Keep package declarations small and readable.
- Use generated companions for large derived consequences.
- Do not commit ProtocolDelta reports, evidence dumps, or architecture reports.
- Do not edit SQLite rows, generated ledgers, or report-like artifacts as source
  truth.
