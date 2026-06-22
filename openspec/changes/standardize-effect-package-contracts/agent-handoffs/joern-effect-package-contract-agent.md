# joern-effect package contract agent handoff

Changed:
- Added `packages/joern-effect/src/attune.package.ts` with a minimal Joern proof package contract for runtime query, CPG program builder, generated traversal DSL, Joern template, query evidence view, and generated schema coverage boundaries.
- Added `packages/joern-effect/src/attune.package.typecheck.ts` compile-only assertions for contract, handler/property maps, layers, and type guidance.
- Added `packages/joern-effect/test/attune-package-contract.test.ts` focused decode/alignment tests.

Generated files:
- None.

Validation commands:
- `nx run joern-effect:typecheck`
- `nx run joern-effect:test`

Package contract status:
- `joern-effect` now has a source-level package contract using the public `@attune/framework-protocol` DSL import.
- Package views cover `templateRegistryAtom`, `queryEvidenceAtom`, and `generatedSchemaCoverageAtom` as called out in the design.

Residual migration debt:
- `Joern` and `CpgProgramBuilder` still use lower-level `Context.Tag` service definitions.
- Live Joern process/runtime configuration remains a waivered subprocess and hidden configuration boundary.
- Template registry generation is declared as a boundary before generated template registry source exists in this package.

Blockers:
- None for this minimal contract slice.

Next-agent recommendations:
- Replace Joern proof CLI and generation command surfaces with typed Nx executors before removing the process/runtime waiver.
- Materialize the template registry/evidence generated sources or narrow the declared template boundary if the final generator shape changes.
